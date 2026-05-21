const jwt = require("jsonwebtoken");
const Member = require("../models/memberModule.js");

const IDLE_SESSION_LIMIT_MS = 12 * 60 * 60 * 1000;

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.member = await Member.findById(decoded.id).select("-password");
    req.user = req.member;

    if (!req.member) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const lastSeenTime = req.member.lastSeen
      ? new Date(req.member.lastSeen).getTime()
      : Date.now();
    const hasBeenInactiveTooLong =
      !req.member.isOnline &&
      !Number.isNaN(lastSeenTime) &&
      Date.now() - lastSeenTime > IDLE_SESSION_LIMIT_MS;

    if (hasBeenInactiveTooLong) {
      await Member.findByIdAndUpdate(req.member._id, { isOnline: false });
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    await Member.findByIdAndUpdate(req.member._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;
// const jwt = require("jsonwebtoken");
// const Member = require("../models/memberModel");

// exports.authenticate = async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       token = req.headers.authorization.split(" ")[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = await Member.findById(decoded.id).select("-password");
//       next();
//     } catch (error) {
//       return res.status(401).json({ message: "Not authorized" });
//     }
//   }

//   if (!token) {
//     return res.status(401).json({ message: "No token provided" });
//   }
// };
