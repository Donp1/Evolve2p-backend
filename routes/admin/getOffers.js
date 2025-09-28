const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Get all offers (Admin only)
router.get("/", isAdmin, async (req, res) => {
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  try {
    // Fetch all offers
    const offers = await db.offer.findMany({
      orderBy: { createdAt: "desc" }, // optional: newest first
    });

    return res.json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
