const ContactMessage = require("../models/contactMessageModel.js");

exports.createContactMessage = async (req, res) => {
  try {
    const { name, email, phoneNumber, contactUs } = req.body;

    if (!name || !email || !phoneNumber || !contactUs) {
      return res.status(400).json({
        message: "Name, email, phone number, and message are required.",
      });
    }

    const message = await ContactMessage.create({
      name,
      email,
      phoneNumber,
      contactUs,
      userId: req.member?._id || null,
    });

    return res.status(201).json({
      message: "Contact message submitted successfully.",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to submit contact message.",
      error: error.message,
    });
  }
};

exports.getContactMessages = async (req, res) => {
  try {
    if (!req.member?.isAdmin) {
      return res.status(403).json({ message: "Admins only." });
    }

    const messages = await ContactMessage.find()
      .populate("userId", "name username email phoneNumber")
      .sort({ createdAt: -1 });

    return res.status(200).json({ data: messages });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load contact messages.",
      error: error.message,
    });
  }
};
