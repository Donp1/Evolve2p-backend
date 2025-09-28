const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Delete payment method (Admin only)
router.delete("/:id", isAdmin, async (req, res) => {
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      error: true,
      message: "Payment method ID is required",
    });
  }

  try {
    // Check if exists
    const existing = await db.paymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        error: true,
        message: "Payment method not found",
      });
    }

    // Delete the payment method
    await db.paymentMethod.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Payment method deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
