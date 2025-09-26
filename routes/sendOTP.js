const dotenv = require("dotenv");
dotenv.config();

// const Mailgun = require("mailgun.js");
// const FormData = require("form-data");

// const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

// const mailerSend = new MailerSend({
//   apiKey: process.env.MAILERSEND_API_KEY,
// });

// (async () => {
//   try {
//     const sentFrom = new Sender(
//       "no-reply@test-p7kx4xwvo72g9yjr.mlsender.net", // full email
//       "Evolve2p"
//     );

//     const recipients = [
//       new Recipient("contact@evolve2p.com", "Joseph Precious"),
//     ];

//     const personalization = [
//       {
//         email: "contact@evolve2p.com",
//         data: {
//           otp: "12345",
//           user_name: "JPTech",
//           expiry_minutes: "20",
//         },
//       },
//     ];

//     const emailParams = new EmailParams()
//       .setFrom(sentFrom)
//       .setTo(recipients)
//       .setTemplateId("vywj2lp7kwql7oqz")
//       .setPersonalization(personalization)
//       .setSubject("One-time password (OTP) for Evolve2p")
//       .setReplyTo(
//         new Sender("support@test-p7kx4xwvo72g9yjr.mlsender.net", "Support")
//       );

//     const res = await mailerSend.email.send(emailParams);
//     console.log(res);
//   } catch (error) {
//     console.log("Error Sending Mail: ", error);
//   }
// })();

const express = require("express");
const nodemailer = require("nodemailer");
const { generateOTP } = require("../utils");
const { createOTPUser, findOtpByEmail } = require("../utils/users");
const { db } = require("../db");

const router = express.Router();

const transporter = nodemailer.createTransport({
  port: 587,
  secure: false,
  host: "smtp.gmail.com",
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.post("/", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(401)
      .json({ error: true, message: "Provide an Email Address" });
  }

  const otp = generateOTP();
  try {
    const info = await transporter.sendMail({
      from: {
        name: "Evolve2p",
        address: "evolve2p@gmail.com",
      },
      to: email, // list of receivers
      subject: "Verify Your Account: OTP for Evolve2p.", // Subject line
      html: `
        <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Evolve2p</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Thank you for choosing Evolve2p. Use the following OTP to complete your Sign Up procedures. OTP is valid for 5 minutes. If mail is not seen, please check spam</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
    <p style="font-size:0.9em;">Regards,<br />Evolve2p</p>
    <hr style="border:none;border-top:1px solid #eee" />
    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
      <p>Evolve2p Inc</p>
      <p>1600 Amphitheatre Parkway</p>
      <p>California</p>
    </div>
  </div>
</div>
      `, // html body
    });

    const userExit = await findOtpByEmail(email);
    if (userExit) {
      const updateUser = await db.oTP.update({
        data: {
          otp: parseInt(otp),
          expiresAt: new Date().toISOString(),
        },
        where: {
          email,
        },
      });
      if (updateUser) {
        return res
          .status(200)
          .json({ success: true, message: "Email sent successfully" });
      }
    } else {
      const otpUser = await createOTPUser({ email, otp: parseInt(otp) });
      if (otpUser) {
        return res
          .status(200)
          .json({ success: true, message: "Email sent successfully" });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Unable to send Mail: " + error });
  }
});

module.exports = router;
