const crypto = require("crypto");
const ethers = require("ethers");
const { subscribeToAddressWebhook } = require("./utils/crypto");
require("dotenv").config();

async function generateBTCWallet() {
  try {
    const response = await fetch("https://api.tatum.io/v3/ethereum/wallet", {
      method: "GET",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch BTC wallet:",
        response.status,
        await response.text()
      );
      return;
    }

    const data = await response.json();
    // generateBTCAddressForUser("user-123456789", data.xpub); // Example user ID, replace with actual user ID

    const privateKey = await getMasterPrivateKey(data.mnemonic);
    console.log("✅ ETHEREUM Wallet generated:");
    console.log("Mnemonic:", data.mnemonic);
    console.log("Xpub:", data.xpub);
    console.log("PrivateKey:", privateKey);
  } catch (error) {
    console.log(error);
  }
}

async function getETHMasterPrivateKey(mnemonic) {
  const res = await fetch("https://api.tatum.io/v3/ethereum/wallet/priv", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mnemonic,
      index: 0, // master key (first child at index 0)
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Error:", data);
    return;
  }

  return data.key;
}

async function getTRONMasterPrivateKey() {
  const res = await fetch("https://api.tatum.io/v3/tron/wallet/priv", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mnemonic: process.env.TRON_WALLET_MNEMONIC,
      index: 0, // master key (first child at index 0)
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Error:", data);
    return;
  }

  console.log(data);

  return data.key;
}

async function getBtcMasterAddress() {
  // const addressRes = await axios.get(
  //   `https://api.tatum.io/v3/bitcoin/address/${xpub}/0`,
  //   { headers: HEADERS }
  // );

  // const address = addressRes.data.address;

  const res = await fetch(
    `https://api.tatum.io/v3/ethereum/address/${process.env.ETH_WALLET_XPUB}/0`,
    {
      method: "GET",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Error:", data);
    return;
  }

  console.log(data);
}

function uuidToIndex(uuid) {
  const hash = crypto.createHash("sha256").update(uuid).digest("hex");
  const rawIndex = parseInt(hash.slice(0, 8), 16);
  return rawIndex % 2147483647; // Safe index
}

async function getBTCBalance(address) {
  const url = `https://api.tatum.io/v3/bitcoin/address/balance/${address}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Error getting balance:", data);
    return;
  }

  const currentBalance = parseFloat(data.incoming) - parseFloat(data.outgoing);
  console.log(`✅ Current BTC balance of ${address}: ${currentBalance} BTC`);
  return currentBalance;
}
async function getETHBalance(address) {
  const url = `https://api.tatum.io/v3/ethereum/account/balance/${address}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Error getting balance:", data);
    return;
  }

  // const currentBalance = parseFloat(data.incoming) - parseFloat(data.outgoing);
  // console.log(`✅ Current BTC balance of ${address}: ${currentBalance} BTC`);

  console.log(data);
  return data;
}

