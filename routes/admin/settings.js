const express = require("express");
const { isAdmin } = require("../../middlewares"); // optional if you have admin auth middleware
const { db } = require("../../db");

const router = express.Router();

/**
 * GET /api/admin/settings
 * Fetch current settings (Admin only)
 */
router.get("/", async (req, res) => {
  try {
    let settings = await db.settings.findFirst();

    // ✅ Create a default record if none exists
    if (!settings) {
      settings = await db.settings.create({ data: {} });
    }

    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({
      error: true,
      message: "Failed to fetch settings",
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update any settings field (Admin only)
 */
router.put("/", isAdmin, async (req, res) => {
  try {
    const {
      withdrawalLimit,
      depositLimit,
      sendCryptoFee,
      tradingFee,
      maintenanceMode,
      supportEmail,
      supportPhoneNumber,
    } = req.body;

    const existing = await db.settings.findFirst();

    if (!existing) {
      return res.status(404).json({
        error: true,
        message: "Settings not found",
      });
    }

    const updated = await db.settings.update({
      where: { id: existing.id },
      data: {
        withdrawalLimit,
        depositLimit,
        sendCryptoFee,
        tradingFee,
        maintenanceMode,
        supportEmail,
        supportPhoneNumber,
      },
    });

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings: updated,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      error: true,
      message: "Failed to update settings",
    });
  }
});

module.exports = router;
