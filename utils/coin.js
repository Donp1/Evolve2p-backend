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
  // const countries = [
  //   "usd",
  //   "aed",
  //   "ars",
  //   "aud",
  //   "bdt",
  //   "bhd",
  //   "bmd",
  //   "brl",
  //   "cad",
  //   "chf",
  //   "clp",
  //   "cny",
  //   "czk",
  //   "dkk",
  //   "eur",
  //   "gbp",
  //   "gel",
  //   "hkd",
  //   "huf",
  //   "idr",
  //   "ils",
  //   "inr",
  //   "jpy",
  //   "krw",
  //   "kwd",
  //   "lkr",
  //   "mmk",
  //   "mxn",
  //   "myr",
  //   "ngn",
  //   "nok",
  //   "nzd",
  //   "php",
  //   "pkr",
  //   "pln",
  //   "rub",
  //   "sar",
  //   "sek",
  //   "sgd",
  //   "thb",
  //   "try",
  //   "twd",
  //   "uah",
  //   "vef",
  //   "vnd",
  //   "zar",
  // ];

  const countries = [
    "AED",
    "AFN",
    "ALL",
    "AMD",
    "ANG",
    "AOA",
    "ARS",
    "AUD",
    "AWG",
    "AZN",
    "BAM",
    "BBD",
    "BDT",
    "BGN",
    "BHD",
    "BIF",
    "BMD",
    "BND",
    "BOB",
    "BRL",
    "BSD",
    "BTN",
    "BWP",
    "BYN",
    "BYR",
    "BZD",
    "CAD",
    "CDF",
    "CHF",
    "CLP",
    "CNY",
    "COP",
    "CRC",
    "CUP",
    "CVE",
    "CZK",
    "DJF",
    "DKK",
    "DOP",
    "DZD",
    "EGP",
    "ERN",
    "ETB",
    "EUR",
    "FJD",
    "FKP",
    "GBP",
    "GEL",
    "GGP",
    "GHS",
    "GIP",
    "GMD",
    "GNF",
    "GTQ",
    "GYD",
    "HKD",
    "HNL",
    "HRK",
    "HTG",
    "HUF",
    "IDR",
    "ILS",
    "IMP",
    "INR",
    "IQD",
    "IRR",
    "ISK",
    "JEP",
    "JMD",
    "JOD",
    "JPY",
    "KES",
    "KGS",
    "KHR",
    "KMF",
    "KPW",
    "KRW",
    "KWD",
    "KYD",
    "KZT",
    "LAK",
    "LBP",
    "LKR",
    "LRD",
    "LSL",
    "LTL",
    "LVL",
    "LYD",
    "MAD",
    "MDL",
    "MGA",
    "MKD",
    "MMK",
    "MNT",
    "MOP",
    "MUR",
    "MVR",
    "MWK",
    "MXN",
    "MYR",
    "MZN",
    "NAD",
    "NGN",
    "NIO",
    "NOK",
    "NPR",
    "NZD",
    "OMR",
    "PAB",
    "PEN",
    "PGK",
    "PHP",
    "PKR",
    "PLN",
    "PYG",
    "QAR",
    "RON",
    "RSD",
    "RUB",
    "RWF",
    "SAR",
    "SBD",
    "SCR",
    "SDG",
    "SEK",
    "SGD",
    "SHP",
    "SLL",
    "SOS",
    "SRD",
    "SVC",
    "SYP",
    "SZL",
    "THB",
    "TJS",
    "TMT",
    "TND",
    "TOP",
    "TRY",
    "TTD",
    "TWD",
    "TZS",
    "UAH",
    "UGX",
    "USD",
    "UYU",
    "UZS",
    "VEF",
    "VND",
    "VUV",
    "WST",
    "XCD",
    "YER",
    "ZAR",
    "ZMK",
    "ZMW",
    "ZWL",
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

async function getPricesForOffer(basePairs) {
  try {
    const coins = ["BTC", "ETH", "USDT", "USDC"];

    // Generate payload
    const payload = [];
    let batchIdCounter = 1;

    coins?.forEach((coin) => {
      basePairs?.forEach((pair) => {
        payload.push({
          batchId: batchIdCounter.toString(),
          symbol: coin,
          basePair: pair,
        });
        batchIdCounter++;
      });
    });

    const TATUM_API_URL = "https://api.tatum.io/v4/data/rate/symbol/batch";
    const res = await fetch(TATUM_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    // console.log("Raw response:", data);

    if (!data) {
      throw new Error("Unable to fetch coin price from tatum");
    }

    // Transform into easy lookup
    const result = {};
    data?.forEach((item) => {
      if (!result[item.symbol]) result[item.symbol] = {};
      result[item.symbol][item.basePair] = parseFloat(item.value); // convert string to number
    });

    return result;
  } catch (error) {
    console.error("Error fetching rates:", error);
  }
}
module.exports = {
  savePrices,
  fetchPricesForCoins,
  getSupportedCountries,
  getCoinGeckoSupportedCurrencies,
  getPricesForOffer,
};
