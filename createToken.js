const { sign } = require("jsonwebtoken");
const crypto = require("crypto");

const key_name = "Evolve2p";
const key_secret =
  "------BEGIN PRIVATE KEY-----MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQD0zaf1AYnSI7gUvg6oZBQmCbnn0e1/wnutVv9xTIK9G7IUaZMRa1qZ+1HICfVAG2ZqSeNgPgtHMoLZjW5TkylZ+Q5nKdpIX3Z501RfuvCtykOBcEemqnr9pQmO2o0loL6XuLpWaWB9Iqs5dh3En6nedKP8U8AMNtNpXP2dG3NFoHGOzG6JHxwdcl+lvNb7XBzIv21sUYSLgeIwsoc8pTEaSNS2K9WXqhiMP1c+EQKdR3jzaBmYfSBPJieL6K/4ZDS22DBtkI756EjfsTtDmpPZVPJdnIQmaxYGPDI8TVdmonfjRRvvmI2Tj9pqRyuGm5M8eRid0gplgbQrskGJhP/5AgMBAAECggEAQTckXmXZhGzVllkHaJ64q2V97B8FyTpTXltF07YRQjXFnCB/+G0EBu9n2wWkGz7xarFibHo64O245CIEWSlkI77wslT4/LzJwCynVpVjlrjCgRIbVHAoMbgssqzQW0zWWW7x3SFXfh6lRLqNtZrfUw75vLfG+roEWhZWzerJK6vMD/2vEPcXGC7w3PzlOBnUgSG+JAFgDliIL1h8HHXN+h83u7AVOv3GGVOl0dGnsxbe3LBpzRsOULSwE6Bh0YHGgtVhwCnjwugnIg594N/BB/W4oSELboIFXLdWIGA5IS6wZSeX1nOAzmSORSvQRV7H7X/mFSpNZ2Q6H3ws4QWfnQKBgQD9oGHjyXuQgpyxSFVJTcl+uo/kLMd3pi6ptxWG2I1zMcObFQLT+Y1SuxZ17AMTnAjiy7J2ASzZntvI448h2EOknjSkkM7JAYX345ff9HU56e2a8hlMqV9Ze6ch2WWDs5s887Fo+RSnd9AXJEN1xzc3Pq0+b5X3hxd1xUp9dhyUxwKBgQD3GCLLox3+miUfyJvS31aFFcNGmCAFmQZ3kkf6rFpVnKqPHaLuAyAOTx4wUUj1fVfWOVDPP+j0eiPpfwmivkIVAbjm0rfVPMIulRy3JwETnbDaTa2kndNUgwGHKQagWASkHYQczJ5GEGjJid+PMjO0EUVtv1GTbFQFmZ5ZxEeFPwKBgAuz6tBn65uvayuC+ux2+mUulpUgu9N5h42tNQET3PMDyNLPFWJSkYLPvymRylKNUJumaoWnaDpiaiHK3j/hir19z1AInoIH3/agOdHLpd0WPjB4G1K+PfgTDJMzRMve7brSQ81kMN/JV4C526MDnjieW8AVxgW15g85G0bOvGLhAoGAAYfev1A1YVxnGnlNrdLAYHawDQHoQOCfz6HSXFUxAhLEY7qVRdAzJKOM1lPKleq+3o7gV0hYExummU22K5HuKt8l3Bg2F1YXBd7anK/bK9nwPIn6p2hq5L0jB0lTxy6EaNfd96e0205Ct+zou6Rd+aGZwoJK6RTkuFwpRPkYUFUCgYBpXqDAWyj2qYc637VQN3mx+fhvDQW2o76XBHXeiU9gaq9r0MpFXvCUkybMuhQg3x6d1W9GwmJMVw4VEBWqheI80y6xq2leCdEW9E47jLJ5KZQvX+q4mRTtOR7bw6zC6Fc0lRAUmdl8KSYQ3bRyJ5xlDVLExDl2STGaHoq9z7Z5Qw==-----END PRIVATE KEY-----";
const request_method = "GET";
const url = "api.coinbase.com";
const request_path = "/api/v3/brokerage/accounts";

const algorithm = "ES256";
const uri = request_method + " " + url + request_path;

const token = sign(
  {
    iss: "cdp",
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    sub: key_name,
    uri,
  },
  key_secret,
  {
    algorithm,
    header: {
      kid: key_name,
      nonce: crypto.randomBytes(16).toString("hex"),
    },
  }
);
console.log("export JWT=" + token);
