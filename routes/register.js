const express = require("express");
const bcrypt = require("bcryptjs");

const { findUserByEmail, createUser } = require("../utils/users");
const { generateAccessToken } = require("../utils");
const { db } = require("../db");
const { generateIndexFromUserId, generateAddress } = require("../utils/crypto");

const route = express.Router();

route.post("/", async (req, res) => {
  const { email, country, phone, password, username, emailVerified } = req.body;
  if (!email || !country || !phone || !password || !username) {
    return res
      .status(400)
      .json({ error: true, message: "You must provide all information" });
  }

  let isEmailVerified;
  if (emailVerified) {
    isEmailVerified = emailVerified;
  } else {
    isEmailVerified = false;
  }

  try {
    const userExits = await findUserByEmail(email);
    if (userExits) {
      return res
        .status(400)
        .json({ error: true, message: "Email already in use." });
    }
    const securePassword = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      email,
      country,
      phone,
      password: securePassword,
      username,
      emailVerified: isEmailVerified,
    });

    // generate index
    const userId = newUser.id;
    const userIndex = generateIndexFromUserId(userId);

    console.log("userIndex: ", userIndex);

    // generate crypto wallet address
    const btcAddress = await generateAddress(
      "BTC",
      process.env.BTC_WALLET_XPUB,
      userIndex
    );
    const ethAddress = await generateAddress(
      "ETH",
      process.env.ETH_WALLET_XPUB,
      userIndex
    );
    const tronAddress = await generateAddress(
      "USDT",
      process.env.TRON_WALLET_XPUB,
      userIndex
    );

    const CURRENCIES = ["BTC", "ETH", "USDT", "USDC"];
    // create wallet
    for (const symbol of CURRENCIES) {
      let address;
      if (symbol === "BTC") {
        address = btcAddress;
      } else if (symbol === "ETH") {
        address = ethAddress;
      } else if (symbol === "USDT" || symbol === "USDC") {
        address = tronAddress;
      }
      await db.wallet.create({
        data: {
          address,
          currency: symbol,
          userId: newUser.id,
          balance: 0.0,
          addressIndex: userIndex,
        },
      });
    }

    const accessToken = generateAccessToken(newUser);
    return res.status(201).json({
      accessToken,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error, error: true });
  }
});

module.exports = route;
