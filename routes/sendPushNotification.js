// routes/disputes.js
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const { isAuthenticated } = require("../middlewares");
const { db } = require("../db");
const fetch = require("node-fetch");
const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { userId, title, body } = req.body;

  if (!userId || !title || !body) {
    return res
      .status(400)
      .json({ error: "userId, title and body are required" });
  }

  try {
    const tokens = await db.pushToken.findMany({
      where: { userId },
    });

    if (!tokens.length) {
      return res.json({ success: false, message: "No tokens for user" });
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const data = await response.json();

    // 🔹 Clean up invalid tokens
    if (data.data) {
      for (let i = 0; i < data.data.length; i++) {
        if (
          data.data[i].status === "error" &&
          data.data[i].details?.error === "DeviceNotRegistered"
        ) {
          await db.pushToken.delete({
            where: { token: messages[i].to },
          });
          console.log("Removed invalid token:", messages[i].to);
        }
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: "Failed to save token" });
  }
});

module.exports = router;