async function generateBTCAddressForUser(userId, BTC_XPUB) {
  const index = uuidToIndex(userId);

  const url = `https://api.tatum.io/v3/bitcoin/address/${BTC_XPUB}/${index}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": TATUM_API_KEY,
    },
  });

  if (!res.ok) {
    console.error("❌ Failed to get address:", res.status, await res.text());
    return;
  }

  const { address } = await res.json();
  console.log(`✅ BTC deposit address for user ${userId} (index ${index}):`);
  console.log(address);
  const balance = await getBTCBalance(address);
  console.log("BTC Address Balance: ", balance);
}

async function generateTRONAddressForUser(userId, BTC_XPUB) {
  // const index = uuidToIndex(userId);

  const url = `https://api.tatum.io/v3/tron/address/${BTC_XPUB}/${userId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
    },
  });

  if (!res.ok) {
    console.error("❌ Failed to get address:", res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log(data);
}

async function sendCustomERC20({
  to,
  amount,
  contractAddress,
  fromPrivateKey,
}) {
  try {
    const res = await fetch("https://api.tatum.io/v3/ethereum/transaction", {
      method: "POST",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to, // recipient
        amount: amount.toString(), // string format required
        currency: "ERC20",
        contractAddress, // your deployed token contract
        fromPrivateKey,
        fee: {
          gasLimit: "60000",
          gasPrice: "30",
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Error sending token:", data);
      return null;
    }

    console.log("✅ Transaction sent. TX ID:", data.txId);
    return data;
  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
    return null;
  }
}

const getETHPrivateKey = async (index = 769357989) => {
  const path = `m/44'/60'/0'/0/${index}`;

  const node = ethers.Wallet.fromMnemonic(
    process.env.ETH_WALLET_MNEMONIC,
    path
  );
  console.log("ETH Address:", node.address);
  console.log("ETH Private Key:", node.privateKey);
};

async function getUserPrivateKey() {
  try {
    const response = await fetch(
      "https://api.tatum.io/v3/ethereum/wallet/priv",
      {
        method: "POST",
        headers: {
          "x-api-key": process.env.TATUM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mnemonic: process.env.ETH_WALLET_MNEMONIC,
          index: 769357989,
          currency: "ETH", // Can also be BTC, MATIC, etc.
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Private key error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log(data);
    return data.key;
  } catch (error) {
    console.log(error);
  }
}

async function generateAddFromPrv() {
  try {
    const privateKey =
      "0xea4d89b77331f60df81ca4d50cc1f474104894cc9d8d008c4c2702457619b1c2";
    const wallet = new ethers.Wallet(privateKey);

    console.log("Ethereum Address:", wallet.address);
  } catch (error) {
    console.log(error);
  }
}

const getUserPrivateKeyPro = async (asset, index) => {
  try {
    const assetType = asset.toUpperCase();

    const endpoints = {
      BTC: "https://api.tatum.io/v3/bitcoin/wallet/priv",
      ETH: "https://api.tatum.io/v3/ethereum/wallet/priv",
      USDT: "https://api.tatum.io/v3/ethereum/wallet/priv", // USDT on Ethereum
      USDC: "https://api.tatum.io/v3/ethereum/wallet/priv", // USDC on Ethereum
    };

    if (!endpoints[assetType]) {
      throw new Error(`Unsupported asset type: ${asset}`);
    }

    const mnemonicEnv = {
      BTC: process.env.BTC_WALLET_MNEMONIC,
      ETH: process.env.ETH_WALLET_MNEMONIC,
      USDT: process.env.ETH_WALLET_MNEMONIC,
      USDC: process.env.ETH_WALLET_MNEMONIC,
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

async function sweepFunds({ asset, fromIndex, amount }) {
  const TATUM_API_KEY = process.env.TATUM_API_KEY;

  const MASTER_WALLETS = {
    BTC: process.env.BTC_WALLET_ADDRESS,
    ETH: process.env.ETH_WALLET_ADDRESS,
    USDT: process.env.ETH_WALLET_ADDRESS,
    USDC: process.env.ETH_WALLET_ADDRESS,
  };

  const CONTRACT_ADDRESSES = {
    USDT: process.env.CONTRACT_ADDRESS_USDT, // Sepolia or Mainnet
    USDC: process.env.CONTRACT_ADDRESS_USDC,
  };

  const DECIMALS = {
    USDT: 6,
    USDC: 6,
  };
  const upperAsset = asset.toUpperCase();

  if (!MASTER_WALLETS[upperAsset]) {
    throw new Error(`Unsupported asset type: ${asset}`);
  }

  // Step 1: Derive user's private key
  const fromPrivateKey = await getUserPrivateKeyPro(upperAsset, fromIndex);
  const toAddress = MASTER_WALLETS[upperAsset];

  let url, body;

  // Step 2: Determine endpoint and payload
  switch (upperAsset) {
    case "BTC":
      url = "https://api.tatum.io/v3/bitcoin/transaction";
      body = {
        fromAddress: [
          {
            address: null, // Not needed if fromPrivateKey is provided
            privateKey: fromPrivateKey,
          },
        ],
        to: [
          {
            address: toAddress,
            value: Number(amount).toFixed(8),
          },
        ],
      };
      break;

    case "ETH":
      url = "https://api.tatum.io/v3/ethereum/transaction";
      body = {
        fromPrivateKey,
        to: toAddress,
        amount: Number(amount).toFixed(8),
      };
      break;

    case "USDT":
    case "USDC":
      url = "https://api.tatum.io/v3/blockchain/token/transaction";
      body = {
        chain: "ETH", // or ethereum-sepolia for testnet
        to: toAddress,
        contractAddress: CONTRACT_ADDRESSES[upperAsset],
        digits: DECIMALS[upperAsset],
        amount: String(amount),
        fromPrivateKey,
      };
      break;

    default:
      throw new Error(`Asset ${asset} is not supported for sweeping.`);
  }

  // Step 3: Send transaction
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, currency: upperAsset }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(`❌ Sweep failed for ${asset}:`, result);
    throw new Error(
      `Sweep failed: ${result.message || JSON.stringify(result)}`
    );
  }

  console.log(
    `✅ Sweep successful [${asset}] TX:`,
    result.txId || result.txHash
  );
  return result.txId || result.txHash;
}

async function generateTronWallet() {
  try {
    const res = await fetch("https://api.tatum.io/v3/tron/wallet", {
      method: "GET",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
      },
    });

    const data = await res.json();
    console.log(data);
    console.log("Master Wallet Address:", data.address);
    console.log("Private Key:", data.privateKey);

    return data;
  } catch (error) {
    console.error("❌ Error generating Tron wallet:", error);
  }
}

async function generateTronMasterWallet() {
  const url = "https://api.tatum.io/v3/tron/wallet";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
    },
  });

  const data = await response.json();

  console.log(data);

  console.log("✅ Mnemonic:", data.mnemonic);
  console.log("✅ Xpub:", data.xpub);
  console.log("✅ Master Address (index 0):", data.address);
  console.log("✅ Master Private Key (index 0):", data.privateKey);

  return data;
}

async function getAddressFromXpub(index = 0) {
  const url = `https://api.tatum.io/v3/tron/address/${process.env.TRON_WALLET_XPUB}/${index}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
    },
  });

  const data = await res.json();
  console.log("✅ Master Address (index 0):", data.address);
  return data.address;
}

getAddressFromXpub();

// generateTronWallet();

// getTRONMasterPrivateKey();

// generateTronMasterWallet();

// generateTRONAddressForUser(0, process.env.TRON_WALLET_XPUB);

// sweepFunds({
//   asset: "USDT",
//   fromIndex: 769357989,
//   amount: 20.0, // Adjust amount as needed
// });

// const key = getUserPrivateKeyPro("ETH", 769357989);

// getUserPrivateKey();
// generateAddFromPrv();

// getUserPrivateKey();

// generateBTCWallet();
// getBtcMasterAddress();
// getETHBalance("0x3e36ae53c30485de97a3c8d2f3039f5af3d03155");
// getETHBalance("0x3e36ae53c30485de97a3c8d2f3039f5af3d03155");

// subscribeToAddressWebhook("0x3e36ae53c30485de97a3c8d2f3039f5af3d03155", "ETH");

// sendCustomERC20({
//   to: "0x49e819e7b8d68dc982fe2dcb2008632973d35112",
//   amount: 5,
//   contractAddress: "0xCeE163CD8551990d780aAaE8a0d585fAA9E579dA",
//   fromPrivateKey: process.env.ETH_WALLET_PRIVATE_KEY,
// });
