const express = require("express");
const {
  mergeMembers,
  getMergeStatus,
} = require("../controller/mergingController.js");
const protect = require("../middleware/auth.js"); // OR: const { protect } = require("../middleware/auth");
const router = express.Router();

// DEBUG: Optional check to ensure handlers are functions
console.log("mergeMembers is a", typeof mergeMembers); // should be 'function'
console.log("getMergeStatus is a", typeof getMergeStatus); // should be 'function'
console.log("protect is a", typeof protect); // should be 'function'

router.post("/", protect, mergeMembers);
// router.get("/status", getMergeStatus);

module.exports = router;
