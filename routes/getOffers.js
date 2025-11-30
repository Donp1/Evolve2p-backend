// routes/offers.js
const express = require("express");
const { db } = require("../db");
const { getPricesForOffer } = require("../utils/coin");

const router = express.Router();

// GET /offers - Fetch offers with filters, sorting, pricing
router.get("/", async (req, res) => {
  try {
    const {
      type, // BUY / SELL (user’s perspective)
      crypto, // BTC / USDT / ETH
      currency, // NGN / USD / GHS
      status, // ACTIVE / INACTIVE
      paymentMethod, // Single or array
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filters = {};

    // ✅ Correct Buy/Sell logic:
    // If user wants to BUY → show SELL offers
    // If user wants to SELL → show BUY offers
    if (type) {
      const t = type.toUpperCase();
      filters.type = t === "BUY" ? "SELL" : "BUY";
    }

    if (crypto) filters.crypto = crypto.toUpperCase();
    if (currency) filters.currency = currency.toUpperCase();
    if (status) filters.status = "ACTIVE";

    // Payment method filter
    if (paymentMethod && paymentMethod?.length > 0) {
      const methodArray = Array.isArray(paymentMethod)
        ? paymentMethod
        : [paymentMethod];

      filters.paymentMethod = {
        id: { in: methodArray },
      };
    }

    // Fetch offers
    const offers = await db.offer.findMany({
      where: filters,
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

    const totalOffers = await db.offer.count({ where: filters });

    if (!offers.length) {
      return res.json({
        data: [],
        meta: { total: totalOffers },
      });
    }

    // Get unique fiat currencies
    const uniqueCurrencies = [
      ...new Set(offers.map((o) => o.currency.toUpperCase())),
    ];

    // Fetch prices for these currencies
    const prices = await getPricesForOffer(uniqueCurrencies);

    // Attach pricing
    const offersWithPrice = offers.map((offer) => {
      const fiat = offer.currency.toUpperCase();
      const coin = offer.crypto.toUpperCase();

      const basePrice = prices?.[coin]?.[fiat] || 0;

      // Apply margin
      const finalPrice = basePrice * (1 + offer.margin / 100);

      return {
        ...offer,
        basePrice,
        finalPrice,
      };
    });

    return res.json({
      data: offersWithPrice,
      meta: { total: totalOffers },
    });
  } catch (err) {
    console.error("❌ Failed fetching offers:", err);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

module.exports = router;
