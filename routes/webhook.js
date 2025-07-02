require("dotenv").config(); // Load environment variables

// routes/webhook.js
const express = require("express");
const router = express.Router();

// Optional: secure your webhook with a secret token
const TATUM_WEBHOOK_SECRET = process.env.TATUM_WEBHOOK_SECRET;

router.post("/:asset", async (req, res) => {
  try {
    const asset = req.params.asset.toUpperCase(); // btc, eth, usdt, usdc
    const event = req.body;

    if (!event || !event.address || !event.txId || !event.amount) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid webhook payload" });
    }

    // if (
    //   TATUM_WEBHOOK_SECRET &&
    //   req.headers["x-webhook-token"] !== TATUM_WEBHOOK_SECRET
    // ) {
    //   return res.status(403).json({ error: "Unauthorized webhook" });
    // }

    const depositAddress = event.address;
    const txHash = event.txId;
    const amount = parseFloat(event.amount);
    const currency = asset;
    const status = "CONFIRMED";

    console.log(
      `📩 Incoming ${currency} deposit for address ${depositAddress}:`,
      amount
    );

    const wallet = await db.wallet.findUnique({
      where: { address: depositAddress },
      include: { user: true }, // so you can get the userId
    });

    if (!wallet) {
      console.error("❌ Wallet not found for address:", depositAddress);
      return res.status(404).json({ error: "Wallet not found" });
    }

    await db.transaction.create({
      data: {
        userId: wallet.user.id,
        walletId: wallet.id,
        amount,
        type: "DEPOSIT",
        currency,
        txHash,
        status,
      },
    });

    // ✅ 5. Respond to Tatum quickly
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
