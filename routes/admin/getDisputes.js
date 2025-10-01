const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Get all active disputes (Admin only)
router.get("/", isAdmin, async (req, res) => {
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  try {
    const disputes = await db.dispute.findMany({
      include: {
        trade: {
          select: {
            id: true,
            buyerId: true,
            sellerId: true,
            amount: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, disputes });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
