// routes/chat.js
const express = require("express");
const { db } = require("../db");
const { isAuthenticated } = require("../middlewares");

const router = express.Router();

// ✅ Get all chats for a user
// router.get("/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const chats = await db.chat.findMany({
//       where: {
//         participants: {
//           some: { userId },
//         },
//       },
//       include: {
//         participants: {
//           include: { user: true },
//         },
//         messages: {
//           orderBy: { createdAt: "desc" },
//           take: 1, // last message preview
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     res.json(chats);
//   } catch (err) {
//     console.error("❌ Error fetching user chats:", err);
//     res.status(500).json({ error: "Failed to fetch chats" });
//   }
// });

// ✅ Get messages for a chat
router.get("/:chatId", isAuthenticated, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, role } = req.payload;
    const userRole = role; // e.g., 'user' or 'admin'

    if (!chatId) {
      return res.status(400).json({ error: "Chat ID is required" });
    }

    // Find the chat
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: true,
        participants: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Fetch messages
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
