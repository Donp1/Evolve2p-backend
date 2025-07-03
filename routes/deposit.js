const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  const body = req.body;

  try {
    const isTatum = body.chain && body.txId && body.to;
    const txId = isTatum ? body.txId : body.id;

    console.log(body);

    const existing = await db.transaction.findFirst({
      where: { txHash: txId },
    });
    if (existing) return res.status(200).json({ message: "Already processed" });

    const wallet = await db.wallet.findFirst({
      where: {
        address: body.to || body.address,
        currency: body.asset || "USDT",
      },
      include: { user: true },
    });

    console.log(wallet.currency);

    if (!wallet) {
      console.error(
        "❌ Wallet not found for address:",
        body.to || body.address
      );
      return res.status(404).json({ message: "Wallet not found" });
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

    await db.transaction.create({
      data: {
        amount: body.amount || body.value,
        toAddress: body.to || body.address,
        type: "DEPOSIT",
        status: "COMPLETED",
        txHash: txId,
        userId: wallet.userId,
        walletId: wallet.id,
      },
    });

    console.log("📬 Webhook received:", body);
    res.status(200).json({ message: "Processed" });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
