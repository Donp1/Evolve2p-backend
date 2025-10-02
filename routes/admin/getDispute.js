const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.get("/:disputeId", isAdmin, async (req, res) => {
  const { disputeId } = req.params;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!disputeId) {
    return res
      .status(404)
      .json({ error: true, message: "No Dispute ID provided" });
  }
  try {
    // ✅ Fetch users
    const dispute = await db.dispute.findFirst({
      where: {
        id: disputeId,
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        trade: {
          include: {
            buyer: true,
            seller: true,
            offer: true,
            chat: {
              include: { messages: true },
            },
          },
        },
      },
    });

    if (!dispute) {
      return res
        .status(404)
        .json({ error: true, message: "Invalid Dispute ID provided" });
    }

    return res.status(200).json({
      success: true,
      dispute,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message || "Internal server error" });
  }
});

module.exports = router;
