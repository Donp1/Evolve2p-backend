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
  sendBEP20,
} = require("../utils/crypto");

const router = express.Router();

// 🧩 Helper functions
const isPossibleUsername = (input) =>
  /^[a-zA-Z0-9_]{3,20}$/.test(input) && !input.startsWith("0x");

const isPossibleAddress = (input, chain) => {
  // 🪙 BTC address formats
  const btcRegex = /^[13mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  const btcBech32 = /^(bc1|tb1)[a-zA-HJ-NP-Z0-9]{25,39}$/;

  // 💠 ETH & BSC share the same address format (0x + 40 hex chars)
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  const bscRegex = /^0x[a-fA-F0-9]{40}$/;

  // 🌀 TRON address format
  const tronRegex = /^T[a-zA-Z0-9]{33}$/;

  if (chain === "BTC") return btcRegex.test(input) || btcBech32.test(input);
  if (chain === "ETH") return ethRegex.test(input);
  if (chain === "USDC") return bscRegex.test(input);
  if (chain === "USDT") return tronRegex.test(input);
  return "Not a supported address format";
};

router.post("/", isAuthenticated, async (req, res) => {
  const { userId } = req.payload;
  const { toAddress, amount, coin } = req.body;

  try {
    const amountNum = parseFloat(amount);

    if (!toAddress || !amountNum || !coin)
      return res
        .status(400)
        .json({ error: true, message: "Missing required fields" });

    // --- 🧮 Platform fee setup ---
    const settings = await db.settings.findFirst();
    const feePercent = settings?.sendCryptoFee || 0.5; // Default 0.5%
    const feeAmount = (amountNum * feePercent) / 100;
    const totalDeduction = amountNum + feeAmount;

    // --- 🧍‍♂️ Sender wallet ---
    const sender = await db.user.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });

    if (!sender)
      return res.status(404).json({ error: true, message: "Sender not found" });

    const fromWallet = sender.wallets.find((w) => w.currency === coin);

    if (!fromWallet)
      return res
        .status(404)
        .json({ error: true, message: "Sender wallet not found" });

    // --- 🎯 Determine recipient type ---
    let toWallet = null;
    let recipient = null;

    if (isPossibleUsername(toAddress)) {
      // Username-based internal transfer
      recipient = await db.user.findFirst({
        where: { username: { equals: toAddress, mode: "insensitive" } },
        include: { wallets: true },
      });

      if (!recipient)
        return res
          .status(404)
          .json({ error: true, message: "Username not found" });

      toWallet = recipient.wallets.find((w) => w.currency === coin);

      if (!toWallet)
        return res.status(404).json({
          error: true,
          message: `Recipient does not have a ${coin} wallet.`,
        });
    } else if (isPossibleAddress(toAddress, coin)) {
      // Wallet address (could be BTC, ETH, BSC, TRON)
      toWallet = await db.wallet.findFirst({
        where: {
          address: {
            equals: toAddress,
            mode: "insensitive",
          },
          currency: coin,
        },
      });
    } else {
      return res.status(400).json({
        error: true,
        message: "Invalid username or wallet address format",
      });
    }

    // ✅ INTERNAL TRANSFER
    if (toWallet?.id) {
      if (fromWallet.balance < totalDeduction) {
        return res.status(400).json({
          error: true,
          message: `Insufficient balance. You need at least ${totalDeduction} ${coin} (includes ${feeAmount} ${coin} fee).`,
        });
      }

      await db.$transaction([
        // Deduct sender balance (amount + fee)
        db.wallet.update({
          where: { id: fromWallet.id },
          data: { balance: { decrement: totalDeduction } },
        }),

        // Credit recipient
        db.wallet.update({
          where: { id: toWallet.id },
          data: { balance: { increment: amountNum } },
        }),

        // Record transaction
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

      return res.status(200).json({
        success: true,
        message: "Internal transfer successful",
        data: {
          sent: amountNum,
          fee: feeAmount,
          totalDeducted: totalDeduction,
        },
      });
    } else {
      // ✅ ON-CHAIN TRANSFER
      if (fromWallet.balance < totalDeduction) {
        return res.status(400).json({
          error: true,
          message: `Insufficient balance. You need ${totalDeduction} ${coin} (includes ${feeAmount} ${coin} fee).`,
        });
      }

      // --- 🔑 Select private key ---
      let privateKey;
      if (coin === "BTC") privateKey = process.env.BTC_WALLET_PRIVATE_KEY;
      else if (coin === "ETH") privateKey = process.env.ETH_WALLET_PRIVATE_KEY;
      else if (coin === "USDT")
        privateKey = process.env.TRON_WALLET_PRIVATE_KEY;
      else if (coin === "USDC") privateKey = process.env.BNB_WALLET_PRIVATE_KEY;

      if (!privateKey)
        return res
          .status(400)
          .json({ error: true, message: "Private key not configured" });

      // --- 🚀 Send transaction ---
      let tx;
      if (coin === "BTC") {
        // tx = await sendBTC({
        //   wif: privateKey,
        //   to: toAddress,
        //   amountSats: Math.round(amountNum * 1e8),
        //   feeRate: 10, // sats per byte
        //   network: "testnet",
        // });

        tx = await sendBTC(
          privateKey,
          process.env.BTC_WALLET_ADDRESS,
          toAddress,
          amountNum
        );
      } else if (coin === "ETH")
        tx = await sendETH(privateKey, toAddress, amountNum);
      else if (coin === "USDT") {
        const contractAddress = ERC20_CONTRACTS[coin];
        // tx = await sendTRC20({
        //   amount: amountNum,
        //   to: toAddress,
        //   privateKey,
        //   contractAddress,
        //   mainnet: false,
        // });

        tx = await sendTRC20(
          privateKey,
          toAddress,
          amountNum,
          process.env.CONTRACT_ADDRESS_USDT
        );
      } else if (coin === "USDC") {
        tx = await sendBEP20(privateKey, toAddress, amountNum);
      } else {
        return res
          .status(400)
          .json({ error: true, message: "Unsupported currency" });
      }

      if (!tx || !tx.txId)
        return res
          .status(500)
          .json({ error: true, message: "Transaction failed" });

      await db.$transaction([
        db.wallet.update({
          where: { id: fromWallet.id },
          data: { balance: { decrement: totalDeduction } },
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
      });
    }
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({
      error: true,
      message: err.message || "Internal Server Error",
    });
  }
});

module.exports = router;
