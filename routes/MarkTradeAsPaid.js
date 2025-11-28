const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { sendPushNotification } = require("../utils/index");

const router = express.Router();

router.post("/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.payload;

  try {
    const trade = await db.trade.findUnique({
      where: { id },
      include: { seller: true, buyer: true, offer: true },
    });
    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });
    if (trade.buyerId !== userId) {
      return res
        .status(403)
        .json({ error: true, message: "Only buyer can mark paid" });
    }
    if (trade.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: true, message: "Trade not in PENDING state" });
    }

    const sellerWallet = await db.wallet.findFirst({
      where: { userId: trade.sellerId, currency: trade.offer.crypto },
    });

    if (!sellerWallet)
      return res.status(400).json({
        error: true,
        message: "Unable to get seller wallet",
      });

    const deducted = await db.wallet.update({
      where: { id: sellerWallet.id },
      data: { balance: { decrement: trade.amountCrypto } },
    });

    if (!deducted) {
      return res.status(400).json({
        error: true,
        message: "Unable to lock crypto amount in escrow",
      });
    }

    const updated = await db.trade.update({
      where: { id },
      data: { status: "PAID" },
    });

    const buyerNotification = await db.notification.create({
      data: {
        title: "Trade Marked as Paid ✅",
        message: `You have marked your trade with ${trade?.seller?.username} as paid. Please wait for the seller to release ${trade.amountCrypto} ${trade?.offer?.crypto}.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: trade?.buyerId,
      },
    });

    const sellerNotification = await db.notification.create({
      data: {
        title: "Trade Marked as Paid ✅",
        message: `${trade?.buyer?.username} has marked the trade as paid. Please confirm and release ${trade.amountCrypto} ${trade?.offer?.crypto}.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: trade?.sellerId,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(trade?.buyerId).emit("new_notification", buyerNotification);
      io.to(trade?.sellerId).emit("new_notification", sellerNotification);
    }

    if (trade.buyer.pushToken)
      await sendPushNotification(
        trade.buyer.pushToken,
        "Marked as Paid ✅",
        `You have marked your trade with @${trade?.seller?.username} as paid. Please wait for the seller to release ${trade.amountCrypto} ${trade?.offer?.crypto}.`
      );

    if (trade.seller.pushToken)
      await sendPushNotification(
        trade.seller.pushToken,
        "Marked as Paid ✅",
        `@${trade?.buyer?.username} has marked the trade as paid. ${trade.amountCrypto} ${trade?.offer?.crypto} locked in escrow, Please confirm and release.`
      );

    res.json({ success: true, message: "Marked as paid", trade: updated });
  } catch (err) {
    console.error("❌ Mark paid error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
