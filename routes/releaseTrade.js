const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { convertCryptoToFiat } = require("../utils/crypto");
const { releaseTrade } = require("../utils/users");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { tradeId } = req.body;
    const { userId } = req.payload;

    const trade = await db.trade.findUnique({ where: { id: tradeId } });
    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });
    if (trade.sellerId !== userId)
      return res.status(403).json({
        error: true,
        message: "You are not authorized to release this escrow",
      });
    if (trade.status !== "PAID")
      return res
        .status(400)
        .json({ error: true, message: "Trade is not PAID" });

    await releaseTrade(tradeId);

    res.json({ success: true, message: "Escrow released successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: "Failed to release escrow" });
  }
});
module.exports = router;
