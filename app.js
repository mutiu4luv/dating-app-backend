// dotenv.config();

// const express = require("express");
// const dotenv = require("dotenv");

// const { default: mongoose } = require("mongoose");
// const cors = require("cors");
// const memberRouter = require("./router/memberRouter.js");
// const { mergeMembers } = require("./controller/mergingController.js");
// const { paystackWebhookHandler } = require("./webhooks/paystack.js");
// const subscriptionRouter = require("./router/subcriptionRouter.js");

// const app = express();
// app.use(cors());

// app.use(express.json());
// app.use("/api/user", memberRouter);
// app.use("/api/merge", mergeMembers);
// app.use("/api/webhook/paystack", paystackWebhookHandler);
// app.use("/api/subscription", subscriptionRouter);

// app.get("/", (req, res) => {
//   res.send("Hello Victor, welcome to whoba Ogo foundation");
// });

// app.listen(process.env.PORT, () => {
//   console.log("server is running in port 7000");
// });

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log("database connected");
//   })
//   .catch(() => {
//     console.log("database not connected");
//   });

require("dotenv").config();

const express = require("express");
const { default: mongoose } = require("mongoose");
const cors = require("cors");
const memberRouter = require("./router/memberRouter.js");
const { mergeMembers } = require("./controller/mergingController.js");
const { paystackWebhookHandler } = require("./webhooks/paystack.js");
const subscriptionRouter = require("./router/subcriptionRouter.js");
const mergeRouter = require("./router/merginRouter.js");

const app = express();
app.use("/uploads", express.static("uploads"));
// app.use(cors());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173", // for local dev
];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin like Postman or mobile apps
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true, // if you're using cookies or sessions
  })
);

app.use(express.json()); // <-- move these up!
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", memberRouter);
app.use("/api/merge", mergeRouter);
app.post("/api/webhook/paystack", paystackWebhookHandler);
app.use("/api/subscription", subscriptionRouter);
// app.use("/merge", mergeRouter);

app.get("/", (req, res) => {
  res.send("Hello Victor, welcome to whoba Ogo foundation");
});

app.get("/", (req, res) => {
  res.send("Hello Victor, welcome to whoba Ogo foundation");
});

app.listen(process.env.PORT, () => {
  console.log("server is running in port 7000");
});

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log("database connected");
//   })
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 90000, // 30 seconds
    socketTimeoutMS: 95000, // 45 seconds
  })
  .catch(() => {
    console.log("database not connected");
  });
