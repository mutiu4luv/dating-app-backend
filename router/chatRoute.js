const express = require("express");
const router = express.Router();
const { getChatMessages, saveMessage } = require("../controller/chat");

router.get("/", getChatMessages);
router.post("/save", saveMessage);

module.exports = router;
