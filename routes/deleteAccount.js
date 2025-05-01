const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAuthenticated } = require("../middlewares");
const { findUserByEmail, deleteAccount } = require("../utils/users");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const email = req.payload.email;

  if (!email) {
    return res.json({ error: true, message: "Provide an Email address" });
  }

  try {
    const userExist = await findUserByEmail(email);
    if (!userExist) {
      return res.json({ error: true, message: "Email provided do not exist" });
    }

    const deletedUser = await deleteAccount(email);
    if (deletedUser) {
      return res.json({
        success: true,
        message: "Account deleted successfully",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
