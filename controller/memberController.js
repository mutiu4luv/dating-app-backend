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

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const tokenizeProfileText = (value) => {
  const ignoredWords = new Set([
    "about",
    "after",
    "also",
    "with",
    "from",
    "that",
    "this",
    "they",
    "them",
    "have",
    "love",
    "like",
    "looking",
    "person",
    "people",
  ]);

  return [
    ...new Set(
      normalizeText(value)
        .split(/[^a-z0-9]+/i)
        .filter((word) => word.length > 3 && !ignoredWords.has(word))
    ),
  ];
};

const getAgeScore = (currentAge, otherAge) => {
  if (!currentAge || !otherAge) return { score: 0, reason: null };

  const ageGap = Math.abs(Number(currentAge) - Number(otherAge));
  if (ageGap <= 3) return { score: 15, reason: "Very close age range" };
  if (ageGap <= 7) return { score: 10, reason: "Close age range" };
  if (ageGap <= 12) return { score: 5, reason: "Compatible age range" };
  return { score: 0, reason: null };
};

const getLocationScore = (currentLocation, otherLocation) => {
  const current = normalizeText(currentLocation);
  const other = normalizeText(otherLocation);
  if (!current || !other) return { score: 0, reason: null };
  if (current === other) return { score: 15, reason: "Same location" };

  const currentParts = new Set(current.split(/[\s,.-]+/).filter(Boolean));
  const hasSharedArea = other
    .split(/[\s,.-]+/)
    .some((part) => currentParts.has(part));

  return hasSharedArea
    ? { score: 8, reason: "Nearby location" }
    : { score: 0, reason: null };
};

const getActivityScore = (member) => {
  if (member.isOnline) return { score: 10, reason: "Online now" };
  if (!member.lastSeen) return { score: 0, reason: null };

  const lastSeenTime = new Date(member.lastSeen).getTime();
  if (Number.isNaN(lastSeenTime)) return { score: 0, reason: null };

  const daysSinceActive = (Date.now() - lastSeenTime) / (1000 * 60 * 60 * 24);
  if (daysSinceActive <= 7) return { score: 5, reason: "Recently active" };
  return { score: 0, reason: null };
};

const hasActiveSubscription = (member) => {
  if (!member) return false;
  if (member.subscriptionTier === "Premium") return true;
  if (member.subscriptionTier && member.subscriptionTier !== "Free") {
    return (
      !member.subscriptionExpiresAt ||
      new Date(member.subscriptionExpiresAt).getTime() > Date.now()
    );
  }
  return Boolean(member.hasPaid);
};

const publicSuggestionFields =
  "photo name username age gender location occupation relationshipType description isOnline lastSeen subscriptionTier subscriptionExpiresAt hasPaid";

