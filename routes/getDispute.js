// routes/disputes.js
const express = require("express");
const { isAuthenticated, isAdmin } = require("../middlewares");
const { db } = require("../db");

const router = express.Router();

router.get("/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.payload; // role can be 'USER' or 'ADMIN'
  console.log(role);

  try {
    // Find dispute
    const dispute = await db.dispute.findUnique({
      where: { id },
      include: {
        trade: {
          include: {
            buyer: { select: { id: true, username: true } },
            seller: { select: { id: true, username: true } },
          },
        },
        user: { select: { id: true, username: true } }, // who opened the dispute
      },
    });

    if (!dispute) {
      return res
        .status(404)
        .json({ error: true, message: "Dispute not found" });
    }

    // Ensure only buyer, seller, or admin can view
    if (
      dispute.trade.buyer.id !== userId &&
      dispute.trade.seller.id !== userId &&
      role !== "ADMIN"
    ) {
      return res.status(403).json({
        error: true,
        message: "You are not authorized to view this dispute",
      });
    }

    return res.json({
      success: true,
      dispute,
    });
  } catch (err) {
    console.error("❌ Get dispute error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
