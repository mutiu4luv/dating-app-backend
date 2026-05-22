const Message = require("../models/chatModel.js");
const Member = require("../models/memberModule.js");
const mongoose = require("mongoose");

const CHAT_LIMITS = {
  Free: 10,
  Basic: 20,
  Standard: 30,
  Premium: Infinity,
};

const getEffectiveChatTier = (member) => {
  if (member?.isAdmin) return "Premium";

  const hasActivePaidSubscription =
    member?.subscriptionTier &&
    member.subscriptionTier !== "Free" &&
    member.subscriptionExpiresAt &&
    new Date(member.subscriptionExpiresAt) > new Date();

  return hasActivePaidSubscription ? member.subscriptionTier : "Free";
};

const resetChatCycleIfExpired = (member) => {
  const now = new Date();
  const cycleStart = member.chatCycleStartedAt || member.createdAt || now;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  if (now.getTime() - new Date(cycleStart).getTime() >= thirtyDays) {
    member.chatCycleStartedAt = now;
    member.chatContactsThisCycle = [];
  }
};

const resetMergeCycleIfMonthChanged = (member) => {
  const now = new Date();
  const lastReset = member.lastMergeReset || new Date(0);

  if (
    now.getMonth() !== new Date(lastReset).getMonth() ||
    now.getFullYear() !== new Date(lastReset).getFullYear()
  ) {
    member.mergeCountThisCycle = 0;
    member.lastMergeReset = now;
  }
};

const requireChatAccess = async (
  memberId,
  res,
  { receiverId, consumeSlot = false } = {}
) => {
  const member = await Member.findById(memberId);

  if (!member) {
    res.status(404).json({ error: "User not found" });
    return null;
  }

  resetChatCycleIfExpired(member);
  resetMergeCycleIfMonthChanged(member);

  const tier = getEffectiveChatTier(member);
  const limit = CHAT_LIMITS[tier] ?? CHAT_LIMITS.Free;
  const contactIds = (member.chatContactsThisCycle || []).map((id) =>
    id.toString()
  );
  const receiverKey = receiverId?.toString();
  const hasExistingContact = receiverKey && contactIds.includes(receiverKey);

  if (
    consumeSlot &&
    receiverKey &&
    !hasExistingContact &&
    limit !== Infinity &&
    contactIds.length >= limit
  ) {
    res.status(403).json({
      error: `${tier} plan can chat with ${limit} people in one month. Upgrade to chat with more people.`,
      chatLimitReached: true,
      tier,
      limit,
    });
    return null;
  }

  if (consumeSlot && receiverKey && !hasExistingContact) {
    member.chatContactsThisCycle.push(receiverId);
  }

  if (
    member.isModified("chatCycleStartedAt") ||
    member.isModified("chatContactsThisCycle") ||
    member.isModified("lastMergeReset") ||
    member.isModified("mergeCountThisCycle")
  ) {
    await member.save();
  }

  return member;
};

// exports.getChatMessages = async (req, res) => {
//   const { member1, member2 } = req.query;

//   try {
//     const messages = await Message.find({
//       $or: [
//         { senderId: member1, receiverId: member2 },
//         { senderId: member2, receiverId: member1 },
//       ],
//     }).sort("createdAt");

//     res.status(200).json(messages);
//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch messages", error: err });
//   }
// };

// exports.getChatMessages = async (req, res) => {
//   const { member1, member2 } = req.query;

//   if (!member1 || !member2) {
//     return res
//       .status(400)
//       .json({ error: "Both member1 and member2 are required." });
//   }

//   const room = [member1, member2].sort().join("_");

