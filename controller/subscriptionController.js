const { config } = require("../config");
const Member = require("../models/memberModule");
const queries = require("../queries/subscriptionQuery");
const axios = require("axios");

// exports.createSubscription = async (req, res) => {
//   const subscriptionTier = req.params.plan;
//   const id = req.params.id;

//   if (!id) {
//     return res.status(400).json({
//       message: "Failed to fetch ID: id not found in context",
//       hasError: true,
//     });
//   }

//   try {
//     const user = await Member.findById(id);
//     if (!user) {
//       return res.status(404).json({
//         message: "User not found",
//         hasError: true,
//       });
//     }
//     console.log("Available plans:", Object.keys(config.subscriptionTiers));
//     console.log("Requested plan:", subscriptionTier);

//     const tier = config.subscriptionTiers[subscriptionTier];

//     if (!tier) {
//       return res.status(400).json({
//         message: "Invalid subscription tier type in context",
//         hasError: true,
//       });
//     }

//     // If user is already subscribed to this tier, you may want to prevent duplicate subscriptions
//     if (
//       user.paystackSubscriptionCode &&
//       user.subscriptionTier === subscriptionTier
//     ) {
//       return res.status(400).json({
//         message: "User is already subscribed to this tier.",
//         hasError: true,
//       });
//     }

//     if (subscriptionTier === "Free") {
//       try {
//         await queries.cancelSubscription(
//           user.paystackSubscriptionCode,
//           user.paystackEmailToken,
//           user.paystackAuthorizationCode
//         );

//         // Optionally, clear user's subscription fields
//         user.paystackSubscriptionCode = "";
//         user.paystackAuthorizationCode = "";
//         user.paystackStatus = "";
//         user.paystackCustomerCode = "";
//         user.paystackEmailToken = "";
//         user.subscriptionTier = "Free";
//         await user.save();

//         return res.status(200).json({
//           hasError: false,
//           message: "Subscription cancelled successfully.",
//         });
//       } catch (err) {
//         return res.status(500).json({
//           message: err.message,
//           hasError: true,
//         });
//       }
//     }

//     console.log("Tier object:", tier);
//     // Create a new checkout session for paid plans
//     const url = await queries.createCheckoutSession(
//       user.email,
//       tier.paystackPlanID,
//       tier.price
//     );

//     return res.status(200).json({
//       hasError: false,
//       data: url,
//       message:
//         "Checkout session created. Complete payment to activate subscription.",
//     });
//   } catch (err) {
//     return res.status(500).json({
//       message: "Failed to fetch user: " + err.message,
//       hasError: true,
//     });
//   }
// };

const dayjs = require("dayjs"); // use for date calculations

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

    const tier = config.subscriptionTiers[subscriptionTier];
    if (!tier) {
      return res.status(400).json({
        message: "Invalid subscription tier type in context",
        hasError: true,
      });
    }

    // Check and reset expired subscription
    const now = new Date();
    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < now) {
      user.paystackSubscriptionCode = "";
      user.paystackAuthorizationCode = "";
      user.paystackStatus = "";
      user.paystackCustomerCode = "";
      user.paystackEmailToken = "";
      user.subscriptionTier = "Free";
      user.mergeCountThisCycle = 0;
      user.subscriptionExpiresAt = null;
      user.lastMergeReset = new Date(0); // reset to epoch start
      await user.save();
    }

    // Prevent re-subscription if still valid and limit reached
    const tierLimits = {
      Free: 3,
      Basic: 10,
      Standard: 20,
      Premium: Infinity,
    };

    if (
      user.subscriptionTier === subscriptionTier &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt > now &&
      user.mergeCountThisCycle >= tierLimits[subscriptionTier]
    ) {
      return res.status(400).json({
        hasError: true,
        message: `You've reached your maximum ${subscriptionTier} plan merges. Wait for your subscription to expire before subscribing again.`,
      });
    }

    // Handle Free tier downgrade (cancel current plan if exists)
    if (subscriptionTier === "Free") {
      try {
        await queries.cancelSubscription(
          user.paystackSubscriptionCode,
          user.paystackEmailToken,
          user.paystackAuthorizationCode
        );

        user.paystackSubscriptionCode = "";
        user.paystackAuthorizationCode = "";
        user.paystackStatus = "";
        user.paystackCustomerCode = "";
        user.paystackEmailToken = "";
        user.subscriptionTier = "Free";
        user.mergeCountThisCycle = 0;
        user.subscriptionExpiresAt = null;
        user.lastMergeReset = new Date(); // start tracking from now
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

    // Proceed to create Paystack subscription
    const url = await queries.createCheckoutSession(
      user.email,
      tier.paystackPlanID,
      tier.price
    );

    user.subscriptionTier = subscriptionTier;
    user.subscriptionExpiresAt = dayjs().add(30, "day").toDate();
    user.mergeCountThisCycle = 0; // Reset merge usage
    user.lastMergeReset = new Date(); // Reset cycle start
    await user.save();

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

exports.initiatePayment = async (req, res) => {
  const { email, amount, member1, member2, plan, redirect_url } = req.body;

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount,
        metadata: { member1, member2, plan },
        callback_url: redirect_url,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 seconds
      }
    );

    res.status(200).json(response.data.data);
  } catch (error) {
    console.error("Paystack error:", error.response?.data || error.message);
    res.status(500).json({ error: "Payment initiation failed" });
  }
};

exports.initiateSubscription = async (req, res) => {
  try {
    const { email, amount, member1, member2, plan } = req.body;

    if (!email || !amount || !member1 || !member2 || !plan) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const callback_url = `dating-app-git-main-mutiu4luvs-projects.vercel.app/merge/${member1}/${member2}`;

    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount,
        callback_url, // ✅ Important: both userId and member2
        metadata: {
          plan,
          member1,
          member2,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      authorization_url: paystackRes.data.data.authorization_url,
      reference: paystackRes.data.data.reference,
    });
  } catch (error) {
    console.error(
      "Paystack Init Error:",
      error?.response?.data || error.message
    );
    res.status(500).json({ message: "Payment initialization failed" });
  }
};
