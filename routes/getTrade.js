const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");

const router = express.Router();

router.get("/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.payload;

  try {
    const trade = await db.trade.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
        offer: true,
        escrow: true,
      },
    });

    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });
    // Optional visibility constraint:
    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      return res.status(403).json({ error: true, message: "Not allowed" });
    }

    res.json({ success: true, data: trade });
  } catch (err) {
    console.error("❌ Get trade error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
