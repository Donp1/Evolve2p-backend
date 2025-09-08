// routes/offers.js
const express = require("express");
const { db } = require("../db");
const { isAuthenticated } = require("../middlewares");
const router = express.Router();

// GET /offers - Fetch offers with pagination, filters, and payment method
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.body;
    // Query DB
    const offers = await db.offer.findMany({
      where: {
        userId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        crypto: true,
        currency: true,
        margin: true,
        minLimit: true,
        maxLimit: true,
        status: true,
        time: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      offers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

module.exports = router;
