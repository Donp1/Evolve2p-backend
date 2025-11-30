const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { redis } = require("../utils/redis");
const { getPricesForOffer } = require("../utils/coin");

const router = express.Router();

router.get("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ error: true, message: "Code is required" });
    }

    // get the price
    const prices = await getPricesForOffer([String(code).toUpperCase()]);

    if (!prices) {
      return res
        .status(400)
        .json({ error: true, message: "Unable to get prices" });
    }

    return res.status(200).json({ success: true, prices });
  } catch (err) {
    console.error("Error fetching crypto prices from Redis:", err);
    return res
      .status(400)
      .json({ error: true, message: "Unable to get prices" });
  }
});

module.exports = router;
