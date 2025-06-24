const express = require("express");
const router = express.Router();
const {
  getChatMessages,
  saveMessage,
  getUserConversations,
} = require("../controller/chat");

router.get("/", getChatMessages);
router.post("/save", saveMessage);
router.get("/conversations/:userId", getUserConversations);

module.exports = router;
