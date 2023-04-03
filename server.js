import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
const main = await import("./main.js");


const path = await import("path");
const fs = await import("fs");

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(path.resolve("./website/interface.html"));
});

const server = createServer(app);
const io = new Server(server);

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

io.on("connection", (socket) => {
  console.log("connected");
  io.emit("log", { text: "Socket connected", workloads: process.workloads });
  socket.on("order", (data) => {
    io.emit("log", { text: "Order sent", workloads: process.workloads });
    main.processRequest(data.config, data.id, data.testFile);
  })
});

process.logMethod = (text) => {
  //process.stdout.write(text);
  io.emit("log", { text: text, workloads: process.workloads });
};
