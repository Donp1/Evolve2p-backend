const dotenv = require("dotenv");
dotenv.config();

const { TronWeb } = require("tronweb");
const cron = require("node-cron");

const crypto = require("crypto");
const { db } = require("../db");

const ERC20_CONTRACTS = {
  USDT: process.env.CONTRACT_ADDRESS_USDT,
  // USDC: process.env.CONTRACT_ADDRESS_USDC,
};

async function generateAddress(currency, xpub, index) {
  let url;
  if (currency === "BTC") {
    url = `https://api.tatum.io/v3/bitcoin/address/${xpub}/${index}`;
  } else if (currency === "ETH") {
    url = `https://api.tatum.io/v3/ethereum/address/${xpub}/${index}`;
  } else if (currency === "USDT" || currency === "USDC") {
    url = `https://api.tatum.io/v3/tron/address/${xpub}/${index}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(
      "❌ Failed to get address:",
      response.status,
      await response.text()
    );
    return;
  }
  const { address } = await response.json();
  return address;
}

function generateIndexFromUserId(userId) {
  const hash = crypto.createHash("sha256").update(userId).digest("hex");
  const intValue = parseInt(hash.substring(0, 8), 16); // 32-bit integer
  const maxSafeIndex = 2_147_483_647; // XPUB limit
  return intValue % maxSafeIndex;
}

async function sendBTC(fromPrivateKey, toAddress, amount) {
  const value = Number(Number(amount).toFixed(8)); // BTC uses up to 8 decimals
  if (isNaN(value) || value <= 0) {
    throw new Error("Invalid amount for BTC transaction");
  }

  const res = await fetch("https://api.tatum.io/v3/bitcoin/transaction", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fromAddress: [
        {
          address: process.env.BTC_WALLET_ADDRESS, // Replace with your BTC wallet address
          privateKey: fromPrivateKey, // Replace with your BTC wallet private key
        },
      ],
      to: [
        {
          address: toAddress,
          value, // Amount in BTC
        },
      ],
      // fee: "0.00005",
    }),
  });

  const data = await res.json();
  console.log(data);
  return data;
}

async function sendETH(fromPrivateKey, toAddress, amount) {
  const res = await fetch("https://api.tatum.io/v3/ethereum/transaction", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: toAddress,
      currency: "ETH",
      // amount: Number(Number(amount).toFixed(18)), // ETH uses up to 18 decimals
      amount: String(Number(amount).toFixed(18)), // Tatum expects string for large numbers
      fromPrivateKey: fromPrivateKey,
    }),
  });

  const data = await res.json();
  console.log(data);
  return data;
}
// assetType: 'BTC' | 'ETH'
async function subscribeToAddressWebhook(userAddress, assetType) {
  const TATUM_API_URL = "https://api.tatum.io/v3/subscription";
  let subscriptionType, attr;

  switch (assetType.toUpperCase()) {
    case "BTC":
      subscriptionType = "ADDRESS_TRANSACTION";
      attr = { address: userAddress, chain: "bitcoin-testnet" };
      break;
    case "ETH":
      subscriptionType = "ADDRESS_TRANSACTION";
      attr = { address: userAddress, chain: "ethereum-sepolia" };
      break;
    default:
      throw new Error(`Unsupported asset type: ${assetType}`);
  }

  const payload = {
    type: subscriptionType,
    attr: {
      ...attr,
      url: `https://evolve2p-backend.onrender.com/api/deposit`, // Your webhook URL
    },
  };

  try {
    const response = await fetch(TATUM_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Webhook subscription failed:", data);
      throw new Error(data.message || "Subscription failed");
    }

    console.log(
      `✅ Webhook subscribed for ${assetType} address: ${userAddress}`
    );
    return data;
  } catch (err) {
    console.error("Error subscribing webhook:", err.message);
    throw err;
  }
}

