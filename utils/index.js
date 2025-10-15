const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user?.role },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1d",
    }
  );
}

function generateAccessTokenAdmin(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, isAdmin: true },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1d",
    }
  );
}

// {
//   "id": "uuid-of-admin",
//   "email": "admin@example.com",
//   "isAdmin": true
// }

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

const sendOtp = async (email, otp) => {
  const data = {
    channel: "email",
    provider: "sweego",
    from: {
      email: "support@evolve-2p.com",
      name: "Evolve2p",
    },
    recipients: [
      {
        email: email,
        name: "Evolve2p User",
      },
    ],
    subject: "Verify your Evolve2p account",
    message_html: `
   <div style="font-family: Arial, sans-serif; text-align: center; background-color: #0a0a0f; padding: 40px; color: #fff;">
        <img 
          src="https://res.cloudinary.com/jptech/image/upload/c_thumb,w_200,g_face/v1758836955/app-icon_sc6t2n.jpg" 
          alt="Evolve2p Logo" 
          style="width: 120px; height: auto; margin-bottom: 20px;border-radius: 10px;"
        />
        <h2 style="color: #b084f9;">Welcome to Evolve2p</h2>
        <p>Your one-time password (OTP) is:</p>
        <div style="font-size: 24px; font-weight: bold; background: linear-gradient(90deg, #7b2ff7, #f107a3); color: white; padding: 10px 20px; display: inline-block; border-radius: 10px; margin-top: 10px;">
          ${otp}
        </div>
        <p style="margin-top: 20px; font-size: 14px; color: #aaa;">
          This code will expire in 10 minutes.<br />
          Please do not share it with anyone.
        </p>
      </div>
  `,
  };

  const res = await fetch("https://api.sweego.io/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Api-Key": process.env.SWEEGO_API_KEY,
    },
    body: JSON.stringify(data),
  });

  return res.json();
};

const sendAdminMail = async (email, subject, messageTitle, messageBody) => {
  const data = {
    channel: "email",
    provider: "sweego",
    from: {
      email: "support@evolve-2p.com",
      name: "Evolve2p",
    },
    recipients: [
      {
        email,
        name: "Evolve2p User",
      },
    ],
    subject,
    message_html: `
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #0d0d14;
        color: #fff;
        padding: 40px 20px;
        text-align: center;
      ">
        <div style="max-width: 600px; margin: 0 auto; background: #14141f; border-radius: 16px; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
          <img 
            src="https://res.cloudinary.com/jptech/image/upload/c_thumb,w_200,g_face/v1758836955/app-icon_sc6t2n.jpg" 
            alt="Evolve2p Logo
            style="width: 100px; height: auto; border-radius: 12px; margin-bottom: 25px;"
          />

          <h1 style="color: #b084f9; margin-bottom: 10px;font-weight: bold; font-size: 20px">${messageTitle}</h1>
          <div style="height: 2px; width: 80px; background: linear-gradient(90deg, #7b2ff7, #f107a3); margin: 0 auto 20px auto;"></div>

          <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
            ${messageBody}
          </p>

          <p style="margin-top: 25px; font-size: 12px; color: #777;">
            © ${new Date().getFullYear()} Evolve2p. All rights reserved.<br>
            You are receiving this email because you are a registered Evolve2p user.
          </p>
        </div>
      </div>
    `,
  };

  try {
    const res = await fetch("https://api.sweego.io/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Api-Key": process.env.SWEEGO_API_KEY,
      },
      body: JSON.stringify(data),
    });

    return res.json();
  } catch (error) {
    console.error("❌ Error sending admin mail:", error);
    throw new Error("Failed to send admin mail");
  }
};

module.exports = {
  generateAccessToken,
  generateOTP,
  getTimeDifferenceInMinutes,
  generateAccessTokenAdmin,
  sendOtp,
  sendAdminMail,
};
