const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { convertCryptoToFiat } = require("../utils/crypto");
const { releaseTrade } = require("../utils/users");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { tradeId, action } = req.body; // "release_to_buyer" or "refund_to_seller"
    const { userId } = req.payload;

    // Ensure only admins can do this
    const admin = await db.user.findUnique({ where: { id: userId } });
    if (!admin || admin.role !== "ADMIN")
      return res.status(403).json({ error: true, message: "Unauthorized" });

    const trade = await db.trade.findUnique({
      where: { id: tradeId },
      include: { offer: true },
    });
    if (!trade || trade.status !== "DISPUTED")
      return res
        .status(400)
        .json({ error: true, message: "Trade is not in dispute" });

    if (action === "release_to_buyer") {
      // Move escrow to buyer
      await db.$transaction([
        db.wallet.update({
          where: {
            userId: trade.buyerId,
            currency: trade.offer.crypto,
          },
          data: { balance: { increment: trade.amountCrypto } },
        }),
        db.trade.update({
          where: { id: tradeId },
          data: { status: "COMPLETED", escrowReleased: true },
        }),
      ]);
    } else if (action === "refund_to_seller") {
      // Refund escrow to seller
      await prisma.$transaction([
        prisma.wallet.update({
          where: {
            userId: trade.sellerId,
            asset: trade.offer.crypto,
          },
          data: { balance: { increment: trade.amountCrypto } },
        }),
        db.trade.update({
          where: { id: tradeId },
          data: { status: "CANCELLED", escrowReleased: false },
        }),
      ]);
    } else {
      return res.status(400).json({ error: true, message: "Invalid action" });
    }

    res.json({ success: true, message: "Dispute resolved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Failed to resolve dispute" });
  }
});

module.exports = router;
