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
const { paystackWebhookHandler } = require("./webhooks/paystack.js");
const Member = require("./models/memberModule.js");

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

  socket.on("voice_call_offer", (data = {}) => {
    if (!data.toUserId || !data.fromUserId || !data.offer) return;
    io.to(data.toUserId.toString()).emit("voice_call_offer", {
      ...data,
      fromSocketId: socket.id,
    });
  });

  socket.on("voice_call_answer", (data = {}) => {
    if (!data.toUserId || !data.answer) return;
    io.to(data.toUserId.toString()).emit("voice_call_answer", data);
  });

  socket.on("voice_call_ice_candidate", (data = {}) => {
    if (!data.toUserId || !data.candidate) return;
    io.to(data.toUserId.toString()).emit("voice_call_ice_candidate", data);
  });

  socket.on("voice_call_rejected", (data = {}) => {
    if (!data.toUserId) return;
    io.to(data.toUserId.toString()).emit("voice_call_rejected", data);
  });

  socket.on("voice_call_ended", (data = {}) => {
    if (!data.toUserId) return;
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
