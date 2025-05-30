const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
var cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const register = require("./routes/register.js");
const login = require("./routes/login.js");
const sendOTP = require("./routes/sendOTP.js");
const verifyEmail = require("./routes/verifyEmail.js");
const checkEmailExist = require("./routes/checkEmailExist.js");
const checkUsernameExist = require("./routes/checkUsernameExist.js");
const updateUser = require("./routes/updateUser.js");
const forgotPassword = require("./routes/forgotPassword.js");
const checkToken = require("./routes/checkToken.js");
const getUser = require("./routes/getUser.js");
const kycGetLink = require("./routes/kycGetLink.js");
const kycVerification = require("./routes/kycVerify.js");
const deleteAccount = require("./routes/deleteAccount.js");
const changePassword = require("./routes/changePassword.js");
const generateSecret = require("./routes/generateSecrete.js");
const verifySecrete = require("./routes/verifySecrete.js");
const checkPin = require("./routes/checkPin.js");

const app = express();

const PORT = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));

// swagger middleware
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
//Routes
app.use("/api/auth/register", register);
app.use("/api/auth/login", login);
app.use("/api/send-otp", sendOTP);
app.use("/api/verify-email", verifyEmail);
app.use("/api/check-email-exist", checkEmailExist);
app.use("/api/check-username-exist", checkUsernameExist);
app.use("/api/update-user", updateUser);
app.use("/api/forgot-password", forgotPassword);
app.use("/api/check-token", checkToken);
app.use("/api/check-pin", checkPin);
app.use("/api/get-user", getUser);
app.use("/api/kyc-get-link", kycGetLink);
app.use("/api/kyc-verification", kycVerification);
app.use("/api/delete-account", deleteAccount);
app.use("/api/change-password", changePassword);
app.use("/api/generate-secrete", generateSecret);
app.use("/api/verify-secrete", verifySecrete);

app.listen(PORT, (error) => {
  if (error) {
    console.log(error.message);
  } else {
    console.log(`Server running on PORT ${PORT}`);
  }
});
