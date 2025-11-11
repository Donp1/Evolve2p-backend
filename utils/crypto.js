const dotenv = require("dotenv");
dotenv.config();

const { TronWeb } = require("tronweb");
const cron = require("node-cron");
const axios = require("axios");

const crypto = require("crypto");
const { db } = require("../db");
const { ethers } = require("ethers");
const { abi } = require("../constants");

const bitcoin = require("bitcoinjs-lib");
const hdkey = require("hdkey");
const ecc = require("tiny-secp256k1");
const { ECPairFactory } = require("ecpair");
const { BIP32Factory } = require("bip32");
const bip39 = require("bip39");

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

const ERC20_CONTRACTS = {
  USDT: process.env.CONTRACT_ADDRESS_USDT,
};

async function generateAddress(currency, index) {
  if (currency === "BTC") {
    const wallet = await deriveBtcFromMnemonic(
      process.env.BTC_WALLET_MNEMONIC,
      index
    );
    return { ...wallet };
  }

  if (currency === "ETH") {
    const wallet = deriveEvmFromMnemonic(
      process.env.ETH_WALLET_MNEMONIC,
      index
    );
    return { ...wallet };
  }

  if (currency === "USDC") {
    const wallet = deriveEvmFromMnemonic(
      process.env.BNB_WALLET_MNEMONIC,
      index
    );
    return { ...wallet };
  }

  if (currency === "USDT") {
    const wallet = deriveTronFromMnemonic(
      process.env.TRON_WALLET_MNEMONIC,
      index
    );

    return { ...wallet };
  }
}

function generateIndexFromUserId(userId) {
  const hash = crypto.createHash("sha256").update(userId).digest("hex");
  const intValue = parseInt(hash.substring(0, 8), 16); // 32-bit integer
  const maxSafeIndex = 2_147_483_647; // XPUB limit
  return intValue % maxSafeIndex;
}

// async function sendBTC(fromPrivateKey, toAddress, amount) {
//   const value = Number(Number(amount).toFixed(8)); // BTC uses up to 8 decimals
//   if (isNaN(value) || value <= 0) {
//     throw new Error("Invalid amount for BTC transaction");
//   }

//   const res = await fetch("https://api.tatum.io/v3/bitcoin/transaction", {
//     method: "POST",
//     headers: {
//       "x-api-key": process.env.TATUM_API_KEY,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       fromAddress: [
//         {
//           address: process.env.BTC_WALLET_ADDRESS, // Replace with your BTC wallet address
//           privateKey: fromPrivateKey, // Replace with your BTC wallet private key
//         },
//       ],
//       to: [
//         {
//           address: toAddress,
//           value, // Amount in BTC
//         },
//       ],
//       // fee: "0.00005",
//     }),
//   });

//   const data = await res.json();
//   console.log(data);
//   return data;
// }

// async function sendETH(fromPrivateKey, toAddress, amount) {
//   const res = await fetch("https://api.tatum.io/v3/ethereum/transaction", {
//     method: "POST",
//     headers: {
//       "x-api-key": process.env.TATUM_API_KEY,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       to: toAddress,
//       currency: "ETH",
//       // amount: Number(Number(amount).toFixed(18)), // ETH uses up to 18 decimals
//       amount: String(Number(amount).toFixed(18)), // Tatum expects string for large numbers
//       fromPrivateKey: fromPrivateKey,
//     }),
//   });

//   const data = await res.json();
//   console.log(data);
//   return data;
// }

// async function sendBEP20(fromPrivateKey, toAddress, amount, contractAddress) {
//   const provider = new ethers.providers.JsonRpcProvider(
//     "https://data-seed-prebsc-1-s1.binance.org:8545/"
//   );

//   const wallet = new ethers.Wallet(fromPrivateKey, provider);

//   // console.log("Connected address:", wallet.address);
//   const contract = new ethers.Contract(contractAddress, abi, wallet);

//   const decimals = await contract.decimals();
//   const parsedAmount = ethers.utils.parseUnits(amount, decimals);

//   const tx = await contract.transfer(toAddress, parsedAmount);

//   const receipt = await tx.wait();

//   if (receipt?.transactionHash)
//     return {
//       txId: receipt?.transactionHash,
//     };
// }

// assetType: 'BTC' | 'ETH'

// export async function sendETH({
//   fromPrivateKey,
//   toAddress,
//   amount,
//   rpcUrl = "https://sepolia.gateway.tenderly.co", // Default to Sepolia
//   confirmations = 1,
// }) {
//   try {
//     // 1️⃣ Connect wallet and provider
//     const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
//     const wallet = new ethers.Wallet(fromPrivateKey, provider);
//     const senderAddress = await wallet.getAddress();
//     console.log(`🔑 Sending from: ${senderAddress}`);

//     // 2️⃣ Parse ETH amount
//     const value = ethers.utils.parseEther(amount.toString());

//     // 3️⃣ Check sender balance
//     const balance = await provider.getBalance(senderAddress);
//     if (balance.lt(value)) {
//       throw new Error("Insufficient ETH balance for transfer.");
//     }

//     // 4️⃣ Estimate gas limit
//     const gasEstimate = await provider.estimateGas({
//       to: toAddress,
//       from: senderAddress,
//       value,
//     });

