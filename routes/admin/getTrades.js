const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Get all trades (Admin only)
router.get("/", isAdmin, async (req, res) => {
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  try {
    // Fetch all trades
    const trades = await db.trade.findMany({
      include: {
        buyer: true, // include user details if you have relations
        seller: true,
        offer: true,
      },
      orderBy: { createdAt: "desc" }, // newest trades first
    });

    return res.json({
      success: true,
      count: trades.length,
      trades,
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
