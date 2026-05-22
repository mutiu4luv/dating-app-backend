const express = require("express");
const router = express.Router();
const {
  createContactMessage,
  getContactMessages,
} = require("../controller/contactController.js");
const protect = require("../middleware/auth");

router.post("/", createContactMessage);
router.get("/", protect, getContactMessages);

module.exports = router;
