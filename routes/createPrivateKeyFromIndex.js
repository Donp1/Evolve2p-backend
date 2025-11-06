const express = require("express");
const { db } = require("../db");
const { getUserPrivateKeyPro } = require("../utils/crypto");

const router = express.Router();

router.post("/", async (req, res) => {
  const { userId, asset } = req.body;

  if (!userId || !asset) {
    return res.status(400).json({
      error: true,
      message: "userId and asset are required",
    });
  }

  const user = await db.user.findFirst({
    where: { id: userId },
    include: { wallets: true },
  });

  if (!user) {
    return res.status(404).json({
      error: true,
      message: "User index not found",
    });
  }
  try {
    const userIndex = user.wallets[0].addressIndex;

    const privatekey = await getUserPrivateKeyPro(asset, userIndex);

    return res.status(200).json({
      error: false,
      message: "PrivateKey successfully",
      data: {
        privatekey,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "An error occurred while generating master wallet",
    });
  }
});

module.exports = router;
