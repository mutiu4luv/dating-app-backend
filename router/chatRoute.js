const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  saveMessage,
  getUserConversations,
  getUnreadMessageCount,
  getLatestUnreadMessage,
  markMessagesAsRead,
  getAdminChatActivity,
  getAdminConversationMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
} = require("../controller/chat");
const protect = require("../middleware/auth");
const upload = require("../middleware/multer");

router.get("/", protect, getChatMessages);
router.post("/save", protect, upload.single("image"), saveMessage);
router.put("/message/:messageId", protect, editMessage);
router.delete("/message/:messageId", protect, deleteMessage);
router.put("/message/:messageId/reaction", protect, reactToMessage);
router.get("/conversations/:userId", protect, getUserConversations);
router.get("/admin/activity", protect, getAdminChatActivity);
router.get(
  "/admin/conversation/users/:member1/:member2",
  protect,
  getAdminConversationMessages
);
router.get("/admin/conversation/:room", protect, getAdminConversationMessages);
router.get("/unread/latest/:userId", protect, getLatestUnreadMessage);
router.get("/unread/count/:userId", protect, getUnreadMessageCount);
router.put("/read/:userId", protect, markMessagesAsRead);

module.exports = router;
