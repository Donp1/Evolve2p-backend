const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { findUserByEmail } = require("../utils/users");
const { convertCurrency } = require("../utils/crypto");

const router = express.Router();
// isAuthenticated
router.post("/", isAuthenticated, async (req, res) => {
  const { email } = req.payload;
  const { fromCoin, toCoin, fromAmount } = req.body;

  if (!email) {
    return res.status(400).json({ error: true, message: "Provide an email" });
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
      return res.status(400).json({ error: "Amount must be greater than 0" });
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
    const toAmount = await convertCurrency(amountNum, fromCoin, toCoin);

    const tx = await db.$transaction([
      db.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: amountNum } },
      }),
      db.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: toAmount } },
      }),
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
      message: "Swap completed",
      data: {
        fromCoin,
        toCoin,
        fromAmount: amountNum,
        toAmount,
      },
    });

    // return res.status(200).json({ success: true, message: "Swap operation successful", user });
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
