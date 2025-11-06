const express = require("express");
const {
  generateETHWallet,
  generateBTCWallet,
  generateBSCWallet,
  generateTRONWallet,
} = require("../utils/crypto");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const ethInfo = await generateETHWallet();
    const btcInfo = await generateBTCWallet();
    const bscInfo = await generateBSCWallet();
    const tronInfo = await generateTRONWallet();

    return res.status(200).json({
      error: false,
      message: "Master wallet generated successfully",
      data: {
        ETH: ethInfo,
        BTC: btcInfo,
        BSC: bscInfo,
        TRON: tronInfo,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "An error occurred while generating master wallet",
    });
  }
});

module.exports = router;
