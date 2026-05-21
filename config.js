const config = {
  subscriptionTiers: {
    Free: {
      paystackPlanID: "",
      price: 0,
    },
    Basic: {
      paystackPlanID: process.env.PAYSTACK_BASIC_PLAN_ID || "plan_basic",
      price: 1000, // in kobo
    },
    Standard: {
      paystackPlanID:
        process.env.PAYSTACK_STANDARD_PLAN_ID || "plan_standard",
      price: 3000, // in kobo
    },
    Premium: {
      paystackPlanID:
        process.env.PAYSTACK_PREMIUM_PLAN_ID || "plan_premium",
      price: 5000, // in kobo
    },
  },
};

module.exports = { config };
