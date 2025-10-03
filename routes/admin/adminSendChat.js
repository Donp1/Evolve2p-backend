const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

router.post("/", isAdmin, async (req, res) => {
  try {
    const { chatId, content } = req.body;

    if (!req.payload || !req.payload.isAdmin) {
      return res
        .status(403)
        .json({ error: true, message: "Forbidden: Admin access required" });
    }

    // Validate chat exists
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) {
      return res.status(404).json({ error: true, message: "Chat not found" });
    }

    // Create message
    const message = await db.message.create({
      data: {
        chatId,
        senderId: null,
        content: content || null,
        type: "SYSTEM",
        attachment: null,
      },
    });

    // Emit real-time update
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("new_message", message);
    }

    return res.status(201).json({ success: true, message });
  } catch (err) {
    console.error("Error sending message:", err);
    return res
      .status(500)
      .json({ error: true, message: "Failed to send message" });
  }
});

module.exports = router;
