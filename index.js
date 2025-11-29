const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const cron = require("node-cron");

const { db } = require("./db.js");
const { findUserById } = require("./utils/users.js");

// docs settings
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const { startPolling, ERC20_CONTRACTS } = require("./utils/crypto.js");

const register = require("./routes/register.js");
const login = require("./routes/login.js");
const sendOTP = require("./routes/sendOTP.js");
const verifyEmail = require("./routes/verifyEmail.js");
const checkEmailExist = require("./routes/checkEmailExist.js");
const checkUsernameExist = require("./routes/checkUsernameExist.js");
const updateUser = require("./routes/updateUser.js");
const forgotPassword = require("./routes/forgotPassword.js");
const checkToken = require("./routes/checkToken.js");
const getUser = require("./routes/getUser.js");
const getUserById = require("./routes/getUserById.js");
const getUserOffers = require("./routes/getUserOffers.js");
const kycGetLink = require("./routes/kycGetLink.js");
const kycVerification = require("./routes/kycVerify.js");
const deleteAccount = require("./routes/deleteAccount.js");
const changePassword = require("./routes/changePassword.js");
const generateSecret = require("./routes/generateSecrete.js");
const verifySecrete = require("./routes/verifySecrete.js");
const checkPin = require("./routes/checkPin.js");
const sendSmsOtp = require("./routes/sendSmsOtp.js");
const send = require("./routes/send.js");
const swap = require("./routes/swap.js");
const deposit = require("./routes/deposit.js");
const createOffer = require("./routes/createOffer.js");
const createTrade = require("./routes/createTrade.js");
const getTrade = require("./routes/getTrade.js");
const releaseTrade = require("./routes/releaseTrade.js");
const markTradeAsPaid = require("./routes/MarkTradeAsPaid.js");
const cancleTrade = require("./routes/cancleTrade.js");
const getOffers = require("./routes/getOffers.js");
const getOffer = require("./routes/getOffer.js");
const getPaymentMethods = require("./routes/getPaymentMethods.js");
const openDispute = require("./routes/openDispute.js");
const getDispute = require("./routes/getDispute.js");
const uploadChatProofs = require("./routes/uploadChatProofs.js");
const registerPushToken = require("./routes/registerPushToken.js");
const sendPushNotification = require("./routes/sendPushNotification.js");
const createTrust = require("./routes/createTrust.js");
const forgotPin = require("./routes/forgotPin.js");

const getChats = require("./routes/getChats.js");
const sendChat = require("./routes/sendChat.js");

// Admin
const getUsers = require("./routes/admin/getUsers.js");
const getAdmins = require("./routes/admin/getAdmins.js");
const getUserAdmin = require("./routes/admin/getUser.js");
const loginAdmin = require("./routes/admin/login.js");
const createAdmin = require("./routes/admin/createAdmin.js");
const getOverview = require("./routes/admin/getOverview.js");
const adminPerformAction = require("./routes/admin/adminPerformAction.js");
const adminResetUserPassword = require("./routes/admin/adminResetUserPassword.js");
const adminGetTrades = require("./routes/admin/getTrades.js");
const adminGetTrade = require("./routes/admin/getTrade.js");
const adminGetOffers = require("./routes/admin/getOffers.js");
const adminGetDisputes = require("./routes/admin/getDisputes.js");
const adminGetDispute = require("./routes/admin/getDispute.js");
const adminGetTransactions = require("./routes/admin/getTransactions.js");
const adminGetTransaction = require("./routes/admin/adminGetTransaction.js");
const adminGetSwaps = require("./routes/admin/getSwaps.js");
const adminGetSwap = require("./routes/admin/adminGetSwap.js");
const adminGetPaymentMethods = require("./routes/admin/getPaymentMethods.js");
const adminCreatePaymentMethod = require("./routes/admin/createPaymentMethod.js");
const adminDeletePaymentMethod = require("./routes/admin/deletePaymentMethod.js");
const performOfferAction = require("./routes/admin/performOfferAction.js");
const deleteOffer = require("./routes/admin/deleteOffer.js");
const admingetOffer = require("./routes/admin/getOffer.js");
const resolveDispute = require("./routes/admin/resolveDispute.js");
const adminSendChat = require("./routes/admin/adminSendChat.js");
const adminCancleTrade = require("./routes/admin/adminCancleTrade.js");
const adminSendMail = require("./routes/admin/sendMail.js");
const settings = require("./routes/admin/settings.js");

const app = express();
const server = http.createServer(app);

// setup socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // set your frontend URL later for security
    methods: ["GET", "POST"],
  },
});

// Attach io to app
app.set("io", io);

