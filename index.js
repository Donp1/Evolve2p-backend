const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
var cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const axios = require("axios");

const { startPolling, ERC20_CONTRACTS } = require("./utils/crypto.js");

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
const sendSmsOtp = require("./routes/sendSmsOtp.js");
const send = require("./routes/send.js");
const deposit = require("./routes/deposit.js");

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
app.use("/api/deposit", deposit);
app.use("/api/auth/register", register); // done
app.use("/api/auth/login", login); // done
app.use("/api/send-otp", sendOTP); // done
app.use("/api/verify-email", verifyEmail); // done
app.use("/api/check-email-exist", checkEmailExist); // done
app.use("/api/check-username-exist", checkUsernameExist); // done
app.use("/api/update-user", updateUser); // done
app.use("/api/forgot-password", forgotPassword); // done
app.use("/api/check-token", checkToken); //done
app.use("/api/check-pin", checkPin); // done
app.use("/api/get-user", getUser); // done
app.use("/api/kyc-get-link", kycGetLink); // done
app.use("/api/kyc-verification", kycVerification); // done
app.use("/api/delete-account", deleteAccount); // done
app.use("/api/change-password", changePassword); // done
app.use("/api/generate-secrete", generateSecret); // done
app.use("/api/verify-secrete", verifySecrete); // done
app.use("/api/send-sms-otp", sendSmsOtp);
app.use("/api/send", send);

// app.listen(PORT, (error) => {
//   if (error) {
//     console.log(error.message);
//   } else {
//     console.log(`Server running on PORT ${PORT}`);
//   }
// });

// Object.keys(ERC20_CONTRACTS).forEach((asset) => startPolling(asset));

(async () => {
  try {
    const txDetails = await fetch(
      `https://api.tatum.io/v3/bitcoin/transaction/3be873da0652dd4c873477d48d740e740c895f39ca0648d392b83e388ed640e3`,
      {
        headers: {
          "x-api-key": process.env.TATUM_API_KEY,
        },
      }
    );
    const tx = await txDetails.json();
    const fromAddress = tx.inputs[0]?.coin?.address;
    console.log(fromAddress);
  } catch (err) {
    console.error("❌ error:", err.message);
  }
})();

// tb1qf7exflc3r6mk7hjha8lh5zsfhj9sqst35h0274
