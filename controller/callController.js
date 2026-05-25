const mongoose = require("mongoose");
const Member = require("../models/memberModule.js");
const CallLog = require("../models/callLogModel.js");

const CALL_LIMITS = {
  Free: 10,
  Basic: 20,
  Standard: 30,
  Premium: Infinity,
};

const getEffectiveTier = (member) => {
  if (member?.isAdmin) return "Premium";

  const hasActivePaidSubscription =
    member?.subscriptionTier &&
    member.subscriptionTier !== "Free" &&
    member.subscriptionExpiresAt &&
    new Date(member.subscriptionExpiresAt) > new Date();

  return hasActivePaidSubscription ? member.subscriptionTier : "Free";
};

const resetContactCycleIfExpired = (member) => {
  const now = new Date();
  const cycleStart = member.chatCycleStartedAt || member.createdAt || now;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  if (now.getTime() - new Date(cycleStart).getTime() >= thirtyDays) {
    member.chatCycleStartedAt = now;
    member.chatContactsThisCycle = [];
  }
};

const buildLimitMessage = (tier, limit) =>
  `${tier} plan can connect with ${limit} people in one month. Upgrade to enjoy a better plan and continue making calls.`;

exports.checkCallAccessForSocket = async ({
  callerId,
  receiverId,
  consumeSlot = true,
}) => {
  if (
    !mongoose.Types.ObjectId.isValid(callerId) ||
    !mongoose.Types.ObjectId.isValid(receiverId)
  ) {
    return { allowed: false, message: "Invalid caller or receiver." };
  }

  const caller = await Member.findById(callerId);
  if (!caller) return { allowed: false, message: "Caller not found." };

  resetContactCycleIfExpired(caller);

  const tier = getEffectiveTier(caller);
  const limit = CALL_LIMITS[tier] ?? CALL_LIMITS.Free;
  const contactIds = (caller.chatContactsThisCycle || []).map((id) =>
    id.toString()
  );
  const receiverKey = receiverId.toString();
  const hasExistingContact = contactIds.includes(receiverKey);

  if (!hasExistingContact && limit !== Infinity && contactIds.length >= limit) {
    await caller.save();
    return {
      allowed: false,
      tier,
      limit,
      message: buildLimitMessage(tier, limit),
    };
  }

  if (consumeSlot && !hasExistingContact) {
    caller.chatContactsThisCycle.push(receiverId);
  }

  if (
    caller.isModified("chatCycleStartedAt") ||
    caller.isModified("chatContactsThisCycle")
  ) {
    await caller.save();
  }

  return {
    allowed: true,
    tier,
    limit: limit === Infinity ? "unlimited" : limit,
  };
};

exports.canStartCall = async (req, res) => {
  try {
    const { receiverId } = req.query;
    const callerId = req.member._id.toString();

    const access = await exports.checkCallAccessForSocket({
      callerId,
      receiverId,
      consumeSlot: false,
    });

    if (!access.allowed) {
      return res.status(403).json({ ...access, callLimitReached: true });
    }

    return res.status(200).json(access);
  } catch (error) {
    console.error("Call access check failed:", error);
    return res.status(500).json({ message: "Unable to check call access." });
  }
};

exports.getMyCallLogs = async (req, res) => {
  try {
    const userId = req.member._id;
    const logs = await CallLog.find({
      $or: [{ callerId: userId }, { receiverId: userId }],
    })
      .populate("callerId", "name username photo")
      .populate("receiverId", "name username photo")
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(80);

    return res.status(200).json({ logs });
  } catch (error) {
    console.error("Failed to load call logs:", error);
    return res.status(500).json({ message: "Failed to load call logs." });
  }
};

exports.getCallLogsWithMember = async (req, res) => {
  try {
    const userId = req.member._id;
    const { memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid member ID." });
    }

    const logs = await CallLog.find({
      $or: [
        { callerId: userId, receiverId: memberId },
        { callerId: memberId, receiverId: userId },
      ],
    })
      .populate("callerId", "name username photo")
      .populate("receiverId", "name username photo")
      .sort({ startedAt: 1, createdAt: 1 })
      .limit(120);

    return res.status(200).json({ logs });
  } catch (error) {
    console.error("Failed to load call logs with member:", error);
    return res.status(500).json({ message: "Failed to load call logs." });
  }
};

exports.markCallLog = async ({
  callId,
  callerId,
  receiverId,
  status,
  answeredAt,
  endedAt,
}) => {
  if (!callId || !callerId || !receiverId) return null;

  const existing = await CallLog.findOne({ callId }).select(
    "callerId receiverId answeredAt"
  );

  const update = {
    callId,
    status,
  };

  if (!existing) {
    update.callerId = callerId;
    update.receiverId = receiverId;
  }

  if (answeredAt) update.answeredAt = answeredAt;
  if (endedAt) update.endedAt = endedAt;
  if (endedAt && !answeredAt) {
    if (existing?.answeredAt) update.answeredAt = existing.answeredAt;
  }
  if (update.answeredAt && endedAt) {
    update.durationSeconds = Math.max(
      0,
      Math.floor((new Date(endedAt) - new Date(update.answeredAt)) / 1000)
    );
  }

  return CallLog.findOneAndUpdate({ callId }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
};
