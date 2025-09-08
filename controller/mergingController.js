const memberModule = require("../models/memberModule.js");
// const Member = require("../models/memberModule.js");
// const Merge = require("../models/mergeModel.js");
const Merge = require("../models/model/mergesmodel.js");
const Subscription = require("../models/subscriptionMddel.js"); // adjust if needed

// exports.mergeMembers = async (req, res) => {
//   const { memberId1, memberId2, plan } = req.body;

//   if (!memberId1 || !memberId2) {
//     return res.status(400).json({ message: "Member IDs are required" });
//   }

//   if (memberId1 === memberId2) {
//     return res.status(400).json({ message: "Cannot merge the same member" });
//   }

//   try {
//     const member1 = await memberModule.findById(memberId1);
//     const member2 = await memberModule.findById(memberId2);

//     if (!member1 || !member2) {
//       return res.status(404).json({ message: "One or both members not found" });
//     }

//     if (member1.relationshipType !== member2.relationshipType) {
//       return res.status(400).json({ message: "Members are not compatible" });
//     }

//     // Check if already merged
//     const alreadyMerged = await Merge.findOne({
//       $or: [
//         { member1: member1._id, member2: member2._id },
//         { member1: member2._id, member2: member1._id },
//       ],
//     });

//     if (alreadyMerged) {
//       return res
//         .status(400)
//         .json({ message: "These members are already merged" });
//     }

//     // Define limits by tier
//     const mergeLimits = {
//       Free: 3,
//       Basic: 10,
//       Standard: 20,
//     };

//     const tier = plan || member1.subscriptionTier;
//     const isLimited = mergeLimits.hasOwnProperty(tier);

//     // ⏳ Reset counter monthly
//     const now = new Date();
//     const lastReset = member1.lastMergeReset || new Date(0);
//     const isNewMonth =
//       now.getMonth() !== lastReset.getMonth() ||
//       now.getFullYear() !== lastReset.getFullYear();

//     if (isNewMonth) {
//       member1.mergeCountThisCycle = 0;
//       member1.lastMergeReset = now;
//       await member1.save();
//     }

//     // Check limit
//     if (isLimited) {
//       const limit = mergeLimits[tier];
//       if (member1.mergeCountThisCycle >= limit) {
//         return res.status(403).json({
//           message: `You have reached the monthly limit of ${limit} merges for the ${tier} plan.`,
//         });
//       }

//       member1.mergeCountThisCycle += 1;
//       await member1.save();
//     }

//     // Create new merge
//     const newMerge = await Merge.create({
//       member1: member1._id,
//       member2: member2._id,
//       member1Email: member1.email,
//       compatibilityScore: 100,
//     });

//     return res
//       .status(200)
//       .json({ message: "Members matched", match: newMerge });
//   } catch (err) {
//     console.error("❌ Error merging members:", err);
//     res
//       .status(500)
//       .json({ message: "Error merging members", error: err.message });
//   }
// };

exports.mergeMembers = async (req, res) => {
  const { memberId1, memberId2, plan } = req.body;

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
      return res.status(400).json({
        message: "These members are already merged",
      });
    }

    const mergeLimits = {
      Free: 3,
      Basic: 10,
      Standard: 20,
    };

    // Update subscription tier if changed
    if (plan && plan !== member1.subscriptionTier) {
      member1.subscriptionTier = plan;
    }

    const tier = member1.subscriptionTier || "Free";
    const isLimited = mergeLimits.hasOwnProperty(tier);

    const now = new Date();
    const lastReset = member1.lastMergeReset || new Date(0);
    const isNewMonth =
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();

    if (isNewMonth) {
      member1.mergeCountThisCycle = 0;
      member1.lastMergeReset = now;
    }

    if (isLimited) {
      const limit = mergeLimits[tier];
      if (member1.mergeCountThisCycle >= limit) {
        return res.status(403).json({
          message: `You have reached the monthly limit of ${limit} merges for the ${tier} plan.`,
        });
      }

      member1.mergeCountThisCycle += 1;
    }

    // ✅ Set hasPaid = true if plan is not Free
    if (plan && plan !== "Free") {
      member1.hasPaid = true;
    }

    await member1.save();

    const newMerge = await Merge.create({
      member1: member1._id,
      member2: member2._id,
      member1Email: member1.email,
      compatibilityScore: 100,
    });

    return res.status(200).json({
      message: "Members matched",
      match: newMerge,
      subscriptionTier: member1.subscriptionTier,
      hasPaid: member1.hasPaid, // ✅ optional: return it to frontend
    });
  } catch (err) {
    console.error("❌ Error merging members:", err);
    res.status(500).json({
      message: "Error merging members",
      error: err.message,
    });
  }
};
const mongoose = require("mongoose");

exports.getMergeStatuses = async (req, res) => {
  const { member1, member2 } = req.query;

  if (!member1 || !member2) {
    return res.status(400).json({ message: "Member IDs are required." });
  }

  try {
    // Cast to ObjectId if needed
    let m1 = member1,
      m2 = member2;
    try {
      m1 = mongoose.Types.ObjectId(member1);
      m2 = mongoose.Types.ObjectId(member2);
    } catch (e) {
      // fallback to string if not valid ObjectId
    }

    const existingMerge = await Merge.findOne({
      $or: [
        { member1: m1, member2: m2 },
        { member1: m2, member2: m1 },
      ],
    });

    const isMerged = !!existingMerge;

    const member = await memberModule.findById(member1);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    let hasPaid = false;
    let subscriptionActive = false;
    let expired = true;

    const now = new Date();
    if (
      member.subscriptionExpiresAt &&
      member.subscriptionExpiresAt > now &&
      member.subscriptionTier !== "Free"
    ) {
      subscriptionActive = true;
      hasPaid = true;
      expired = false;
    }

    // Debug log
    console.log({
      member1,
      member2,
      isMerged,
      subscriptionExpiresAt: member.subscriptionExpiresAt,
      subscriptionTier: member.subscriptionTier,
      now,
      expired,
    });

    return res.status(200).json({
      hasPaid,
      isMerged,
      email: member.email,
      subscriptionActive,
      expired,
    });
  } catch (err) {
    console.error("Status check failed:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};
