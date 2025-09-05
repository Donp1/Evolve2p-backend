// routes/disputes.js
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const { isAuthenticated } = require("../middlewares");
const { db } = require("../db");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  secure: true,
});
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post(
  "/",
  isAuthenticated,
  upload.single("evidence"),
  async (req, res) => {
    const { tradeId, reason, description } = req.body;
    const { userId } = req.payload; // from JWT
    const evidence = req.file ? req.file.buffer : null;

    try {
      // Validate input
      if (!tradeId || !reason) {
        return res
          .status(400)
          .json({ error: true, message: "tradeId and reason are required" });
      }

      // Find trade
      const trade = await db.trade.findFirst({
        where: { id: tradeId },
        include: { buyer: true, seller: true },
      });
      if (!trade) {
        return res
          .status(404)
          .json({ error: true, message: "Trade not found" });
      }

      // Ensure user is part of the trade
      if (trade.buyerId !== userId && trade.sellerId !== userId) {
        return res
          .status(403)
          .json({ error: true, message: "You are not part of this trade" });
      }

      // Check if a dispute already exists for this trade
      const existing = await db.dispute.findFirst({ where: { tradeId } });
      if (existing) {
        return res.status(400).json({
          error: true,
          message: "Dispute already opened for this trade",
        });
      }

      let evidenceUrl = null;

      // Upload evidence if provided
      if (evidence) {
        evidenceUrl = await new Promise((resolve, reject) => {
          const cld_upload_stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "auto",
              folder: "dispute-evidence",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(evidence).pipe(cld_upload_stream);
        });
      }

      // Create dispute
      const dispute = await db.dispute.create({
        data: {
          tradeId,
          openedBy: userId,
          reason,
          evidence: evidenceUrl || null,
          description: description || null,
          status: "OPEN",
        },
        include: { trade: true },
      });

      // Update trade status to DISPUTED
      const updatedTrade = await db.trade.update({
        where: { id: tradeId },
        data: { status: "DISPUTED" },
        include: {
          buyer: true,
          seller: true,
          offer: { include: { paymentMethod: true } },
          chat: { include: { messages: true, participants: true } },
        },
      });

      const sellserNotification = await db.notification.create({
        data: {
          title: "Funds Released 🎉",
          message: `Trade with buyer ${trade?.buyer?.username} is now in dispute and the trade has been paused`,
          category: "TRADE",
          data: { tradeId: tradeId },
          read: false,
          userId: updatedTrade.buyerId,
        },
      });

      const buyerNotification = await db.notification.create({
        data: {
          title: "Funds Released 🎉",
          message: `Trade with seller ${trade?.seller?.username} is now in dispute and the trade has been paused`,
          category: "TRADE",
          data: { tradeId: tradeId },
          read: false,
          userId: updatedTrade.buyerId,
        },
      });

      const io = req.app.get("io");
      if (io) {
        io.to(trade?.buyerId).emit("new_notification", buyerNotification);

        // ✅ Notify the seller
        io.to(trade.sellerId).emit("new_notification", sellserNotification);
      }

      return res.status(201).json({
        success: true,
        message: "Dispute created successfully",
        trade: updatedTrade,
      });
    } catch (err) {
      console.error("❌ Create dispute error:", err);
      res.status(500).json({ error: true, message: "Internal server error" });
    }
  }
);

module.exports = router;
