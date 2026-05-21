const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  saveMessage,
  getUserConversations,
  getUnreadMessageCount,
  markMessagesAsRead,
  getAdminChatActivity,
} = require("../controller/chat");
const protect = require("../middleware/auth");
const upload = require("../middleware/multer");

router.get("/", protect, getChatMessages);
router.post("/save", protect, upload.single("image"), saveMessage);
router.get("/conversations/:userId", protect, getUserConversations);
router.get("/admin/activity", protect, getAdminChatActivity);
router.get("/unread/count/:userId", protect, getUnreadMessageCount);
router.put("/read/:userId", protect, markMessagesAsRead);

module.exports = router;
