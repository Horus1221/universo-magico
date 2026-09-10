const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const publicPath = path.join(__dirname, "..", "public");

app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.emit(
    "system",
    "✨ Bienvenido al Universo Mágico"
  );

  socket.broadcast.emit(
    "system",
    "🌟 Un nuevo jugador entró al reino"
  );

  socket.on("chat", (message) => {
    if (typeof message !== "string") return;

    const cleanMessage = message
      .trim()
      .slice(0, 200);

    if (!cleanMessage) return;

    io.emit("chat", cleanMessage);
  });

  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);

    socket.broadcast.emit(
      "system",
      "👋 Un jugador salió del reino"
    );
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `✨ Universo Mágico funcionando en el puerto ${PORT}`
  );
});
