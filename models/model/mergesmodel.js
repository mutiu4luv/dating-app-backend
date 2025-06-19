const mongoose = require("mongoose");

const mergeSchema = new mongoose.Schema(
  {
    member1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    member2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    compatibilityScore: Number,
    matchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ✅ Fix: Only register model if not already registered
module.exports = mongoose.models.Merge || mongoose.model("Merges", mergeSchema);
