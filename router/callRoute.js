const express = require("express");
const {
  canStartCall,
  getMyCallLogs,
} = require("../controller/callController.js");
const protect = require("../middleware/auth.js");

const router = express.Router();

router.get("/can-start", protect, canStartCall);
router.get("/logs", protect, getMyCallLogs);

module.exports = router;
