const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { convertCryptoToFiat } = require("../utils/crypto");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { userId } = req.payload;
  const {
    type,
    crypto,
    currency,
    margin,
    paymentMethod,
    minLimit,
    maxLimit,
    paymentTerms,
    paymentTime,
  } = req.body;

  if (!userId) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  if (!type || !["buy", "sell"].includes(type)) {
    return res
      .status(400)
      .json({ error: true, message: "Type must be 'buy' or 'sell'" });
  }

  if (margin === undefined || isNaN(margin)) {
    return res.status(400).json({ error: "Margin is required " });
  }

  if (!crypto)
    return res.status(400).json({ error: true, message: "crypto is required" });
  if (!currency)
    return res
      .status(400)
      .json({ error: true, message: "currency is required" });

  if (!paymentMethod)
    return res
      .status(400)
      .json({ error: true, message: "Payment method is required" });
  if (!paymentTime)
    return res
      .status(400)
      .json({ error: true, message: "Payment time is required" });

  if (!minLimit || !maxLimit || minLimit <= 0 || maxLimit <= 0) {
    return res.status(400).json({
      error: true,
      message: "Min and max limits must be greater than 0",
    });
  }
  if (minLimit > maxLimit) {
    return res.status(400).json({
      error: true,
      message: "Min limit cannot be greater than max limit",
    });
  }

  try {
    // const amountFiat = await convertCryptoToFiat(
    //   String(crypto).toUpperCase(),
    //   amountCrypto,
    //   String(currency).toUpperCase()
    // );

    const offer = await db.offer.create({
      data: {
        type: String(type)?.toUpperCase(),
        crypto: String(crypto).toUpperCase(),
        currency,
        margin: Number(margin),
        paymentMethod: { connect: { id: paymentMethod } },
        status: "ACTIVE",
        user: { connect: { id: userId } },
        maxLimit: Number(maxLimit),
        minLimit: Number(minLimit),
        terms: paymentTerms,
        time: paymentTime,
      },
    });

    if (offer) {
      const notification = await db.notification.create({
        data: {
          category: "SYSTEM",
          title: "Offer Created",
          message: `Your offer to ${type} ${crypto} has been created successfully.`,
          read: false,
          userId: userId,
        },
      });

      const io = req.app.get("io");
      if (io) {
        io.to(userId).emit("new_notification", notification);
      }

      return res
        .status(201)
        .json({ success: true, message: "Offer created successfully", offer });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: true, message: error?.message });
  }
});

module.exports = router;