//   try {
//     const messages = await Message.find({ room }).sort({ createdAt: 1 }); // oldest to newest
//     res.json(messages);
//   } catch (err) {
//     console.error("❌ Error fetching messages", err);
//     res.status(500).json({ error: "Server error fetching messages." });
//   }
// };
exports.getChatMessages = async (req, res) => {
  const { member1, member2 } = req.query;

  if (!member1 || !member2) {
    return res
      .status(400)
      .json({ error: "Both member1 and member2 are required." });
  }

  const room = [member1, member2].sort().join("_");

  try {
    if (req.member._id.toString() !== member1) {
      return res.status(403).json({ error: "You cannot access this chat." });
    }

    const sender = await requireChatAccess(member1, res, {
      receiverId: member2,
      consumeSlot: false,
    });
    if (!sender) return;

    // 👌 If subscription valid → fetch messages
    const messages = await Message.find({ room }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages", err);
    res.status(500).json({ error: "Server error fetching messages." });
  }
};

exports.saveMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content = "", room } = req.body;
    const imageUrl = req.file?.path || "";
    const cleanContent = content.trim();

    if (!senderId || !receiverId || !room || (!cleanContent && !imageUrl)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (req.member._id.toString() !== senderId) {
      return res.status(403).json({ error: "You cannot send as another user." });
    }

    const sender = await requireChatAccess(senderId, res, {
      receiverId,
      consumeSlot: true,
    });
    if (!sender) return;

    // ✅ UPDATE LAST SEEN ON REAL ACTIVITY
    await Member.findByIdAndUpdate(senderId, {
      lastSeen: new Date(),
      isOnline: true, // keep them online while chatting
    });

    // ✅ Save the message
    const message = new Message({
      senderId,
      receiverId,
      content: cleanContent,
      imageUrl,
      room,
    });

    const saved = await message.save();

    return res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Message saving failed:", err.message);
    res.status(500).json({ error: "Failed to save message" });
  }
};

// exports.saveMessage = async (req, res) => {
//   try {
//     const { senderId, receiverId, content, room } = req.body;

//     if (!senderId || !receiverId || !content || !room) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     if (
//       !mongoose.Types.ObjectId.isValid(senderId) ||
//       !mongoose.Types.ObjectId.isValid(receiverId)
//     ) {
//       return res.status(400).json({ error: "Invalid sender or receiver ID" });
//     }

//     const message = new Message({ senderId, receiverId, content, room });
//     const saved = await message.save();

//     return res.status(201).json(saved);
//   } catch (err) {
//     console.error("❌ Message saving failed:", err.message);
//     res
//       .status(500)
//       .json({ error: "Failed to save message", details: err.message });
//   }
// };

