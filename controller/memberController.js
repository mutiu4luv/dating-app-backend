const Member = require("../models/memberModule.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendOtpEmail } = require("../utility/sendOtpEmail.js");
const Otp = require("../models/otp.js");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
const localizedFormat = require("dayjs/plugin/localizedFormat");

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
console.log("JWT_SECRET used:", process.env.JWT_SECRET);
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is not set in environment variables!");
  throw new Error("JWT_SECRET is required but not set");
}
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "59m" });

exports.register = async (req, res) => {
  const {
    name,
    age,
    gender,
    location,
    occupation,
    maritalStatus,
    relationshipType,
    username,
    email,
    phoneNumber,
    password,
    description,
  } = req.body;
  console.log("req.body:", req.body);
  console.log("req.file:", req.file);

  let photoUrl = "";
  if (req.file) {
    photoUrl = req.file.path;
  }

  try {
    const exists = await Member.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already used" });

    const hashed = await bcrypt.hash(password, 10);

    const member = await Member.create({
      photo: photoUrl,
      name,
      age: Number(age), // convert to number
      gender,
      location,
      occupation,
      maritalStatus,
      relationshipType,
      username,
      email,
      phoneNumber,
      password: hashed,
      description,
    });

    const token = generateToken(member._id);
    res.status(201).json({ member, token });
  } catch (err) {
    console.error("Registration error:", err);
    res
      .status(500)
      .json({ message: "Error registering user", error: err.message });
  }
};
// exports.register = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ message: "Email is required" });
//   }

//   try {
//     const existing = await Member.findOne({ email });
//     if (existing)
//       return res.status(400).json({ message: "Email already in use" });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     await Otp.create({
//       email,
//       otp,
//       expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
//     });

//     await sendOtpEmail(email, otp);

//     res.status(200).json({ message: "OTP sent to email" });
//   } catch (error) {
//     console.error("Error sending OTP:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // Step 2: Verify OTP and Complete Registration
// exports.verifyAndCompleteRegistration = async (req, res) => {
//   const {
//     name,
//     age,
//     gender,
//     location,
//     occupation,
//     maritalStatus,
//     relationshipType,
//     username,
//     email,
//     phoneNumber,
//     password,
//     description,
//     otp,
//   } = req.body;
//   try {
//     const validOtp = await Otp.findOne({ email, otp });
//     if (!validOtp || validOtp.expiresAt < new Date()) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const photoUrl = req.file?.path || "";
//     const member = await Member.create({
//       photo: photoUrl,
//       name,
//       age: Number(age),
//       gender,
//       location,
//       occupation,
//       maritalStatus,
//       relationshipType,
//       username,
//       email,
//       phoneNumber,
//       password: hashedPassword,
//       description,
//     });

//     await validOtp.deleteOne();
//     const token = generateToken(member._id);
//     res.status(201).json({ member, token });
//   } catch (err) {
//     console.error("Registration error:", err);
//     res
//       .status(500)
//       .json({ message: "Error completing registration", error: err.message });
//   }
// };

// exports.sendOtp = async (req, res) => {
//   const { email } = req.body;
//   if (!email) return res.status(400).json({ message: "Email is required" });
//   try {
//     const existing = await Member.findOne({ email });
//     if (existing)
//       return res.status(400).json({ message: "Email already in use" });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     await Otp.create({
//       email,
//       otp,
//       expiresAt: new Date(Date.now() + 10 * 60000),
//     });
//     await sendOtpEmail(email, otp);
//     res.status(200).json({ message: "OTP sent to email" });
//   } catch (err) {
//     console.error("OTP error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

exports.login = async (req, res) => {
  console.log("Login request body:", req.body);

  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  if (req.body.email === "" || req.body.password === "") {
    return res
      .status(400)
      .json({ message: "Email and password cannot be empty" });
  }

  const { email, password } = req.body;

  try {
    const member = await Member.findOne({ email });
    if (!member) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // ✅ Update online status
    member.isOnline = true;
    member.lastSeen = new Date();
    await member.save();

    const token = generateToken(member._id);
    res.json({ member, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login error", error: err.message });
  }
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
    const userGender = (currentUser.gender || "").toLowerCase();
    const oppositeGenderTypes = ["marriage", "friendship", "dating"];
    let genderQuery = {};

    if (oppositeGenderTypes.includes(relType)) {
      // Opposite gender for these types (case-insensitive)
      genderQuery = {
        gender: userGender === "male" ? /female/i : /male/i,
      };
    } else {
      // Same gender for all other types (case-insensitive)
      genderQuery = { gender: new RegExp(`^${userGender}$`, "i") };
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
exports.getSingleMember = async (req, res) => {
  const { id } = req.params;

  try {
    const member = await Member.findById(id).select("username email _id");
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }
    res.json(member);
  } catch (err) {
    console.error("❌ Error fetching member", err);
    res.status(500).json({ error: "Server error fetching member." });
  }
};

exports.getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await Member.findById(userId).select("isOnline lastSeen");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const lastSeenRaw = user.lastSeen;
    const lastSeenRelative = lastSeenRaw ? dayjs(lastSeenRaw).fromNow() : null;
    const lastSeenExact = lastSeenRaw
      ? dayjs(lastSeenRaw).format("MMM D, YYYY [at] h:mm A")
      : null;

    res.status(200).json({
      isOnline: Boolean(user.isOnline),
      lastSeen: {
        relative: lastSeenRelative,
        exact: lastSeenExact,
      },
    });
  } catch (err) {
    console.error("Error checking user status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.member._id; // `req.member` comes from your `protect` middleware

    await Member.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};
exports.getProfile = async (req, res) => {
  try {
    const userId = req.member._id; // `req.member` comes from your `protect` middleware
    const member = await Member.findById(userId).select("-password");
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    res.status(200).json(member);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
