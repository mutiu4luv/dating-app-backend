const express = require("express");
const protect = require("../middleware/auth");
const {
  createSubscription,
  getCustomerPortal,
} = require("../controller/subscriptionController");
const router = express.Router();
router.post("/create/:plan/:id", protect, createSubscription);
router.get("/portal/:id", protect, getCustomerPortal);

module.exports = router;
