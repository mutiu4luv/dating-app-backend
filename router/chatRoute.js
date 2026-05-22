const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  saveMessage,
  getUserConversations,
  getUnreadMessageCount,
  markMessagesAsRead,
  getAdminChatActivity,
  getAdminConversationMessages,
} = require("../controller/chat");
const protect = require("../middleware/auth");
const upload = require("../middleware/multer");

router.get("/", protect, getChatMessages);
router.post("/save", protect, upload.single("image"), saveMessage);
router.get("/conversations/:userId", protect, getUserConversations);
router.get("/admin/activity", protect, getAdminChatActivity);
router.get(
  "/admin/conversation/users/:member1/:member2",
  protect,
  getAdminConversationMessages
);
router.get("/admin/conversation/:room", protect, getAdminConversationMessages);
router.get("/unread/count/:userId", protect, getUnreadMessageCount);
router.put("/read/:userId", protect, markMessagesAsRead);

module.exports = router;
