const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// ✅ Delete Offer (Admin only)
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
      message: "Offer ID is required",
    });
  }

  try {
    // Check if exists
    const existing = await db.offer.findFirst({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        error: true,
        message: "Offer not found",
      });
    }

    // Delete the payment method
    await db.offer.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
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
