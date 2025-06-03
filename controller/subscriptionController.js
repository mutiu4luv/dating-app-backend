const { config } = require("../config");
const Member = require("../models/memberModule");
const queries = require("../queries/subscriptionQuery");

exports.createSubscription = async (req, res) => {
  const subscriptionTier = req.params.plan;
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({
      message: "Failed to fetch ID: id not found in context",
      hasError: true,
    });
  }

  try {
    const user = await Member.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        hasError: true,
      });
    }
    console.log("Available plans:", Object.keys(config.subscriptionTiers));
    console.log("Requested plan:", subscriptionTier);

    const tier = config.subscriptionTiers[subscriptionTier];

    if (!tier) {
      return res.status(400).json({
        message: "Invalid subscription tier type in context",
        hasError: true,
      });
    }

    // If user is already subscribed to this tier, you may want to prevent duplicate subscriptions
    if (
      user.paystackSubscriptionCode &&
      user.subscriptionTier === subscriptionTier
    ) {
      return res.status(400).json({
        message: "User is already subscribed to this tier.",
        hasError: true,
      });
    }

    if (subscriptionTier === "Free") {
      try {
        await queries.cancelSubscription(
          user.paystackSubscriptionCode,
          user.paystackEmailToken,
          user.paystackAuthorizationCode
        );

        // Optionally, clear user's subscription fields
        user.paystackSubscriptionCode = "";
        user.paystackAuthorizationCode = "";
        user.paystackStatus = "";
        user.paystackCustomerCode = "";
        user.paystackEmailToken = "";
        user.subscriptionTier = "Free";
        await user.save();

        return res.status(200).json({
          hasError: false,
          message: "Subscription cancelled successfully.",
        });
      } catch (err) {
        return res.status(500).json({
          message: err.message,
          hasError: true,
        });
      }
    }

    console.log("Tier object:", tier);
    // Create a new checkout session for paid plans
    const url = await queries.createCheckoutSession(
      user.email,
      tier.paystackPlanID,
      tier.price
    );

    return res.status(200).json({
      hasError: false,
      data: url,
      message:
        "Checkout session created. Complete payment to activate subscription.",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch user: " + err.message,
      hasError: true,
    });
  }
};

// exports.getCustomerPortal = async (req, res) => {
//   const id = req.params.id;
//   if (!id) {
//     return res.status(500).json({
//       message: "Failed to fetch ID: id not found in context",
//       hasError: true,
//     });
//   }

//   try {
//     // const user = await queries.getUserById(id);
//     const user = await Member.findById(id);
//     const url = await queries.getCustomerPortalSession(
//       user.paystackSubscriptionCode
//     );

//     return res.status(200).json({
//       hasError: false,
//       data: url,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       message: err.message,
//       hasError: true,
//     });
//   }
// };
exports.getCustomerPortal = async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({
      message: "Failed to fetch ID: id not found in context",
      hasError: true,
    });
  }

  try {
    const user = await Member.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        hasError: true,
      });
    }
    if (!user.paystackSubscriptionCode) {
      return res.status(404).json({
        message: "Subscription not found",
        hasError: true,
      });
    }

    const url = await queries.getCustomerPortalSession(
      user.paystackSubscriptionCode
    );

    return res.status(200).json({
      hasError: false,
      data: url,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
      hasError: true,
    });
  }
};
