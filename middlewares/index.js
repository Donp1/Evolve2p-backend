const dotenv = require("dotenv");
dotenv.config();

const jwt = require("jsonwebtoken");

function isAuthenticated(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: true, message: "Un-Authorized " });
  }

  try {
    const token = authorization.split(" ")[1];

    const payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET,
      (err, payload) => {
        if (err) return console.log(err);
        req.payload = payload;
      }
    );
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: true, message: "Token has expired" });
    }
    // console.log(err);
    return res.status(401).json({ error: true, message: "Un-Authorized " });
  }

  return next();
}

module.exports = {
  isAuthenticated,
};
