const express = require("express");
const {
  mergeMembers,
  getMergeStatuses,
} = require("../controller/mergingController.js");
const protect = require("../middleware/auth.js");
const router = express.Router();

// DEBUG: Optional check to ensure handlers are functions
console.log("mergeMembers is a", typeof mergeMembers); // should be 'function'
console.log("protect is a", typeof protect); // should be 'function'

router.post("/", protect, mergeMembers);
router.get("/status", getMergeStatuses); // ✅ route handler is a function

module.exports = router;
