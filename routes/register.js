const dotenv = require("dotenv");
dotenv.config();
const express = require("express");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const route = express.Router();

route.post("/", async (req, res) => {
  const user = await prisma.user.create({
    data: {
      email: "josephchukwuka4@gmail.com",
      name: "joseph chukwuka precious",
    },
  });
  res.json({ user });
});

module.exports = route;
