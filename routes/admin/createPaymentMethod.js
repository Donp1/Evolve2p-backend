const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Add new payment method (Admin only)
router.post("/", isAdmin, async (req, res) => {
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res
      .status(400)
      .json({ error: true, message: "Payment method name is required" });
  }

  try {
    // Check if it already exists
    const existing = await db.paymentMethod.findUnique({
      where: { name },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: true, message: "Payment method already exists" });
    }

    const paymentMethod = await db.paymentMethod.create({
      data: { name },
    });

    return res.status(201).json({
      success: true,
      message: "Payment method added successfully",
      paymentMethod,
    });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
