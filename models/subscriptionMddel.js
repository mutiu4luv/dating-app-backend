const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member", // This matches the model name you export
      required: true,
    },
    plan: {
      type: String,
      enum: ["Free", "Basic", "Standard", "Premium"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentReference: String,
    status: {
      type: String,
      enum: ["active", "expired", "pending", "failed"],
      default: "active",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Automatically set expiresAt if not provided
subscriptionSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(
      this.startedAt.getTime() + 30 * 24 * 60 * 60 * 1000
    );
  }
  next();
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
