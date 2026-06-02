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
  getChatDirectoryMembers,
  getSuggestedMembers,
  changePassword,
  getPublicMemberProfile,
} = require("../controller/memberController");
const {
  recordProfileView,
  toggleProfileLike,
  getProfileEngagements,
} = require("../controller/profileEngagementController");
const {
  createStory,
  getStories,
  getMyStory,
} = require("../controller/storyController");
const protect = require("../middleware/auth");
const upload = require("../middleware/multer");
const storyUpload = require("../middleware/storyUpload");
// const { getSingleMember } = require("../controller/memberController.js");

router.post("/register", upload.single("photo"), register);
// router.post("/register", upload.single("photo"), verifyAndCompleteRegistration);
// router.post("/register/send-otp", sendOtp);

router.post("/login", login);
router.get("/profile", protect, getProfile);
router.get("/chat-directory", protect, getChatDirectoryMembers);
router.get("/suggested/:userId", protect, getSuggestedMembers);
router.get("/stories/public", getStories);
router.get("/stories", protect, getStories);
router.get("/stories/me", protect, getMyStory);
router.post("/stories", protect, storyUpload.single("storyImage"), createStory);
router.post("/:id/view", protect, recordProfileView);
router.post("/:id/like", protect, toggleProfileLike);
router.get("/:id/engagements", protect, getProfileEngagements);
router.get("/public-profile/:id", protect, getPublicMemberProfile);
router.post("/change-password", protect, changePassword);
router.get("/", protect, getAllMembers);
router.get("/:id", protect, getMemberById);
router.delete("/:id", protect, deleteMember);
router.put("/:id", protect, upload.single("photo"), updateMember);
router.get("/merge/:id", protect, getMembersByRelationshipType);
router.get("/single/:id", getSingleMember);
router.get("/:userId/status", getUserStatus);
router.post("/logout", protect, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
