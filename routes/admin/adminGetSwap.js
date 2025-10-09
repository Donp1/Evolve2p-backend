const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAdmin } = require("../../middlewares/index");
const { db } = require("../../db");

const router = express.Router();

router.get("/:swapId", isAdmin, async (req, res) => {
  const { swapId } = req.params;

  // ✅ Ensure the token payload has admin flag
  if (!req.payload || !req.payload.isAdmin) {
    return res
      .status(403)
      .json({ error: true, message: "Forbidden: Admin access required" });
  }

  if (!swapId) {
    return res
      .status(404)
      .json({ error: true, message: "No Swap ID provided" });
  }
  try {
    // ✅ Fetch users
    const swap = await db.swap.findFirst({
      where: {
        id: swapId,
      },
      include: {
        user: { select: { username: true, email: true, id: true } },
      },
    });

    if (!swap) {
      return res
        .status(404)
        .json({ error: true, message: "Invalid Swap ID provided" });
    }

    return res.status(200).json({
      success: true,
      swap,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: true, message: error.message || "Internal server error" });
  }
});

module.exports = router;
