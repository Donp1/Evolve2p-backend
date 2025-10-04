const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.get("/:tradeId", isAdmin, async (req, res) => {
  const { tradeId } = req.params;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!tradeId) {
    return res
      .status(404)
      .json({ error: true, message: "No Trade ID provided" });
  }
  try {
    // ✅ Fetch users
    const trade = await db.trade.findFirst({
      where: {
        id: tradeId,
      },
      include: {
        buyer: { select: { id: true, email: true, username: true } },
        seller: { select: { id: true, email: true, username: true } },
        offer: true,
      },
    });

    if (!trade) {
      return res
        .status(404)
        .json({ error: true, message: "Invalid Trade ID provided" });
    }

    return res.status(200).json({
      success: true,
      trade,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message || "Internal server error" });
  }
});

module.exports = router;
