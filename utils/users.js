const bcrypt = require("bcryptjs");
const { db } = require("../db");

function findUserByEmail(email) {
  return db.user.findUnique({
    where: {
      email,
    },

    include: {
      wallets: true,
      transactions: true,
      swaps: true,
      tradesAsSeller: {
        include: {
          offer: { include: { paymentMethod: true, user: true } },
          buyer: true,
          seller: true,
        },
      },
      tradesAsBuyer: {
        include: {
          offer: { include: { paymentMethod: true, user: true } },
          buyer: true,
          seller: true,
        },
      },
      notifications: true,
    },
  });
}

function createUser(user) {
  return db.user.create({
    data: user,
  });
}

function createOTPUser(user) {
  return db.oTP.create({ data: { email: user.email, otp: user.otp } });
}

function findUserById(id) {
  return db.user.findUnique({
    where: {
      id,
    },
    include: {
      wallets: true,
      transactions: true,
      swaps: true,
      tradesAsSeller: {
        include: {
          offer: { include: { paymentMethod: true, user: true } },
          buyer: true,
          seller: true,
        },
      },
      tradesAsBuyer: {
        include: {
          offer: { include: { paymentMethod: true, user: true } },
          buyer: true,
          seller: true,
        },
      },
      notifications: true,
    },
  });
}

function findUserByUsername(username) {
  return db.user.findFirst({
    where: {
      username,
    },
    include: {
      wallets: true,
      transactions: true,
      swaps: true,
      tradesAsSeller: {
        include: {
          offer: { include: { paymentMethod: true, user: true } },
          buyer: true,
          seller: true,
        },
      },
      tradesAsBuyer: {
        include: {
          offer: { include: { paymentMethod: true, user: true } },
          buyer: true,
          seller: true,
        },
      },
      notifications: true,
    },
  });
}

function findOtpByEmail(email) {
  return db.oTP.findUnique({
    where: {
      email,
    },
  });
}

function deleteAccount(email) {
  return db.user.delete({
    where: {
      email,
    },
  });
}

async function releaseTrade(tradeId) {
  const trade = await db.trade.findUnique({
    where: { id: tradeId },
    include: { offer: true },
  });
  if (!trade || trade.status !== "PAID")
    throw new Error("Trade not ready for release");

  await prisma.$transaction([
    prisma.wallet.update({
      where: {
        userId_asset: { userId: trade.buyerId, asset: trade.offer.asset },
      },
      data: { balance: { increment: trade.amountCrypto } },
    }),
    prisma.trade.update({
      where: { id: tradeId },
      data: { status: "COMPLETED", escrowReleased: true },
    }),
  ]);
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findOtpByEmail,
  createOTPUser,
  findUserByUsername,
  deleteAccount,
  releaseTrade,
};
