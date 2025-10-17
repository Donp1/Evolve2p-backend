const express = require("express");
const { emailQueue } = require("../../utils");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.post("/", isAdmin, async (req, res) => {
  const { subject, title, message } = req.body;

  if (!subject || !title || !message) {
    return res.status(400).json({ error: true, message: "Missing fields" });
  }

  try {
    const users = await db.user.findMany({
      where: { emailVerified: true },
      select: { email: true },
    });

    if (!users.length) {
      return res.status(404).json({ error: true, message: "No users found" });
    }

    // Add jobs to queue
    await Promise.all(
      users.map((user) =>
        emailQueue.add("send-email", {
          email: user.email,
          subject,
          title,
          message,
        })
      )
    );

    return res.status(202).json({
      success: true,
      message: `Queued ${users.length} emails for sending.`,
    });
  } catch (error) {
    console.error("❌ Bulk email error:", error);
    return res.status(500).json({ error: true, message: "Server error" });
  }
});
