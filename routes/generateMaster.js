const express = require("express");
const { generateETHWallet } = require("../generateWallet");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const masterInfo = await generateETHWallet();

    return res.status(200).json({
      error: false,
      message: "Master wallet generated successfully",
      data: masterInfo,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "An error occurred while generating master wallet",
    });
  }
});

module.exports = router;
