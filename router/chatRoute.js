const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  saveMessage,
  getUserConversations,
  getUnreadMessageCount,
} = require("../controller/chat");
const protect = require("../middleware/auth");

router.get("/", getChatMessages);
router.post("/save", saveMessage);
router.get("/conversations/:userId", protect, getUserConversations);
router.get("/unread/count/:userId", protect, getUnreadMessageCount);

module.exports = router;
