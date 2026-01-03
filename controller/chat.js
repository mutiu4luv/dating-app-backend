const Message = require("../models/chatModel.js");
const Member = require("../models/memberModule.js");
const mongoose = require("mongoose");

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
    // 🔥 CHECK SUBSCRIPTION
    const sender = await Member.findById(member1);
    if (!sender) return res.status(404).json({ error: "User not found" });

    const now = new Date(sender.subscriptionExpiresAt);

    // if (now < new Date()) {
    //   return res.status(403).json({
    //     error: "Your subscription has expired. Renew to continue chatting.",
    //     expired: true,
    //   });
    // }

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
    const { senderId, receiverId, content, room } = req.body;

    if (!senderId || !receiverId || !content || !room) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sender = await Member.findById(senderId);
    if (!sender) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ UPDATE LAST SEEN ON REAL ACTIVITY
    await Member.findByIdAndUpdate(senderId, {
      lastSeen: new Date(),
      isOnline: true, // keep them online while chatting
    });

    // ✅ Save the message
    const message = new Message({
      senderId,
      receiverId,
      content,
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

          lastMessage: { $first: "$content" },
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
