const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Get all payment methods + number of offers (Admin only)
router.get("/", isAdmin, async (req, res) => {
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  try {
    const paymentMethods = await db.paymentMethod.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { offers: true },
        },
      },
    });

    // Format response: include count instead of raw relation
    const formatted = paymentMethods.map((pm) => ({
      id: pm.id,
      name: pm.name,
      createdAt: pm.createdAt,
      offersCount: pm._count.offers,
    }));

    return res.status(200).json({ success: true, paymentMethods: formatted });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