async function sendSweepTransaction({ to, privateKey, amount, currency }) {
  const payload = {
    fromPrivateKey: privateKey,
    to,
    amount,
  };

  const url = {
    BTC: "https://api.tatum.io/v3/bitcoin/transaction",
    ETH: "https://api.tatum.io/v3/ethereum/transaction",
    USDT: "https://api.tatum.io/v3/ethereum/transaction",
    USDC: "https://api.tatum.io/v3/ethereum/transaction",
  }[currency];

  if (!url) throw new Error(`Unsupported sweep currency: ${currency}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Sweep failed");

  return data.txId || data.txHash;
}

const getUserPrivateKey = async (asset, index) => {
  try {
    const assetType = asset.toUpperCase();

    const endpoints = {
      BTC: "https://api.tatum.io/v3/bitcoin/wallet/priv",
      ETH: "https://api.tatum.io/v3/ethereum/wallet/priv",
      USDT: "https://api.tatum.io/v3/tron/wallet/priv", // USDT on tron
      USDC: "https://api.tatum.io/v3/tron/wallet/priv", // USDC on tron
    };

    if (!endpoints[assetType]) {
      throw new Error(`Unsupported asset type: ${asset}`);
    }

    const mnemonicEnv = {
      BTC: process.env.BTC_WALLET_MNEMONIC,
      ETH: process.env.ETH_WALLET_MNEMONIC,
      USDT: process.env.TRON_WALLET_MNEMONIC,
      USDC: process.env.TRON_WALLET_MNEMONIC,
    };

    const mnemonic = mnemonicEnv[assetType];
    if (!mnemonic) {
      throw new Error(`Mnemonic not set for ${assetType}`);
    }

    const response = await fetch(endpoints[assetType], {
      method: "POST",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mnemonic,
        index,
        currency: assetType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Private key error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log(data);
    return data.key;
  } catch (err) {
    console.error(
      `❌ Error deriving private key for ${asset} at index ${index}:`,
      err.message
    );
    throw err;
  }
};

const sendTRC20 = async (
  privateKey,
  toAddress,
  amount,
  contractAddress,
  asset
) => {
  if (!contractAddress) {
    throw new Error(`Unsupported TRC20 Contract Address for ${asset}`);
  }

  try {
    const payload = {
      to: toAddress,
      amount: String(amount), // TRC20 uses 6 decimals for USDT/USDC
      fromPrivateKey: privateKey,
      tokenAddress: contractAddress,
      feeLimit: 600,
    };

    // console.log(payload);
    // return;
    const sendTRC20 = await fetch(
      "https://api.tatum.io/v3/tron/trc20/transaction",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "x-api-key": process.env.TATUM_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await sendTRC20.json();
    // console.log(data);
    return data;
  } catch (error) {
    console.log("Sending TRC20 ERROR: ", error);
  }
};

const DECIMALS = 18n; // For USDT
const POLL_INTERVAL_MS = 8000;

async function pollTRC20Deposits(assetType = "USDT") {
  try {
    const walletMap = new Map();
    const wallets = await db.wallet.findMany();
    wallets.forEach((wallet) => {
      walletMap.set(wallet.address, wallet);
    });

    const CONTRACT_ADDRESS = ERC20_CONTRACTS[assetType.toUpperCase()];

    if (!CONTRACT_ADDRESS)
      throw new Error(`Unsupported TRC20 asset: ${assetType}`);
    const url = `https://api.shasta.trongrid.io/v1/contracts/${CONTRACT_ADDRESS}/events?event_name=Transfer&only_confirmed=true`;
    const res = await fetch(url);
    const { data: events } = await res.json();

    if (!Array.isArray(events) || events.length === 0) return;

    for (const event of events) {
      const { from, to, value } = event.result;
      const txId = event.transaction_id;

      const toAddress = TronWeb.address.fromHex(to);

      const wallet = walletMap.get(toAddress);
      if (!wallet) continue;

      const existing = await db.transaction.findFirst({
        where: { txHash: txId },
      });
      if (existing) continue;

      // Check if transaction is recent (1 min window)
      const now = Date.now();
      const timestamp = event.block_timestamp;
      const isRecent = now - timestamp < 3 * 60 * 1000;
      if (!isRecent) continue;

      const amount = Number(BigInt(value)) / Number(10n ** DECIMALS);
      const fromBase58 = TronWeb.address.fromHex(from);

      const payload = {
        id: txId,
        address: toAddress,
        type: "incoming",
        asset: assetType.toUpperCase(),
        network: "TRON",
        amount: amount.toFixed(6),
        txId,
        timestamp,
        blockNumber: event.block_number,
        counterAddress: fromBase58,
        chain: "TRON",
        subscriptionType: "addressEvent",
        transactionType: "PAYMENT",
      };

      console.log("📥 New deposit detected:", payload);

      try {
        const webhookRes = await fetch(
          "https://evolve2p-backend.onrender.com/api/deposit",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (webhookRes.ok) {
          console.log("✅ Webhook sent");
        } else {
          console.warn("⚠️ Webhook failed:", await webhookRes.text());
        }
      } catch (err) {
        console.error("❌ Webhook error:", err.message);
      }
    }
  } catch (err) {
    console.error("❌ Poll error:", err.message);
  }
}

const getLiveRate = async (fromSymbol, toSymbol) => {
  const symbolToId = {
    BTC: "btc-bitcoin",
    ETH: "eth-ethereum",
    USDT: "usdt-tether",
    USDC: "usdc-usd-coin",
  };

  const fromId = symbolToId[fromSymbol];
  const toId = symbolToId[toSymbol];

  if (!fromId || !toId) {
    throw new Error("Unsupported currency symbol");
  }

  const fetchPrice = async (id) => {
    const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch price for ${id}`);
    }
    const data = await res.json();
    return parseFloat(data.quotes.USD.price);
  };

  const fromToUSD = await fetchPrice(fromId);
  const toToUSD = await fetchPrice(toId);

  if (!fromToUSD || !toToUSD) {
    throw new Error("Missing rate data");
  }

  const rate = fromToUSD / toToUSD;
  return rate;
};

const convertCurrency = async (amount, fromSymbol, toSymbol) => {
  if (fromSymbol === toSymbol) return amount;

  const rate = await getLiveRate(fromSymbol, toSymbol);
  return Number((Number(amount) * rate).toFixed(8)); // rounding to 8 decimal places
};

function startPolling(assetType = "USDC") {
  console.log(`📡 Starting TRC20 monitoring for ${assetType}`);
  cron.schedule("*/8 * * * * *", () => pollTRC20Deposits(assetType));
}

module.exports = {
  generateAddress,
  generateIndexFromUserId,
  sendBTC,
  sendETH,
  ERC20_CONTRACTS,
  subscribeToAddressWebhook,
  startPolling,
  sendSweepTransaction,
  getUserPrivateKey,
  sendTRC20,
  convertCurrency,
};
