// routes/disputes.js
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const { isAuthenticated } = require("../middlewares");
const { db } = require("../db");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { userId } = req.payload;
  const { token } = req.body;

  if (!userId || !token) {
    return res
      .status(400)
      .json({ error: true, message: "userId and token are required" });
  }

  try {
    const existing = await db.pushToken.findUnique({
      where: { token },
    });

    if (!existing) {
      await db.pushToken.create({
        data: {
          token,
          userId,
        },
      });
    } else if (existing.userId !== userId) {
      // Token exists but belongs to another user → reassign
      await db.pushToken.update({
        where: { token },
        data: { userId },
      });
    }

    res.json({
      success: true,
      message: "Token saved successfully",
      data: existing,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: "Failed to save token" });
  }
});

module.exports = router;
