const { config } = require("../config");
const Member = require("../models/memberModule");

exports.createSubscription = async (req, res) => {
  const subscriptionTier = req.params.plan;
  const id = req.uid;

  if (!id) {
    return res.status(500).json({
      message: "Failed to fetch ID: id not found in context",
      hasError: true,
    });
  }

  try {
    const user = await Member.findById(id);

    const tier = config.subscriptionTiers[subscriptionTier];
    if (!tier) {
      return res.status(500).json({
        message: "Invalid subscription tier type in context",
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

    const url = await queries.createCheckoutSession(
      user.email,
      tier.paystackPlanID,
      tier.price
    );

    return res.status(200).json({
      hasError: false,
      data: url,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch user: " + err.message,
      hasError: true,
    });
  }
};

exports.getCustomerPortal = async (req, res) => {
  const id = req.uid;

  if (!id) {
    return res.status(500).json({
      message: "Failed to fetch ID: id not found in context",
      hasError: true,
    });
  }

  try {
    const user = await queries.getUserById(id);

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
