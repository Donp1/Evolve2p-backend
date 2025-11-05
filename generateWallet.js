require("dotenv").config();
const crypto = require("crypto");
const { ethers } = require("ethers");
const { TronWeb } = require("tronweb");
const axios = require("axios");
const https = require("https");

const bitcoin = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const { ECPairFactory } = require("ecpair");

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// const { subscribeToAddressWebhook } = require("./utils/crypto");
const { abi } = require("./constants");
const { ifError } = require("assert");

async function generateAddress(currency, xpub, index) {
  let url;
  if (currency === "BTC") {
    url = `https://api.tatum.io/v3/bitcoin/address/${xpub}/${index}`;
  } else if (currency === "ETH") {
    url = `https://api.tatum.io/v3/ethereum/address/${xpub}/${index}`;
  } else if (currency === "USDT") {
    url = `https://api.tatum.io/v3/tron/address/${xpub}/${index}`;
  } else if (currency === "USDC") {
    url = `https://api.tatum.io/v3/bsc/address/${xpub}/${index}`;
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

async function generateETHWallet() {
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

    const privateKey = await getETHMasterPrivateKey(data.mnemonic);
    const address = await generateAddress("ETH", data.xpub, 0);

    console.log("✅ ETHEREUM Wallet generated:");
    console.log("Mnemonic:", data.mnemonic);
    console.log("Xpub:", data.xpub);
    console.log("privateKey", privateKey);

    return {
      Mnemonic: data.mnemonic,
      Xpub: data.xpub,
      PrivateKey: privateKey,
      address: address,
    };
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

async function getBNBMasterPrivateKey() {
  const res = await fetch("https://api.tatum.io/v3/bsc/wallet/priv", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mnemonic: process.env.BNB_WALLET_MNEMONIC,
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

async function generateBNBWallet() {
  try {
    const res = await fetch("https://api.tatum.io/v3/bsc/wallet", {
      method: "GET",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
      },
    });

    const data = await res.json();
    console.log(data);

    return data;
  } catch (error) {
    console.error("❌ Error generating BNB wallet:", error);
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
  const url = `https://api.tatum.io/v3/bsc/address/${process.env.BNB_WALLET_XPUB}/${index}`;

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

// async function sendBEP20(fromPrivateKey, toAddress, amount, contractAddress) {
//   try {
//     const res = await fetch(
//       "https://api.tatum.io/v3/blockchain/token/transaction",
//       {
//         method: "POST",
//         headers: {
//           "x-api-key": process.env.TATUM_API_KEY,
//           "Content-Type": "application/json",
//           accept: "application/json",
//         },
//         body: JSON.stringify({
//           to: toAddress,
//           amount: String(Number(amount).toFixed(18)),
//           // currency: "BSC20",
//           contractAddress, // ✅ BEP20 contract (e.g. USDT)
//           fromPrivateKey,
//         }),
//       }
//     );

//     const data = await res.json();
//     console.log("BEP20 send response:", data);
//     return data;
//   } catch (error) {
//     console.log(error);
//   }
// }

async function sendBEP20Native() {
  const amount = "10";
  const to = "0x7042b33e1b88b377e27df1cb903674cddb88b686";
  const provider = new ethers.providers.JsonRpcProvider(
    "https://data-seed-prebsc-1-s1.binance.org:8545/"
  );

  const wallet = new ethers.Wallet(
    process.env.BNB_WALLET_PRIVATE_KEY,
    provider
  );

  // console.log("Connected address:", wallet.address);
  const contract = new ethers.Contract(
    "0x2D6c122a99109E9FC0eaaDa3DC8e3966AC86050B",
    abi,
    wallet
  );

  const decimals = await contract.decimals();
  const parsedAmount = ethers.utils.parseUnits(amount, decimals);

  const tx = await contract.transfer(to, parsedAmount);

  const receipt = await tx.wait();
  console.log("receipt: ", receipt);
  console.log("tx: ", tx);
}

async function sendBEP20(
  fromPrivateKey,
  toAddress,
  amount,
  contractAddress,
  rpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545/" // default: BSC testnet
) {
  try {
    // 1️⃣ Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(fromPrivateKey, provider);
    console.log(`🔑 Sending from: ${wallet.address}`);

    // 2️⃣ Setup contract
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    // 3️⃣ Get token decimals and parse amount
    const decimals = await contract.decimals();
    const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals);

    // 4️⃣ Estimate gas
    const gasEstimate = await contract.estimateGas.transfer(
      toAddress,
      parsedAmount
    );

    // 5️⃣ Get gas price and add small buffer (10%)
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(110).div(100); // +10%

    // 6️⃣ Optional: check wallet balance for gas fee
    const balance = await provider.getBalance(wallet.address);
    const gasCost = gasEstimate.mul(adjustedGasPrice);
    if (balance.lt(gasCost)) {
      throw new Error("Insufficient BNB balance for gas fee");
    }

    // 7️⃣ Send transaction
    console.log(`🚀 Sending ${amount} tokens to ${toAddress}...`);
    const tx = await contract.transfer(toAddress, parsedAmount, {
      gasLimit: gasEstimate,
      gasPrice: adjustedGasPrice,
    });

    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await tx.wait(1);

    // 8️⃣ Return result
    console.log(`✅ Transaction confirmed: ${receipt.transactionHash}`);
    return {
      txId: receipt.transactionHash,
    };
  } catch (err) {
    console.error("❌ BEP20 Send Error:", err);
    return {
      success: false,
      error: err.message || "Transaction failed",
    };
  }
}

async function sendETH() {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://sepolia.gateway.tenderly.co"
  );

  const wallet = new ethers.Wallet(
    process.env.ETH_WALLET_PRIVATE_KEY,
    provider
  );

  const value = ethers.utils.parseEther(String(0.0001));
  const gasPrice = await wallet.getGasPrice();

  // const balance = await wallet.getBalance();
  // const address = wallet.address;
  // const network = await provider.getNetwork();
  // console.log("Chain: ", network);
  // console.log("address: ", address);
  // console.log("balance: ", ethers.utils.formatEther(balance._hex));

  const tx = await wallet.sendTransaction({
    to: "0xfe4f687252745af90c2f15873449520062c32fc9",
    gasPrice,
    value,
  });

  const receipt = await tx.wait(2);

  console.log(receipt);
}

async function sendETH({
  fromPrivateKey,
  toAddress,
  amount,
  rpcUrl = "https://sepolia.gateway.tenderly.co", // Default to Sepolia
  confirmations = 1,
}) {
  try {
    // 1️⃣ Connect wallet and provider
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(fromPrivateKey, provider);
    const senderAddress = await wallet.getAddress();
    console.log(`🔑 Sending from: ${senderAddress}`);

    // 2️⃣ Parse ETH amount
    const value = ethers.utils.parseEther(amount.toString());

    // 3️⃣ Check sender balance
    const balance = await provider.getBalance(senderAddress);
    if (balance.lt(value)) {
      throw new Error("Insufficient ETH balance for transfer.");
    }

    // 4️⃣ Estimate gas limit
    const gasEstimate = await provider.estimateGas({
      to: toAddress,
      from: senderAddress,
      value,
    });

    // 5️⃣ Get current gas price and apply +10% buffer
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(110).div(100);

    // 6️⃣ Ensure enough ETH for both amount + gas
    const gasCost = gasEstimate.mul(adjustedGasPrice);
    if (balance.lt(value.add(gasCost))) {
      throw new Error("Not enough ETH to cover both amount and gas fees.");
    }

    // 7️⃣ Create transaction object
    const tx = {
      to: toAddress,
      value,
      gasLimit: gasEstimate,
      gasPrice: adjustedGasPrice,
    };

    console.log(`🚀 Sending ${amount} ETH to ${toAddress}...`);

    // 8️⃣ Send transaction
    const sentTx = await wallet.sendTransaction(tx);
    console.log(`⏳ Transaction sent: ${sentTx.hash}`);

    // 9️⃣ Wait for confirmation
    const receipt = await sentTx.wait(confirmations);
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

    // 🔟 Return structured result
    return {
      success: true,
      txId: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: ethers.utils.formatUnits(adjustedGasPrice, "gwei") + " gwei",
      from: senderAddress,
      to: toAddress,
      amountSent: amount,
    };
  } catch (err) {
    console.error("❌ sendETH Error:", err);
    return {
      success: false,
      error: err.message || "Transaction failed",
    };
  }
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

async function sweepTrc20(
  privateKeyHex,
  tronRpcUrl,
  trc20Address,
  masterAddress
) {
  const tronWeb = new TronWeb({
    fullHost: tronRpcUrl,
    privateKey: privateKeyHex,
  });
  const sender = tronWeb.address.fromPrivateKey(privateKeyHex);

  // 1) token balance (TRC20)
  const contract = await tronWeb.contract().at(trc20Address);
  const balance = await contract.balanceOf(sender).call();
  if (balance.toString() === "0") return null;

  // 2) check TRX balance for fees
  const trxBalance = await tronWeb.trx.getBalance(sender); // in SUN
  // estimate small top-up threshold, e.g. 1 TRX = 1_000_000 SUN
  if (trxBalance < 1000000) throw new Error("INSUFFICIENT_TRX_FOR_FEE");

  // 3) perform transfer
  const tx = await contract.transfer(masterAddress, balance).send();
  console.log(tx);
  return tx; // tx id
}

async function sweepETH(PRIVATE_KEY, MASTER_ADDRESS) {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://sepolia.drpc.org"
  );
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 ETH balance:", ethers.utils.formatEther(balance));

  if (balance.isZero()) return console.log("⚠️ No ETH to sweep.");

  const gasPrice = await provider.getGasPrice();
  const gasLimit = 21000;
  const gasCost = gasPrice.mul(gasLimit);

  const amountToSend = balance.sub(gasCost);
  if (amountToSend.lte(0)) return console.log("⚠️ Not enough ETH for gas.");

  console.log(
    `🚀 Sending ${ethers.utils.formatEther(
      amountToSend
    )} ETH to ${MASTER_ADDRESS}`
  );
  const tx = await wallet.sendTransaction({
    to: MASTER_ADDRESS,
    value: amountToSend,
    gasPrice,
    gasLimit,
  });
  const receipt = await tx.wait();

  if (receipt.transactionHash) {
    return { txId: receipt.transactionHash };
  }

  return { ifError: false, message: "Sweeping failed" };
}

async function sweepBep20(PRIVATE_KEY, TOKEN_ADDRESS, MASTER_WALLET) {
  try {
    // 1️⃣ Setup provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(
      "https://data-seed-prebsc-1-s1.binance.org:8545/"
    );
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`🔑 Sweeping from: ${wallet.address}`);

    // 2️⃣ Setup contract
    const contract = new ethers.Contract(TOKEN_ADDRESS, abi, wallet);

    // 3️⃣ Get token balance
    const tokenBalance = await contract.balanceOf(wallet.address);
    if (tokenBalance === 0n) {
      console.log("❌ No tokens to sweep.");
      return;
    }

    const decimals = await contract.decimals();
    console.log(
      `💰 Token Balance: ${ethers.utils.formatUnits(tokenBalance, decimals)}`
    );

    // 4️⃣ Estimate gas for transfer
    const gasEstimate = await contract.estimateGas.transfer(
      MASTER_WALLET,
      tokenBalance
    );
    const gasPrice = await provider.getFeeData();

    const totalGasCost = gasEstimate * gasPrice.gasPrice;
    const bnbBalance = await provider.getBalance(wallet.address);

    if (bnbBalance < totalGasCost) {
      console.log("⚠️ Insufficient BNB for gas fee. Cannot sweep.");
      return;
    }

    // 5️⃣ Send transfer transaction
    console.log(
      `🚀 Sending ${ethers.utils.formatUnits(
        tokenBalance,
        decimals
      )} tokens to ${MASTER_WALLET}...`
    );

    const tx = await contract.transfer(MASTER_WALLET, tokenBalance, {
      gasLimit: gasEstimate,
      gasPrice: gasPrice.gasPrice,
    });

    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();

    console.log(receipt);

    return {
      txId: receipt.transactionHash,
    };
  } catch (err) {
    console.error("❌ BEP20 Sweep Error:", err);
    return {
      success: false,
      error: err.message || "Transaction failed",
    };
  }
}

async function sendBtc({
  wif,
  to,
  amountSats = null,
  feeRate = 10,
  network = "testnet",
}) {
  const NETWORK =
    network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

  const BLOCKSTREAM_API =
    network === "mainnet"
      ? "https://blockstream.info/api"
      : "https://blockstream.info/testnet/api";

  const VBYTE_INPUT = 68; // P2WPKH input size
  const VBYTE_OUTPUT = 31; // P2WPKH output size
  const TX_OVERHEAD = 10; // Overhead bytes
  const DUST_LIMIT = 294; // Avoid dust outputs

  const keyPair = ECPair.fromWIF(wif, NETWORK);

  // ✅ Ensure Buffer pubkey for compatibility
  const pubkeyBuffer = Buffer.from(keyPair.publicKey);
  const { address: fromAddress } = bitcoin.payments.p2wpkh({
    pubkey: pubkeyBuffer,
    network: NETWORK,
  });

  if (!fromAddress) throw new Error("Failed to derive address from WIF.");

  console.log("🔑 From:", fromAddress);

  // --- 1️⃣ Fetch UTXOs ---
  const utxosRes = await axios.get(
    `${BLOCKSTREAM_API}/address/${fromAddress}/utxo`
  );
  const utxos = utxosRes.data;

  if (!Array.isArray(utxos) || utxos.length === 0) {
    throw new Error("No UTXOs available for this address.");
  }

  // Sort by largest first
  utxos.sort((a, b) => b.value - a.value);

  // --- 2️⃣ Select inputs ---
  let selected = [];
  let inputSum = 0n;
  const amountTarget = amountSats !== null ? BigInt(amountSats) : null;

  if (amountTarget === null) {
    // Sweep all
    for (const u of utxos) {
      selected.push(u);
      inputSum += BigInt(u.value);
    }
  } else {
    for (const u of utxos) {
      selected.push(u);
      inputSum += BigInt(u.value);
      const estVSize =
        TX_OVERHEAD + selected.length * VBYTE_INPUT + 2 * VBYTE_OUTPUT;
      const estFee = BigInt(Math.ceil(feeRate * estVSize));
      if (inputSum >= amountTarget + estFee) break;
    }
  }

  if (selected.length === 0)
    throw new Error("Insufficient UTXOs for this transaction.");

  // --- 3️⃣ Compute fee and outputs ---
  const outputs = amountTarget === null ? 1 : 2;
  const estVSize =
    TX_OVERHEAD + selected.length * VBYTE_INPUT + outputs * VBYTE_OUTPUT;
  const fee = BigInt(Math.ceil(feeRate * estVSize));

  let valueToSend;
  let change = 0n;

  if (amountTarget === null) {
    // Sweep all
    if (inputSum <= fee) throw new Error("Not enough balance to cover fee.");
    valueToSend = inputSum - fee;
    if (valueToSend <= BigInt(DUST_LIMIT))
      throw new Error("Resulting output is dust.");
  } else {
    if (inputSum < amountTarget + fee)
      throw new Error("Insufficient funds (including fee).");
    valueToSend = amountTarget;
    change = inputSum - amountTarget - fee;
    if (change > 0n && change < BigInt(DUST_LIMIT)) change = 0n;
  }

  // --- 4️⃣ Build PSBT ---
  const psbt = new bitcoin.Psbt({ network: NETWORK });

  for (const u of selected) {
    const rawTxRes = await axios.get(`${BLOCKSTREAM_API}/tx/${u.txid}/hex`);
    const rawTxHex = rawTxRes.data;
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
    });
  }

  psbt.addOutput({ address: to, value: Number(valueToSend) });
  if (change > 0n)
    psbt.addOutput({ address: fromAddress, value: Number(change) });

  // --- 5️⃣ Sign and finalize ---
  selected.forEach((u, i) => {
    psbt.signInput(i, {
      publicKey: Buffer.from(keyPair.publicKey),
      sign: (hash) => Buffer.from(ecc.sign(hash, keyPair.privateKey)),
    });
  });

  try {
    psbt.validateSignaturesOfAllInputs((pubkey, msgHash, signature) => {
      return ecc.verify(msgHash, pubkey, signature);
    });
  } catch (err) {
    console.warn("⚠️ Signature validation warning:", err.message);
  }
  psbt.finalizeAllInputs();

  // --- 6️⃣ Broadcast ---
  const txHex = psbt.extractTransaction().toHex();
  const broadcast = await axios.post(`${BLOCKSTREAM_API}/tx`, txHex, {
    headers: { "Content-Type": "text/plain" },
  });

  console.log("✅ Transaction sent! TXID:", broadcast.data);
  return { txid: broadcast.data };
}

