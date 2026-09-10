const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const publicPath = path.join(__dirname, "..", "public");
const usersFile = path.join(__dirname, "users.json");

const PORT = process.env.PORT || 10000;


/* =========================================
   USUARIOS
========================================= */

let users = {};

try {

  if (fs.existsSync(usersFile)) {

    users =
      JSON.parse(
        fs.readFileSync(
          usersFile,
          "utf8"
        )
      );

  }

} catch (error) {

  console.error(
    "Error leyendo usuarios:",
    error
  );

  users = {};

}


/* =========================================
   MIDDLEWARE
========================================= */

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.static(publicPath)
);


/* =========================================
   SEGURIDAD DE CONTRASEÑAS
========================================= */

function hashPassword(password) {

  const salt =
    crypto.randomBytes(16)
      .toString("hex");

  const hash =
    crypto.scryptSync(
      password,
      salt,
      64
    ).toString("hex");

  return `${salt}:${hash}`;

}


function verifyPassword(
  password,
  stored
) {

  try {

    const parts =
      stored.split(":");

    if (parts.length !== 2)
      return false;

    const salt =
      parts[0];

    const originalHash =
      Buffer.from(
        parts[1],
        "hex"
      );

    const testHash =
      crypto.scryptSync(
        password,
        salt,
        64
      );

    return crypto.timingSafeEqual(
      originalHash,
      testHash
    );

  } catch {

    return false;

  }

}


/* =========================================
   GUARDAR USUARIOS
========================================= */

function saveUsers() {

  fs.writeFileSync(
    usersFile,
    JSON.stringify(
      users,
      null,
      2
    )
  );

}


/* =========================================
   HEALTH CHECK
========================================= */

app.get(
  "/health",
  (req, res) => {

    res.json({
      ok: true
    });

  }
);


/* =========================================
   REGISTRO
========================================= */

app.post(
  "/api/register",
  (req, res) => {

    const username =
      String(
        req.body?.username || ""
      ).trim();

    const password =
      String(
        req.body?.password || ""
      );


    if (
      username.length < 3 ||
      password.length < 6
    ) {

      return res.status(400).json({
        error:
          "Nombre mínimo 3 caracteres y contraseña mínima 6."
      });

    }


    if (users[username]) {

      return res.status(409).json({
        error:
          "Ese aventurero ya existe."
      });

    }


    users[username] = {

      password:
        hashPassword(
          password
        ),

      character: null,

      createdAt:
        new Date().toISOString()

    };


    saveUsers();


    console.log(
      "✨ Nuevo aventurero:",
      username
    );


    res.json({

      username,

      character: null

    });

  }
);


/* =========================================
   LOGIN
========================================= */

app.post(
  "/api/login",
  (req, res) => {

    const username =
      String(
        req.body?.username || ""
      ).trim();

    const password =
      String(
        req.body?.password || ""
      );


    const user =
      users[username];


    if (
      !user ||
      !verifyPassword(
        password,
        user.password
      )
    ) {

      return res.status(401).json({
        error:
          "Nombre o contraseña incorrectos."
      });

    }


    console.log(
      "🌟 Aventurero conectado:",
      username
    );


    res.json({

      username,

      character:
        user.character || null

    });

  }
);


/* =========================================
   GUARDAR PERSONAJE
========================================= */

app.post(
  "/api/character",
  (req, res) => {

    const username =
      String(
        req.body?.username || ""
      ).trim();

    const character =
      req.body?.character || null;


    if (!username) {

      return res.status(400).json({
        error:
          "Falta el nombre del aventurero."
      });

    }


    if (!users[username]) {

      return res.status(404).json({
        error:
          "Aventurero no encontrado."
      });

    }


    users[username].character =
      character;


    saveUsers();


    console.log(
      "🧙 Personaje guardado:",
      username
    );


    res.json({

      ok: true,

      character

    });

  }
);


/* =========================================
   CHAT
========================================= */

io.on(
  "connection",
  socket => {

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


    socket.on(
      "chat",
      data => {

        if (
          typeof data ===
          "string"
        ) {

          const message =
            data
              .trim()
              .slice(0, 200);


          if (!message)
            return;


          io.emit(
            "chat",
            {
              username:
                "Jugador",

              message
            }
          );

          return;

        }


        if (
          !data ||
          typeof data.message !==
          "string"
        ) {

          return;

        }


        const message =
          data.message
            .trim()
            .slice(0, 200);


        if (!message)
          return;


        const username =
          String(
            data.username ||
            "Jugador"
          )
            .trim()
            .slice(0, 24);


        io.emit(
          "chat",
          {

            username:
              username || "Jugador",

            message

          }
        );

      }
    );


    socket.on(
      "disconnect",
      () => {

        console.log(
          "Jugador desconectado:",
          socket.id
        );


        socket.broadcast.emit(
          "system",
          "👋 Un jugador salió del reino"
        );

      }
    );

  }
);


/* =========================================
   INICIO
========================================= */

app.get(
  "*",
  (req, res) => {

    res.sendFile(
      path.join(
        publicPath,
        "index.html"
      )
    );

  }
);


server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `✨ Universo Mágico funcionando en el puerto ${PORT}`
    );

  }
);
