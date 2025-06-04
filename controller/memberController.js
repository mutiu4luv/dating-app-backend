const Member = require("../models/memberModule.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });

exports.register = async (req, res) => {
  const { username, email, password, ...rest } = req.body;

  try {
    const exists = await Member.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);
    const member = await Member.create({
      ...rest,
      username,
      email,
      password: hashed,
    });

    const token = generateToken(member._id);
    res.status(201).json({ member, token });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error registering user", error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const member = await Member.findOne({ email });
    if (!member) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(member._id);
    res.json({ member, token });
  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  res.json(req.member);
};

exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find();
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }
    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }
    res.status(200).json({ message: "Member deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMatchesByRelationshipType = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = await Member.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const relType = currentUser.relationshipType.toLowerCase();
    let genderQuery = {};
    if (["gay", "lesbian"].includes(relType)) {
      genderQuery = { gender: currentUser.gender };
    } else {
      genderQuery = {
        gender: currentUser.gender === "male" ? "female" : "male",
      };
    }
    const matches = await Member.find({
      relationshipType: currentUser.relationshipType,
      _id: { $ne: currentUser._id },
      ...genderQuery,
    });

    res.status(200).json({ matches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
