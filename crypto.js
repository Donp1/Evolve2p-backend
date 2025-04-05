// import crypto library
var crypto = require("crypto");

// create the json request object
var cb_access_timestamp = Date.now() / 1000; // in ms
var requestPath = "/payment-methods";

var body = JSON.stringify({
  price: "1.0",
  size: "1.0",
  side: "buy",
  product_id: "BTC-USD",
});
var method = "GET";

// create the prehash string by concatenating required parts
var message = cb_access_timestamp + method + requestPath + body;

// decode the base64 secret
var key = Buffer.from("dd942dd9-454f-441f-8278-52ba828e463a", "base64");

// create a sha256 hmac with the secret
var hmac = crypto.createHmac("sha256", key);

// sign the require message with the hmac and base64 encode the result
var cb_access_sign = hmac.update(message).digest("base64");

fetch("https://api.exchange.coinbase.com/payment-methods", {
  method: "GET",
  redirect: "follow",
  headers: {
    "cb-access-key": "ctUNyHC2lCoiNggXYDJFK8SXNGQsiqZR",
    "cb-access-passphrase": "123456789",
    "KC-API-TIMESTAMP": Date.now(),
    "cb-access-sign": cb_access_sign,
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
})
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
