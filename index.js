const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
var cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const register = require("./routes/register.js");
const login = require("./routes/login.js");
const sendOTP = require("./routes/sendOTP.js");
const verifyEmail = require("./routes/verifyEmail");
const checkEmailExist = require("./routes/checkEmailExist.js");
const checkUsernameExist = require("./routes/checkUsernameExist.js");
const updateUser = require("./routes/updateUser.js");
const forgotPassword = require("./routes/forgotPassword");
const checkToken = require("./routes/checkToken.js");
const getUser = require("./routes/getUser.js");

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
app.use("/api/get-user", getUser);

app.listen(PORT, (error) => {
  if (error) {
    console.log(error.message);
  } else {
    console.log(`Server running on PORT ${PORT}`);
  }
});
