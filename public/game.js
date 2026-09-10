
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


/* =========================================
   INICIALIZAR MUNDO
========================================= */

function initWorld() {

  scene = new THREE.Scene();

  clock = new THREE.Clock();

  scene.background =
    new THREE.Color(0x91c9e8);

  scene.fog =
    new THREE.Fog(
      0x91c9e8,
      35,
      180
    );


  /* =========================
     CÁMARA
  ========================= */

  camera =
    new THREE.PerspectiveCamera(
      60,
      window.innerWidth /
      window.innerHeight,
      0.1,
      500
    );

  camera.position.set(
    0,
    5,
    10
  );


  /* =========================
     RENDERER
  ========================= */

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      2
    )
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  sceneEl.innerHTML = "";

  sceneEl.appendChild(
    renderer.domElement
  );


  /* =========================
     ILUMINACIÓN
  ========================= */

  const ambient =
    new THREE.HemisphereLight(
      0xbfe9ff,
      0x304020,
      2.2
    );

  scene.add(ambient);


  const sun =
    new THREE.DirectionalLight(
      0xfff4d6,
      3
    );

  sun.position.set(
    -40,
    70,
    30
  );

  sun.castShadow = true;

  sun.shadow.mapSize.width =
    2048;

  sun.shadow.mapSize.height =
    2048;

  sun.shadow.camera.left =
    -100;

  sun.shadow.camera.right =
    100;

  sun.shadow.camera.top =
    100;

  sun.shadow.camera.bottom =
    -100;

  sun.shadow.camera.near =
    1;

  sun.shadow.camera.far =
    250;

  scene.add(sun);


  /* =========================
     TERRENO
  ========================= */

  createTerrain();


  /* =========================
     AGUA
  ========================= */

  createWater();


  /* =========================
     VEGETACIÓN
  ========================= */

  createForest();


  /* =========================
     ROCAS
  ========================= */

  createRocks();


  /* =========================
     ALDEA
  ========================= */

  createVillage();


  /* =========================
     MONTAÑAS
  ========================= */

  createMountains();


  /* =========================
     JUGADOR
  ========================= */

  loadPlayer();


  /* =========================
     CONTROLES
  ========================= */

  setupJoystick();

  setupKeyboard();

  setupCameraTouch();

  setupCombat();

  setupChat();

  setupMap();

  setupHouseControls();


  window.addEventListener(
    "resize",
    resize
  );


  animate();

}


/* =========================================
   TERRENO
========================================= */

function createTerrain() {

  const geometry =
    new THREE.PlaneGeometry(
      180,
      180,
      60,
      60
    );

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x4d7c42,
      roughness: 1
    });

  const ground =
    new THREE.Mesh(
      geometry,
      material
    );

  ground.rotation.x =
    -Math.PI / 2;

  ground.receiveShadow = true;

  scene.add(ground);

}


/* =========================================
   AGUA
========================================= */

function createWater() {

  const geometry =
    new THREE.PlaneGeometry(
      42,
      18,
      20,
      10
    );

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x3b91b5,
      transparent: true,
      opacity: 0.82,
      roughness: 0.25,
      metalness: 0.05
    });

  const water =
    new THREE.Mesh(
      geometry,
      material
    );

  water.rotation.x =
    -Math.PI / 2;

  water.position.set(
    18,
    0.035,
    -35
  );

  water.receiveShadow = true;

  scene.add(water);

}


/* =========================================
   BOSQUE
========================================= */

function createForest() {

  for (
    let i = 0;
    i < 95;
    i++
  ) {

    const x =
      (Math.random() - 0.5) *
      150;

    const z =
      (Math.random() - 0.5) *
      150;


    if (
      Math.abs(x) < 24 &&
      Math.abs(z) < 24
    ) {

      continue;

    }


    createTree(
      x,
      z,
      0.8 +
      Math.random() * 1.5
    );

  }

}


/* =========================================
   ÁRBOL
========================================= */

