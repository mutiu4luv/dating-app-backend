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

const app = express();
app.use("/uploads", express.static("uploads"));
app.use(cors());
app.use(express.json());
app.use("/api/user", memberRouter);
app.use("/api/merge", mergeMembers);
// app.use("/api/webhook/paystack", paystackWebhookHandler);
app.post("/api/webhook/paystack", paystackWebhookHandler);
app.use("/api/subscription", subscriptionRouter);

app.get("/", (req, res) => {
  res.send("Hello Victor, welcome to whoba Ogo foundation");
});

app.listen(process.env.PORT, () => {
  console.log("server is running in port 7000");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("database connected");
  })
  .catch(() => {
    console.log("database not connected");
  });
