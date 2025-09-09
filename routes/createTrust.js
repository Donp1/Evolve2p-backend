// routes/offers.js
const express = require("express");
const { db } = require("../db");
const { isAuthenticated } = require("../middlewares");
const router = express.Router();

// POST /trust/:userId - trust someone
router.post("/", isAuthenticated, async (req, res) => {
  const { trustedId } = req.body;
  const { userId: trusterId } = req.payload;

  if (trusterId === trustedId) {
    return res.status(400).json({ error: "You cannot trust yourself" });
  }

  try {
    // Prevent duplicate trusts
    const existing = await db.trust.findFirst({
      where: { trusterId, trustedId },
    });

    if (existing) {
      return res.status(400).json({ error: "Already trusted" });
    }

    await db.trust.create({
      data: { trusterId, trustedId },
    });

    return res.status(200).json({
      success: true,
      message: "You have successfully trusted this user.",
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
