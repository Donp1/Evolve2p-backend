const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const jwt = require("jsonwebtoken");

const { db } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Assuming token is in "Bearer <token>" format

  if (!token) {
    return res.status(401).json({ error: true, message: "No token provided" });
  }

  try {
    // Verify the token to check its validity and expiration
    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res
            .status(401)
            .json({ error: true, message: "Token has expired" });
        }
        return res.status(401).json({ error: true, message: "Invalid token" });
      }

      res
        .status(200)
        .json({ success: true, message: "Token is valid", user: decoded });
    });
  } catch (err) {
    res.status(500).json({ error: true, message: "Server error" });
  }
});

module.exports = router;
