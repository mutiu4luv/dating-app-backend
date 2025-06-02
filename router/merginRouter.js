const express = require("express");
const { mergeMembers } = require("../controller/mergingController");
const protect = require("../middleware/auth");
const router = express.Router();
router.post("/", protect, mergeMembers);

module.exports = router;
