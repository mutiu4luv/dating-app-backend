const jwt = require("jsonwebtoken");
const Member = require("../models/memberModule.js");
const dayjs = require("dayjs");

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.member = await Member.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = protect;

module.exports = async function updateOnlineStatus(req, res, next) {
  try {
    const userId = req.user?._id; // or wherever your logged-in user's ID is stored
    if (userId) {
      await Member.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });
    }
  } catch (err) {
    console.error("Error updating online status:", err);
  }
  next();
};
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
