const Member = require("../models/memberModule.js");
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
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    const member1 = await Member.findById(memberId1);
    const member2 = await Member.findById(memberId2);

    if (!member1 || !member2) {
      return res.status(404).json({ message: "One or both members not found" });
    }

    // Only match based on relationship type
    const compatible = member1.relationshipType === member2.relationshipType;

    if (!compatible) {
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

    const newMerge = await Merge.create({
      member1: member1._id,
      member2: member2._id,

      member1Name: member1.name,
      relationshipType: member1.relationshipType,
      mergedAt: new Date(),
      compatibilityScore: 100,
      member1Email: member1.email,
      member1Phone: member1.phoneNumber,
      member2Name: member2.name,
      member2Email: member2.email,
      member2Phone: member2.phoneNumber,
    });

    res.status(200).json({ message: "Members matched", match: newMerge });
  } catch (err) {
    console.error(err); // <--- log the real error

    res
      .status(500)
      .json({ message: "Error merging members", error: err.message });
  }
};
