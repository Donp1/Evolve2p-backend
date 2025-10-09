const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.get("/:transactionId", isAdmin, async (req, res) => {
  const { transactionId } = req.params;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!transactionId) {
    return res
      .status(404)
      .json({ error: true, message: "No Transaction ID provided" });
  }
  try {
    // ✅ Fetch users
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
      },
      include: {
        user: {
          select: { username: true, email: true, id: true, country: true },
        },
        wallet: true,
      },
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ error: true, message: "Invalid Transaction ID provided" });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message || "Internal server error" });
  }
});

module.exports = router;
