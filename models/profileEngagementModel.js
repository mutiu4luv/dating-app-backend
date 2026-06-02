const mongoose = require("mongoose");

const profileEngagementSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["view", "like"],
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

profileEngagementSchema.index(
  { ownerId: 1, actorId: 1, type: 1 },
  { unique: true }
);

module.exports = mongoose.model("ProfileEngagement", profileEngagementSchema);
