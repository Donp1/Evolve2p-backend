// routes/offers.js
const express = require("express");
const { db } = require("../db");
const { fetchAllPrices } = require("../utils");
const { getPricesForOffer } = require("../utils/coin");
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

    // ✅ Invert type logic (if BUY → fetch SELL, if SELL → fetch BUY)
    if (type) {
      const normalized = type.toUpperCase();
      filters.type = normalized === "BUY" ? "SELL" : "BUY";
    }

    if (crypto) filters.crypto = crypto.toUpperCase();
    if (currency) filters.currency = currency.toUpperCase();
    if (status) filters.status = status.toUpperCase();

    // ✅ Payment method filter (supports array)
    if (paymentMethod) {
      const methods = Array.isArray(paymentMethod)
        ? paymentMethod
        : [paymentMethod]; // normalize into array

      filters.paymentMethod = {
        id: {
          in: methods,
        },
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

    const uniqueCurrencies = [
      ...new Set(offers.map((o) => o.currency.toUpperCase())),
    ];

    const prices = await getPricesForOffer(uniqueCurrencies);

    // console.log(prices);

    const offersWithPrice = offers.map((offer) => {
      const fiat = offer.currency.toUpperCase();
      const crypto = offer.crypto.toUpperCase();

      // Base price of crypto in this fiat currency
      const basePrice = prices[crypto]?.[fiat] || 0;

      // console.log(prices[crypto]);

      // Apply margin
      const finalPrice = basePrice * (1 + offer.margin / 100);

      return {
        ...offer,
        basePrice,
        finalPrice,
      };
    });

    // Total count
    const totalOffers = await db.offer.count({ where: filters });

    res.json({
      data: offersWithPrice,
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
