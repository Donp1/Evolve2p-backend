const express = require("express");
const { isAuthenticated, isAdmin } = require("../middlewares");
const { db } = require("../db");

const router = express.Router();

// POST /api/trades/:tradeId/chat
router.post("/:tradeId", isAuthenticated, async (req, res) => {
  const { tradeId } = req.params;
  const { message } = req.body;
  const { userId, role } = req.payload; // role instead of isAdmin

  try {
    const trade = await db.trade.findUnique({ where: { id: tradeId } });
    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });

    let senderType;

    if (role === "ADMIN") {
      senderType = "ADMIN";
    } else if (trade.buyerId === userId) {
      senderType = "BUYER";
    } else if (trade.sellerId === userId) {
      senderType = "SELLER";
    } else {
      return res
        .status(403)
        .json({ error: true, message: "Not authorized for this trade" });
    }

    const chatMsg = await db.chatMessage.create({
      data: {
        tradeId,
        senderId: role === "ADMIN" ? null : userId, // admins don't need senderId
        senderType,
        message,
      },
    });

    res.status(201).json({ success: true, message: "Message sent", chatMsg });
  } catch (err) {
    console.error("❌ Chat send error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
