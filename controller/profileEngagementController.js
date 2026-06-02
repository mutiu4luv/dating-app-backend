const Member = require("../models/memberModule");
const ProfileEngagement = require("../models/profileEngagementModel");

const hasActivePaidSubscription = (member) => {
  if (!member) return false;
  if (member.isAdmin) return true;
  if (member.subscriptionTier === "Premium") return true;
  if (member.subscriptionTier && member.subscriptionTier !== "Free") {
    return (
      !member.subscriptionExpiresAt ||
      new Date(member.subscriptionExpiresAt).getTime() > Date.now()
    );
  }
  return Boolean(member.hasPaid);
};

const requirePremiumAccess = (member, res) => {
  if (hasActivePaidSubscription(member)) return true;
  res.status(403).json({
    message:
      "Upgrade to Premium to see who viewed and liked your profile.",
  });
  return false;
};

exports.recordProfileView = async (req, res) => {
  try {
    const ownerId = req.params.id;
    const actorId = req.member?._id?.toString();

    if (!ownerId || !actorId || ownerId === actorId) {
      return res.status(200).json({ message: "View ignored." });
    }

    await ProfileEngagement.findOneAndUpdate(
      { ownerId, actorId, type: "view" },
      { $set: { ownerId, actorId, type: "view" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: "Profile view recorded." });
  } catch (error) {
    console.error("recordProfileView failed:", error);
    return res.status(500).json({ message: "Failed to record profile view." });
  }
};

exports.recordProfileViewByIds = async (ownerId, actorId) => {
  if (!ownerId || !actorId || ownerId === actorId) return null;

  return ProfileEngagement.findOneAndUpdate(
    { ownerId, actorId, type: "view" },
    { $set: { ownerId, actorId, type: "view" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

exports.toggleProfileLike = async (req, res) => {
  try {
    const ownerId = req.params.id;
    const actorId = req.member?._id?.toString();

    if (!ownerId || !actorId || ownerId === actorId) {
      return res.status(400).json({ message: "Invalid profile like." });
    }

    const existing = await ProfileEngagement.findOne({
      ownerId,
      actorId,
      type: "like",
    });

    if (existing) {
      await existing.deleteOne();
      return res.status(200).json({ liked: false, message: "Like removed." });
    }

    await ProfileEngagement.create({
      ownerId,
      actorId,
      type: "like",
    });

    return res.status(200).json({ liked: true, message: "Profile liked." });
  } catch (error) {
    console.error("toggleProfileLike failed:", error);
    return res.status(500).json({ message: "Failed to update like." });
  }
};

exports.getProfileEngagements = async (req, res) => {
  try {
    const ownerId = req.params.id;
    if (req.member?._id?.toString() !== ownerId && !req.member?.isAdmin) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const owner = await Member.findById(ownerId).select(
      "subscriptionTier subscriptionExpiresAt hasPaid isAdmin"
    );
    if (!requirePremiumAccess(owner, res)) return;

    const [viewers, likers] = await Promise.all([
      ProfileEngagement.find({ ownerId, type: "view" })
        .sort({ updatedAt: -1 })
        .populate("actorId", "name username photo lastSeen isOnline"),
      ProfileEngagement.find({ ownerId, type: "like" })
        .sort({ createdAt: -1 })
        .populate("actorId", "name username photo lastSeen isOnline"),
    ]);

    return res.status(200).json({
      viewers: viewers.map((item) => ({
        _id: item._id,
        actorId: item.actorId,
        viewedAt: item.updatedAt,
      })),
      likers: likers.map((item) => ({
        _id: item._id,
        actorId: item.actorId,
        likedAt: item.createdAt,
      })),
      counts: {
        viewers: viewers.length,
        likers: likers.length,
      },
    });
  } catch (error) {
    console.error("getProfileEngagements failed:", error);
    return res.status(500).json({ message: "Failed to load profile insights." });
  }
};
