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
const swap = require("./routes/swap.js");
const deposit = require("./routes/deposit.js");
const createOffer = require("./routes/createOffer.js");
const createTrade = require("./routes/createTrade.js");

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
app.use("/api/swap", swap);
app.use("/api/create-offer", createOffer);
app.use("/api/create-trade", createTrade);

app.listen(PORT, (error) => {
  if (error) {
    console.log(error.message);
  } else {
    console.log(`Server running on PORT ${PORT}`);
  }
});

// Object.keys(ERC20_CONTRACTS).forEach((asset) => startPolling(asset));

// const COINS = {
//   bitcoin: "btc-bitcoin",
//   ethereum: "eth-ethereum",
//   tether: "usdt-tether",
//   "usd-coin": "usdc-usd-coin",
// };

// async function getUSDPrice(id) {
//   const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${id}`);
//   const data = await res.json();
//   return parseFloat(data.quotes.USD.price);
// }

// async function fetchFormattedPrices() {
//   const prices = {};

//   for (const [key, id] of Object.entries(COINS)) {
//     prices[key] = { usd: await getUSDPrice(id) };
//   }

//   const btcPrice = prices.bitcoin.usd;
//   const ethPrice = prices.ethereum.usd;

//   for (const key in prices) {
//     const usd = prices[key].usd;
//     prices[key].btc = parseFloat((usd / btcPrice).toFixed(8));
//     prices[key].eth = parseFloat((usd / ethPrice).toFixed(8));
//   }

//   prices.bitcoin.btc = 1;
//   prices.ethereum.eth = 1;

//   return prices;
// }

// const getLiveRate = async (fromSymbol, toSymbol) => {
//   const symbolToId = {
//     BTC: "btc-bitcoin",
//     ETH: "eth-ethereum",
//     USDT: "usdt-tether",
//     USDC: "usdc-usd-coin",
//   };

//   const fromId = symbolToId[fromSymbol];
//   const toId = symbolToId[toSymbol];

//   if (!fromId || !toId) {
//     throw new Error("Unsupported currency symbol");
//   }

//   const fetchPrice = async (id) => {
//     const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${id}`);
//     if (!res.ok) {
//       throw new Error(`Failed to fetch price for ${id}`);
//     }
//     const data = await res.json();
//     return parseFloat(data.quotes.USD.price);
//   };

//   const fromToUSD = await fetchPrice(fromId);
//   const toToUSD = await fetchPrice(toId);

//   if (!fromToUSD || !toToUSD) {
//     throw new Error("Missing rate data");
//   }

//   const rate = fromToUSD / toToUSD;
//   return rate;
// };

// const convertCurrency = async (amount, fromSymbol, toSymbol) => {
//   if (fromSymbol === toSymbol) return amount;

//   const rate = await getLiveRate(fromSymbol, toSymbol);
//   return Number((Number(amount) * rate).toFixed(8)); // rounding to 8 decimal places
// };

// const fetchPrices = async () => {
//   const symbolToId = {
//     bitcoin: "btc-bitcoin",
//     ethereum: "eth-ethereum",
//     tether: "usdt-tether",
//     "usd-coin": "usdc-usd-coin",
//   };

//   try {
//     // Step 1: Fetch USD prices for all coins from CoinPaprika
//     const entries = await Promise.all(
//       Object.entries(symbolToId).map(async ([key, id]) => {
//         const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${id}`);
//         const data = await res.json();
//         return [key, parseFloat(data.quotes.USD.price)];
//       })
//     );

//     const usdPrices = Object.fromEntries(entries);

//     // Step 2: Calculate BTC and ETH rates
//     const btcPrice = usdPrices.bitcoin;
//     const ethPrice = usdPrices.ethereum;

//     const formattedPrices = {};

//     for (const key in usdPrices) {
//       const usd = usdPrices[key];
//       formattedPrices[key] = {
//         usd: usd,
//         btc: parseFloat((usd / btcPrice).toFixed(8)),
//         eth: parseFloat((usd / ethPrice).toFixed(8)),
//       };
//     }

//     // Set 1 for base units
//     formattedPrices.bitcoin.btc = 1;
//     formattedPrices.ethereum.eth = 1;

//     // Step 3: Update state
//     return { prices: formattedPrices };
//   } catch (error) {
//     console.error("Failed to fetch coin prices", error);
//   }
// };

// (async () => {
//   try {
//     // const prices = await fetchFormattedPrices();
//     // const rate = await getLiveRate("ETH", "BTC");
//     // const convertedAmount = await convertCurrency("1", "BTC", "USDT");
//     const prices = await fetchPrices();
//     console.log(prices);
//   } catch (err) {
//     console.error("❌ error:", err);
//   }
// })();

// tb1qf7exflc3r6mk7hjha8lh5zsfhj9sqst35h0274
