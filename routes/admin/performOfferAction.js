const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

router.post("/", isAdmin, async (req, res) => {
  const { actionType, offerId } = req.body;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!offerId) {
    return res
      .status(404)
      .json({ error: true, message: "No offer ID provided" });
  }

  try {
    // ✅ Fetch offer
    const offer = await db.offer.findFirst({
      where: {
        id: offerId,
      },
    });

    if (!offer) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid Offer ID provided" });
    }

    const updateOffer = await db.offer.update({
      where: { id: offerId },
      data: { status: actionType == "active" ? "ACTIVE" : "INACTIVE" },
    });

    if (!updateOffer) {
      return res
        .status(400)
        .json({ error: true, message: "Unable to update offer status" });
    }

    if (updateUser) {
      return res
        .status(200)
        .json({ success: true, message: "Offer Status updated successfully" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