async function sendTrc20({
  privateKey,
  to,
  contractAddress,
  amount,
  mainnet = true,
}) {
  try {
    const rpc = mainnet
      ? "https://api.trongrid.io" // ✅ Mainnet
      : "https://api.shasta.trongrid.io"; // 🧪 Testnet

    const tronWeb = new TronWeb({
      fullHost: rpc,
      privateKey,
    });

    // --- 1️⃣ Load contract
    const contract = await tronWeb.contract().at(contractAddress);

    // --- 2️⃣ Fetch token decimals
    const decimals = Number(await contract.decimals().call());

    // --- 3️⃣ Convert amount to smallest unit as string
    const amountInSun = BigInt(
      Math.round(Number(amount) * 10 ** decimals)
    ).toString();

    // --- 4️⃣ Get sender
    const sender = tronWeb.address.fromPrivateKey(privateKey);
    console.log(`🔑 From: ${sender}`);
    console.log(`📦 Sending ${amount} tokens to ${to}`);

    // --- 5️⃣ Send TRC20 transfer
    const tx = await contract
      .transfer(to, amountInSun)
      .send({ feeLimit: 100_000_000 }, privateKey);

    console.log(`✅ TX broadcast successfully! TXID: ${tx}`);

    return {
      success: true,
      txId: tx,
    };
  } catch (err) {
    console.error("❌ TRC20 Send Error:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}

function deriveChildFromMnemonic(mnemonic, index, pathBase = "m/44'/60'/0'/0") {
  if (!mnemonic || mnemonic.split(" ").length < 12) {
    throw new Error("Invalid mnemonic");
  }
  const path = `${pathBase}/${index}`;
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);

  console.log("address: ", wallet.address);
  console.log("privateKey: ", wallet.privateKey);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    wallet, // ethers.Wallet instance you can connect to a provider
  };
}

async function sweepETH2(
  CHILD_PRIVATE_KEY,
  MASTER_PRIVATE_KEY,
  MASTER_ADDRESS,
  RPC_URL = "https://sepolia.drpc.org"
) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  const masterWallet = new ethers.Wallet(MASTER_PRIVATE_KEY, provider);
  const childWallet = new ethers.Wallet(CHILD_PRIVATE_KEY, provider);

  const masterAddress = await masterWallet.getAddress();
  const childAddress = await childWallet.getAddress();

  console.log(`🔍 Sweep start: child=${childAddress}, master=${masterAddress}`);

  // 1️⃣ Check child's balance
  const childBalance = await provider.getBalance(childAddress);
  console.log(
    `💰 Child balance: ${ethers.utils.formatEther(childBalance)} ETH`
  );

  // If child has no balance to sweep, stop
  if (childBalance.isZero()) {
    console.log("⚠️ No ETH to sweep from child wallet.");
    return { ok: false, reason: "no_balance" };
  }

  // 2️⃣ Estimate gas fee for sweep
  const gasPrice = await provider.getGasPrice();
  const gasLimit = 21000;
  const gasNeeded = gasPrice.mul(gasLimit);

  // 3️⃣ If child wallet has less than gasNeeded, top up from master
  if (childBalance.lte(gasNeeded)) {
    console.log(
      `💨 Sending gas from master to child (${ethers.utils.formatEther(
        gasNeeded
      )} ETH)...`
    );

    const gasTx = await masterWallet.sendTransaction({
      to: childAddress,
      value: gasNeeded, // send exactly the gas cost
    });
    await gasTx.wait();

    console.log(`✅ Gas sent to child. TX: ${gasTx.hash}`);

    // Wait for provider to update balance
    await new Promise((res) => setTimeout(res, 5000));
  }

  // 4️⃣ Recheck child balance
  const newBalance = await provider.getBalance(childAddress);
  const finalGasCost = gasPrice.mul(gasLimit);
  const amountToSend = newBalance.sub(finalGasCost);

  if (amountToSend.lte(0)) {
    console.log("⚠️ Not enough ETH to sweep after gas top-up.");
    return { ok: false, reason: "insufficient_after_gas" };
  }

  console.log(
    `🚀 Sweeping ${ethers.utils.formatEther(
      amountToSend
    )} ETH from ${childAddress} to master ${MASTER_ADDRESS}`
  );

  // 5️⃣ Sweep transaction
  const sweepTx = await childWallet.sendTransaction({
    to: MASTER_ADDRESS,
    value: amountToSend,
    gasLimit,
    gasPrice,
  });

  console.log(`📤 Sweep TX sent: ${sweepTx.hash}`);
  const receipt = await sweepTx.wait();

  if (receipt.status === 1) {
    console.log(`✅ Sweep successful! Hash: ${receipt.transactionHash}`);
    return {
      ok: true,
      childAddress,
      masterAddress,
      sweptAmount: ethers.utils.formatEther(amountToSend),
      txHash: receipt.transactionHash,
    };
  } else {
    console.log("❌ Sweep failed.");
    return { ok: false, reason: "tx_failed" };
  }
}

