const bcrypt = require("bcryptjs");
const { db } = require("../db");

function findUserByEmail(email) {
  return db.user.findUnique({
    where: {
      email,
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
  });
}

function findUserByUsername(username) {
  return db.user.findFirst({
    where: {
      username,
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

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findOtpByEmail,
  createOTPUser,
  findUserByUsername,
  deleteAccount,
};
