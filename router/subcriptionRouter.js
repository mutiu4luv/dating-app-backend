const express = require("express");
const protect = require("../middleware/auth");
const {
  createSubscription,
  getCustomerPortal,
} = require("../controller/subscriptionController");
const router = express.Router();
router.post("/create/:id", protect, createSubscription);
router.post("/portal/:id", protect, getCustomerPortal);

module.exports = router;
