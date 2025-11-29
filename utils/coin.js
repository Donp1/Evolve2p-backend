const dotenv = require("dotenv");
const { redis } = require("./redis");
dotenv.config();

const COIN_MAP = {
  btc: "bitcoin",
  eth: "ethereum",
  usdt: "tether",
  usdc: "usd-coin",
};

function getCoinGeckoSupportedCurrencies() {
  const countries = [
    "usd",
    "aed",
    "ars",
    "aud",
    "bdt",
    "bhd",
    "bmd",
    "brl",
    "cad",
    "chf",
    "clp",
    "cny",
    "czk",
    "dkk",
    "eur",
    "gbp",
    "gel",
    "hkd",
    "huf",
    "idr",
    "ils",
    "inr",
    "jpy",
    "krw",
    "kwd",
    "lkr",
    "mmk",
    "mxn",
    "myr",
    "ngn",
    "nok",
    "nzd",
    "php",
    "pkr",
    "pln",
    "rub",
    "sar",
    "sek",
    "sgd",
    "thb",
    "try",
    "twd",
    "uah",
    "vef",
    "vnd",
    "zar",
  ];

  return countries; // → ["usd","ngn","eur","gbp", ...]
}

async function getSupportedCountries() {
  // 1. Load CoinGecko supported currencies
  const supportedFiats = getCoinGeckoSupportedCurrencies();
  const supportedSet = new Set(supportedFiats.map((c) => c.toLowerCase()));

  // 2. Load countries with currencies included
  const res = await fetch(
    "https://restcountries.com/v3.1/all?fields=name,flags,cca2,currencies"
  );
  const countries = await res.json();

  // 3. Filter only countries with at least one CG-supported currency
  const filtered = countries
    .filter((c) => c.currencies)
    .map((c) => {
      const currencyCodes = Object.keys(c.currencies);

      // find first currency that CG supports
      const supported = currencyCodes.find((code) =>
        supportedSet.has(code.toLowerCase())
      );

      if (!supported) return null;

      return {
        name: c.name.common,
        flag: c.flags.png,
        cca2: c.cca2,
        currency: {
          code: supported,
          name: c.currencies[supported].name,
          symbol: c.currencies[supported].symbol ?? "",
        },
      };
    })
    .filter(Boolean); // remove nulls

  return filtered;
}

async function fetchPricesForCoins(coins, currencies) {
  if (!coins?.length || !currencies?.length) return {};

  // Convert symbols → CoinGecko IDs
  const coinIds = coins.map((c) => COIN_MAP[c.toLowerCase()]).join(",");
  const vsCurrencies = currencies.map((c) => c.toLowerCase()).join(",");

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=${vsCurrencies}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      // "x-cg-demo-api-key": process.env.COINGECKO_API_KEY, // optional
    },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko rate limit or error: ${res.status}`);
  }

  const data = await res.json();

  // Map back to short symbols
  const formatted = {};
  for (const symbol of coins) {
    const id = COIN_MAP[symbol.toLowerCase()];
    formatted[symbol.toLowerCase()] = data[id] || null;
  }

  return formatted;
}

async function savePrices() {
  try {
    const countries = await getSupportedCountries();
    const countryCodes = countries
      .map((c) => c?.currency?.code)
      .filter(Boolean);
    const countriesPrices = await fetchPricesForCoins(
      ["btc", "eth", "usdt", "usdc"],
      countryCodes
    );

    // Save as JSON string in Redis
    await redis.set("crypto_prices", JSON.stringify(countriesPrices), {
      EX: 60, // optional: expire in 60 seconds
    });
    console.log("Prices saved to Redis");
  } catch (err) {
    console.error("Error saving prices to Redis:", err.message);
  }
}

module.exports = {
  savePrices,
  fetchPricesForCoins,
  getSupportedCountries,
  getCoinGeckoSupportedCurrencies,
};
