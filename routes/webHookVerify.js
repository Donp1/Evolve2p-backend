const dotenv = require("dotenv");
dotenv.config();

const express = require("express");

const router = express.Router();

module.exports = (io) => {
  router.post("/", (req, res) => {
    const webHookData = req.body;
    console.log(webHookData);

    io.emit("kyc-completed", {
      data: webHookData,
      status: "completed",
      message: "KYC verification is completed.",
    });
    return res.json({ data: webHookData });
  });

  return router;
};
