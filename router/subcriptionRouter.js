const express = require("express");
const protect = require("../middleware/auth");

const {
  createSubscription,
  getCustomerPortal,
  initiatePayment,
  initiateSubscription,
  getAllSubscribers,
} = require("../controller/subscriptionController");
const router = express.Router();
router.post("/create/:plan/:id", protect, createSubscription);
router.get("/portal/:id", protect, getCustomerPortal);
router.post("/initiate", initiatePayment);
router.post("/initiates", initiateSubscription);
router.get("/", getAllSubscribers);

module.exports = router;
