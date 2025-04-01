const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.put("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Provisw email and password" });
  }

  try {
    const userExits = await findUserByEmail(email);
    if (!userExits)
      return res
        .status(400)
        .json({ error: true, message: "Invalid email address provided" });

    const hashPassword = await bcrypt.hash(password, 10);

    const updateUser = await db.user.update({
      where: {
        email,
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
