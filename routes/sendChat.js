const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { db } = require("../db");
const { isAuthenticated } = require("../middlewares");
const streamifier = require("streamifier");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  secure: true,
});

router.post(
  "/",
  isAuthenticated,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { userId: senderId } = req.payload;
      const { chatId, content } = req.body;

      // Validate chat exists
      const chat = await db.chat.findUnique({
        where: { id: chatId },
        include: { participants: true },
      });

      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      let attachmentUrl = null;

      // Upload attachment if present
      if (req.file) {
        attachmentUrl = await new Promise((resolve, reject) => {
          const cld_upload_stream = cloudinary.uploader.upload_stream(
            { resource_type: "auto", folder: "chat-attachments" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
        });
      }

      // Decide message type
      let messageType = "TEXT";
      if (attachmentUrl && content) {
        messageType = "TEXT"; // still text but with attachment
      } else if (attachmentUrl) {
        messageType = "IMAGE"; // or FILE depending on your enum
      }

      // Create message
      const message = await db.message.create({
        data: {
          chatId,
          senderId,
          content: content || null,
          type: messageType,
          attachment: attachmentUrl,
        },
        include: {
          sender: true,
        },
      });

      // Emit real-time update
      const io = req.app.get("io");
      if (io) {
        io.to(chatId).emit("new_message", message);
      }

      return res.status(201).json(message);
    } catch (err) {
      console.error("Error sending message:", err);
      return res.status(500).json({ error: "Failed to send message" });
    }
  }
);

module.exports = router;
