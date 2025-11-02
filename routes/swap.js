const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { convertCurrency } = require("../utils/crypto");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { email } = req.payload;
  const { fromCoin, toCoin, fromAmount } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ error: true, message: "Unauthorized: provide a valid token" });
  }

  if (!fromCoin || !toCoin || !fromAmount) {
    return res
      .status(400)
      .json({ error: true, message: "Missing required fields" });
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
      include: { wallets: true },
    });

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    const amountNum = parseFloat(fromAmount);
    if (amountNum <= 0) {
      return res
        .status(400)
        .json({ error: true, message: "Amount must be greater than 0" });
    }

    const fromWallet = user.wallets.find((w) => w.currency === fromCoin);
    const toWallet = user.wallets.find((w) => w.currency === toCoin);

    if (!fromWallet || !toWallet) {
      return res.status(404).json({
        error: true,
        message: `Wallets for ${fromCoin} or ${toCoin} not found`,
      });
    }

    if (fromWallet.balance < amountNum) {
      return res.status(400).json({
        error: true,
        message: `Insufficient balance in ${fromCoin} wallet`,
      });
    }

    // --- 🧮 Fee setup ---
    const settings = await db.settings.findFirst();
    const swapFeePercent = settings.swapFee || 1; // 1% fee
    const swapFee = (amountNum * swapFeePercent) / 100;
    const netAmount = amountNum - swapFee;

    // --- 💱 Perform conversion ---
    const toAmount = await convertCurrency(netAmount, fromCoin, toCoin);

    // --- 💾 Perform DB transaction ---
    await db.$transaction([
      // Deduct total (including fee)
      db.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: amountNum } },
      }),
      // Add converted (after-fee) amount
      db.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: toAmount } },
      }),
      // Record swap
      db.swap.create({
        data: {
          userId: user.id,
          fromCoin,
          toCoin,
          fromAmount: amountNum,
          toAmount,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Swap completed successfully",
    });
  } catch (error) {
    console.error("❌ Swap Error:", error);
    return res.status(500).json({
      error: true,
      message: "Internal server error during swap",
    });
  }
});

module.exports = router;
