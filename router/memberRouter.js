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
} = require("../controller/memberController");
const protect = require("../middleware/auth");
// const { authenticate } = require("../middleware/auth.js");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getProfile);
router.get("/", protect, getAllMembers);
router.get("/:id", protect, getMemberById);
router.delete("/:id", protect, deleteMember);
router.put("/:id", protect, updateMember);

module.exports = router;
