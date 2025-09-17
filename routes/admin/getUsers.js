const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.get("/", isAdmin, async (req, res) => {
  try {
    // ✅ Ensure the token payload has admin flag
    if (!req.payload || !req.payload.isAdmin) {
      return res
        .status(403)
        .json({ error: true, message: "Forbidden: Admin access required" });
    }

    // ✅ Fetch users
    const users = await db.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        username: true,
        country: true,
        kycVerified: true,
        status: true,
        createdAt: true,
        phone: true,
        DOB: true,
        is2faEnabled: true,
      },
    });

    return res.status(200).json({
      error: false,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || "Internal server error" });
  }
});

module.exports = router;
