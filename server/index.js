const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;
const SECRET = process.env.JWT_SECRET || "universo-magico-secret";

const publicPath = path.join(__dirname, "..", "public");
const usersFile = path.join(__dirname, "users.json");

let users = {};

try {
  if (fs.existsSync(usersFile)) {
    users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  }
} catch (error) {
  console.log("No se pudo cargar users.json");
  users = {};
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicPath));

/* =========================
   SALUD DEL SERVIDOR
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Universo Mágico funcionando"
  });
});

/* =========================
   INICIO
========================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/* =========================
   TOKEN
========================= */

function createToken(username) {
  return jwt.sign(
    { username },
    SECRET,
    { expiresIn: "30d" }
  );
}

/* =========================
   REGISTRO
========================= */

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        error: "Faltan el nombre y la contraseña."
      });
    }

    const cleanUsername = String(username).trim();

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        error: "El nombre debe tener al menos 3 caracteres."
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 4 caracteres."
      });
    }

    if (users[cleanUsername]) {
      return res.status(409).json({
        error: "Ese nombre ya existe."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    users[cleanUsername] = {
      password: hashedPassword,
      character: null
    };

    fs.writeFileSync(
      usersFile,
      JSON.stringify(users, null, 2)
    );

    res.json({
      username: cleanUsername,
      token: createToken(cleanUsername),
      character: null
    });

  } catch (error) {
    console.error("Error en registro:", error);

    res.status(500).json({
      error: "Error interno del servidor."
    });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        error: "Ingresá tu nombre y contraseña."
      });
    }

    const cleanUsername = String(username).trim();
    const user = users[cleanUsername];

    if (!user) {
      return res.status(401).json({
        error: "Nombre o contraseña incorrectos."
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Nombre o contraseña incorrectos."
      });
    }

    res.json({
      username: cleanUsername,
      token: createToken(cleanUsername),
      character: user.character || null
    });

  } catch (error) {
    console.error("Error en login:", error);

    res.status(500).json({
      error: "Error interno del servidor."
    });
  }
});

/* =========================
   GUARDAR PERSONAJE
========================= */

app.post("/api/character", (req, res) => {
  try {
    const { username, character } = req.body || {};

    if (!username || !users[username]) {
      return res.status(404).json({
        error: "Usuario no encontrado."
      });
    }

    users[username].character = character || null;

    fs.writeFileSync(
      usersFile,
      JSON.stringify(users, null, 2)
    );

    res.json({
      ok: true,
      character: users[username].character
    });

  } catch (error) {
    console.error("Error guardando personaje:", error);

    res.status(500).json({
      error: "No se pudo guardar el personaje."
    });
  }
});

/* =========================
   CHAT
========================= */

io.on("connection", (socket) => {

  console.log(
    "Jugador conectado:",
    socket.id
  );

  socket.emit(
    "system",
    "✨ Bienvenido al Universo Mágico"
  );

  socket.broadcast.emit(
    "system",
    "🌟 Un nuevo jugador entró al reino"
  );

  socket.on("chat", (data) => {

    if (!data) return;

    let username = "Jugador";
    let message = "";

    if (typeof data === "string") {
      message = data;
    } else {
      username = String(
        data.username || "Jugador"
      ).slice(0, 24);

      message = String(
        data.message || ""
      );
    }

    message = message
      .trim()
      .slice(0, 200);

    if (!message) return;

    io.emit("chat", {
      username,
      message
    });
  });

  socket.on("disconnect", () => {

    console.log(
      "Jugador desconectado:",
      socket.id
    );

    socket.broadcast.emit(
      "system",
      "👋 Un jugador salió del reino"
    );
  });
});

/* =========================
   SERVIDOR
========================= */

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    `✨ Universo Mágico funcionando en el puerto ${PORT}`
  );

});
