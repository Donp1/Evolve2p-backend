const express = require("express");
const bcrypt = require("bcryptjs");

const { findUserByEmail, createUser } = require("../utils/users");
const { generateAccessToken } = require("../utils");
const { db } = require("../db");
const {
  generateIndexFromUserId,
  generateAddress,
  subscribeToAddressWebhook,
} = require("../utils/crypto");

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

    // generate crypto wallet address
    const btcAddress = await generateAddress("BTC", userIndex);
    const ethAddress = await generateAddress("ETH", userIndex);
    const tronAddress = await generateAddress("USDT", userIndex);
    const bnbAddress = await generateAddress("USDC", userIndex);

    const CURRENCIES = ["BTC", "ETH", "USDT", "USDC"];
    // create wallet
    for (const symbol of CURRENCIES) {
      let address;
      let privateKey;
      if (symbol === "BTC") {
        address = btcAddress.address;
        privateKey = btcAddress.privateKey;
        // subscribeToAddressWebhook(address, symbol);
      } else if (symbol === "ETH") {
        address = ethAddress.address;
        privateKey = ethAddress.privateKey;
        // subscribeToAddressWebhook(address, symbol);
      } else if (symbol === "USDT") {
        address = tronAddress.address;
        privateKey = tronAddress.privateKey;
        subscribeToAddressWebhook(address, symbol);
      } else if (symbol === "USDC") {
        address = bnbAddress.address;
        privateKey = bnbAddress.privateKey;
        // subscribeToAddressWebhook(address, symbol);
      }

      const wallet = await db.wallet.create({
        data: {
          address,
          currency: symbol,
          userId: newUser.id,
          balance: 0.0,
          addressIndex: userIndex,
          privateKey,
        },
      });
    }

    const notification = await db.notification.create({
      data: {
        userId: newUser.id,
        message:
          "Welcome to Evolve2p. Your account has been created successfully.",
        read: false,
        title: "Welcome Message",
        category: "SYSTEM",
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(newUser.id).emit("new_notification", notification);
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
