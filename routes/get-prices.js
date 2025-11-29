const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { redis } = require("../utils/redis");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await redis.get("crypto_prices"); // get the key

    if (!data)
      return res
        .status(400)
        .json({ error: true, message: "Unable to get prices" }); // key does not exist or expired

    const prices = JSON.parse(data); // parse JSON back to object

    return res.status(200).json({ success: true, prices });
  } catch (err) {
    console.error("Error fetching crypto prices from Redis:", err);
    return res
      .status(400)
      .json({ error: true, message: "Unable to get prices" });
  }
});

module.exports = router;
