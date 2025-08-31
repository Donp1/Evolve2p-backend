const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { getMarketPrice } = require("../utils/crypto");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { offerId, amountFiat, amountCrypto } = req.body;
  const { userId: buyerId } = req.payload;

  try {
    if (
      !offerId ||
      !amountFiat ||
      amountFiat <= 0 ||
      !amountCrypto ||
      amountCrypto <= 0
    ) {
      return res.status(400).json({ error: true, message: "Invalid request" });
    }

    const offer = await db.offer.findUnique({
      where: { id: offerId },
      include: { user: true, paymentMethod: true },
    });

    if (!offer)
      return res.status(404).json({ error: true, message: "Offer not found" });
    if (buyerId === offer.userId) {
      return res
        .status(400)
        .json({ error: true, message: "Cannot trade with your own offer" });
    }
    if (offer.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ error: true, message: "Offer is not active" });
    }
    if (amountFiat < offer.minLimit || amountFiat > offer.maxLimit) {
      return res
        .status(400)
        .json({ error: true, message: "Trade amount outside offer limits" });
    }

    // Price per 1 unit crypto in offer.currency, then apply margin
    const marketPrice = await getMarketPrice(offer.crypto, offer.currency);
    if (!marketPrice) {
      return res
        .status(500)
        .json({ error: true, message: "Unable to fetch price" });
    }

    // Ensure seller has enough crypto
    const sellerId = offer.userId;

    const sellerWallet = await db.wallet.findFirst({
      where: { userId: sellerId, currency: offer.crypto },
    });

    if (Number(sellerWallet.balance) < amountCrypto) {
      return res
        .status(400)
        .json({ error: true, message: "Seller does not have enough balance" });
    }

    // Transaction: decrement seller balance, create trade + escrow
    const result = await db.$transaction(
      async (tx) => {
        // Deduct from seller (lock)
        await tx.wallet.update({
          where: { id: sellerWallet.id },
          data: { balance: { decrement: amountCrypto } },
        });

        // Create trade
        const trade = await tx.trade.create({
          data: {
            offerId,
            buyerId,
            sellerId,
            amountCrypto: Number(amountCrypto),
            amountFiat: Number(amountFiat),
            status: "PENDING", // PENDING → PAID → COMPLETED or CANCELED
            escrowReleased: false,
          },
        });

        // Create escrow row
        await tx.escrow.create({
          data: {
            tradeId: trade.id,
            sellerId,
            crypto: offer.crypto.toUpperCase(),
            amount: amountCrypto,
          },
        });

        return trade;
      },
      {
        timeout: 15000, // 15 seconds
        maxWait: 5000, // how long Prisma waits to acquire a transaction slot
      }
    );

    const newChat = await db.chat.create({
      data: {
        tradeId: result.id,
        participants: {
          create: [
            { userId: buyerId, role: "BUYER" },
            { userId: sellerId, role: "SELLER" },
          ],
        },
        messages: {
          create: [
            {
              senderId: null,
              type: "SYSTEM",
              content: `You're buying ${result.amountCrypto} ${offer.crypto} for ${result.amountFiat} ${offer.currency} via ${offer.paymentMethod.name}. The ${result.amountCrypto} ${offer.crypto} is now in escrow and it's safe to make your payment.`,
            },
            {
              type: "SYSTEM",
              content:
                "Third-party payment s are not accepted for this trade. The selected bank accounts must belong to the buyer and seller respectively.",
              senderId: null,
            },
            {
              type: "SYSTEM",
              content:
                "Please wait for the seller to share their bank account details.",
              senderId: null,
            },
          ],
        },
      },
      include: {
        participants: true,
        messages: true,
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(buyerId).emit("new_trade", result);

      // ✅ Notify the seller
      io.to(sellerId).emit("new_trade", result);
    }

    return res.status(201).json({
      success: true,
      message: "Trade created. Please proceed with payment.",
      trade: result,
    });
  } catch (err) {
    console.error("❌ Create trade error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});
module.exports = router;
