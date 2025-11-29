const { db } = require("./db");
const { fetchAllPrices } = require("./utils");
// fetchAllPrices should return something like:
// { ngn: { btc: 12345, usdt: 1 }, usd: { btc: 68000, usdt: 1 }, ... }

(async () => {
  // 1. Get all offers
  const offers = await db.offer.findMany();

  // 2. Extract unique FIAT currencies
  const uniqueCurrencies = [
    ...new Set(offers.map((o) => o.currency.toLowerCase())),
  ];

  // 3. Fetch price data for all currencies
  const prices = await fetchAllPrices(uniqueCurrencies);

  // 4. Attach calculated price to each offer
  const offersWithPrice = offers.map((offer) => {
    const fiat = offer.currency.toLowerCase();
    const crypto = offer.crypto.toLowerCase();

    // Base price of crypto in this fiat currency
    const basePrice = prices[crypto]?.[fiat] || 0;

    // Apply margin
    const finalPrice = basePrice * (1 + offer.margin / 100);

    return {
      ...offer,
      basePrice,
      finalPrice,
    };
  });

  console.log(offersWithPrice[0]);
})();
