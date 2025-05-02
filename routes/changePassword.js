const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const bcrypt = require("bcryptjs");
const { isAuthenticated } = require("../middlewares/index");

const { findUserByEmail } = require("../utils/users");

const { db } = require("../db");

const router = express.Router();

router.put("/", isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: true, message: "Provide current and new password" });
  }
  try {
    const user = await db.user.findUnique({
      where: {
        email: req.payload.email,
      },
    });
    if (!user) {
      return res.status(400).json({
        error: true,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        error: true,
        message: "Current password is incorrect",
      });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    const updateUser = await db.user.update({
      where: {
        email: req.payload.email,
      },
      data: {
        password: hashPassword,
      },
    });
    if (updateUser) {
      return res
        .status(200)
        .json({ success: true, message: "Password updated successfully" });
    }
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
