const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { convertCryptoToFiat } = require("../utils/crypto");
const { releaseTrade, sendPushNotification } = require("../utils/users");

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
          },
          include: {
            buyer: true,
            seller: true,
            offer: { include: { paymentMethod: true } },
            chat: { include: { messages: true, participants: true } },
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
        message: `${updated?.seller?.username} has released ${trade.amountCrypto} ${trade.escrow.crypto}. The trade is now completed successfully.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: updated.buyerId,
      },
    });

    const sellserNotification = await db.notification.create({
      data: {
        title: "Funds Released 🎉",
        message: `${updated?.seller?.username} has released ${trade.amountCrypto} ${trade.escrow.crypto}. The trade is now completed successfully.`,
        category: "TRADE",
        data: { tradeId: id },
        read: false,
        userId: updated.buyerId,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(updated.buyerId).emit("new_trade", updated);

      // ✅ Notify the seller
      io.to(updated.sellerId).emit("new_trade", updated);

      io.to(updated.buyerId).emit("new_notification", buyerNotification);

      // ✅ Notify the seller
      io.to(updated.sellerId).emit("new_notification", sellserNotification);
    }

    await sendPushNotification(
      trade.buyerId,
      "Escrow Released 🎉",
      `Your trade with ${updated?.seller?.username} has been completed successfully .`
    );
    await sendPushNotification(
      trade.sellerId,
      "Escrow Released 🎉",
      `Your trade with ${updated?.buyer?.username} has been completed successfully.`
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
