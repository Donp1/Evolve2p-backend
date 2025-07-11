const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { db } = require("../db");
const { isAuthenticated } = require("../middlewares");
const {
  ERC20_CONTRACTS,
  sendBTC,
  sendETH,
  sendTRC20,
} = require("../utils/crypto");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { userId } = req.payload;
  const { toAddress, amount, coin } = req.body;

  try {
    const amountNum = parseFloat(amount);
    if (!toAddress || !amountNum || !coin)
      return res.status(400).json({ error: true, message: "Missing fields" });

    // Get sender wallet
    const sender = await db.user.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });

    const fromWallet = sender.wallets.find((w) => w.currency === coin);
    if (!fromWallet)
      return res
        .status(404)
        .json({ error: true, message: "Sender wallet not found" });

    // Check internal user by username or address
    const isUsername = await db.user.findFirst({
      where: { username: toAddress },
      include: { wallets: true },
    });

    let toWallet = null;

    if (isUsername) {
      toWallet = isUsername.wallets.find((w) => w.currency === coin);
    } else {
      const isAddress = await db.wallet.findFirst({
        where: { address: toAddress, currency: coin },
      });
      if (isAddress) toWallet = isAddress;
    }

    // ✅ INTERNAL TRANSFER
    if (toWallet) {
      if (fromWallet.balance < amountNum) {
        console.log(fromWallet.balance, amountNum);
        return res
          .status(400)
          .json({ error: true, message: "Insufficient balance" });
      }

      await db.$transaction([
        db.wallet.update({
          where: { id: fromWallet.id },
          data: { balance: { decrement: amountNum } },
        }),
        db.wallet.update({
          where: { id: toWallet.id },
          data: { balance: { increment: amountNum } },
        }),
        db.transaction.create({
          data: {
            userId,
            walletId: fromWallet.id,
            type: "INTERNAL_TRANSFER",
            amount: Number(amountNum.toFixed(8)),
            toAddress: toWallet.address,
            fromAddress: fromWallet.address,
            txHash: `internal_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            status: "COMPLETED",
          },
        }),
      ]);

      return res
        .status(200)
        .json({ success: true, message: "Internal transfer successful" });
    }

    // ✅ ON-CHAIN TRANSFER
    if (fromWallet.balance < amountNum) {
      return res
        .status(400)
        .json({ error: true, message: "Insufficient balance" });
    }

    let privateKey;
    if (coin === "BTC") {
      privateKey = process.env.BTC_WALLET_PRIVATE_KEY;
    } else if (coin === "ETH") {
      privateKey = process.env.ETH_WALLET_PRIVATE_KEY;
    } else if (["USDT", "USDC"].includes(coin)) {
      privateKey = process.env.TRON_WALLET_PRIVATE_KEY;
    }

    if (!privateKey)
      return res
        .status(400)
        .json({ error: true, message: "Private key not configured" });

    let tx;
    if (coin === "BTC") {
      tx = await sendBTC(privateKey, toAddress, amountNum);
    } else if (coin === "ETH") {
      tx = await sendETH(privateKey, toAddress, amountNum);
    } else if (["USDT", "USDC"].includes(coin)) {
      const contractAddress = ERC20_CONTRACTS[coin];
      tx = await sendTRC20(
        privateKey,
        toAddress,
        amountNum,
        contractAddress,
        coin
      );
    } else {
      return res.status(400).json({ error: "Unsupported currency" });
    }

    if (!tx || !tx.txId) {
      return res
        .status(500)
        .json({ error: true, message: "Transaction failed" });
    }

    await db.$transaction([
      db.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: amountNum } },
      }),
      db.transaction.create({
        data: {
          userId,
          walletId: fromWallet.id,
          type: "TRANSFER",
          amount: Number(amountNum.toFixed(8)),
          toAddress,
          fromAddress: fromWallet.address,
          txHash: tx.txId,
          status: "COMPLETED",
        },
      }),
    ]);

    return res.json({
      success: true,
      message: "On-chain transfer successful",
      txId: tx.txId,
    });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({
      error: "Transfer failed",
      message: err.message || "Internal Server Error",
    });
  }
});

module.exports = router;
