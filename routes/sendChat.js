const express = require("express");
const { db } = require("../db");
const { isAuthenticated } = require("../middlewares");
const router = express.Router();

/**
 * Send a message to a chat
 */
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { userId: senderId } = req.payload;
    const { chatId, content, type } = req.body;

    // Validate chat exists
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Create message
    const message = await db.message.create({
      data: {
        chatId,
        senderId,
        content,
        type: type || "TEXT",
      },
      include: {
        sender: true,
      },
    });

    // Emit real-time update with socket.io
    const io = req.app.get("io");
    io.to(chatId).emit("new_message", message);

    return res.status(201).json(message);
  } catch (err) {
    console.error("Error sending message:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
