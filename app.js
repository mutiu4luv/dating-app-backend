// require("dotenv").config();

// const express = require("express");
// const { default: mongoose } = require("mongoose");
// const cors = require("cors");
// const memberRouter = require("./router/memberRouter.js");
// const { mergeMembers } = require("./controller/mergingController.js");
// const { paystackWebhookHandler } = require("./webhooks/paystack.js");
// const subscriptionRouter = require("./router/subcriptionRouter.js");
// const mergeRouter = require("./router/merginRouter.js");

// const app = express();
// app.use("/uploads", express.static("uploads"));
// // app.use(cors());

// const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"];

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS: " + origin));
//     }
//   },
//   credentials: true, // Required if you're using cookies
// };

// app.use(express.json()); // <-- move these up!
// app.use(express.urlencoded({ extended: true }));
// app.use(cors(corsOptions)); // ✅ MUST COME BEFORE all route handlers

// app.use("/api/user", memberRouter);
// app.use("/api/merge", mergeRouter);
// app.post("/api/webhook/paystack", paystackWebhookHandler);
// app.use("/api/subscription", subscriptionRouter);
// // app.use("/merge", mergeRouter);

// app.get("/", (req, res) => {
//   res.send("Hello Victor, welcome to whoba Ogo foundation");
// });

// app.listen(process.env.PORT, () => {
//   console.log("server is running in port 7000");
// });

// // mongoose
// //   .connect(process.env.MONGO_URI)
// //   .then(() => {
// //     console.log("database connected");
// //   })
// mongoose
//   .connect(process.env.MONGO_URI, {
//     serverSelectionTimeoutMS: 90000, // 30 seconds
//     socketTimeoutMS: 95000, // 45 seconds
//   })
//   .catch(() => {
//     console.log("database not connected");
//   });
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

const app = express();
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 New client connected: " + socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`📦 User joined room: ${room}`);
  });

  socket.on("send_message", async (data) => {
    io.to(data.room).emit("receive_message", data);

    // Optionally save to DB (if model is connected)
    // await Message.create({ ...data });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected: " + socket.id);
  });
});

const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
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
