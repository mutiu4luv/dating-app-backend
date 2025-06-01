const express = require("express");
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");
const cors = require("cors");
const memberRouter = require("./router/memberRouter.js");

const app = express();
app.use(cors());

app.use(express.json());
dotenv.config();
app.use("/api/user", memberRouter);
// app.use("/api/ticket", ticketRouter);
// app.use("/api/match", matchRouter);

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
