const dotenv = require("dotenv");
dotenv.config();

const express = require("express");

const router = express.Router();

module.exports = (io) => {
  router.post("/", (req, res) => {
    const webHookData = req.body;
    return res.json({ data: webHookData });
  });

  return router;
};
