const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1d",
    }
  );
}

const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
function generateOTP() {
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += numbers[crypto.randomInt(numbers.length)];
  }
  return otp;
}

function getTimeDifferenceInMinutes(time) {
  let prismaDateTime = new Date(time); // This is an example DateTime from Prisma

  // Get current time from Date.now()
  let currentTime = Date.now(); // This gives the current timestamp in milliseconds

  // Subtract the Prisma DateTime from current time
  let differenceInMilliseconds = currentTime - prismaDateTime.getTime(); // getTime() converts Date to milliseconds

  // Optionally convert difference to other units (e.g., seconds, minutes, etc.)
  let differenceInSeconds = differenceInMilliseconds / 1000; // Convert milliseconds to seconds
  let differenceInMinutes = differenceInSeconds / 60; // Convert seconds to minutes

  return differenceInMinutes;
}

module.exports = {
  generateAccessToken,
  generateOTP,
  getTimeDifferenceInMinutes,
};
