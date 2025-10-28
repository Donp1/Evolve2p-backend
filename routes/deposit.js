const express = require("express");
const { db } = require("../db");
const fetch = require("node-fetch");

const router = express.Router();

router.post("/", async (req, res) => {
  const body = req.body;
  console.log("📦 Incoming data:", body);

  try {
    // --- 🧠 Normalize data based on subscriptionType / chain ---
    let normalized = {
      chain: body.chain,
      txHash: body.txId,
      blockNumber: body.blockNumber,
      timestamp: body.timestamp,
      subscriptionId: body.subscriptionId,
      subscriptionType: body.subscriptionType,
    };

    // Identify asset type automatically
    if (body.asset === "BTC" || body.chain?.includes("bitcoin")) {
      normalized.asset = "BTC";
      normalized.amount = body.amount;
      normalized.toAddress = body.address;
      normalized.fromAddress = body.counterAddress; // fallback, may fix below
    } else if (body.asset === "ETH" || body.chain?.includes("ethereum")) {
      normalized.asset = "ETH";
      normalized.amount = body.amount;
      normalized.toAddress = body.address;
      normalized.fromAddress = body.counterAddress;
    } else if (body.subscriptionType === "INCOMING_FUNGIBLE_TX") {
      normalized.asset = "USDC";
      normalized.amount = body.amount;
      normalized.toAddress = body.address;
      normalized.fromAddress = body.counterAddress;
    } else if (body.asset === "USDT" || body.chain?.includes("TRON")) {
      normalized.asset = "USDT";
      normalized.amount = body.amount;
      normalized.toAddress = body.address;
      normalized.fromAddress = body.counterAddress;
    } else {
      console.warn("⚠️ Unsupported webhook payload:", body);
      return res
        .status(400)
        .json({ error: true, message: "Unsupported chain" });
    }

    // --- 🚫 Prevent double processing ---
    const existing = await db.transaction.findFirst({
      where: { txHash: normalized.txHash },
    });
    if (existing)
      return res
        .status(400)
        .json({ error: true, message: "Already processed" });

    // --- 🔍 Find the wallet based on toAddress ---
    const wallet = await db.wallet.findFirst({
      where: { address: normalized.toAddress },
      include: { user: true },
    });

    if (!wallet) {
      console.error("❌ Wallet not found for address:", normalized.toAddress);
      return res.status(404).json({ error: true, message: "Wallet not found" });
    }

    // --- 🧮 Update balance ---
    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: Number(normalized.amount),
        },
      },
    });

    // --- 🔗 Handle BTC specific “fromAddress” lookup ---
    if (normalized.asset === "BTC") {
      try {
        const txDetails = await fetch(
          `https://api.tatum.io/v3/bitcoin/transaction/${normalized.txHash}`,
          {
            headers: {
              "x-api-key": process.env.TATUM_API_KEY,
            },
          }
        );
        const tx = await txDetails.json();
        const fromAddress = tx.inputs?.[0]?.coin?.address;
        if (fromAddress) normalized.fromAddress = fromAddress;
      } catch (err) {
        console.error("❌ Error fetching BTC tx details:", err.message);
      }
    }

    // --- 🧾 Create transaction record ---
    const txData = {
      amount: normalized.amount,
      toAddress: normalized.toAddress,
      fromAddress: normalized.fromAddress,
      txHash: normalized.txHash,
      type: "DEPOSIT",
      status: "COMPLETED",
      userId: wallet.userId,
      walletId: wallet.id,
    };

    await db.transaction.create({ data: txData });

    console.log("✅ Deposit processed successfully:", txData);
    res.status(200).json({ success: true, message: "Processed", data: txData });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: true, message: "Server error" });
  }
});

module.exports = router;
