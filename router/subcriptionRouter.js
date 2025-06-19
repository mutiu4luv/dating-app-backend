const express = require("express");
const protect = require("../middleware/auth");

const {
  createSubscription,
  getCustomerPortal,
  initiatePayment,
} = require("../controller/subscriptionController");
const router = express.Router();
router.post("/create/:plan/:id", protect, createSubscription);
router.get("/portal/:id", protect, getCustomerPortal);
router.post("/initiate", initiatePayment);

module.exports = router;
