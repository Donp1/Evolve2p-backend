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
      include: { escrow: true },
    });

    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });
    // Either party can cancel while PENDING (and not marked paid). Adjust policy as needed.
    if (trade.status !== "PENDING" || trade.escrowReleased) {
      return res
        .status(400)
        .json({ error: true, message: "Cannot cancel at this stage" });
    }
    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      return res.status(403).json({ error: true, message: "Not allowed" });
    }

    // const sellerWallet = await ensureWallet(
    //   trade.sellerId,
    //   trade.escrow.crypto
    // );
    const sellerWallet = await db.wallet.findFirst({
      where: { userId: trade.sellerId, currency: trade.escrow.crypto },
    });

    const updated = await db.$transaction(async (tx) => {
      // refund seller
      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balance: { increment: Number(trade.amountCrypto) } },
      });

      // mark escrow "released" to avoid re-use (optionally delete instead)
      await tx.escrow.update({
        where: { tradeId: trade.id },
        data: { released: true },
      });

      // cancel trade
      const t = await tx.trade.update({
        where: { id: trade.id },
        data: { status: "CANCELLED" },
        include: {
          buyer: true,
          seller: true,
          offer: { include: { paymentMethod: true } },
          chat: { include: { messages: true, participants: true } },
        },
      });

      return t;
    });

    const sellserNotification = await db.notification.create({
      data: {
        title: "Trade Canceled",
        message: `Your trade with ${updated?.buyer.username} has been canceled. Funds have been returned to your wallet.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: updatedTrade.sellerId,
      },
    });

    const buyerNotification = await db.notification.create({
      data: {
        title: "Trade Canceled",
        message: `Your trade with ${updated?.seller.username} has been canceled.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: updatedTrade.buyerId,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(updated.sellerId).emit("new_trade", updated);

      // ✅ Notify the seller
      io.to(updated.buyerId).emit("new_trade", updated);

      io.to(updated?.buyerId).emit("new_notification", buyerNotification);

      // ✅ Notify the seller
      io.to(updated.sellerId).emit("new_notification", sellserNotification);
    }

    if (updated.buyer.pushToken)
      await sendPushNotification(
        updated.buyer.pushToken,
        "Trade Canceled",
        `Your trade with ${updated?.seller.username} has been canceled.`
      );

    if (updated.seller.pushToken)
      await sendPushNotification(
        updated.seller.pushToken,
        "Trade Canceled",
        `Your trade with ${updated?.buyer.username} has been canceled. Funds have been returned to your wallet.`
      );

    res.json({
      success: true,
      message: "Trade canceled and funds returned.",
      trade: updated,
    });
  } catch (err) {
    console.error("❌ Cancel trade error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
