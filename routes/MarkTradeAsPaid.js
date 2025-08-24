const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");

const router = express.Router();

router.post("/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.payload;

  try {
    const trade = await db.trade.findUnique({ where: { id } });
    if (!trade)
      return res.status(404).json({ error: true, message: "Trade not found" });
    if (trade.buyerId !== userId) {
      return res
        .status(403)
        .json({ error: true, message: "Only buyer can mark paid" });
    }
    if (trade.status !== "PENDING") {
      return res
        .status(400)
        .json({ error: true, message: "Trade not in PENDING state" });
    }

    const updated = await db.trade.update({
      where: { id },
      data: { status: "PAID" },
    });

    res.json({ success: true, message: "Marked as paid", trade: updated });
  } catch (err) {
    console.error("❌ Mark paid error:", err);
    res.status(500).json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
