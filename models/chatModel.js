const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    content: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
      content: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
    },
    editedAt: Date,
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Member",
          required: true,
        },
        emoji: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    room: { type: String, required: true },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
