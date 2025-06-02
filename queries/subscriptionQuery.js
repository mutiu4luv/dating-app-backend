const axios = require("axios");

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CALLBACK_URL = process.env.CALLBACK_URL;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set in environment variables");
}

// Create Checkout Session
async function createCheckoutSession(userEmail, planID, priceInCents) {
  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: userEmail,
        amount: priceInCents * 100,
        plan: planID,
        channels: ["card"],
        callback_url: CALLBACK_URL,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response.data;
    return data.authorization_url;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
}

// Get Customer Portal Session
async function getCustomerPortalSession(subscriptionCode) {
  try {
    const response = await axios.get(
      `https://api.paystack.co/subscription/${subscriptionCode}/manage/link`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const { data } = response.data;
    return data.link;
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
}

// Cancel Subscription
async function cancelSubscription(code, token, authorization) {
  try {
    await axios.post(
      "https://api.paystack.co/subscription/disable",
      {
        code,
        token,
        authorization,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
}

// Get Active Subscriptions
async function getActiveSubscriptions(customerCode) {
  try {
    const response = await axios.get(
      `https://api.paystack.co/subscription?status=active&search=${customerCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const { data } = response.data;
    return data.filter((sub) => sub.status === "active");
  } catch (err) {
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = {
  createCheckoutSession,
  getCustomerPortalSession,
  cancelSubscription,
  getActiveSubscriptions,
};