function createTree(
  x,
  z,
  scale = 1
) {

  const tree =
    new THREE.Group();


  const trunk =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        0.28,
        0.45,
        3.2,
        8
      ),

      new THREE.MeshStandardMaterial({
        color: 0x65452d,
        roughness: 1
      })

    );

  trunk.position.y =
    1.6;

  trunk.castShadow = true;

  trunk.receiveShadow = true;

  tree.add(trunk);


  const leaves1 =
    new THREE.Mesh(

      new THREE.IcosahedronGeometry(
        1.7,
        1
      ),

      new THREE.MeshStandardMaterial({
        color: 0x285d35,
        roughness: 1
      })

    );

  leaves1.position.y =
    3.6;

  leaves1.scale.set(
    1.2,
    1.15,
    1.2
  );

  leaves1.castShadow = true;

  tree.add(leaves1);


  const leaves2 =
    new THREE.Mesh(

      new THREE.IcosahedronGeometry(
        1.35,
        1
      ),

      new THREE.MeshStandardMaterial({
        color: 0x3f7f42,
        roughness: 1
      })

    );

  leaves2.position.y =
    5.1;

  leaves2.scale.set(
    1.15,
    1.1,
    1.15
  );

  leaves2.castShadow = true;

  tree.add(leaves2);


  tree.position.set(
    x,
    0,
    z
  );

  tree.scale.setScalar(
    scale
  );

  scene.add(tree);

}


/* =========================================
   ROCAS
========================================= */

function createRocks() {

  for (
    let i = 0;
    i < 55;
    i++
  ) {

    const rock =
      new THREE.Mesh(

        new THREE.DodecahedronGeometry(
          0.7 +
          Math.random() * 1.2,
          1
        ),

        new THREE.MeshStandardMaterial({
          color: 0x777875,
          roughness: 1
        })

      );


    rock.position.set(

      (Math.random() - 0.5) *
      160,

      0.45,

      (Math.random() - 0.5) *
      160

    );


    rock.rotation.set(
      Math.random(),
      Math.random(),
      Math.random()
    );


    rock.scale.y =
      0.55 +
      Math.random() * 0.45;


    rock.castShadow = true;

    rock.receiveShadow = true;

    scene.add(rock);

  }

}


/* =========================================
   MONTAÑAS
========================================= */

function createMountains() {

  for (
    let i = 0;
    i < 12;
    i++
  ) {

    const mountain =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          10 +
          Math.random() * 12,

          22 +
          Math.random() * 18,

          7

        ),

        new THREE.MeshStandardMaterial({
          color: 0x52665b,
          roughness: 1
        })

      );


    const angle =
      Math.random() *
      Math.PI *
      2;


    const distance =
      85 +
      Math.random() *
      25;


    mountain.position.set(

      Math.cos(angle) *
      distance,

      10,

      Math.sin(angle) *
      distance

    );


    mountain.castShadow = true;

    scene.add(mountain);

  }

}


/* =========================================
   ALDEA
========================================= */

function createVillage() {

  createHouse(
    -12,
    -8,
    "Casa del Bosque"
  );

  createHouse(
    10,
    -7,
    "Casa del Herrero"
  );

  createHouse(
    -8,
    10,
    "Casa de la Curandera"
  );

  createHouse(
    10,
    11,
    "Casa del Sabio"
  );

}


/* =========================================
   CASA EXTERIOR
========================================= */

function createHouse(
  x,
  z,
  name
) {

  const house =
    new THREE.Group();


  const body =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        7,
        4,
        6
      ),

      new THREE.MeshStandardMaterial({
        color: 0xb98c61,
        roughness: 0.9
      })

    );


  body.position.y =
    2;

  body.castShadow = true;

  body.receiveShadow = true;

  house.add(body);


  const roof =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        5.3,
        3.5,
        4
      ),

      new THREE.MeshStandardMaterial({
        color: 0x513b32,
        roughness: 0.9
      })

    );


  roof.rotation.y =
    Math.PI / 4;

  roof.position.y =
    5.7;

  roof.castShadow = true;

  house.add(roof);


  house.position.set(
    x,
    0,
    z
  );


  scene.add(house);


  houses.push({
    object: house,
    x,
    z,
    name
  });

}
