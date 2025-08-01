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
    Pro: {
      paystackPlanID: process.env.PAYSTACK_PRO_PLAN_ID || "plan_pro",
      price: 2000, // in kobo
    },
    Enterprise: {
      paystackPlanID:
        process.env.PAYSTACK_ENTERPRISE_PLAN_ID || "plan_enterprise",
      price: 3000, // in kobo
    },
  },
};

module.exports = { config };
