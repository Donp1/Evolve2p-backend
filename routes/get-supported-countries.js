const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { redis } = require("../utils/redis");
const { getSupportedCountries } = require("../utils/coin");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const countriesData = await getSupportedCountries();

    if (!countriesData) {
      return res.status(400).json({
        error: true,
        message: "Error getting supported countries data",
      });
    }

    return res.status(200).json({ success: true, countriesData });
  } catch (error) {
    console.log("Error getting supported countries data: ", error);
    return res
      .status(400)
      .json({ error: true, message: "Error getting supported countries data" });
  }
});

module.exports = router;
