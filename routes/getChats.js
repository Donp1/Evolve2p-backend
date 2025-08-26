// routes/chat.js
const express = require("express");
const { db } = require("../db");

const router = express.Router();

// ✅ Get all chats for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const chats = await db.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // last message preview
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(chats);
  } catch (err) {
    console.error("❌ Error fetching user chats:", err);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

// ✅ Get messages for a chat
router.get("/:chatId/messages", async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await db.message.findMany({
      where: { chatId },
      include: { sender: true },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