//     // 5️⃣ Get current gas price and apply +10% buffer
//     const gasPrice = await provider.getGasPrice();
//     const adjustedGasPrice = gasPrice.mul(110).div(100);

//     // 6️⃣ Ensure enough ETH for both amount + gas
//     const gasCost = gasEstimate.mul(adjustedGasPrice);
//     if (balance.lt(value.add(gasCost))) {
//       return {
//         error: true,
//         error: "Not enough ETH to cover both amount and gas fees.",
//       };
//     }

//     // 7️⃣ Create transaction object
//     const tx = {
//       to: toAddress,
//       value,
//       gasLimit: gasEstimate,
//       gasPrice: adjustedGasPrice,
//     };

//     console.log(`🚀 Sending ${amount} ETH to ${toAddress}...`);

//     // 8️⃣ Send transaction
//     const sentTx = await wallet.sendTransaction(tx);
//     console.log(`⏳ Transaction sent: ${sentTx.hash}`);

//     // 9️⃣ Wait for confirmation
//     const receipt = await sentTx.wait(confirmations);
//     console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

//     // 🔟 Return structured result
//     return {
//       txId: receipt.transactionHash,
//     };
//   } catch (err) {
//     console.error("❌ sendETH Error:", err);
//     return {
//       success: false,
//       error: err.message || "Transaction failed",
//     };
//   }
// }

async function subscribeToAddressWebhook(userAddress, assetType) {
  const TATUM_API_URL = "https://api.tatum.io/v4/subscription";
  let subscriptionType, attr;

  switch (assetType.toUpperCase()) {
    case "BTC":
      subscriptionType = "ADDRESS_EVENT";
      attr = { address: userAddress, chain: "bitcoin-testnet" };
      break;

    case "ETH":
      subscriptionType = "ADDRESS_EVENT";
      attr = { address: userAddress, chain: "ethereum-sepolia" };
      break;

    case "USDC":
      subscriptionType = "INCOMING_FUNGIBLE_TX";
      attr = {
        chain: "bsc-testnet", // change to "BSC" for mainnet
        // contractAddress: "0x2D6c122a99109E9FC0eaaDa3DC8e3966AC86050B",
        address: userAddress,
      };
      break;

    default:
      throw new Error(`Unsupported asset type: ${assetType}`);
  }

  const payload = {
    type: subscriptionType,
    attr: {
      ...attr,
      url: `https://evolve2p-backend.onrender.com/api/deposit`,
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

    console.log(`✅ Webhook subscribed for ${assetType}:`, data);
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

// const sendTRC20 = async (
//   privateKey,
//   toAddress,
//   amount,
//   contractAddress,
//   asset
// ) => {
//   if (!contractAddress) {
//     throw new Error(`Unsupported TRC20 Contract Address for ${asset}`);
//   }

//   try {
//     const payload = {
//       to: toAddress,
//       amount: String(amount), // TRC20 uses 6 decimals for USDT/USDC
//       fromPrivateKey: privateKey,
//       tokenAddress: contractAddress,
//       feeLimit: 600,
//     };

//     const sendTRC20 = await fetch(
//       "https://api.tatum.io/v3/tron/trc20/transaction",
//       {
//         method: "POST",
//         body: JSON.stringify(payload),
//         headers: {
//           "x-api-key": process.env.TATUM_API_KEY,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const data = await sendTRC20.json();
//     // console.log(data);
//     return data;
//   } catch (error) {
//     console.log("Sending TRC20 ERROR: ", error);
//   }
// };

// async function sendETH({
//   fromPrivateKey,
//   toAddress,
//   amount,
//   rpcUrl = "https://sepolia.gateway.tenderly.co", // Default to Sepolia
//   confirmations = 1,
// }) {
//   try {
//     // 1️⃣ Connect wallet and provider
//     const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
//     const wallet = new ethers.Wallet(fromPrivateKey, provider);
//     const senderAddress = await wallet.getAddress();
//     console.log(`🔑 Sending from: ${senderAddress}`);

//     // 2️⃣ Parse ETH amount
//     const value = ethers.utils.parseEther(amount.toString());

//     // 3️⃣ Check sender balance
//     const balance = await provider.getBalance(senderAddress);
//     if (balance.lt(value)) {
//       throw new Error("Insufficient ETH balance for transfer.");
//     }

//     // 4️⃣ Estimate gas limit
//     const gasEstimate = await provider.estimateGas({
//       to: toAddress,
//       from: senderAddress,
//       value,
//     });

//     // 5️⃣ Get current gas price and apply +10% buffer
//     const gasPrice = await provider.getGasPrice();
//     const adjustedGasPrice = gasPrice.mul(110).div(100);

//     // 6️⃣ Ensure enough ETH for both amount + gas
//     const gasCost = gasEstimate.mul(adjustedGasPrice);
//     if (balance.lt(value.add(gasCost))) {
//       throw new Error("Not enough ETH to cover both amount and gas fees.");
//     }

//     // 7️⃣ Create transaction object
//     const tx = {
//       to: toAddress,
//       value,
//       gasLimit: gasEstimate,
//       gasPrice: adjustedGasPrice,
//     };

//     console.log(`🚀 Sending ${amount} ETH to ${toAddress}...`);

//     // 8️⃣ Send transaction
//     const sentTx = await wallet.sendTransaction(tx);
//     console.log(`⏳ Transaction sent: ${sentTx.hash}`);

//     // 9️⃣ Wait for confirmation
//     const receipt = await sentTx.wait(confirmations);
//     console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

//     // 🔟 Return structured result
//     return {
//       success: true,
//       txId: receipt.transactionHash,
//       blockNumber: receipt.blockNumber,
//       gasUsed: receipt.gasUsed.toString(),
//       gasPrice: ethers.utils.formatUnits(adjustedGasPrice, "gwei") + " gwei",
//       from: senderAddress,
//       to: toAddress,
//       amountSent: amount,
//     };
//   } catch (err) {
//     console.error("❌ sendETH Error:", err);
//     return {
//       success: false,
//       error: err.message || "Transaction failed",
//     };
//   }
// }

async function sendETH(fromPrivateKey, toAddress, amount, isFee = false) {
  const res = await fetch("https://api.tatum.io/v3/ethereum/transaction", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
      "x-testnet-type": "ethereum-sepolia",
    },
    body: JSON.stringify({
      to: toAddress,
      currency: "ETH",
      amount: String(Number(amount).toFixed(18)),
      fromPrivateKey: fromPrivateKey,
    }),
  });

  const data = await res.json();
  console.log(data);
  return { ...data, success: true, isFee };
}

async function sendTRX(fromPrivateKey, toAddress, amount, isFee = false) {
  const res = await fetch("https://api.tatum.io/v3/tron/transaction", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: toAddress,
      amount: String(Number(amount).toFixed(18)),
      fromPrivateKey: fromPrivateKey,
    }),
  });

  const data = await res.json();
  console.log(data);
  return { ...data, success: true, isFee };
}

