const express = require("express");
const {
  canStartCall,
  getMyCallLogs,
  getCallLogsWithMember,
} = require("../controller/callController.js");
const protect = require("../middleware/auth.js");

const router = express.Router();

router.get("/can-start", protect, canStartCall);
router.get("/logs", protect, getMyCallLogs);
router.get("/logs/:memberId", protect, getCallLogsWithMember);

module.exports = router;
