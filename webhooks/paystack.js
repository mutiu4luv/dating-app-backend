const queries = require("../queries/subscriptionQuery");
// const logger = require("../utils/logger"); // optional logger
const Member = require("../models/memberModule");
const { cancelSubscription, getActiveSubscriptions } = queries;

const handleCreate = async (data) => {
  const subscription = data;

  const user = await Member.findOne({ email: subscription.customer.email });
  if (!user)
    throw new Error(`User with email ${subscription.customer.email} not found`);

  if (user.paystackAuthorizationCode) {
    try {
      await cancelSubscription(
        user.paystackSubscriptionCode,
        user.paystackEmailToken,
        user.paystackAuthorizationCode
      );
    } catch (err) {
      console.warn(
        `Warning: Failed to cancel existing subscription for user ${user._id}:`,
        err.message
      );
    }
  }

  user.paystackSubscriptionCode = subscription.subscription_code;
  user.subscriptionTier = subscription.plan.name;
  user.paystackAuthorizationCode =
    subscription.authorization.authorization_code;
  user.paystackStatus = subscription.status;
  user.paystackCustomerCode = subscription.customer.customer_code;
  user.paystackEmailToken = subscription.email_token;

  await user.save();
};

const handleChargeSuccess = (data) => {
  console.log("Handling charge.success event:", data);
};

const handleInvoiceCreate = (data) => {
  console.log("Invoice created:", data);
};

const handlePaymentFailed = (data) => {
  console.log("Invoice payment failed:", data);
};

const handleInvoiceUpdate = (data) => {
  console.log("Invoice updated:", data);
};

const handleNotRenew = async (data) => {
  const subscription = data;
  const user = await Member.findOne({ email: subscription.customer.email });
  if (!user || !user.paystackCustomerCode) return;

  const activeSubs = await getActiveSubscriptions(user.paystackCustomerCode);
  if (activeSubs.length === 0) {
    user.subscriptionTier = "Free";
    user.paystackAuthorizationCode = "";
    user.paystackStatus = "";
    user.paystackEmailToken = "";
    await user.save();
    console.log(`Successfully downgraded user ${user._id} to Free tier.`);
  }
};

const handleDisable = (data) => {
  console.log("Subscription disabled:", data);
};

const paystackWebhookHandler = async (req, res) => {
  try {
    const { event, data } = req.body;

    switch (event) {
      case "subscription.create":
        await handleCreate(data);
        break;
      case "charge.success":
        handleChargeSuccess(data);
        break;
      case "invoice.create":
        handleInvoiceCreate(data);
        break;
      case "invoice.payment_failed":
        handlePaymentFailed(data);
        break;
      case "invoice.update":
        handleInvoiceUpdate(data);
        break;
      case "subscription.not_renew":
        await handleNotRenew(data);
        break;
      case "subscription.disable":
        handleDisable(data);
        break;
      default:
        console.log("Unhandled event type:", event);
    }

    res.status(200).json({ message: "Webhook received" });
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    res.status(500).json({ message: "Failed to process webhook" });
  }
};

module.exports = { paystackWebhookHandler };
