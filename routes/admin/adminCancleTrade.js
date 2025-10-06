const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.post("/:tradeId", isAdmin, async (req, res) => {
  const { tradeId } = req.params;

  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  try {
    const trade = await db.trade.findUnique({
      where: { id: tradeId },
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
        message: `Your trade with ${updated?.buyer.username} has been canceled by Evolve2p. Funds have been returned to your wallet.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: updatedTrade.sellerId,
      },
    });

    const buyerNotification = await db.notification.create({
      data: {
        title: "Trade Canceled",
        message: `Your trade with ${updated?.seller.username} has been canceled by Evolve2p.`,
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
