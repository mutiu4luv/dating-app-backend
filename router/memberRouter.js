const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
  getAllMembers,
  getMemberById,
  deleteMember,
  updateMember,
  getMembersByRelationshipType,
  getUserStatus,
  verifyAndCompleteRegistration,
  getSingleMember,
  logout,
  forgotPassword,
  resetPassword,
  sendOtp,
} = require("../controller/memberController");
const protect = require("../middleware/auth");
const upload = require("../middleware/multer");
// const { getSingleMember } = require("../controller/memberController.js");

router.post("/register/send-otp", register);
router.post("/register", upload.single("photo"), verifyAndCompleteRegistration);
router.post("/register/send-otp", sendOtp);

router.post("/login", login);
router.get("/profile", protect, getProfile);
router.get("/", protect, getAllMembers);
router.get("/:id", protect, getMemberById);
router.delete("/:id", protect, deleteMember);
router.put("/:id", protect, updateMember);
router.get("/merge/:id", protect, getMembersByRelationshipType);
router.get("/single/:id", getSingleMember);
router.get("/:userId/status", getUserStatus);
router.post("/logout", protect, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
