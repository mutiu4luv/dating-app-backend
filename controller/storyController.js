const cloudinary = require("cloudinary").v2;
const Story = require("../models/storyModel");
const Member = require("../models/memberModule");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

const cleanupExpiredStories = async () => {
  const now = new Date();
  const expiredStories = await Story.find({ expiresAt: { $lte: now } });

  if (!expiredStories.length) return [];

  await Promise.all(
    expiredStories.map(async (story) => {
      if (story.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(story.imagePublicId);
        } catch (error) {
          console.error("Story cloudinary delete failed:", error.message);
        }
      }
      await story.deleteOne();
    })
  );

  return expiredStories;
};

exports.cleanupExpiredStories = cleanupExpiredStories;

exports.createStory = async (req, res) => {
  try {
    const ownerId = req.member?._id?.toString();
    const member = await Member.findById(ownerId).select(
      "subscriptionTier subscriptionExpiresAt hasPaid isAdmin"
    );

    if (!hasActivePaidSubscription(member)) {
      return res.status(403).json({
        message: "Upgrade to Premium to post a story.",
      });
    }

    const text = String(req.body.text || "").trim();
    const imageUrl = req.file?.path || "";
    const imagePublicId = req.file?.filename || "";

    if (!text && !imageUrl) {
      return res.status(400).json({
        message: "Add text or an image to post a story.",
      });
    }

    await cleanupExpiredStories();

    const story = await Story.create({
      ownerId,
      text,
      imageUrl,
      imagePublicId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populated = await story.populate(
      "ownerId",
      "name username photo relationshipType"
    );

    return res.status(201).json({
      message: "Story posted successfully.",
      story: populated,
    });
  } catch (error) {
    console.error("createStory failed:", error);
    return res.status(500).json({ message: "Failed to post story." });
  }
};

exports.getStories = async (req, res) => {
  try {
    await cleanupExpiredStories();

    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .populate(
        "ownerId",
        "name username photo subscriptionTier hasPaid isOnline lastSeen relationshipType"
      );

    return res.status(200).json({
      stories,
      count: stories.length,
    });
  } catch (error) {
    console.error("getStories failed:", error);
    return res.status(500).json({ message: "Failed to load stories." });
  }
};

exports.getMyStory = async (req, res) => {
  try {
    const ownerId = req.member?._id?.toString();
    await cleanupExpiredStories();

    const story = await Story.findOne({
      ownerId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate(
        "ownerId",
        "name username photo subscriptionTier hasPaid isOnline lastSeen relationshipType"
      );

    return res.status(200).json({ story: story || null });
  } catch (error) {
    console.error("getMyStory failed:", error);
    return res.status(500).json({ message: "Failed to load your story." });
  }
};
