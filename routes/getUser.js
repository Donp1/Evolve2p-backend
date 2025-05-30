const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { findUserByEmail } = require("../utils/users");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { email } = req.payload;
  if (!email) {
    return res.status(400).json({ error: true, message: "Provide an email" });
  }
  try {
    const userExist = await findUserByEmail(email);
    if (userExist) {
      userExist.password = undefined;
      userExist.secret = undefined;
      userExist.pin = undefined;
      return res
        .status(200)
        .json({ success: true, message: "Valid user", user: userExist });
    }

    return res
      .status(400)
      .json({ error: true, message: "User does not exist" });
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
