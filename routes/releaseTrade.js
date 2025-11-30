const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { convertCryptoToFiat } = require("../utils/crypto");
const { releaseTrade } = require("../utils/users");
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
    if (trade.sellerId !== userId) {
      return res
        .status(403)
        .json({ error: true, message: "Only seller can release escrow" });
    }
    if (trade.status !== "PAID") {
      return res
        .status(400)
        .json({ error: true, message: "Trade must be in PAID state" });
    }
    if (!trade.escrow || trade.escrow.released) {
      return res
        .status(400)
        .json({ error: true, message: "Escrow already released or missing" });
    }

    const buyerWallet = await db.wallet.findFirst({
      where: { userId: trade.buyerId, currency: trade.escrow.crypto },
    });

    // const buyerWallet = await ensureWallet(trade.buyerId, trade.escrow.crypto);

    const updated = await db.$transaction(
      async (tx) => {
        // Credit buyer
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balance: { increment: Number(trade.amountCrypto) } },
        });

        // Mark escrow released
        await tx.escrow.update({
          where: { tradeId: trade.id },
          data: { released: true },
        });

        // Complete trade
        const t = await tx.trade.update({
          where: { id: trade.id },
          data: {
            status: "COMPLETED",
            escrowReleased: true,
            completedAt: new Date(),
          },
          include: {
            buyer: { select: { id: true, username: true } },
            seller: { select: { id: true, username: true } },
            offer: {
              include: {
                paymentMethod: true, // 👈 include payment method relation
              },
            },
            escrow: true,
            chat: {
              include: {
                messages: true,
                participants: true,
              },
            },
          },
        });

        return t;
      },
      {
        timeout: 15000,
        maxWait: 5000,
      }
    );

    const buyerNotification = await db.notification.create({
      data: {
        title: "Funds Released 🎉",
        message: `Your trade with ${updated?.seller?.username} has been completed successfully .`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: updated.buyerId,
      },
    });

    const sellserNotification = await db.notification.create({
      data: {
        title: "Funds Released 🎉",
        message: `Your trade with ${updated?.buyer?.username} has been completed successfully.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: updated.buyerId,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(updated.id).emit("new_trade", updated);

      io.to(updated.buyerId).emit("new_notification", buyerNotification);

      // ✅ Notify the seller
      io.to(updated.sellerId).emit("new_notification", sellserNotification);
    }

    if (updated.buyer.pushToken)
      await sendPushNotification(
        updated.buyer.pushToken,
        "Funds Released 🎉",
        `Your trade with ${updated?.seller?.username} has been completed successfully .`
      );

    if (updated.seller.pushToken)
      await sendPushNotification(
        updated.seller.pushToken,
        "Funds Released 🎉",
        `Your trade with ${updated?.buyer?.username} has been completed successfully .`
      );

    res.json({
      success: true,
      message: "Escrow released. Trade completed.",
      trade: updated,
    });
  } catch (err) {
    console.error("❌ Release escrow error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
