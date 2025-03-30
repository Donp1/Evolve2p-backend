const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { db } = require("../db");
const { findUserByEmail, findUserByUsername } = require("../utils/users");

const router = express.Router();

router.post("/", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: true, message: "Provide a username" });
  }
  try {
    const userExist = await findUserByUsername(username);
    if (userExist) {
      return res.status(200).json({ success: true, message: "User Exist" });
    }

    return res
      .status(400)
      .json({ error: true, message: "User does not exist" });
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
