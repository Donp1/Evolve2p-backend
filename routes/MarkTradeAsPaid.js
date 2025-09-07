const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { sendPushNotification } = require("../utils/users");

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
        userId: userId,
      },
    });

    const sellerNotification = await db.notification.create({
      data: {
        title: "Trade Marked as Paid ✅",
        message: `${trade?.buyer?.username} has marked the trade as paid. Please confirm and release ${trade.amountCrypto} ${trade?.offer?.crypto}.`,
        category: "TRADE",
        data: { tradeId: result.id },
        read: false,
        userId: result?.sellerId,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(trade?.buyerId).emit("new_notification", buyerNotification);
      io.to(trade?.sellerId).emit("new_notification", sellerNotification);
    }

    // await sendPushNotification(
    //   result?.buyerId,
    //   "Marked as Paid ✅",
    //   `You have marked your trade with ${trade?.seller?.username} as paid. Please wait for the seller to release ${trade.amountCrypto} ${trade?.offer?.crypto}.`
    // );
    // await sendPushNotification(
    //   result?.sellerId,
    //   "Marked as Paid ✅",
    //   `${trade?.buyer?.username} has marked the trade as paid. Please confirm and release ${trade.amountCrypto} ${trade?.offer?.crypto}.`
    // );

    res.json({ success: true, message: "Marked as paid", trade: updated });
  } catch (err) {
    console.error("❌ Mark paid error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
