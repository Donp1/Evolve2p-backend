const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.get("/:offerId", isAdmin, async (req, res) => {
  const { offerId } = req.params;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!offerId) {
    return res
      .status(404)
      .json({ error: true, message: "No Offer ID provided" });
  }
  try {
    // ✅ Fetch users
    const offer = await db.offer.findFirst({
      where: {
        id: offerId,
      },
      include: {
        paymentMethod: true,
        user: { select: { username: true, email: true, id: true } },
      },
    });

    if (!offer) {
      return res
        .status(404)
        .json({ error: true, message: "Invalid Offer ID provided" });
    }

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message || "Internal server error" });
  }
});

module.exports = router;
