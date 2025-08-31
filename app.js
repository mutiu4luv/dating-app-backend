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
const { paystackWebhookHandler } = require("./webhooks/paystack.js");
const memberModule = require("./models/memberModule.js");

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
  process.env.MAIN_APP_URL,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

// ✅ Socket.IO setup with same allowed origins
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

io.on("connection", (socket) => {
  console.log("🔌 New client connected: " + socket.id);

  socket.on("register_user", async (userId) => {
    socket.userId = userId;

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    await Member.findByIdAndUpdate(userId, { isOnline: true });
  });

  // ✅ Handle room join
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`📦 User joined room: ${room}`);
  });

  // ✅ Broadcast message to everyone in room (except sender)
  socket.on("send_message", (data) => {
    const { room } = data;
    socket.to(room).emit("receive_message", data);
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
        await Member.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/user", memberRouter);
app.use("/api/merge", mergeRouter);
app.use("/api/subscription", subscriptionRouter);
app.post("/api/webhook/paystack", paystackWebhookHandler);
app.use("/api/chat", chatRouter);

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