async function sendBSC(fromPrivateKey, toAddress, amount, isFee = false) {
  const res = await fetch("https://api.tatum.io/v3/bsc/transaction", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
      "x-testnet-type": "ethereum-sepolia",
    },
    body: JSON.stringify({
      to: toAddress,
      currency: "BSC",
      amount: String(Number(amount).toFixed(18)),
      fromPrivateKey: fromPrivateKey,
    }),
  });

  const data = await res.json();
  console.log(data);
  return { ...data, success: true, isFee };
}

// async function sendBTC({
//   wif,
//   to,
//   amountSats = null,
//   feeRate = 10,
//   network = "testnet",
// }) {
//   const NETWORK =
//     network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

//   const BLOCKSTREAM_API =
//     network === "mainnet"
//       ? "https://blockstream.info/api"
//       : "https://blockstream.info/testnet/api";

//   const VBYTE_INPUT = 68; // P2WPKH input size
//   const VBYTE_OUTPUT = 31; // P2WPKH output size
//   const TX_OVERHEAD = 10; // Overhead bytes
//   const DUST_LIMIT = 294; // Avoid dust outputs

//   const keyPair = ECPair.fromWIF(wif, NETWORK);

//   // ✅ Ensure Buffer pubkey for compatibility
//   const pubkeyBuffer = Buffer.from(keyPair.publicKey);
//   const { address: fromAddress } = bitcoin.payments.p2wpkh({
//     pubkey: pubkeyBuffer,
//     network: NETWORK,
//   });

//   if (!fromAddress) throw new Error("Failed to derive address from WIF.");

//   console.log("🔑 From:", fromAddress);

//   // --- 1️⃣ Fetch UTXOs ---
//   const utxosRes = await axios.get(
//     `${BLOCKSTREAM_API}/address/${fromAddress}/utxo`
//   );
//   const utxos = utxosRes.data;

//   if (!Array.isArray(utxos) || utxos.length === 0) {
//     throw new Error("No UTXOs available for this address.");
//   }

//   // Sort by largest first
//   utxos.sort((a, b) => b.value - a.value);

//   // --- 2️⃣ Select inputs ---
//   let selected = [];
//   let inputSum = 0n;
//   const amountTarget = amountSats !== null ? BigInt(amountSats) : null;

//   if (amountTarget === null) {
//     // Sweep all
//     for (const u of utxos) {
//       selected.push(u);
//       inputSum += BigInt(u.value);
//     }
//   } else {
//     for (const u of utxos) {
//       selected.push(u);
//       inputSum += BigInt(u.value);
//       const estVSize =
//         TX_OVERHEAD + selected.length * VBYTE_INPUT + 2 * VBYTE_OUTPUT;
//       const estFee = BigInt(Math.ceil(feeRate * estVSize));
//       if (inputSum >= amountTarget + estFee) break;
//     }
//   }

//   if (selected.length === 0)
//     throw new Error("Insufficient UTXOs for this transaction.");

//   // --- 3️⃣ Compute fee and outputs ---
//   const outputs = amountTarget === null ? 1 : 2;
//   const estVSize =
//     TX_OVERHEAD + selected.length * VBYTE_INPUT + outputs * VBYTE_OUTPUT;
//   const fee = BigInt(Math.ceil(feeRate * estVSize));

//   let valueToSend;
//   let change = 0n;

