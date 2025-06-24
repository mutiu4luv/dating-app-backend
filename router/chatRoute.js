const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  saveMessage,
  getUserConversations,
} = require("../controller/chat");
const protect = require("../middleware/auth");

router.get("/", getChatMessages);
router.post("/save", saveMessage);
router.get("/conversations/:userId", protect, getUserConversations);

module.exports = router;
