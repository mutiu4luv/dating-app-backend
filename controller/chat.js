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

exports.getChatMessages = async (req, res) => {
  const { member1, member2 } = req.query;

  if (!member1 || !member2) {
    return res
      .status(400)
      .json({ error: "Both member1 and member2 are required." });
  }

  const room = [member1, member2].sort().join("_");

  try {
    const messages = await Message.find({ room }).sort({ createdAt: 1 }); // oldest to newest
    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages", err);
    res.status(500).json({ error: "Server error fetching messages." });
  }
};
// exports.saveMessage = async (req, res) => {
//   try {
//     const { senderId, receiverId, content, room } = req.body;

//     if (!senderId || !receiverId || !content || !room) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const message = new Message({ senderId, receiverId, content, room });
//     const saved = await message.save();

//     return res.status(201).json(saved);
//   } catch (err) {
//     console.error("❌ Message saving failed:", err.message); // 👈 logs real error
//     res
//       .status(500)
//       .json({ error: "Failed to save message", details: err.message });
//   }
// };

exports.saveMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, room } = req.body;

    if (!senderId || !receiverId || !content || !room) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({ error: "Invalid sender or receiver ID" });
    }

    const message = new Message({ senderId, receiverId, content, room });
    const saved = await message.save();

    return res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Message saving failed:", err.message);
    res
      .status(500)
      .json({ error: "Failed to save message", details: err.message });
  }
};

exports.getUserConversations = async (req, res) => {
  const { userId } = req.params;

  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", new mongoose.Types.ObjectId(userId)] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$content" },
          timestamp: { $first: "$createdAt" },
        },
      },
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
        },
      },
      { $sort: { timestamp: -1 } },
    ]);

    res.status(200).json(conversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
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
