const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");
const { sendPushNotification } = require("../../utils/index");

const router = express.Router();

router.post("/", isAdmin, async (req, res) => {
  const { actionType, userId } = req.body;

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
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid User ID provided" });
    }

    const updateUser = await db.user.update({
      where: { id: userId },
      data: { status: actionType == "suspend" ? "SUSPENDED" : "ACTIVE" },
    });

    if (!updateUser) {
      return res
        .status(400)
        .json({ error: true, message: "Unable to update users status" });
    }

    if (updateUser) {
      if (updateUser.pushToken)
        await sendPushNotification(
          updateUser.pushToken,
          "Evolve2p Support",
          `Your account with Evolve2p has been ${updateUser.status}`
        );
      return res
        .status(200)
        .json({ success: true, message: "Status updated successfully" });
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
