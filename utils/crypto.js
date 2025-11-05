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
const ecc = require("tiny-secp256k1");
const { ECPairFactory } = require("ecpair");

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

const ERC20_CONTRACTS = {
  USDT: process.env.CONTRACT_ADDRESS_USDT,
};

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

async function sendBTC({
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
  return { txId: broadcast.data };
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

async function sweepTrc20(
  privateKeyHex,
  masterAddress,
  trc20Address,
  tronRpcUrl = "https://api.shasta.trongrid.io"
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

function startPolling(assetType = "USDT") {
  console.log(`📡 Starting TRC20 monitoring for ${assetType}`);
  cron.schedule("*/8 * * * * *", () => pollTRC20Deposits(assetType));
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
};