const PORT = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  const userId = socket.handshake.query.userId;

  if (userId) {
    socket.join(userId); // join a room with the userId
    console.log(`User ${userId} connected and joined room: ${userId}`);
  }

  // Step 3: Join chat room
  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
    console.log(`📥 ${socket.id} joined chat ${chatId}`);
  });

  socket.on("join_trade", (tradeId) => {
    socket.join(tradeId);
    console.log(`📥 ${socket.id} joined trade ${tradeId}`);
  });

  socket.on("leave_chat", (chatId) => {
    socket.leave(chatId);
    console.log(`📤 ${socket.id} left chat ${chatId}`);
  });

  // Step 4: Send + broadcast messages
  socket.on("send_message", async ({ chatId, senderId, content, type }) => {
    try {
      const chat = await db.chat.findUnique({
        where: { id: chatId },
      });

      if (!chat) {
        return socket.emit("error_message", { error: "Chat not found" });
      }

      const message = await db.message.create({
        data: {
          chatId,
          senderId,
          content,
          type: type || "TEXT",
        },
        include: { sender: true },
      });

      io.to(chatId).emit("new_message", message);
      console.log("📩 Message sent in chat:", chatId);
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));

// swagger middleware
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
//Routes
app.use("/api/deposit", deposit);
app.use("/api/auth/register", register); // done
app.use("/api/auth/login", login); // done
app.use("/api/send-otp", sendOTP); // done
app.use("/api/verify-email", verifyEmail); // done
app.use("/api/check-email-exist", checkEmailExist); // done
app.use("/api/check-username-exist", checkUsernameExist); // done
app.use("/api/update-user", updateUser); // done
app.use("/api/forgot-password", forgotPassword); // done
app.use("/api/check-token", checkToken); //done
app.use("/api/check-pin", checkPin); // done
app.use("/api/get-user", getUser); // done
app.use("/api/get-user-by-id", getUserById);
app.use("/api/get-user-offers", getUserOffers);
app.use("/api/kyc-get-link", kycGetLink); // done
app.use("/api/kyc-verification", kycVerification); // done
app.use("/api/delete-account", deleteAccount); // done
app.use("/api/change-password", changePassword); // done
app.use("/api/generate-secrete", generateSecret); // done
app.use("/api/verify-secrete", verifySecrete); // done
app.use("/api/send-sms-otp", sendSmsOtp);
app.use("/api/send", send);
app.use("/api/swap", swap);
app.use("/api/register-push-token", registerPushToken);
app.use("/api/send-push-notification", sendPushNotification);
app.use("/api/create-trust", createTrust);
app.use("/api/reset-pin", forgotPin);

// Trade
app.use("/api/create-trade", createTrade);
app.use("/api/get-trade", getTrade);
app.use("/api/release-trade", releaseTrade);
app.use("/api/mark-trade-as-paid", markTradeAsPaid);
app.use("/api/cancle-trade", cancleTrade);
// end Trade

app.use("/api/create-offer", createOffer);
app.use("/api/get-offers", getOffers); //
app.use("/api/get-offer", getOffer); //
app.use("/api/get-payment-methods", getPaymentMethods); //

// Disput
app.use("/api/open-dispute", openDispute);
app.use("/api/get-dispute", getDispute);
// End of Dispute

// chats
app.use("/api/send-chat", sendChat);
app.use("/api/get-chats", getChats);
app.use("/api/upload-chat-proofs", uploadChatProofs);
// End Chats

// Admin
app.use("/api/admin/auth/register", createAdmin);
app.use("/api/admin/auth/login", loginAdmin);
app.use("/api/admin/users", getUsers);
app.use("/api/admin/admins", getAdmins);
app.use("/api/admin/user", getUserAdmin);
app.use("/api/admin/overview", getOverview);
app.use("/api/admin/perform-action-user", adminPerformAction);
app.use("/api/admin/reset-user-password", adminResetUserPassword);
app.use("/api/admin/get-offers", adminGetOffers);
app.use("/api/admin/get-trades", adminGetTrades);
app.use("/api/admin/get-trade", adminGetTrade);
app.use("/api/admin/get-transactions", adminGetTransactions);
app.use("/api/admin/get-transaction", adminGetTransaction);
app.use("/api/admin/get-swaps", adminGetSwaps);
app.use("/api/admin/get-swap", adminGetSwap);
app.use("/api/admin/get-disputes", adminGetDisputes);
app.use("/api/admin/get-dispute", adminGetDispute);
app.use("/api/admin/get-payment-methods", adminGetPaymentMethods);
app.use("/api/admin/create-payment-method", adminCreatePaymentMethod);
app.use("/api/admin/delete-offer", deleteOffer);
app.use("/api/admin/delete-payment-method", adminDeletePaymentMethod);
app.use("/api/admin/perform-offer-action", performOfferAction);
app.use("/api/admin/get-offer", admingetOffer);
app.use("/api/admin/resolve-dispute", resolveDispute);
app.use("/api/admin/send-chat", adminSendChat);
app.use("/api/admin/cancle-trade", adminCancleTrade);
app.use("/api/admin/send-mail", adminSendMail);
app.use("/api/admin/settings", settings);
// End of Admin

// master
app.use("/api/generate-master-wallet", require("./routes/generateMaster.js"));
app.use(
  "/api/get-user-private-key",
  require("./routes/createPrivateKeyFromIndex.js")
);

// worker to check expired trades
cron.schedule("* * * * *", async () => {
  // every 1 min
  await db.trade.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: {
      status: "CANCELLED",
      canceledAt: new Date(),
    },
  });
});

// startPolling(ERC20_CONTRACTS.USDT);

server.listen(PORT, (error) => {
  if (error) {
    console.log(error.message);
  } else {
    console.log(`Server running on PORT ${PORT}`);
  }
});
