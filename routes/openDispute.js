const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { convertCryptoToFiat } = require("../utils/crypto");
const { releaseTrade } = require("../utils/users");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { tradeId, reason } = req.body;
    const { userId } = req.payload;

    const trade = await db.trade.findUnique({ where: { id: tradeId } });
    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });
    if (![trade.buyerId, trade.sellerId].includes(userId))
      return res
        .status(403)
        .json({ error: true, message: "You are not part of this trade" });
    if (trade.status !== "PAID")
      return res.status(400).json({
        error: true,
        message: "Dispute can only be opened for PAID trades",
      });

    await db.trade.update({
      where: { id: tradeId },
      data: { status: "DISPUTED" },
    });

    // Optionally store reason in a separate Dispute table
    await db.dispute.create({
      data: { tradeId, openedBy: userId, reason },
    });

    res.json({ success: true, message: "Dispute opened successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Failed to open dispute" });
  }
});

module.exports = router;
