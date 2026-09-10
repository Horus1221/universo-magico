import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const $ = id => document.getElementById(id);
const socket = typeof io === "function" ? io() : null;

const home = $("home");
const game = $("game");
const sceneEl = $("scene");

let renderer;
let scene;
let camera;
let clock;

let player = null;
let mixer = null;
let activeAction = null;

const actions = {};

let moving = false;
let nearHouse = null;
let inside = false;

let moveX = 0;
let moveY = 0;
let joyPointer = null;

let lookPointer = null;
let lastLookX = 0;
let lastLookY = 0;

let cameraYaw = 0;
let cameraPitch = 0.28;

let hp = 100;
let mana = 100;
let speedMultiplier = 1;

const keys = {};
const houses = [];

const MOVE_SPEED = 7.5;

const state = {
  username: "Aventurero",
  race: null,
  character: null
};


/* =========================================
   RAZAS Y HABILIDADES
========================================= */

const RACES = {

  Humano: [
    [
      "Voluntad",
      "Recupera maná.",
      () => restoreMana(30)
    ],
    [
      "Segundo aire",
      "Recupera vida.",
      () => restoreHP(25)
    ],
    [
      "Adaptación",
      "Aumenta velocidad.",
      () => buffSpeed(1.6, 5)
    ]
  ],

  Elfo: [
    [
      "Paso de hoja",
      "Impulso veloz.",
      () => dash(8)
    ],
    [
      "Visión élfica",
      "Revela lugares mágicos.",
      () => reveal()
    ],
    [
      "Raíz viva",
      "Regenera vida.",
      () => regen(6, 5)
    ]
  ],

  Enano: [
    [
      "Piel de piedra",
      "Resistencia temporal.",
      () => toast("🪨 Piel de piedra activa")
    ],
    [
      "Golpe sísmico",
      "Onda de energía.",
      () => shockwave()
    ],
    [
      "Forja interior",
      "Recupera maná.",
      () => restoreMana(22)
    ]
  ],

  Orco: [
    [
      "Furia ancestral",
      "Aumenta velocidad.",
      () => buffSpeed(1.8, 5)
    ],
    [
      "Rugido",
      "Sacude el terreno.",
      () => shockwave()
    ],
    [
      "Sed de batalla",
      "Recupera vida.",
      () => restoreHP(20)
    ]
  ],

  Hada: [
    [
      "Alas mágicas",
      "Impulso mágico.",
      () => dash(10)
    ],
    [
      "Polvo feérico",
      "Desata partículas mágicas.",
      () => sparkle()
    ],
    [
      "Bendición",
      "Recupera vida y maná.",
      () => {
        restoreHP(18);
        restoreMana(22);
      }
    ]
  ],

  Dracónido: [
    [
      "Aliento ancestral",
      "Ataque elemental.",
      () => breath()
    ],
    [
      "Escamas dracónicas",
      "Protección temporal.",
      () => toast("🐉 Escamas dracónicas activas")
    ],
    [
      "Salto del dragón",
      "Gran impulso.",
      () => dash(13)
    ]
  ]

};

const costs = [15, 20, 25];


/* =========================================
   LOGIN / REGISTRO
========================================= */

$("tabLogin")?.addEventListener(
  "click",
  () => setAuth(false)
);

$("tabRegister")?.addEventListener(
  "click",
  () => setAuth(true)
);

let registerMode = false;

function setAuth(register) {

  registerMode = register;

  $("tabLogin")?.classList.toggle(
    "active",
    !register
  );

  $("tabRegister")?.classList.toggle(
    "active",
    register
  );

  if ($("authSubmit")) {

    $("authSubmit").textContent =
      register
        ? "CREAR CUENTA"
        : "ENTRAR AL UNIVERSO";

  }

  if ($("authTitle")) {

    $("authTitle").textContent =
      register
        ? "Creá tu aventurero"
        : "Bienvenido al Reino";

  }

}


/* =========================================
   AUTENTICACIÓN
========================================= */

$("authForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const username =
      $("username")?.value.trim() || "";

    const password =
      $("password")?.value || "";

    if (
      username.length < 3 ||
      password.length < 6
    ) {

      return showAuth(
        "Nombre mínimo 3 caracteres y contraseña mínima 6."
      );

    }

    try {

      const response = await fetch(
        registerMode
          ? "/api/register"
          : "/api/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            username,
            password
          })
        }
      );

      const data =
        await response.json().catch(
          () => ({})
        );

      if (!response.ok) {

        throw new Error(
          data.error ||
          "No se pudo entrar."
        );

      }

      localStorage.setItem(
        "universo_magico_user",
        JSON.stringify(data)
      );

      state.character =
        data.character || null;

      startGame(username);

    } catch (error) {

      showAuth(error.message);

    }

  }
);


function showAuth(message) {

  if ($("authMsg")) {

    $("authMsg").textContent = message;

  }

}


/* =========================================
   COMIENZO DEL JUEGO
========================================= */

function startGame(username) {

  state.username =
    username || "Aventurero";

  if ($("playerName")) {

    $("playerName").textContent =
      state.username;

  }

  if ($("avatar")) {

    $("avatar").textContent =
      state.username[0].toUpperCase();

  }

  home.hidden = true;
  game.hidden = false;

  if (!renderer) {

    initWorld();

  }

  setTimeout(
    () => openCharacterCreator(
      state.character
    ),
    700
  );

}
