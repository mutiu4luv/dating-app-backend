const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    callId: { type: String, required: true, index: true },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ringing", "answered", "missed", "declined", "ended"],
      default: "ringing",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    answeredAt: Date,
    endedAt: Date,
    durationSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

callLogSchema.index({ callerId: 1, receiverId: 1, createdAt: -1 });

module.exports = mongoose.model("CallLog", callLogSchema);
