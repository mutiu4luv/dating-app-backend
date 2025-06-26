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
  // verifyAndCompleteRegistration,
  getSingleMember,
  logout,
} = require("../controller/memberController");
const protect = require("../middleware/auth");
const upload = require("../middleware/multer");
// const { getSingleMember } = require("../controller/memberController.js");

router.post("/register", upload.single("photo"), register);
// router.post(
//   "/verify-and-complete-registration",
//   upload.single("photo"),
//   verifyAndCompleteRegistration
// );

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

module.exports = router;
