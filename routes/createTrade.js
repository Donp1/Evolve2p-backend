const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { getMarketPrice } = require("../utils/crypto");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { offerId, amountFiat } = req.body;
  const { userId: buyerId } = req.payload;

  try {
    const offer = await db.offer.findUnique({ where: { id: offerId } });
    if (!offer)
      return res.status(404).json({ error: true, message: "Offer not found" });
    if (buyerId === offer.userId)
      return res
        .status(400)
        .json({ error: true, message: "Cannot trade with your own offer" });

    //    1. Get market price in offer.currency
    const marketPrice = await getMarketPrice(offer.crypto, offer.currency);
    const tradePrice = marketPrice + marketPrice * (offer.margin / 100);

    // 2. Validate fiat amount
    if (amountFiat < offer.minLimit || amountFiat > offer.maxLimit) {
      return res
        .status(400)
        .json({ error: true, message: "Trade amount outside offer limits" });
    }

    // 3. Calculate crypto amount
    const amountCrypto = amountFiat / tradePrice;

    // 4. Lock seller's crypto
    const sellerId = offer.userId;
    const sellerBalance = await db.wallet.findFirst({
      where: { userId: sellerId, currency: offer.crypto },
    });
    if (!sellerBalance || sellerBalance.balance < amountCrypto) {
      return res
        .status(400)
        .json({ error: true, message: "Seller does not have enough balance" });
    }

    await db.wallet.update({
      where: { id: sellerBalance.id },
      data: { balance: { decrement: amountCrypto } },
    });

    // 5. Create trade
    await db.$transaction([
      db.wallet.update({
        where: { id: sellerBalance.id },
        data: { balance: { decrement: amountCrypto } },
      }),
      db.trade.create({
        data: {
          offerId,
          buyerId,
          sellerId,
          amountCrypto, // escrowed
          amountFiat,
          status: "PENDING",
        },
      }),
    ]);

    return res.status(201).json({
      success: true,
      message: "Trade created successfully, Please proceed with payment.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});
module.exports = router;
