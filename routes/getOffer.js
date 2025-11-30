const express = require("express");
const { db } = require("../db");
const { fetchAllPrices } = require("../utils"); // make sure you import the function
const { getPricesForOffer } = require("../utils/coin");
const router = express.Router();

// GET a specific offer with user details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await db.offer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        paymentMethod: true,
      },
    });

    if (!offer) {
      return res.status(404).json({ error: true, message: "Offer not found" });
    }

    // Fetch price for this single offer
    const fiat = offer.currency.toUpperCase();
    const crypto = offer.crypto.toUpperCase();
    const prices = await getPricesForOffer([fiat]); // pass only relevant fiat

    const basePrice = prices[crypto]?.[fiat] || 0;
    const finalPrice = basePrice * (1 + offer.margin / 100);

    const offerWithPrice = {
      ...offer,
      basePrice,
      finalPrice,
    };

    res.json({ offer: offerWithPrice, success: true });
  } catch (error) {
    console.error("Error fetching offer:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
