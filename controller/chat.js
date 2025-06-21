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
exports.saveMessage = async (data) => {
  try {
    const message = new Message(data);
    await message.save();
    return message;
  } catch (err) {
    console.error("❌ Failed to save message:", {
      error: err.message,
      data,
    });
    throw new Error("Message saving failed");
  }
};
