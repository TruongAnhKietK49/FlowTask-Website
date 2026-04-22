const jwt = require("jsonwebtoken");
const config = require("../config/env");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, _next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized. Missing bearer token.");
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub);

    if (!user) {
      res.status(401);
      throw new Error("Not authorized. User no longer exists.");
    }

    req.user = user;
    _next();
  } catch (error) {
    console.error(error); // hoặc log ra
    return res.status(401).json({ message: "Not authorized" });
  }
});

module.exports = {
  protect,
};
