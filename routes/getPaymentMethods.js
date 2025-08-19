const express = require("express");
const { db } = require("../db");
const router = express.Router();

// GET all payment methods
router.get("/", async (req, res) => {
  try {
    const paymentMethods = await db.paymentMethod.findMany({
      orderBy: { name: "asc" }, // optional: sort alphabetically
    });

    return res.json({
      success: true,
      count: paymentMethods.length,
      data: paymentMethods,
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return res.status(500).json({
      error: true,
      message: "Failed to fetch payment methods",
    });
  }
});

module.exports = router;
