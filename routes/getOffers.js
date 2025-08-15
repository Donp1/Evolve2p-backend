// routes/offers.js
const express = require("express");
const { db } = require("../db");
const router = express.Router();

// GET /offers - Fetch offers with pagination, filters, and payment method
router.get("/", async (req, res) => {
  try {
    const {
      type,
      crypto,
      currency,
      status,
      paymentMethod,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Convert pagination params
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(Math.max(parseInt(limit), 1), 100);

    // Build filters
    const filters = {};
    if (type) filters.type = type.toUpperCase();
    if (crypto) filters.crypto = crypto.toUpperCase();
    if (currency) filters.currency = currency.toUpperCase();
    if (status) filters.status = status.toUpperCase();

    // Payment method filter (relation)
    if (paymentMethod) {
      filters.paymentMethod = {
        name: { equals: paymentMethod, mode: "insensitive" },
      };
    }

    // Query DB
    const offers = await db.offer.findMany({
      where: filters,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { [sortBy]: order.toLowerCase() },
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

    // Total count
    const totalOffers = await db.offer.count({ where: filters });

    res.json({
      data: offers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: totalOffers,
        totalPages: Math.ceil(totalOffers / limitNum),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

module.exports = router;
