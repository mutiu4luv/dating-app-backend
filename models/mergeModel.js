// const mongoose = require("mongoose");

// const mergeSchema = new mongoose.Schema(
//   {
//     member1: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Member",
//       required: true,
//     },
//     member2: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Member",
//       required: true,
//     },
//     compatibilityScore: Number,
//     matchedAt: {
//       type: Date,
//       default: Date.now,
//     },
//     member1Email: String,
//   },
//   { timestamps: true }
// );

// // ✅ Prevent OverwriteModelError
// module.exports = mongoose.models.Merge || mongoose.model("Merge", mergeSchema);
