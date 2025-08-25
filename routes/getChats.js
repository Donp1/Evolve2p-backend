// routes/disputes.js
const express = require("express");
const { isAuthenticated, isAdmin } = require("../middlewares");
const { db } = require("../db");

const router = express.Router();

// GET /api/trades/:tradeId/chat
router.get("/:tradeId", isAuthenticated, async (req, res) => {
  const { tradeId } = req.params;
  const { userId, role } = req.payload; // role instead of isAdmin

  try {
    const trade = await db.trade.findUnique({ where: { id: tradeId } });
    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });

    // Only buyer, seller, or admin can view messages
    if (
      role !== "ADMIN" &&
      trade.buyerId !== userId &&
      trade.sellerId !== userId
    ) {
      return res.status(403).json({ error: true, message: "Not authorized" });
    }

    const messages = await db.chatMessage.findMany({
      where: { tradeId },
      include: {
        sender: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({
      success: true,
      messages: messages.map((msg) => ({
        id: msg.id,
        tradeId: msg.tradeId,
        message: msg.message,
        createdAt: msg.createdAt,
        senderType: msg.senderType,
        sender: msg.sender
          ? { id: msg.sender.id, username: msg.sender.username }
          : null,
      })),
    });
  } catch (err) {
    console.error("❌ Chat fetch error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});
module.exports = router;
