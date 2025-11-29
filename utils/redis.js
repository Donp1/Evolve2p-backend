// utils/redis.js
const { createClient } = require("redis");
const dotenv = require("dotenv");
dotenv.config();

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (err) => console.error("Redis Error:", err));

async function connectRedis() {
  try {
    await redis.connect();
    console.log("Redis connected successfully");
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
}

module.exports = { redis, connectRedis };
