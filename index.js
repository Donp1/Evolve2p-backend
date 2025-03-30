const dotenv = require("dotenv");
dotenv.config();
const express = require("express");

const register = require("./routes/register.js");
const login = require("./routes/login.js");
const sendOTP = require("./routes/sendOTP.js");
const verifyEmail = require("./routes/verifyEmail");
const checkEmailExist = require("./routes/checkEmailExist.js");
const checkUsernameExist = require("./routes/checkUsernameExist.js");
const updateUser = require("./routes/updateUser.js");

const app = express();
const PORT = process.env.PORT || 5000;

//middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Routes
app.use("/api/auth/register", register);
app.use("/api/auth/login", login);
app.use("/api/send-otp", sendOTP);
app.use("/api/verify-email", verifyEmail);
app.use("/api/check-email-exist", verifyEmail);
app.use("/api/check-username-exist", checkUsernameExist);
app.use("/api/update-user", updateUser);

app.listen(PORT, (error) => {
  if (error) {
    console.log(error.message);
  } else {
    console.log(`Server running on PORT ${PORT}`);
  }
});
