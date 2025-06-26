// const mongoose = require("mongoose");

// const memberSchema = new mongoose.Schema(
//   {
//     photo: String,
//     name: String,
//     age: Number,
//     gender: String,
//     location: String,
//     occupation: String,
//     maritalStatus: String,
//     relationshipType: String,
//     username: { type: String, unique: true },
//     email: { type: String, unique: true },
//     phoneNumber: String,
//     transactionAmount: Number,
//     transactionStatus: String,
//     transactionReference: String,
//     authorizationUrl: String,
//     password: String,
//     paystackSubscriptionCode: String,
//     paystackEmailToken: String,
//     paystackAuthorizationCode: String,
//     paystackCustomerCode: String,
//     paystackPlanID: String,
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Member", memberSchema);

const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    photo: { type: String, required: false },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    location: { type: String, required: true },
    occupation: { type: String, required: true },
    maritalStatus: { type: String, required: true },
    relationshipType: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    description: { type: String, required: true },
    subscriptionTier: {
      type: String,
      enum: ["Free", "Basic", "Standard", "Premium"],
      default: "Free",
    },
    subscriptionExpiresAt: Date,
    mergeCountThisCycle: {
      type: Number,
      default: 0,
    },
    transactionAmount: Number,
    transactionStatus: String,
    transactionReference: String,
    authorizationUrl: String,
    paystackSubscriptionCode: String,
    paystackEmailToken: String,
    paystackAuthorizationCode: String,
    paystackCustomerCode: String,
    paystackPlanID: String,
    mergeCountThisCycle: { type: Number, default: 0 },
    lastMergeReset: { type: Date, default: new Date(0) },
    subscriptionExpiresAt: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    subscriptionTier: {
      type: String,
      enum: ["Free", "Basic", "Standard", "Premium"],
      default: "Free",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);
