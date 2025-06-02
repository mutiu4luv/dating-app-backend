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

module.exports = mongoose.model("Merge", mergeSchema);
