const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Get all transactions (Admin only)
router.get("/", isAdmin, async (req, res) => {
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  try {
    const transactions = await db.transaction.findMany({
      orderBy: { createdAt: "desc" }, // newest first
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        wallet: {
          select: {
            id: true,
            currency: true,
            balance: true,
          },
        },
      },
    });

    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