exports.getUserConversations = async (req, res) => {
  const { userId } = req.params;

  try {
    if (req.member._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You cannot access another user's conversations." });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
        },
      },

      // newest messages first
      { $sort: { createdAt: -1 } },

      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userObjectId] },
              "$receiverId",
              "$senderId",
            ],
          },

          lastMessage: {
            $first: {
              $cond: [{ $ne: ["$content", ""] }, "$content", "Photo"],
            },
          },
          timestamp: { $first: "$createdAt" },

          // ✅ COUNT UNREAD MESSAGES
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userObjectId] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // get user info
      {
        $lookup: {
          from: "members",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },

      {
        $project: {
          matchId: "$_id",
          username: "$userInfo.username",
          photo: "$userInfo.photo",
          isOnline: "$userInfo.isOnline",
          lastSeen: "$userInfo.lastSeen",
          lastMessage: 1,
          timestamp: 1,
          unreadCount: 1,
          unread: { $gt: ["$unreadCount", 0] },
        },
      },

      { $sort: { timestamp: -1 } },
    ]);

    res.status(200).json(conversations);
  } catch (err) {
    console.error("❌ Error fetching conversations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUnreadMessageCount = async (req, res) => {
  const { userId } = req.params;

  try {
    if (req.member._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You cannot access another user's unread count." });
    }

    const count = await Message.countDocuments({
      receiverId: userId,
      read: false,
    });

    res.status(200).json({ unreadCount: count });
  } catch (err) {
    console.error("Error fetching unread message count:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// exports.markMessagesAsRead = async (req, res) => {
//   const { userId } = req.params;

//   try {
//     await Message.updateMany(
//       { receiverId: userId, read: false },
//       { $set: { read: true } }
//     );
//     res.status(200).json({ message: "Messages marked as read" });
//   } catch (err) {
//     console.error("Error marking messages as read:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
exports.markMessagesAsRead = async (req, res) => {
  const { userId } = req.params;
  const { otherUserId } = req.body;

  try {
    if (req.member._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You cannot update another user's messages." });
    }

    if (!otherUserId) {
      return res.status(400).json({ message: "otherUserId is required" });
    }

    const room = [userId, otherUserId].sort().join("_");

    await Message.updateMany(
      {
        room,
        receiverId: userId,
        read: false,
      },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAdminChatActivity = async (req, res) => {
  try {
    if (!req.member?.isAdmin) {
      return res.status(403).json({ message: "Admins only." });
    }

    const activity = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$room",
          lastMessage: { $first: "$content" },
          lastImageUrl: { $first: "$imageUrl" },
          lastMessageAt: { $first: "$createdAt" },
          lastSenderId: { $first: "$senderId" },
          lastReceiverId: { $first: "$receiverId" },
          totalMessages: { $sum: 1 },
          unreadMessages: {
            $sum: {
              $cond: [{ $eq: ["$read", false] }, 1, 0],
            },
          },
          participants: { $addToSet: "$senderId" },
          receivers: { $addToSet: "$receiverId" },
        },
      },
      {
        $project: {
          room: "$_id",
          lastMessage: 1,
          lastImageUrl: 1,
          lastMessageAt: 1,
          lastSenderId: 1,
          lastReceiverId: 1,
          totalMessages: 1,
          unreadMessages: 1,
          participantIds: { $setUnion: ["$participants", "$receivers"] },
        },
      },
      {
        $lookup: {
          from: "members",
          localField: "participantIds",
          foreignField: "_id",
          as: "participants",
        },
      },
      {
        $project: {
          _id: 0,
          room: 1,
          lastMessage: {
            $cond: [{ $ne: ["$lastMessage", ""] }, "$lastMessage", "Photo"],
          },
          lastImageUrl: 1,
          lastMessageAt: 1,
          totalMessages: 1,
          unreadMessages: 1,
          participants: {
            $map: {
              input: "$participants",
              as: "member",
              in: {
                _id: "$$member._id",
                name: "$$member.name",
                username: "$$member.username",
                email: "$$member.email",
                photo: "$$member.photo",
                isOnline: "$$member.isOnline",
                lastSeen: "$$member.lastSeen",
              },
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $limit: 100 },
    ]);

    return res.status(200).json({ data: activity });
  } catch (err) {
    console.error("Admin chat activity failed:", err);
    return res.status(500).json({ message: "Failed to load chat activity" });
  }
};

exports.getAdminConversationMessages = async (req, res) => {
  try {
    if (!req.member?.isAdmin) {
      return res.status(403).json({ message: "Admins only." });
    }

    const { member1, member2, room } = req.params;
    const hasExactMembers =
      mongoose.Types.ObjectId.isValid(member1) &&
      mongoose.Types.ObjectId.isValid(member2);

    if (!room && !hasExactMembers) {
      return res
        .status(400)
        .json({ message: "Room or two member IDs are required." });
    }

    const query = hasExactMembers
      ? {
          $or: [
            { senderId: member1, receiverId: member2 },
            { senderId: member2, receiverId: member1 },
          ],
        }
      : { room };

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("senderId", "name username email photo isOnline lastSeen")
      .populate("receiverId", "name username email photo isOnline lastSeen");

    return res.status(200).json({ data: messages });
  } catch (err) {
    console.error("Admin conversation messages failed:", err);
    return res.status(500).json({ message: "Failed to load conversation" });
  }
};
