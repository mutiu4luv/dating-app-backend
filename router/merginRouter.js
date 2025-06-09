const express = require("express");
const {
  mergeMembers,
  getMergeStatus,
} = require("../controller/mergingController");
const protect = require("../middleware/auth");
const router = express.Router();
router.post("/", protect, mergeMembers);
router.get("/status", getMergeStatus);

module.exports = router;
