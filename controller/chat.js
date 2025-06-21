const Message = require("../models/chatModel.js");

exports.getChatMessages = async (req, res) => {
  const { member1, member2 } = req.query;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: member1, receiverId: member2 },
        { senderId: member2, receiverId: member1 },
      ],
    }).sort("createdAt");

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages", error: err });
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
