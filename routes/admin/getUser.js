const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.get("/:userId", isAdmin, async (req, res) => {
  const { userId } = req.params;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!userId) {
    return res
      .status(404)
      .json({ error: true, message: "No User ID provided" });
  }
  try {
    // ✅ Fetch users
    const user = await db.user.findFirst({
      where: {
        id: userId,
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

      include: {
        offers: {
          include: { paymentMethod: true },
        },
        tradesAsBuyer: true,
        tradesAsSeller: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: true, message: "Invalid User ID provided" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return res
      .status(500)
      .json({ error: true, message: error.message || "Internal server error" });
  }
});

module.exports = router;
