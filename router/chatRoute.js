const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  saveMessage,
  getUserConversations,
  getUnreadMessageCount,
  markMessagesAsRead,
} = require("../controller/chat");
const protect = require("../middleware/auth");

router.get("/", getChatMessages);
router.post("/save", saveMessage);
router.get("/conversations/:userId", protect, getUserConversations);
router.get("/unread/count/:userId", protect, getUnreadMessageCount);
router.put("/read/:userId", protect, markMessagesAsRead);

module.exports = router;