async function getETHMasterPrivateKey(mnemonic, index) {
  const res = await fetch("https://api.tatum.io/v3/ethereum/wallet/priv", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mnemonic,
      index, // master key (first child at index 0)
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

function generateIndexFromUserId(userId) {
  const hash = crypto.createHash("sha256").update(userId).digest("hex");
  const intValue = parseInt(hash.substring(0, 8), 16); // 32-bit integer
  const maxSafeIndex = 2_147_483_647; // XPUB limit
  return intValue % maxSafeIndex;
}

generateETHWallet().catch(console.error);

// generateAddress(
//   "ETH",
//   "xpub6FDPuti6jitHcXRpx3ygbtx46QhQEeY9HGw6z2chWHrgWRArgGJ5Nkj4e166HsHfs2GzHxXBx9EFyWF21Gp1YGb11sHcEpLySm5dykXki45",
//   0
// ).catch(console.error);

// console.log(generateIndexFromUserId("7b36591d-8b06-4136-bb92-1d06124c18bf"));

// getETHMasterPrivateKey(process.env.ETH_WALLET_MNEMONIC, 0).catch(console.error);

// console.log(generateIndexFromUserId("7b36591d-8b06-4136-bb92-1d06124c18bf"));
// deriveChildFromMnemonic(
//   process.env.ETH_WALLET_MNEMONIC,
//   generateIndexFromUserId("7b36591d-8b06-4136-bb92-1d06124c18bf")
// );

// generateETHWallet().catch(console.error);

// https
//   .get("https://api.tatum.io/v3/bitcoin/info", (res) => {
//     console.log("status:", res.statusCode);
//   })
//   .on("error", console.error);

// sendTrc20({
//   privateKey: process.env.TRON_WALLET_PRIVATE_KEY,
//   to: "TWVXKrsWbBfE8QdnW58HwfsBCXuavfVzpx",
//   contractAddress: process.env.CONTRACT_ADDRESS_USDT,
//   amount: 10,
//   mainnet: false,
// }).catch(console.error);

// (async () => {
//   try {
//     // Send specific amount (10,000 sats) on testnet
//     const result = await sendBtc({
//       wif: process.env.BTC_WALLET_PRIVATE_KEY,
//       to: "tb1qzpl9yf2809yvscmmtca8a5aw0dc69hcauel6dw",
//       amountSats: 10000, // send 10k sats
//       feeRate: 10, // sats/vbyte
//       network: "testnet", // or 'mainnet'
//     });
//     console.log("TXID:", result.txid);

//     // Sweep all balance (mainnet example)
//     /*
//     const sweep = await sendBtc({
//       wif: "Kx...mainnet_wif...",
//       to: "bc1q...destination_mainnet...",
//       amountSats: null,   // null = sweep all
//       feeRate: 8,
//       network: "mainnet",
//     });
//     console.log("Sweep TXID:", sweep.txid);
//     */
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//   }
// })();

// sweepBep20(
//   process.env.BNB_WALLET_PRIVATE_KEY,
//   "0x2D6c122a99109E9FC0eaaDa3DC8e3966AC86050B",
//   "0x4cd1a86e4efb88c869fc283040dfe406950cdb1a"
// ).catch(console.error);

// sweepETH(
//   process.env.ETH_WALLET_PRIVATE_KEY,
//   "0x4cd1a86e4efb88c869fc283040dfe406950cdb1a"
// ).catch(console.error);

// sweepTrc20(
//   process.env.TRON_WALLET_PRIVATE_KEY,
//   "https://api.shasta.trongrid.io",
//   process.env.CONTRACT_ADDRESS_USDT,
//   "TWVXKrsWbBfE8QdnW58HwfsBCXuavfVzpx"
// ).catch(console.error);

// (async () => {
//   const result = await sendBTC({
//     fromWIF: process.env.BTC_WALLET_PRIVATE_KEY, // BTC testnet private key
//     toAddress: "tb1qajvt7e48ra8e0p9wxudh8g80yjlm9nvyrmfywd",
//     amountBTC: "0.000001",
//     networkType: "testnet",
//   });

//   console.log(result);
//   console.log(process.env.BTC_WALLET_PRIVATE_KEY);
// })();

// sendETH(
//   process.env.ETH_WALLET_PRIVATE_KEY,
//   "0xfe4f687252745af90c2f15873449520062c32fc9",
//   0.0001
// ).catch(console.error);

// sendBEP20(
//   process.env.BNB_WALLET_PRIVATE_KEY,
//   "0x7042b33e1b88b377e27df1cb903674cddb88b686",
//   5,
//   "0x2D6c122a99109E9FC0eaaDa3DC8e3966AC86050B"
// ).catch(console.error);

// getBNBMasterPrivateKey();

// getAddressFromXpub();

// generateBNBWallet();

// getAddressFromXpub();

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

module.exports = {
  generateETHWallet,
};
