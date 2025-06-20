const memberModule = require("../models/model/mergesmodel.js");
// const Member = require("../models/memberModule.js");
const Merge = require("../models/mergeModel.js");

exports.mergeMembers = async (req, res) => {
  const { memberId1, memberId2 } = req.body;

  if (!memberId1 || !memberId2) {
    return res.status(400).json({ message: "Member IDs are required" });
  }

  if (memberId1 === memberId2) {
    return res.status(400).json({ message: "Cannot merge the same member" });
  }

  try {
    const member1 = await memberModule.findById(memberId1);
    const member2 = await memberModule.findById(memberId2);

    if (!member1 || !member2) {
      return res.status(404).json({ message: "One or both members not found" });
    }

    if (member1.relationshipType !== member2.relationshipType) {
      return res.status(400).json({ message: "Members are not compatible" });
    }

    const alreadyMerged = await Merge.findOne({
      $or: [
        { member1: member1._id, member2: member2._id },
        { member1: member2._id, member2: member1._id },
      ],
    });

    if (alreadyMerged) {
      return res
        .status(400)
        .json({ message: "These members are already merged" });
    }

    // Handle subscription limit
    if (member1.subscriptionTier !== "Premium") {
      const tierLimits = { Free: 0, Basic: 5, Standard: 10 }; // Example limits
      const limit = tierLimits[member1.subscriptionTier] || 0;

      if (member1.mergeCountThisCycle >= limit) {
        return res.status(403).json({
          message: "You've used up all your merges for this plan.",
        });
      }

      member1.mergeCountThisCycle += 1;
      await member1.save();
    }

    const newMerge = await Merge.create({
      member1: member1._id,
      member2: member2._id,
      member1Email: member1.email,
      compatibilityScore: 100,
    });

    return res
      .status(200)
      .json({ message: "Members matched", match: newMerge });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error merging members", error: err.message });
  }
};

exports.getMergeStatus = async (req, res) => {
  const { member1, member2 } = req.query;
  if (!member1 || !member2) {
    return res.status(400).json({ message: "member1 and member2 required" });
  }

  try {
    console.log("Checking merge status for", member1, member2);

    const merge = await Merge.findOne({
      $or: [
        { member1: member1, member2: member2 },
        { member1: member2, member2: member1 },
      ],
    });

    if (!merge) {
      return res.json({ hasPaid: false, email: "" });
    }

    res.json({ hasPaid: true, email: merge.member1Email || "" });
  } catch (err) {
    console.error("Merge status check error:", err.message);
    res
      .status(500)
      .json({ message: "Error checking merge status", error: err.message });
  }
};

// const mongoose = require("mongoose");

// const mergeSchema = new mongoose.Schema(
//   {
//     member1: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Member", // 👈 this must match your Member model name
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
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Merge", mergeSchema);
