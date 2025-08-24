// routes/disputes.js
const express = require("express");
const { isAuthenticated } = require("../middlewares");
const { db } = require("../db");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { tradeId, reason, evidence } = req.body;
  const { userId } = req.payload; // from JWT

  try {
    // Validate input
    if (!tradeId || !reason) {
      return res
        .status(400)
        .json({ error: true, message: "tradeId and reason are required" });
    }

    // Find trade
    const trade = await db.trade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      return res.status(404).json({ error: true, message: "Trade not found" });
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

    // Create dispute
    const dispute = await db.dispute.create({
      data: {
        tradeId,
        openedBy: userId,
        reason,
        evidence: evidence || null,
      },
      include: { trade: true },
    });

    // Update trade status to DISPUTED
    await db.trade.update({
      where: { id: tradeId },
      data: { status: "DISPUTED" },
    });

    return res.status(201).json({
      success: true,
      message: "Dispute created successfully",
      dispute,
    });
  } catch (err) {
    console.error("❌ Create dispute error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
