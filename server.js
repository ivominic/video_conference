const express = require("express");
const { SocketAddress } = require("net");
const path = require("path");

let app = express();
let server = app.listen(3000, () => {
  console.log("Listening on port 3000.");
});

const io = require("socket.io")(server, { allowEIO3: true });
app.use(express.static(path.join(__dirname, "")));

let userConnections = [];

io.on("connection", (socket) => {
  console.log("socket id is:", socket.id);
  socket.on("userconnect", (data) => {
    console.log("userconnect", data.displayName, data.meetingId);

    let otherUsers = userConnections.filter((p) => p.meetingId === data.meetingId);

    userConnections.push({
      connectionId: socket.id,
      userId: data.userId,
      meetingId: data.meetingId,
    });

    otherUsers.forEach((v) => {
      socket.to(v.connectionId).emit("inform_others_about_me", {
        otherUserId: data.displayName,
        connId: socket.id,
      });
    });

    socket.emit("inform_me_about_other_user", otherUsers);
  });
  socket.on("SDPProcess", (data) => {
    socket.to(data.toConnId).emit("SDPProcess", {
      message: data.message,
      fromConnId: socket.id,
    });
  });
});