//   if (amountTarget === null) {
//     // Sweep all
//     if (inputSum <= fee) throw new Error("Not enough balance to cover fee.");
//     valueToSend = inputSum - fee;
//     if (valueToSend <= BigInt(DUST_LIMIT))
//       throw new Error("Resulting output is dust.");
//   } else {
//     if (inputSum < amountTarget + fee)
//       throw new Error("Insufficient funds (including fee).");
//     valueToSend = amountTarget;
//     change = inputSum - amountTarget - fee;
//     if (change > 0n && change < BigInt(DUST_LIMIT)) change = 0n;
//   }

//   // --- 4️⃣ Build PSBT ---
//   const psbt = new bitcoin.Psbt({ network: NETWORK });

//   for (const u of selected) {
//     const rawTxRes = await axios.get(`${BLOCKSTREAM_API}/tx/${u.txid}/hex`);
//     const rawTxHex = rawTxRes.data;
//     psbt.addInput({
//       hash: u.txid,
//       index: u.vout,
//       nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
//     });
//   }

//   psbt.addOutput({ address: to, value: Number(valueToSend) });
//   if (change > 0n)
//     psbt.addOutput({ address: fromAddress, value: Number(change) });

//   // --- 5️⃣ Sign and finalize ---
//   selected.forEach((u, i) => {
//     psbt.signInput(i, {
//       publicKey: Buffer.from(keyPair.publicKey),
//       sign: (hash) => Buffer.from(ecc.sign(hash, keyPair.privateKey)),
//     });
//   });

//   try {
//     psbt.validateSignaturesOfAllInputs((pubkey, msgHash, signature) => {
//       return ecc.verify(msgHash, pubkey, signature);
//     });
//   } catch (err) {
//     console.warn("⚠️ Signature validation warning:", err.message);
//   }
//   psbt.finalizeAllInputs();

//   // --- 6️⃣ Broadcast ---
//   const txHex = psbt.extractTransaction().toHex();
//   const broadcast = await axios.post(`${BLOCKSTREAM_API}/tx`, txHex, {
//     headers: { "Content-Type": "text/plain" },
//   });

//   console.log("✅ Transaction sent! TXID:", broadcast.data);
//   return { txId: broadcast.data };
// }

async function sendBTC(
  fromPrivateKey,
  fromAddress,
  toAddress,
  amount,
  isFee = false
) {
  const res = await fetch("https://api.tatum.io/v3/bitcoin/transaction", {
    method: "POST",
    headers: {
      "x-api-key": process.env.TATUM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fromAddress: [
        {
          address: fromAddress,
          privateKey: fromPrivateKey,
        },
      ],

      to: [
        {
          address: toAddress,
          value: Number(Number(amount).toFixed(8)), // BTC uses up to 8 decimals
        },
      ],
    }),
  });

  const data = await res.json();
  console.log(data);
  return { ...data, success: true, isFee };
}

async function sendBEP20(
  fromPrivateKey,
  toAddress,
  amount,
  contractAddress = "0x2D6c122a99109E9FC0eaaDa3DC8e3966AC86050B",
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
    const receipt = await tx.wait();

    // 8️⃣ Return result
    console.log(`✅ Transaction confirmed: ${receipt.transactionHash}`);
    return {
      success: true,
      txId: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    console.error("❌ BEP20 Send Error:", err);
    return {
      success: false,
      error: err.message || "Transaction failed",
    };
  }
}

