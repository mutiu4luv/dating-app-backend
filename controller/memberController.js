const Member = require("../models/memberModule.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendOtpEmail } = require("../utility/sendOtpEmail.js");
const Otp = require("../models/otp.js");
const nodemailer = require("nodemailer");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
const localizedFormat = require("dayjs/plugin/localizedFormat");

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

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

// Step 2: Verify OTP and Complete Registration
exports.verifyAndCompleteRegistration = async (req, res) => {
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
    otp,
  } = req.body;
  try {
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp || validOtp.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photoUrl = req.file?.path || "";
    const member = await Member.create({
      photo: photoUrl,
      name,
      age: Number(age),
      gender,
      location,
      occupation,
      maritalStatus,
      relationshipType,
      username,
      email,
      phoneNumber,
      password: hashedPassword,
      description,
    });

    await validOtp.deleteOne();
    const token = generateToken(member._id);
    res.status(201).json({ member, token });
  } catch (err) {
    console.error("Registration error:", err);
    res
      .status(500)
      .json({ message: "Error completing registration", error: err.message });
  }
};

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  try {
    const existing = await Member.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already in use" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60000),
    });
    await sendOtpEmail(email, otp);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("OTP error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.login = async (req, res) => {
  console.log("Login request body:", req.body);

  const { email, password } = req.body;

  if (!email || !password || email === "" || password === "") {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const member = await Member.findOne({ email });
    if (!member) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // ✅ Update online status and last seen
    member.isOnline = true;
    member.lastSeen = new Date();
    await member.save();

    const token = generateToken(member._id);

    // ✅ Send selected public fields only
    res.json({
      token,
      user: {
        _id: member._id,
        name: member.name,
        email: member.email,
        hasPaid: member.hasPaid || false,
        subscriptionTier: member.subscriptionTier || "Free",
        isOnline: member.isOnline,
        lastSeen: member.lastSeen,
        photo: member.photo || null,
        username: member.username,
        isAdmin: member.isAdmin,
      },
    });
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
    const updateData = { ...req.body };

    if (req.file) {
      // Example: base64 encode it or save temporarily
      updateData.photo = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`;
    }
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

// ✅ Get members by relationship type (same type only)
exports.getMembersByRelationshipType = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1️⃣ Find the current user
    const currentUser = await Member.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Find members with the same relationshipType (case-insensitive)
    const matches = await Member.find({
      _id: { $ne: currentUser._id },
      relationshipType: new RegExp(`^${currentUser.relationshipType}$`, "i"), // match same relationship type
    });

    // 3️⃣ Return members that match the same relationship type
    res.status(200).json({
      message: `Members with relationship type '${currentUser.relationshipType}' fetched successfully.`,
      matches,
    });
  } catch (err) {
    console.error("Error fetching members:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
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

    const now = dayjs();
    const lastSeen = dayjs(user.lastSeen);
    const diffMinutes = now.diff(lastSeen, "minute");

    let isOnline = user.isOnline;

    // Flag offline if inactive for more than 10 minutes
    if (isOnline && diffMinutes >= 10) {
      user.isOnline = false;
      await user.save();
      isOnline = false;
    }

    res.status(200).json({
      isOnline,
      lastSeen: {
        relative: lastSeen.fromNow(),
        exact: lastSeen.format("MMM D, YYYY [at] h:mm A"),
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

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Member.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No user with that email." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password/${token}`;
    console.log("Reset link:", resetLink);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Truematchup Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Instructions",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="color:#4CAF50;">Reset Your Password</h2>
          <p>Hello ${user.firstName || "User"},</p>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <p>
            <a href="${resetLink}" style="background:#4CAF50;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 15 minutes.</p>
          <hr/>
          <small>If you did not request this, you can ignore this email.</small>
        </div>
      `,
    });

    res.status(200).json({ message: "Password reset email sent." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Member.findById(decoded.id);

    if (!user) return res.status(400).json({ message: "Invalid token." });

    // 🔐 Hash the new password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // ✅ Generate new token for auto-login
    const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Password reset successful.",
      token: newToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("Reset error:", err.message);
    res.status(400).json({ message: "Token expired or invalid." });
  }
};
