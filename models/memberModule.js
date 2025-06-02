const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    photo: String,
    name: String,
    age: Number,
    gender: String,
    location: String,
    occupation: String,
    maritalStatus: String,
    relationshipType: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    phoneNumber: String,
    password: String,
    paystackSubscriptionCode: String,
    paystackEmailToken: String,
    paystackAuthorizationCode: String,
    paystackCustomerCode: String,
    paystackPlanID: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);
