const Member = require("../models/memberModule");
const queries = require("../queries/subscriptionQuery");
const dayjs = require("dayjs");

const { cancelSubscription, getActiveSubscriptions } = queries;

const handleCreate = async (data) => {
  console.log("Webhook data payload (subscription.create):", data);
  const user = await Member.findOne({ email: data.customer.email });
  if (!user) {
    console.warn(`User with email ${data.customer.email} not found`);
    return;
  }

  // Optionally cancel old subscription
  // if (user.paystackAuthorizationCode) {
  //   try {
  //     await cancelSubscription(
  //       user.paystackSubscriptionCode,
  //       user.paystackEmailToken,
  //       user.paystackAuthorizationCode
  //     );
  //   } catch (err) {
  //     console.warn(
  //       `Warning: Failed to cancel existing subscription for user ${user._id}:`,
  //       err.message
  //     );
  //   }
  // }

  // Update subscription fields
  user.paystackSubscriptionCode = data.subscription_code;
  // user.subscriptionTier = data.plan?.name || "";
  const mapPlanName = (paystackPlanName = "") => {
    const name = paystackPlanName.toLowerCase();
    if (name.includes("premium")) return "Premium";
    if (name.includes("standard")) return "Standard";
    if (name.includes("basic")) return "Basic";
    return "Free";
  };
  user.subscriptionTier = mapPlanName(data.plan?.name || "");
  user.paystackAuthorizationCode = data.authorization?.authorization_code || "";
  user.paystackStatus = data.status || "";
  user.paystackCustomerCode = data.customer?.customer_code || "";
  user.paystackEmailToken = data.email_token || "";
  user.paystackName = data.customer?.first_name || user.name || "";
  user.paystackUsername = data.customer?.username || user.username || "";

  // Save transaction details if available (rare in subscription.create)
  if (data.amount) user.transactionAmount = data.amount / 100;
  if (data.status) user.transactionStatus = data.status;
  if (data.reference) user.transactionReference = data.reference;
  if (data.authorization_url) user.authorizationUrl = data.authorization_url;

  // Always update email and username if present
  user.email = data.customer?.email || user.email;
  user.username = data.customer?.username || user.username;

  await user.save();
  console.log(`Updated user ${user.email} with subscription info.`);
  console.log(`User ${user._id} subscribed to ${user.subscriptionTier} tier.`);
};

const handleChargeSuccess = async (data) => {
  console.log("Webhook data payload (charge.success):", data);

  const user = await Member.findOne({ email: data.customer.email });
  if (!user) return;

  user.transactionAmount = data.amount / 100;
  user.transactionStatus = data.status;
  user.transactionReference = data.reference;
  if (!data.plan && !user.subscriptionTier) {
    console.warn(
      "Charge success without subscription plan, skipping activation"
    );
    return;
  }

  // ✅ ONLY ACTIVATE IF SUBSCRIPTION PLAN EXISTS
  if (user.subscriptionTier && user.subscriptionTier !== "Free") {
    user.hasPaid = true;
    user.subscriptionExpiresAt = dayjs().add(30, "day").toDate();
    user.mergeCountThisCycle = 0;
    user.lastMergeReset = new Date();
  }

  await user.save();
  console.log(`✅ Subscription activated for ${user.email}`);
};

// const handleChargeSuccess = async (data) => {
//   console.log("Webhook data payload (charge.success):", data);
//   const user = await Member.findOne({ email: data.customer.email });
//   if (!user) {
//     console.warn(`User with email ${data.customer.email} not found`);
//     return;
//   }
//   if (data.amount) user.transactionAmount = data.amount / 100;
//   if (data.status) user.transactionStatus = data.status;
//   if (data.reference) user.transactionReference = data.reference;
//   if (data.authorization?.authorization_url)
//     user.authorizationUrl = data.authorization.authorization_url;

//   await user.save();
//   console.log(`Updated user ${user.email} with charge info.`);
// };

const handleNotRenew = async (data) => {
  const user = await Member.findOne({ email: data.customer.email });
  if (!user || !user.paystackCustomerCode) return;

  const activeSubs = await getActiveSubscriptions(user.paystackCustomerCode);
  if (activeSubs.length === 0) {
    user.subscriptionTier = "Free";
    user.subscriptionExpiresAt = null;
    user.hasPaid = false;
    user.mergeCountThisCycle = 0;
    user.lastMergeReset = new Date(0);

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
    console.log("Received Paystack webhook:", event);

    if (!event || !data) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    switch (event) {
      case "subscription.create":
        await handleCreate(data);
        break;
      case "subscription.not_renew":
        await handleNotRenew(data);
        break;
      case "subscription.disable":
        handleDisable(data);
        break;
      case "charge.success":
        await handleChargeSuccess(data);
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