const buildSuggestedMatch = (currentUser, candidate) => {
  let score = 0;
  const reasons = [];

  if (
    normalizeText(currentUser.relationshipType) &&
    normalizeText(currentUser.relationshipType) ===
      normalizeText(candidate.relationshipType)
  ) {
    score += 35;
    reasons.push("Same relationship goal");
  }

  const ageScore = getAgeScore(currentUser.age, candidate.age);
  score += ageScore.score;
  if (ageScore.reason) reasons.push(ageScore.reason);

  const locationScore = getLocationScore(currentUser.location, candidate.location);
  score += locationScore.score;
  if (locationScore.reason) reasons.push(locationScore.reason);

  if (
    normalizeText(currentUser.occupation) &&
    normalizeText(currentUser.occupation) === normalizeText(candidate.occupation)
  ) {
    score += 8;
    reasons.push("Similar occupation");
  }

  const currentKeywords = new Set(
    tokenizeProfileText(`${currentUser.description || ""} ${currentUser.interests || ""}`)
  );
  const candidateKeywords = tokenizeProfileText(
    `${candidate.description || ""} ${candidate.interests || ""}`
  );
  const sharedKeywords = candidateKeywords.filter((word) =>
    currentKeywords.has(word)
  );
  if (sharedKeywords.length) {
    score += Math.min(sharedKeywords.length * 4, 15);
    reasons.push("Similar profile interests");
  }

  const activityScore = getActivityScore(candidate);
  score += activityScore.score;
  if (activityScore.reason) reasons.push(activityScore.reason);

  if (hasActiveSubscription(candidate)) {
    score += 5;
    reasons.push("Active subscription");
  }

  if (
    normalizeText(currentUser.gender) &&
    normalizeText(candidate.gender) &&
    normalizeText(currentUser.gender) !== normalizeText(candidate.gender)
  ) {
    score += 7;
    reasons.push("Preferred gender match");
  }

  return {
    ...candidate.toObject(),
    compatibilityScore: Math.min(score, 100),
    compatibilityReasons: reasons.slice(0, 4),
    matchVector: {
      relationshipType: candidate.relationshipType,
      age: candidate.age,
      location: candidate.location,
      occupation: candidate.occupation,
      activityLevel: candidate.isOnline ? "online" : "recent-or-offline",
      subscriptionStatus: candidate.subscriptionTier || "Free",
      sharedKeywords: sharedKeywords.slice(0, 6),
    },
  };
};

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

  let photoUrl = "";
  if (req.file) {
    photoUrl = req.file.path;
  }

  try {
    // 1️⃣ Check if email already exists
    const exists = await Member.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already used" });
    }

    // 2️⃣ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 3️⃣ CREATE MEMBER (🔥 FIX IS HERE)
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
      password: hashed,
      description,
      isOnline: false,
      lastSeen: new Date(),
    });

    // 4️⃣ Generate token
    const token = generateToken(member._id);

    res.status(201).json({
      member,
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      message: "Error registering user",
      error: err.message,
    });
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
  const { email, password } = req.body;

  try {
    // Find user (Explicitly select password just in case select:false is added later)
    const member = await Member.findOne({ email }).select("+password");
    if (!member) return res.status(404).json({ message: "User not found" });

    //  Compare
    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const updatedMember = await Member.findByIdAndUpdate(
      member._id,
      { isOnline: true, lastSeen: new Date() },
      { new: true }
    );

    const token = generateToken(updatedMember._id);

    res.json({
      token,
      user: {
        _id: updatedMember._id,
        name: updatedMember.name,
        email: updatedMember.email,
        hasPaid: updatedMember.hasPaid || false,
        isAdmin: updatedMember.isAdmin || false,
        username: updatedMember.username,
        photo: updatedMember.photo,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
};
exports.getAllMembers = async (req, res) => {
  try {
    const staleOnlineCutoff = new Date(Date.now() - 2 * 60 * 1000);
    await Member.updateMany(
      { isOnline: true, lastSeen: { $lt: staleOnlineCutoff } },
      { $set: { isOnline: false } }
    );

    const members = await Member.find().select("-password");
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChatDirectoryMembers = async (req, res) => {
  try {
    const currentUserId = req.member?._id;
    const members = await Member.find({ _id: { $ne: currentUserId } })
      .select(
        "photo name username age gender location occupation relationshipType description isOnline lastSeen"
      )
      .sort({ isOnline: -1, lastSeen: -1, createdAt: -1 });

    res.status(200).json({ members });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to load members", error: error.message });
  }
};

exports.getSuggestedMembers = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = String(req.member?._id || "");

    if (currentUserId !== requestedUserId && !req.member?.isAdmin) {
      return res.status(403).json({ message: "Not allowed to view suggestions" });
    }

    const currentUser = await Member.findById(requestedUserId).select(
      publicSuggestionFields
    );
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const candidates = await Member.find({
      _id: { $ne: currentUser._id },
    }).select(publicSuggestionFields);

    const suggestions = candidates
      .map((candidate) => buildSuggestedMatch(currentUser, candidate))
      .filter((candidate) => candidate.compatibilityScore > 0)
      .sort((a, b) => {
        if (b.compatibilityScore !== a.compatibilityScore) {
          return b.compatibilityScore - a.compatibilityScore;
        }
        if (Boolean(b.isOnline) !== Boolean(a.isOnline)) {
          return b.isOnline ? 1 : -1;
        }
        return (
          new Date(b.lastSeen || 0).getTime() -
          new Date(a.lastSeen || 0).getTime()
        );
      })
      .slice(0, 16);

    res.status(200).json({
      message: "Suggested matches fetched successfully.",
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error("Error fetching suggested members:", error);
    res.status(500).json({
      message: "Failed to load suggested matches",
      error: error.message,
    });
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
// ✅ Get members by relationship type
exports.getMembersByRelationshipType = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1️⃣ Find the current user
    const currentUser = await Member.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Normalize relationshipType
    const relType = currentUser.relationshipType?.toLowerCase();
    if (!relType) {
      return res
        .status(400)
        .json({ message: "Relationship type not set for this user" });
    }

    // 3️⃣ Fetch potential matches
    let matches = await Member.find({
      _id: { $ne: currentUser._id },
      relationshipType: { $regex: `^${relType}$`, $options: "i" },
    });

    // 4️⃣ Gender filtering (if applicable)
    if (currentUser.gender) {
      const targetGender =
        currentUser.gender.toLowerCase() === "male" ? "female" : "male";

      matches = matches.filter((m) => m.gender?.toLowerCase() === targetGender);
    }

    // 5️⃣ 🔥 FINAL SORT (ONLINE FIRST, THEN MOST RECENT LAST SEEN)
    matches.sort((a, b) => {
      // Online users first
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      // Both online or both offline → compare lastSeen
      const aLastSeen = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
      const bLastSeen = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;

      return bLastSeen - aLastSeen; // most recent first
    });

    // 6️⃣ Return results
    res.status(200).json({
      message: `Members with relationship type '${currentUser.relationshipType}' fetched successfully.`,
      count: matches.length,
      matches,
    });
  } catch (err) {
    console.error("Error fetching members:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

// exports.getMembersByRelationshipType = async (req, res) => {
//   try {
//     const userId = req.params.id;

//     // 1️⃣ Find the current user
//     const currentUser = await Member.findById(userId);
//     if (!currentUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // 2️⃣ Normalize relationshipType
//     const relType = currentUser.relationshipType?.toLowerCase();
//     if (!relType) {
//       return res
//         .status(400)
//         .json({ message: "Relationship type not set for this user" });
//     }

//     let matches = await Member.find({
//       _id: { $ne: currentUser._id },
//       relationshipType: { $regex: `^${relType}$`, $options: "i" },
//     }).sort({
//       isOnline: -1,
//       lastSeen: -1,
//     });

//     if (currentUser.gender) {
//       const targetGender =
//         currentUser.gender.toLowerCase() === "male" ? "female" : "male";

//       matches = matches.filter((m) => m.gender?.toLowerCase() === targetGender);
//     }

//     // 4️⃣ Return results
//     res.status(200).json({
//       message: `Members with relationship type '${currentUser.relationshipType}' fetched successfully.`,
//       count: matches.length,
//       matches,
//     });
//   } catch (err) {
//     console.error("Error fetching members:", err);
//     res.status(500).json({
//       message: "Server error. Please try again later.",
//     });
//   }
// };

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
    const member = await Member.findById(id).select(
      "username email _id photo isOnline lastSeen"
    );
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
    const lastSeen = user.lastSeen ? dayjs(user.lastSeen) : null;

    let isOnline = user.isOnline;

    // ✅ Auto-set offline after 10 minutes of inactivity
    if (isOnline && lastSeen && now.diff(lastSeen, "minute") >= 10) {
      isOnline = false;

      // Persist ONLY the online flag
      await Member.findByIdAndUpdate(userId, { isOnline: false });
    }

    return res.status(200).json({
      isOnline,
      lastSeen: lastSeen
        ? {
            relative: lastSeen.fromNow(),
            exact: lastSeen.format("MMM D, YYYY [at] h:mm A"),
          }
        : null,
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