async function sendTRC20({
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

async function sweepTrc20(address, privateKey, amount) {
  try {
    const childBalance = await getTronBalance(address);
    const balanceNum = Number(childBalance);

    if (balanceNum < 2) {
      const sendGas = await sendTRX(
        process.env.TRON_WALLET_PRIVATE_KEY,
        address,
        "2", // send 2 TRX for fees
        true
      );
      console.log("Gas Data: ", sendGas);
      if (!sendGas || sendGas.errorCode || !sendGas.txId) {
        throw new Error(
          `Gas top-up failed: ${sendGas.message || "unknown error"}`
        );
      }
    }

    console.log(`🚀 Sweeping  USDT from ${address} to master wallet...`);
    const sweepResult = await sendTRC20({
      privateKey,
      to: process.env.TRON_WALLET_ADDRESS,
      contractAddress: ERC20_CONTRACTS.USDT,
      amount, // keep 1 TRX as reserve
      mainnet: false,
    });

    if (!sweepResult || sweepResult.errorCode) {
      throw new Error(
        `Sweep failed: ${sweepResult.message || "unknown error"}`
      );
    }

    console.log(
      `✅ Sweep successful! TXID: ${sweepResult.txId || sweepResult.hash}`
    );
    return sweepResult;
  } catch (err) {
    console.error("❌ TRC20 Sweep Error:", err);
    return {
      success: false,
      error: err.message || "Transaction failed",
    };
  }
}

async function getTronBalance(address) {
  try {
    const tronWeb = new TronWeb({
      fullHost: "https://api.shasta.trongrid.io", // or https://api.shasta.trongrid.io for testnet
    });
    // Get the balance in SUN (1 TRX = 1,000,000 SUN)
    const balanceInSun = await tronWeb.trx.getBalance(address);
    const balanceInTrx = tronWeb.fromSun(balanceInSun);
    console.log(`💰 Address: ${address}`);
    console.log(`Balance: ${balanceInTrx} TRX`);
    return balanceInTrx;
  } catch (err) {
    console.error("❌ Error fetching balance:", err);
    return null;
  }
}

async function getBSCBalance(address) {
  try {
    const url = `https://api.tatum.io/v3/bsc/account/balance/${address}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Tatum API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`💰 Balance of ${address}: ${data.balance} ETH`);
    return data.balance;
  } catch (error) {
    console.error("❌ Error fetching balance:", error.message);
    return { error: true, message: error.message };
  }
}

async function getEthSepoliaBalance(address) {
  try {
    const url = `https://api.tatum.io/v3/ethereum/account/balance/${address}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Tatum API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`💰 Balance of ${address}: ${data.balance} ETH`);
    return data.balance;
  } catch (error) {
    console.error("❌ Error fetching balance:", error.message);
    return { error: true, message: error.message };
  }
}

async function gasPrice(chain, from, to, amount) {
  try {
    const url = `https://api.tatum.io/v4/blockchainOperations/gas`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": process.env.TATUM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chain, from, to, amount }),
    });

    if (!response.ok) {
      throw new Error(`Tatum API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("gasPrice: ", data);
    return data;
  } catch (error) {
    console.error("❌ Error fetching balance:", error.message);
    return { error: true, message: error.message };
  }
}

async function sweepETH(address, privateKey) {
  try {
    const childBalance = await getEthSepoliaBalance(address);
    const balanceNum = Number(childBalance);

    if (balanceNum <= 0) {
      console.log("❌ No balance to sweep");
      return;
    }

    // Step 2: Subtract gas reserve (keep 0.0003 ETH)
    const gasFee = await gasPrice(
      "ETH",
      address,
      process.env.ETH_WALLET_ADDRESS,
      String(balanceNum + 0.0003)
    );

    const gasPriceWei = ethers.BigNumber.from(gasFee.gasPrice);
    const gasLimit = ethers.BigNumber.from(gasFee.gasLimit);
    const gasFeeWei = gasPriceWei.mul(gasLimit);
    const gasFeeEth = ethers.utils.formatEther(gasFeeWei);

    // Step 1: Top up child wallet with gas (if needed)
    console.log("⛽ Sending gas to child wallet...");
    console.log("Amount to send as fee: ", Number(gasFeeEth) + 0.002);
    const sendGas = await sendETH(
      process.env.ETH_WALLET_PRIVATE_KEY,
      address,
      String(Number(gasFeeEth) + 0.0003), // keep 0.0003 ETH as reserve
      true
    );
    console.log("Gas Data: ", sendGas);
    if (!sendGas || sendGas.errorCode || !sendGas.txId) {
      throw new Error(
        `Gas top-up failed: ${sendGas.message || "unknown error"}`
      );
    }

    const amountToSend = balanceNum - Number(gasFeeEth);

    if (amountToSend <= 0) {
      console.log("Not enough ETH for gas fee.");
      return;
    }

    console.log(
      `🚀 Sweeping ${amountToSend} ETH from ${address} to master wallet...`
    );
    const sweepResult = await sendETH(
      privateKey,
      process.env.ETH_WALLET_ADDRESS,
      amountToSend
    );

    if (!sweepResult || sweepResult.errorCode) {
      throw new Error(
        `Sweep failed: ${sweepResult.message || "unknown error"}`
      );
    }

    console.log(
      `✅ Sweep successful! TXID: ${sweepResult.txId || sweepResult.hash}`
    );
    return sweepResult;
  } catch (error) {
    console.error("❌ sweepETH error:", error.message);
  }
}

async function sweepBep20(address, privateKey, bep20Amount) {
  try {
    const gasFee = await gasPrice(
      "BSC",
      address,
      process.env.BNB_WALLET_ADDRESS,
      String(0.0005)
    );

    const gasPriceWei = ethers.BigNumber.from(gasFee.gasPrice);
    const gasLimit = ethers.BigNumber.from(gasFee.gasLimit);
    const gasFeeWei = gasPriceWei.mul(gasLimit);
    const gasFeeEth = ethers.utils.formatEther(gasFeeWei);

    // Step 1: Top up child wallet with gas (if needed)
    console.log("⛽ Sending gas to child wallet...");
    console.log("Amount to send as fee: ", Number(gasFeeEth) + 0.0003);

    const childBalance = await getBSCBalance(address);
    const balanceNum = Number(childBalance);

    if (balanceNum < Number(gasFeeEth) + 0.0003) {
      const sendGas = await sendBSC(
        process.env.BNB_WALLET_PRIVATE_KEY,
        address,
        String(Number(gasFeeEth) + 0.0003), // keep 0.0003 BSC as reserve
        true
      );
      console.log("Gas Data: ", sendGas);
      if (!sendGas || sendGas.errorCode || !sendGas.txId) {
        throw new Error(
          `Gas top-up failed: ${sendGas.message || "unknown error"}`
        );
      }
    }

    console.log(`🚀 Sweeping  USDC from ${address} to master wallet...`);
    const sweepResult = await sendBEP20(
      privateKey,
      process.env.BNB_WALLET_ADDRESS,
      bep20Amount, // keep 0.0003 ETH as reserve
      process.env.CONTRACT_ADDRESS_USDC
    );

    if (!sweepResult || sweepResult.errorCode) {
      throw new Error(
        `Sweep failed: ${sweepResult.message || "unknown error"}`
      );
    }

    console.log(
      `✅ Sweep successful! TXID: ${sweepResult.txId || sweepResult.hash}`
    );
    return sweepResult;
  } catch (error) {
    console.error("❌ sweepBep20 error:", error.message);
  }
}

async function sweepBTC({
  masterPrivateKey,
  userIndex,
  feeRate = 10, // sats/vbyte
  network = "testnet",
  to,
}) {
  try {
    // 🔹 Setup network and API endpoint
    const NETWORK =
      network === "mainnet"
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    const BLOCKSTREAM_API =
      network === "mainnet"
        ? "https://blockstream.info/api"
        : "https://blockstream.info/testnet/api";

    // 🔹 Prepare key pairs
    const masterKey = ECPair.fromWIF(masterPrivateKey, NETWORK);
    const masterPubkey = Buffer.from(masterKey.publicKey);
    const masterAddress = to;

    const childPrivateKeyData = await getUserPrivateKeyPro("BTC", userIndex);

    const childPrivateKey = childPrivateKeyData?.data?.privatekey;
    if (!childPrivateKey) {
      throw new Error("Could not retrieve child private key");
    }

    const childKey = ECPair.fromWIF(childPrivateKey, NETWORK);
    const { address: childAddress } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(childKey.publicKey),
      network: NETWORK,
    });

    console.log(`👑 Master Wallet: ${masterAddress}`);
    console.log(`👶 Child Wallet: ${childAddress}`);

    // --- 1️⃣ Check if child has any UTXOs ---
    const utxosRes = await axios.get(
      `${BLOCKSTREAM_API}/address/${childAddress}/utxo`
    );
    const utxos = utxosRes.data;

    if (!Array.isArray(utxos) || utxos.length === 0) {
      console.log("❌ No BTC to sweep in child wallet.");
      return;
    }

    // --- 2️⃣ Check child BTC balance ---
    const totalBalance = utxos.reduce((sum, u) => sum + BigInt(u.value), 0n);
    console.log(`💰 Child balance: ${Number(totalBalance) / 1e8} BTC`);

    // --- 3️⃣ Check if child has enough balance for fees ---
    const estVSize = 10 + utxos.length * 68 + 1 * 31; // 1 output (sweep)
    const estFee = BigInt(feeRate * estVSize);

    if (totalBalance <= estFee) {
      console.log("⚠️ Child wallet has no usable funds after fee.");
      return;
    }

    // --- 4️⃣ If child has no BTC for gas (for future transactions), top up from master ---
    const childUtxosRes = await axios.get(
      `${BLOCKSTREAM_API}/address/${childAddress}/utxo`
    );
    const hasGas = childUtxosRes.data.length > 0;

    if (!hasGas) {
      console.log("⚡ Sending small gas top-up to child wallet...");
      const gasTx = await sendBTC({
        wif: masterPrivateKey,
        to: childAddress,
        amountSats: 10_000, // 0.0001 BTC
        feeRate,
        network,
      });
      console.log("⛽ Gas sent TXID:", gasTx.txId);
      // Wait a bit for confirmation before sweeping
      await new Promise((r) => setTimeout(r, 10000));
    }

    // --- 5️⃣ Build sweep transaction ---
    const psbt = new bitcoin.Psbt({ network: NETWORK });

    for (const u of utxos) {
      const rawTxRes = await axios.get(`${BLOCKSTREAM_API}/tx/${u.txid}/hex`);
      psbt.addInput({
        hash: u.txid,
        index: u.vout,
        nonWitnessUtxo: Buffer.from(rawTxRes.data, "hex"),
      });
    }

    const valueToSend = totalBalance - estFee;
    psbt.addOutput({ address: masterAddress, value: Number(valueToSend) });

    // --- 6️⃣ Sign inputs ---
    utxos.forEach((_, i) => {
      psbt.signInput(i, {
        publicKey: Buffer.from(childKey.publicKey),
        sign: (hash) => Buffer.from(ecc.sign(hash, childKey.privateKey)),
      });
    });

    psbt.finalizeAllInputs();
    const txHex = psbt.extractTransaction().toHex();

    // --- 7️⃣ Broadcast ---
    const broadcast = await axios.post(`${BLOCKSTREAM_API}/tx`, txHex, {
      headers: { "Content-Type": "text/plain" },
    });

    console.log(`✅ Sweep complete! TXID: ${broadcast.data}`);

    return {
      success: true,
      txId: broadcast.data,
      from: childAddress,
      to: masterAddress,
      amount: Number(valueToSend),
    };
  } catch (err) {
    console.error("❌ BTC Sweep Error:", err);
    return {
      success: false,
      error: err.message || "Transaction failed",
    };
  }
}

const POLL_INTERVAL_MS = 8000;
const DECIMALS = 18n; // For USDT
const processedTxs = new Set();

async function pollTRC20Deposits(contractAddress, assetType = "USDT") {
  try {
    const walletMap = new Map();
    const wallets = await db.wallet.findMany();
    wallets.forEach((wallet) => walletMap.set(wallet.address, wallet));

    if (!contractAddress)
      throw new Error(`Unsupported TRC20 asset: ${contractAddress}`);

    const url = `https://api.shasta.trongrid.io/v1/contracts/${contractAddress}/events?event_name=Transfer&only_confirmed=true`;
    const res = await fetch(url);
    const { data: events } = await res.json();

    if (!Array.isArray(events) || events.length === 0) return;

    for (const event of events) {
      const { from, to, value } = event.result;
      const txId = event.transaction_id;
      const toAddress = TronWeb.address.fromHex(to);

      // prevent duplicates within last few minutes
      if (processedTxs.has(txId)) continue;

      const wallet = walletMap.get(toAddress);
      if (!wallet) continue;

      const existing = await db.transaction.findFirst({
        where: {
          txHash: {
            equals: txId,
            mode: "insensitive",
          },
        },
      });

      if (existing) continue;

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

      if (processedTxs.has(txId) === false && !existing) {
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
            console.log("✅ Webhook sent:", txId);
            processedTxs.add(txId);
            setTimeout(() => processedTxs.delete(txId), 5 * 60 * 1000); // forget after 5 mins
          } else {
            console.warn("⚠️ Webhook failed:", await webhookRes.text());
          }
        } catch (err) {
          console.error("❌ Webhook error:", err.message);
        }
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

function startPolling(contractAddress) {
  console.log(
    `📡 Starting TRC20 monitoring for ${contractAddress} Contract Address`
  );
  cron.schedule("*/8 * * * * *", () => pollTRC20Deposits(contractAddress));
}

async function convertCryptoToFiat(symbol, amount, fiat) {
  try {
    // Map tickers to CoinPaprika IDs
    const symbolMap = {
      BTC: "btc-bitcoin",
      ETH: "eth-ethereum",
      USDT: "usdt-tether",
      USDC: "usdc-usd-coin",
    };
    const coinId = symbolMap[symbol.toUpperCase()];
    if (!coinId) throw new Error(`Unsupported symbol: ${symbol}`);

    // 1. Get crypto price in USD
    const cryptoRes = await fetch(
      `https://api.coinpaprika.com/v1/tickers/${coinId}`
    );
    if (!cryptoRes.ok) throw new Error("Failed to fetch crypto price");
    const cryptoData = await cryptoRes.json();
    const cryptoPriceUSD = cryptoData?.quotes?.USD?.price;
    if (!cryptoPriceUSD) throw new Error("Invalid price data");

    // 2. If fiat is USD, skip conversion
    let usdToFiatRate = 1;
    if (fiat.toUpperCase() !== "USD") {
      const forexRes = await fetch(`https://open.er-api.com/v6/latest/USD`);
      if (!forexRes.ok) throw new Error("Failed to fetch forex rates");
      const forexData = await forexRes.json();
      usdToFiatRate = forexData?.rates?.[fiat.toUpperCase()];
      if (!usdToFiatRate) throw new Error(`Unsupported fiat: ${fiat}`);
    }

    // 3. Calculate final amount
    return amount * cryptoPriceUSD * usdToFiatRate;
  } catch (err) {
    console.error("Error converting:", err.message);
    throw new Error("Failed to convert crypto to fiat");
  }
}

async function getMarketPrice(symbol, fiat) {
  const symbolMap = {
    BTC: "btc-bitcoin",
    ETH: "eth-ethereum",
    USDT: "usdt-tether",
    USDC: "usdc-usd-coin",
  };
  const coinId = symbolMap[symbol.toUpperCase()];
  if (!coinId) throw new Error(`Unsupported symbol: ${symbol}`);

  const cryptoRes = await fetch(
    `https://api.coinpaprika.com/v1/tickers/${coinId}`
  );
  const cryptoData = await cryptoRes.json();
  const priceUSD = cryptoData?.quotes?.USD?.price;
  if (!priceUSD) throw new Error("Failed to fetch market price");

  // If currency is USD, skip forex
  if (fiat.toUpperCase() === "USD") return priceUSD;

  const forexRes = await fetch(`https://open.er-api.com/v6/latest/USD`);
  const forexData = await forexRes.json();
  const rate = forexData.rates[fiat.toUpperCase()];
  if (!rate) throw new Error(`Unsupported fiat: ${fiat}`);
  return priceUSD * rate;
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
    console.log("Address: ", address);

    return {
      Mnemonic: data.mnemonic,
      Xpub: data.xpub,
      privateKey,
      address: address,
    };
  } catch (error) {
    console.log(error);
  }
}

async function generateBTCWallet() {
  try {
    const response = await fetch("https://api.tatum.io/v3/bitcoin/wallet", {
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

    const privateKey = await getBTCMasterPrivateKey(data.mnemonic);
    const address = await generateAddress("BTC", data.xpub, 0);

    console.log("✅ ETHEREUM Wallet generated:");
    console.log("Mnemonic:", data.mnemonic);
    console.log("Xpub:", data.xpub);
    console.log("privateKey", privateKey);
    console.log("Address: ", address);

    return {
      Mnemonic: data.mnemonic,
      Xpub: data.xpub,
      privateKey,
      address: address,
    };
  } catch (error) {
    console.log(error);
  }
}

async function generateBSCWallet() {
  try {
    const response = await fetch("https://api.tatum.io/v3/bsc/wallet", {
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

    const privateKey = await getBSCMasterPrivateKey(data.mnemonic);
    const address = await generateAddress("USDC", data.xpub, 0);

    console.log("✅ ETHEREUM Wallet generated:");
    console.log("Mnemonic:", data.mnemonic);
    console.log("Xpub:", data.xpub);
    console.log("privateKey", privateKey);
    console.log("Address: ", address);

    return {
      Mnemonic: data.mnemonic,
      Xpub: data.xpub,
      privateKey,
      address: address,
    };
  } catch (error) {
    console.log(error);
  }
}

async function generateTRONWallet() {
  try {
    const response = await fetch("https://api.tatum.io/v3/tron/wallet", {
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

    const privateKey = await getTRONMasterPrivateKey(data.mnemonic);
    const address = await generateAddress("USDT", data.xpub, 0);

    console.log("✅ ETHEREUM Wallet generated:");
    console.log("Mnemonic:", data.mnemonic);
    console.log("Xpub:", data.xpub);
    console.log("privateKey", privateKey);
    console.log("Address: ", address);

    return {
      Mnemonic: data.mnemonic,
      Xpub: data.xpub,
      privateKey,
      address: address,
    };
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
      USDT: "https://api.tatum.io/v3/tron/wallet/priv",
      USDC: "https://api.tatum.io/v3/bsc/wallet/priv",
    };

    if (!endpoints[assetType]) {
      throw new Error(`Unsupported asset type: ${asset}`);
    }

    const mnemonicEnv = {
      BTC: process.env.BTC_WALLET_MNEMONIC,
      ETH: process.env.ETH_WALLET_MNEMONIC,
      USDT: process.env.TRON_WALLET_MNEMONIC,
      USDC: process.env.BNB_WALLET_MNEMONIC,
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

function deriveEvmFromMnemonic(mnemonic, index, pathBase = "m/44'/60'/0'/0") {
  try {
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
    };
  } catch (error) {
    console.log(error);
  }
}

function deriveTronFromMnemonic(mnemonic, index = 0) {
  try {
    // Convert mnemonic to seed
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    // Derive TRON path
    const root = hdkey.fromMasterSeed(seed);
    const path = `m/44'/195'/0'/0/${index}`;
    const child = root.derive(path);

    // Private key in hex
    const privateKey = child.privateKey.toString("hex");

    // Initialize TronWeb with private key
    const tronWeb = new TronWeb({
      fullHost: "https://api.trongrid.io", // or Shasta testnet endpoint
      privateKey,
    });

    // Derive the TRON address
    const address = tronWeb.address.fromPrivateKey(privateKey);
    console.log({ privateKey, address });
    return { privateKey, address };
  } catch (error) {
    console.log(error);
  }
}

async function deriveBtcFromMnemonic(mnemonic, index = 0, options = {}) {
  try {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic");
    }

    const { network = "testnet", scriptType = "p2wpkh", account = 0 } = options;

    const NETWORK =
      network === "testnet"
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;

    // Coin type (per SLIP-44): 0 = mainnet, 1 = testnet
    const coinType = network === "testnet" ? 1 : 0;

    // Select purpose per BIP standard
    let purpose;
    switch (scriptType) {
      case "p2pkh":
        purpose = 44; // Legacy (BIP44)
        break;
      case "p2sh-p2wpkh":
        purpose = 49; // SegWit (wrapped, BIP49)
        break;
      case "p2wpkh":
      default:
        purpose = 84; // Native SegWit (BIP84)
        break;
    }

    // Derivation path: m / purpose' / coin_type' / account' / change / address_index
    const path = `m/${purpose}'/${coinType}'/${account}'/0/${index}`;

    // Derive seed → root → child
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed, NETWORK);
    const child = root.derivePath(path);

    if (!child.privateKey) {
      throw new Error("Could not derive private key (invalid node)");
    }

    const privateKeyHex = child.privateKey.toString("hex");
    const wif = child.toWIF();
    const pubkey = Buffer.from(child.publicKey); // ✅ Fixed: ensure Buffer type

    // Derive address depending on script type
    let address;
    if (scriptType === "p2pkh") {
      address = bitcoin.payments.p2pkh({ pubkey, network: NETWORK }).address;
    } else if (scriptType === "p2sh-p2wpkh") {
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey, network: NETWORK });
      address = bitcoin.payments.p2sh({
        redeem: p2wpkh,
        network: NETWORK,
      }).address;
    } else {
      // Native SegWit (bech32)
      address = bitcoin.payments.p2wpkh({ pubkey, network: NETWORK }).address;
    }

    return {
      address,
      privateKey: wif,
    };
  } catch (error) {
    console.log(error);
  }
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
  convertCryptoToFiat,
  getMarketPrice,
  sendBEP20,
  sweepTrc20,
  sweepETH,
  sweepBep20,
  sweepBTC,
  getUserPrivateKeyPro,
  generateETHWallet,
  generateBTCWallet,
  generateBSCWallet,
  generateTRONWallet,
};
