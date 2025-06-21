const Message = require("../models/chatModel.js");
const Member = require("../models/memberModule.js");

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
