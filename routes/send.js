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
  const { walletId, toAddress, amount } = req.body;

  if (!walletId || !toAddress || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Fetch wallet and currency
    const wallet = await db.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      return res
        .status(404)
        .json({ error: true, message: "Wallet not found or not authorized" });
    }

    // if (wallet.balance <= parseFloat(amount)) {
    //   return res.status(400).json({ error: "Insufficient balance" });
    // }

    const symbol = wallet.currency;
    let privateKey;

    if (symbol === "BTC") {
      privateKey = process.env.BTC_WALLET_PRIVATE_KEY;
    } else if (symbol === "ETH") {
      privateKey = process.env.ETH_WALLET_PRIVATE_KEY;
    } else if (symbol === "USDT" || symbol === "USDC") {
      privateKey = process.env.TRON_WALLET_PRIVATE_KEY;
    }

    let tx;

    // 2. Send based on currency
    if (symbol === "BTC") {
      tx = await sendBTC(privateKey, toAddress, amount);
    } else if (symbol === "ETH") {
      tx = await sendETH(privateKey, toAddress, amount);
    } else if (["USDT", "USDC"].includes(symbol)) {
      const contractAddress = ERC20_CONTRACTS[symbol];
      tx = await sendTRC20(privateKey, toAddress, amount, contractAddress);
    } else {
      return res.status(400).json({ error: "Unsupported currency" });
    }

    if (!tx || !tx.txId) {
      return res
        .status(500)
        .json({ error: true, message: "Transaction failed" });
    }

    // 3. Log transaction
    await db.transaction.create({
      data: {
        userId,
        walletId,
        type: "WITHDRAWAL",
        amount: Number(Number(amount).toFixed(8)),
        toAddress,
        txHash: tx.txId,
        status: "COMPLETED",
      },
    });

    // 4. Deduct balance
    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: parseFloat(amount) },
      },
    });

    return res.json({
      success: true,
      message: "Sent Successufully",
      txId: tx?.txId,
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
