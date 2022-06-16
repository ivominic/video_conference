const express = require("express");
const path = require("path");

let app = express();
let server = app.listen(3000, () => {
  console.log("Listening on port 3000.");
});

const io = require("socket.io")(server, { allowEIO3: true });
app.use(express.static(path.join(__dirname, "")));

io.on("connection", (socket) => {
  console.log("socket id is:", socket.id);
});
