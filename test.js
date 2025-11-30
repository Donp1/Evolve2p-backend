const dotenv = require("dotenv");
const { getPricesForOffer } = require("./utils/coin");
dotenv.config();

// (async () => {
//   const res = await fetch(
//     "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=USDT,USDC,BTC,ETH&convert=NGN",
//     {
//       headers: {
//         "X-CMC_PRO_API_KEY": process.env.COINMARKETCAP_API_KEY,
//       },
//     }
//   );

//   const data = await res.json();

//   console.log(data);
// })();

(async () => {
  try {
    const prices = await getPricesForOffer(["NGN", "USD", "GHS"]);
    console.log(prices);
  } catch (error) {
    console.log(error);
  }
})();
