const express = require("express");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");

const router = express.Router();

// helper to safely convert BigInt to Number
const normalize = (data) => {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
};

const paymentMethodsDetails = async () => {
  // ✅ Get trades grouped by offer
  const tradesByOffer = await db.trade.groupBy({
    by: ["offerId"],
    _count: { offerId: true },
  });

  // ✅ Fetch all offers with their payment methods
  const offers = await db.offer.findMany({
    select: { id: true, paymentMethod: { select: { name: true } } },
  });

  // ✅ Fetch all payment methods directly
  const allPaymentMethods = await db.paymentMethod.findMany({
    select: { name: true },
  });

  const offerMap = new Map(
    offers.map((o) => [o.id, o.paymentMethod?.name || "Unknown"])
  );

  // ✅ Initialize all payment methods with 0
  const grouped = allPaymentMethods.reduce((acc, pm) => {
    acc[pm.name] = 0;
    return acc;
  }, {});

  // ✅ Add real trade counts
  tradesByOffer.forEach((trade) => {
    const method = offerMap.get(trade.offerId) || "Unknown";
    if (grouped[method] !== undefined) {
      grouped[method] += Number(trade._count.offerId);
    }
  });

  // ✅ Return sorted list
  return Object.entries(grouped)
    .map(([paymentMethod, trades]) => ({ paymentMethod, trades }))
    .sort((a, b) => b.trades - a.trades);
};

const bestTradedAssets = async () => {
  // Group completed trades by offer
  const tradesByOffer = await db.trade.groupBy({
    by: ["offerId"],
    where: { status: "COMPLETED" }, // ✅ only completed trades
    _count: { offerId: true },
  });

  // Fetch all offers
  const offers = await db.offer.findMany({
    select: { id: true, crypto: true },
  });

  const offerMap = new Map(offers.map((o) => [o.id, o.crypto]));

  // Force the 4 cryptos you care about
  const allCryptos = ["BTC", "USDT", "ETH", "USDC"];

  // Initialize grouped with 0
  const grouped = allCryptos.reduce((acc, crypto) => {
    acc[crypto] = 0;
    return acc;
  }, {});

  // Add real trade counts
  tradesByOffer.forEach((trade) => {
    const crypto = offerMap.get(trade.offerId) || "Unknown";
    if (grouped[crypto] !== undefined) {
      grouped[crypto] += Number(trade._count.offerId);
    }
  });

  // Return all assets sorted by trades
  return Object.entries(grouped)
    .map(([crypto, trades]) => ({ crypto, trades }))
    .sort((a, b) => b.trades - a.trades);
};

const topCountriesData = async () => {
  const topCountries = await db.user.groupBy({
    by: ["country"],
    _count: { country: true },
    orderBy: { _count: { country: "desc" } },
    take: 5,
  });

  return topCountries.map((c) => ({
    country: c.country,
    users: Number(c._count.country), // 👈 convert BigInt
  }));
};

const usersGrowth = async () => {
  const result = await db.$queryRaw`
    SELECT 
      EXTRACT(YEAR FROM "createdAt")::INT AS year,
      EXTRACT(MONTH FROM "createdAt")::INT AS month,
      COUNT(*)::INT as users
    FROM "User"
    WHERE EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM CURRENT_DATE) -- only current year
    GROUP BY year, month
    ORDER BY year, month;
  `;

  const data = result.map((r) => ({
    year: Number(r.year),
    month: Number(r.month),
    users: Number(r.users),
  }));

  const currentYear = new Date().getFullYear();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // All 12 months
  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);

  const filled = allMonths.map((month) => {
    const found = data.find((d) => d.month === month);
    return {
      year: currentYear,
      month: monthNames[month - 1], // ✅ use month name
      users: found ? found.users : 0,
    };
  });

  return filled;
};

router.get("/", isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      kycVerifiedUsers,
      kycUnVerifiedUsers,
      disputes,
      totalTrades,
      totalCompletedTrades,
      totalPendingTrades,
      totalCancelledTrades,
      assets,
      paymentMethods,
      countries,
      growth,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { kycVerified: true } }),
      db.user.count({ where: { kycVerified: false } }),
      db.dispute.count({ where: { status: "OPEN" } }),
      db.trade.count(),
      db.trade.count({ where: { status: "COMPLETED" } }),
      db.trade.count({ where: { status: "PENDING" } }),
      db.trade.count({ where: { status: "CANCELLED" } }),
      bestTradedAssets(),
      paymentMethodsDetails(),
      topCountriesData(),
      usersGrowth(),
    ]);

    return res.json(
      normalize({
        users: {
          total: totalUsers,
          verified: kycVerifiedUsers,
          unverified: kycUnVerifiedUsers,
        },
        trades: {
          total: totalTrades,
          completed: totalCompletedTrades,
          pending: totalPendingTrades,
          cancelled: totalCancelledTrades,
        },
        disputes: {
          open: disputes,
        },
        analytics: {
          mostTradedAssets: assets,
          paymentMethods,
          topCountries: countries,
          userGrowth: growth,
        },
      })
    );
  } catch (error) {
    console.error("❌ Error fetching dashboard:", error);
    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;
