const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  const body = req.body;

  try {
    console.log("Data: ", body);
    console.log("txId: ", body.txId);

    const existing = await db.transaction.findFirst({
      where: { txHash: body.txId },
    });
    if (existing)
      return res.status(400).json({ erro: true, message: "Already processed" });

    const wallet = await db.wallet.findFirst({
      where: {
        address: body.address || body.to,
        currency: body.asset || "USDT",
      },
      include: { user: true },
    });

    if (!wallet) {
      console.error(
        "❌ Wallet not found for address:",
        body.to || body.address
      );
      return res.status(404).json({ error: true, message: "Wallet not found" });
    }

    // id: txId,
    //     address: body.to || body.address,
    //     asset: body.asset || "UNKNOWN",
    //     type: body.type || "incoming",
    //     amount: body.amount,
    //     blockNumber: body.blockNumber || 0,
    //     txId,
    //     from: body.from,
    //     to: body.to || body.address,
    //     timestamp: body.timestamp || new Date().toISOString(),

    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: body.amount || body.value,
        },
      },
    });

    const data = {
      amount: body.amount || body.value,
      toAddress: body.address || body.to,
      type: "DEPOSIT",
      status: "COMPLETED",
      txHash: body.txId,
      userId: wallet.userId,
      walletId: wallet.id,
      fromAddress: body.counterAddress,
    };

    if (body.asset == "BTC") {
      try {
        const txDetails = await fetch(
          `https://api.tatum.io/v3/bitcoin/transaction/${body.txId}`,
          {
            headers: {
              "x-api-key": process.env.TATUM_API_KEY,
            },
          }
        );
        const tx = await txDetails.json();
        const fromAddress = tx.inputs[0]?.coin?.address;
        data.fromAddress = fromAddress || body.counterAddress;
      } catch (err) {
        console.error("❌ error:", err.message);
      }
    }

    await db.transaction.create({
      data,
    });

    console.log("📬 Webhook received:", body);
    res.status(200).json({ success: true, message: "Processed" });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: true, message: "Server error" });
  }
});

module.exports = router;
