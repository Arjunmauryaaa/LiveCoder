const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const ACTIONS = require("./Actions");

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    socket.join(roomId);
    socket.to(roomId).emit(ACTIONS.JOINED, {
      clients: Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => ({ socketId, username }) // you'll need proper mapping
      ),
      username,
      socketId: socket.id,
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: "User",
      });
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });
});

server.listen(5001, () => {
  console.log("Server listening on port 5001");
});
