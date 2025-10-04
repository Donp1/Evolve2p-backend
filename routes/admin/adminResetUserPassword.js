const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

router.post("/", isAdmin, async (req, res) => {
  const { password, userId } = req.body;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!userId) {
    return res
      .status(400)
      .json({ error: true, message: "No User ID provided" });
  }

  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "No password provided" });
  }

  // ✅ simplified regex for strong password
  const strongPassword =
    /^(?=.{6,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

  if (!strongPassword.test(password)) {
    return res.status(400).json({
      error: true,
      message:
        "Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
    });
  }

  try {
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid User ID provided" });
    }

    const securePassword = await bcrypt.hash(password, 10);

    const updatedPassword = await db.user.update({
      where: { id: user.id },
      data: { password: securePassword },
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
