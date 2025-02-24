const dotenv = require("dotenv")
dotenv.config()

const  { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

module.exports = redis

// await redis.set('foo', 'bar');
// const data = await redis.get('foo');