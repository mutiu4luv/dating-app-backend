require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const memberRouter = require("./router/memberRouter.js");
const mergeRouter = require("./router/merginRouter.js");
const subscriptionRouter = require("./router/subcriptionRouter.js");
const chatRouter = require("./router/chatRoute.js");
const contactRouter = require("./router/contactRoute.js");
const callRouter = require("./router/callRoute.js");
const { paystackWebhookHandler } = require("./webhooks/paystack.js");
const Member = require("./models/memberModule.js");
const {
  checkCallAccessForSocket,
  markCallLog,
} = require("./controller/callController.js");

const app = express();
const server = http.createServer(app);

// Set up Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// io.on("connection", (socket) => {
//   console.log("🔌 New client connected: " + socket.id);

//   socket.on("join_room", (room) => {
//     socket.join(room);
//     console.log(`📦 User joined room: ${room}`);
//   });

//   socket.on("send_message", async (data) => {
//     io.to(data.room).emit("receive_message", data);
//   });

//   socket.on("disconnect", () => {
//     console.log("❌ Client disconnected: " + socket.id);
//   });
// });
const allowedOrigins = [
  "https://truematchup.com",
  "https://www.truematchup.com",
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

// ✅ Socket.IO setup with same allowed origins
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
app.set("io", io);

// io.on("connection", (socket) => {
//   console.log("🔌 New client connected: " + socket.id);

//   socket.on("join_room", (room) => {
//     socket.join(room);
//     console.log(`📦 User joined room: ${room}`);
//   });

//   socket.on("send_message", (data) => {
//     io.to(data.room).emit("receive_message", data);
//   });

//   socket.on("disconnect", () => {
//     console.log("❌ Client disconnected: " + socket.id);
//   });
// });

// const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"];
const onlineUsers = new Map(); // Store socket-to-user mapping

const userSockets = new Map(); // ensure this is defined above
const offlineTimers = new Map();
const missedCallTimers = new Map();

const clearMissedCallTimer = (callId) => {
  if (!callId || !missedCallTimers.has(callId)) return;
  clearTimeout(missedCallTimers.get(callId));
  missedCallTimers.delete(callId);
};

const hasActiveSocket = (userId) => {
  const sockets = userSockets.get(userId?.toString());
  return Boolean(sockets && sockets.size > 0);
};

const emitCallLogUpdated = (data = {}) => {
  if (data.fromUserId) {
    io.to(data.fromUserId.toString()).emit("voice_call_log_updated", data);
  }
  if (data.toUserId) {
    io.to(data.toUserId.toString()).emit("voice_call_log_updated", data);
  }
};

io.on("connection", (socket) => {
  console.log("🔌 New client connected: " + socket.id);

  socket.on("register_user", async (userId) => {
    socket.userId = userId;
    socket.join(userId.toString());

    if (offlineTimers.has(userId)) {
      clearTimeout(offlineTimers.get(userId));
      offlineTimers.delete(userId);
    }

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    try {
      await Member.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error("Presence update failed:", error.message);
    }

    io.emit("presence_update", {
      userId,
      isOnline: true,
      lastSeen: new Date(),
    });
  });

  socket.on("heartbeat", async (userId) => {
    if (!userId) return;

    socket.userId = userId;
    socket.join(userId.toString());

    if (offlineTimers.has(userId)) {
      clearTimeout(offlineTimers.get(userId));
      offlineTimers.delete(userId);
    }

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    try {
      await Member.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error("Heartbeat update failed:", error.message);
    }

    io.emit("presence_update", {
      userId,
      isOnline: true,
      lastSeen: new Date(),
    });
  });

  // ✅ Handle room join
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`📦 User joined room: ${room}`);
  });

  // ✅ Broadcast message to everyone in room (except sender)
  socket.on("send_message", (data) => {
    const { room, receiverId } = data;
    const target = receiverId
      ? socket.to(room).to(receiverId.toString())
      : socket.to(room);
    target.emit("receive_message", data);
  });

  socket.on("message_edited", (data) => {
    if (!data?.room) return;
    socket.to(data.room).emit("message_edited", data);
  });

  socket.on("message_deleted", (data) => {
    const room = data?.message?.room;
    if (!room) return;
    socket.to(room).emit("message_deleted", data);
  });

  socket.on("typing_start", (data = {}) => {
    if (!data.room || !data.senderId || !data.receiverId) return;
    socket.to(data.room).to(data.receiverId.toString()).emit("typing_start", data);
  });

  socket.on("typing_stop", (data = {}) => {
    if (!data.room || !data.senderId || !data.receiverId) return;
    socket.to(data.room).to(data.receiverId.toString()).emit("typing_stop", data);
  });

  socket.on("voice_call_offer", async (data = {}) => {
    if (!data.toUserId || !data.fromUserId || !data.offer) return;

    try {
      if (!hasActiveSocket(data.toUserId)) {
        await markCallLog({
          callId: data.callId,
          callerId: data.fromUserId,
          receiverId: data.toUserId,
          status: "missed",
          endedAt: new Date(),
        });
        socket.emit("voice_call_unavailable", {
          ...data,
          message: "User is not available for calls right now.",
        });
        emitCallLogUpdated(data);
        return;
      }

      const access = await checkCallAccessForSocket({
        callerId: data.fromUserId,
        receiverId: data.toUserId,
      });

      if (!access.allowed) {
        socket.emit("voice_call_blocked", {
          callId: data.callId,
          message: access.message,
          tier: access.tier,
          limit: access.limit,
        });
        return;
      }

      await markCallLog({
        callId: data.callId,
        callerId: data.fromUserId,
        receiverId: data.toUserId,
        status: "ringing",
      });
      emitCallLogUpdated(data);

      clearMissedCallTimer(data.callId);
      const missedTimer = setTimeout(async () => {
        await markCallLog({
          callId: data.callId,
          callerId: data.fromUserId,
          receiverId: data.toUserId,
          status: "missed",
          endedAt: new Date(),
        });
        io.to(data.fromUserId.toString()).emit("voice_call_missed", data);
        io.to(data.toUserId.toString()).emit("voice_call_missed", data);
        emitCallLogUpdated(data);
        missedCallTimers.delete(data.callId);
      }, 60 * 1000);
      missedCallTimers.set(data.callId, missedTimer);
    } catch (error) {
      console.error("Voice call offer failed:", error.message);
      socket.emit("voice_call_blocked", {
        callId: data.callId,
        message: "Unable to start this call. Please try again.",
      });
      return;
    }

    io.to(data.toUserId.toString()).emit("voice_call_offer", {
      ...data,
      fromSocketId: socket.id,
    });
  });

  socket.on("voice_call_answer", async (data = {}) => {
    if (!data.toUserId || !data.answer) return;
    clearMissedCallTimer(data.callId);
    await markCallLog({
      callId: data.callId,
      callerId: data.toUserId,
      receiverId: data.fromUserId,
      status: "answered",
      answeredAt: new Date(),
    });
    emitCallLogUpdated({
      ...data,
      fromUserId: data.toUserId,
      toUserId: data.fromUserId,
    });
    io.to(data.toUserId.toString()).emit("voice_call_answer", data);
  });

  socket.on("voice_call_ice_candidate", (data = {}) => {
    if (!data.toUserId || !data.candidate) return;
    io.to(data.toUserId.toString()).emit("voice_call_ice_candidate", data);
  });

  socket.on("voice_call_rejected", async (data = {}) => {
    if (!data.toUserId) return;
    clearMissedCallTimer(data.callId);
    await markCallLog({
      callId: data.callId,
      callerId: data.toUserId,
      receiverId: data.fromUserId,
      status: "declined",
      endedAt: new Date(),
    });
    emitCallLogUpdated({
      ...data,
      fromUserId: data.toUserId,
      toUserId: data.fromUserId,
    });
    io.to(data.toUserId.toString()).emit("voice_call_rejected", data);
  });

  socket.on("voice_call_ended", async (data = {}) => {
    if (!data.toUserId) return;
    clearMissedCallTimer(data.callId);
    await markCallLog({
      callId: data.callId,
      callerId: data.fromUserId,
      receiverId: data.toUserId,
      status: "ended",
      endedAt: new Date(),
    });
    emitCallLogUpdated(data);
    io.to(data.toUserId.toString()).emit("voice_call_ended", data);
  });

  socket.on("disconnect", async () => {
    console.log("❌ Client disconnected: " + socket.id);

    const userId = socket.userId;
    if (!userId) return;

    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        const offlineTimer = setTimeout(async () => {
          if (userSockets.has(userId)) return;

          try {
            await Member.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: new Date(),
            });
          } catch (error) {
            console.error("Disconnect presence update failed:", error.message);
          }

          io.emit("presence_update", {
            userId,
            isOnline: false,
            lastSeen: new Date(),
          });
          offlineTimers.delete(userId);
        }, 5 * 60 * 1000);

        offlineTimers.set(userId, offlineTimer);
      }
    }
  });
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    // if you're using cookies or authorization headers
  })
);
app.post(
  "/api/webhook/paystack",
  express.raw({ type: "application/json" }),
  paystackWebhookHandler
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/user", memberRouter);
app.use("/api/merge", mergeRouter);
app.use("/api/subscription", subscriptionRouter);
// app.post("/api/webhook/paystack", paystackWebhookHandler);
app.use("/api/chat", chatRouter);
app.use("/api/contact", contactRouter);
app.use("/api/calls", callRouter);

app.get("/", (req, res) => {
  res.send("Hello Victor, welcome to Whoba Ogo Foundation");
});

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 90000,
    socketTimeoutMS: 95000,
  })
  .then(() => console.log("✅ Database connected"))
  .catch(() => console.log("❌ Database not connected"));

const PORT = process.env.PORT || 7000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
