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

//     // ✅ Already merged
//     const existingMerge = await Merge.findOne({
//       $or: [
//         { member1: member1._id, member2: member2._id },
//         { member1: member2._id, member2: member1._id },
//       ],
//     });

//     if (existingMerge) {
//       return res.status(409).json({
//         message: "These members are already merged",
//         match: existingMerge,
//       });
//     }

//     // ✅ Allowed plans
//     const mergeLimits = {
//       Free: 1,
//       Basic: 10,
//       Standard: 20,
//       Premium: Infinity,
//     };

//     if (plan && !mergeLimits[plan]) {
//       return res.status(400).json({ message: "Invalid subscription plan" });
//     }

//     // ✅ Update plan only if valid
//     if (plan) {
//       member1.subscriptionTier = plan;
//     }

//     const tier = member1.subscriptionTier || "Free";
//     const limit = mergeLimits[tier];

//     // ✅ Monthly reset
//     const now = new Date();
//     const lastReset = member1.lastMergeReset || new Date(0);

//     if (
//       now.getMonth() !== lastReset.getMonth() ||
//       now.getFullYear() !== lastReset.getFullYear()
//     ) {
//       member1.mergeCountThisCycle = 0;
//       member1.lastMergeReset = now;
//     }

//     // ✅ Limit check (ONCE)
//     if (limit !== Infinity && member1.mergeCountThisCycle >= limit) {
//       return res.status(403).json({
//         message: `You have reached the monthly limit of ${limit} merges for the ${tier} plan.`,
//       });
//     }

//     // ✅ Increment ONCE
//     member1.mergeCountThisCycle += 1;

//     // ✅ Payment state
//     member1.hasPaid = tier !== "Free";

//     await member1.save();

//     const newMerge = await Merge.create({
//       member1: member1._id,
//       member2: member2._id,
//       member1Email: member1.email,
//       compatibilityScore: 100,
//     });

//     return res.status(200).json({
//       message: "Members matched successfully",
//       match: newMerge,
//       subscriptionTier: member1.subscriptionTier,
//       hasPaid: member1.hasPaid,
//     });
//   } catch (err) {
//     console.error("❌ Error merging members:", err);
//     return res.status(500).json({
//       message: "Error merging members",
//       error: err.message,
//     });
//   }
// };
exports.mergeMembers = async (req, res) => {
  try {
    const { memberId1, memberId2 } = req.body;

    if (!memberId1 || !memberId2) {
      return res.status(400).json({ message: "Member IDs are required" });
    }

    if (memberId1 === memberId2) {
      return res.status(400).json({ message: "Cannot merge same member" });
    }

    const member1 = await memberModule.findById(memberId1);
    const member2 = await memberModule.findById(memberId2);

    if (!member1 || !member2) {
      return res.status(404).json({ message: "Member not found" });
    }

    //  CHECK IF ALREADY MERGED
    const existingMerge = await Merge.findOne({
      $or: [
        { member1: memberId1, member2: memberId2 },
        { member1: memberId2, member2: memberId1 },
      ],
    });

    if (existingMerge) {
      return res.status(200).json({
        match: existingMerge,
        alreadyMerged: true,
        subscriptionTier: member1.subscriptionTier,
        hasPaid: member1.subscriptionTier !== "Free",
      });
    }

    //  DETERMINE PLAN
    const mergeLimits = {
      Free: 1,
      Basic: 10,
      Standard: 30,
      Premium: Infinity,
    };

    const tier = member1.subscriptionTier || "Free";
    const limit = mergeLimits[tier];

    //  MONTHLY RESET
    const now = new Date();
    const lastReset = member1.lastMergeReset || new Date(0);

    if (
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()
    ) {
      member1.mergeCountThisCycle = 0;
      member1.lastMergeReset = now;
    }

    //  LIMIT CHECK (PREMIUM NEVER BLOCKED)
    if (tier !== "Premium" && member1.mergeCountThisCycle >= limit) {
      return res.status(403).json({
        message: `You have reached the monthly limit of ${limit} merges for the ${tier} plan.`,
      });
    }

    //  CREATE MERGE FIRST
    const newMerge = await Merge.create({
      member1: member1._id,
      member2: member2._id,
    });

    //  INCREMENT COUNT ONLY AFTER SUCCESS
    member1.mergeCountThisCycle += 1;
    await member1.save();

    return res.status(200).json({
      match: newMerge,
      subscriptionTier: tier,
      hasPaid: tier !== "Free",
    });
  } catch (err) {
    console.error("❌ mergeMembers failed:", err);
    return res.status(500).json({
      message: "Error merging members",
      error: err.message,
    });
  }
};

const mongoose = require("mongoose");

exports.getMergeStatuses = async (req, res) => {
  const { member1, member2 } = req.query;

  if (!member1) {
    return res.status(400).json({ message: "member1 is required." });
  }

  try {
    // ✅ Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(member1)) {
      return res.status(400).json({ message: "Invalid member1 ID." });
    }

    const m1 = new mongoose.Types.ObjectId(member1);

    // member2 can be "upgrade"
    let isMerged = false;

    if (member2 && mongoose.Types.ObjectId.isValid(member2)) {
      const m2 = new mongoose.Types.ObjectId(member2);

      const existingMerge = await Merge.findOne({
        $or: [
          { member1: m1, member2: m2 },
          { member1: m2, member2: m1 },
        ],
      });

      isMerged = Boolean(existingMerge);
    }

    const member = await memberModule.findById(m1);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    const now = new Date();

    // ✅ PAYMENT LOGIC (FIXED)
    const hasActiveSubscription =
      member.subscriptionTier !== "Free" &&
      (!member.subscriptionExpiresAt || member.subscriptionExpiresAt > now);

    // Fix legacy paid users with missing expiry
    if (member.subscriptionTier !== "Free" && !member.subscriptionExpiresAt) {
      member.subscriptionExpiresAt = dayjs().add(30, "day").toDate();
      await member.save();
    }

    return res.status(200).json({
      isMerged,
      hasPaid: hasActiveSubscription,
      expired: !hasActiveSubscription,
      subscriptionTier: member.subscriptionTier,
      email: member.email,
    });
  } catch (err) {
    console.error("Status check failed:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};
