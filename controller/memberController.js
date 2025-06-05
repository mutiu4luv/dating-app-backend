const Member = require("../models/memberModule.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });

exports.register = async (req, res) => {
  const { username, email, password, ...rest } = req.body;
  let photoUrl = "";
  if (req.file) {
    photoUrl = req.file.path; // Cloudinary returns the hosted URL here
  }

  try {
    const exists = await Member.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);
    const member = await Member.create({
      ...rest,
      username,
      email,
      password: hashed,
      photo: photoUrl,
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
  console.log("Login request body:", req.body);
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  console.log("Login request body after check:", req.body);
  if (req.body.email === "" || req.body.password === "") {
    return res
      .status(400)
      .json({ message: "Email and password cannot be empty" });
  }
  console.log("Login request body after empty check:", req.body);
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

exports.getMembersByRelationshipType = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = await Member.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const relType = (currentUser.relationshipType || "").toLowerCase();
    // List of types that should match opposite gender
    const oppositeGenderTypes = ["marriage", "friendship", "dating"];
    let genderQuery = {};

    if (oppositeGenderTypes.includes(relType)) {
      // Opposite gender for these types
      genderQuery = {
        gender: currentUser.gender.toLowerCase() === "male" ? "Female" : "Male",
      };
    } else {
      // Same gender for all other types
      genderQuery = { gender: currentUser.gender };
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
// exports.getMatchesByLocation = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const currentUser = await Member.findById(userId);
//     if (!currentUser) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const matches = await Member.find({
//       location: currentUser.location,
//       _id: { $ne: currentUser._id },
//     });

//     res.status(200).json({ matches });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
// exports.getMatchesByOccupation = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const currentUser = await Member.findById(userId);
//     if (!currentUser) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const matches = await Member.find({
//       occupation: currentUser.occupation,
//       _id: { $ne: currentUser._id },
//     });

//     res.status(200).json({ matches });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
// exports.getMatchesByAge = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const currentUser = await Member.findById(userId);
//     if (!currentUser) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const ageRange = [currentUser.age - 5, currentUser.age + 5];
//     const matches = await Member.find({
//       age: { $gte: ageRange[0], $lte: ageRange[1] },
//       _id: { $ne: currentUser._id },
//     });

//     res.status(200).json({ matches });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
