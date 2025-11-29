const { savePrices } = require("./utils/coin");
const { redis } = require("./utils/redis");

(async () => {
  // try {
  //   const data = await redis.get("crypto_prices"); // get the key
  //   console.log(data);
  //   if (!data) return null; // key does not exist or expired
  //   const prices = JSON.parse(data); // parse JSON back to object
  //   console.log(prices);
  //   return prices;
  // } catch (err) {
  //   console.error("Error fetching crypto prices from Redis:", err);
  //   return null;
  // }
})();

// module.exports = { getCurrencyByCountryCode };
