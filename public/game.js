
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
/* =========================================
   CARGAR PERSONAJE 3D
========================================= */

function loadPlayer() {

  const loader =
    new GLTFLoader();

  loader.load(

    "/assets/characters/Superhero_Male_FullBody_web.gltf",

    gltf => {

      player = gltf.scene;

      player.scale.setScalar(1.8);

      player.position.set(
        0,
        0,
        18
      );

      player.traverse(object => {

        if (object.isMesh) {

          object.castShadow = true;
          object.receiveShadow = true;

          if (object.material) {

            object.material.roughness =
              0.75;

          }

        }

      });

      scene.add(player);

      /* =========================
         ANIMACIONES
      ========================= */

      mixer =
        new THREE.AnimationMixer(
          player
        );

      loadAnimations();

      /* =========================
         RAZA
      ========================= */

      if (state.race) {

        applyRaceAppearance(
          state.race
        );

      }

      updateCamera(0.1);

      toast(
        "✨ Tu aventurero ha llegado al reino"
      );

    },

    undefined,

    error => {

      console.error(
        "Error cargando personaje:",
        error
      );

      toast(
        "⚠️ No se pudo cargar el personaje 3D"
      );

    }

  );

}


/* =========================================
   ANIMACIONES UAL1
========================================= */

function loadAnimations() {

  const loader =
    new GLTFLoader();

  loader.load(

    "/assets/characters/UAL1_Standard.glb",

    gltf => {

      if (!gltf.animations?.length) {

        console.warn(
          "UAL1 no contiene animaciones"
        );

        return;

      }

      gltf.animations.forEach(
        clip => {

          const name =
            clip.name.toLowerCase();

          let key = "idle";

          if (
            name.includes("walk") ||
            name.includes("walking")
          ) {

            key = "walk";

          }

          if (
            name.includes("run") ||
            name.includes("running")
          ) {

            key = "run";

          }

          if (
            name.includes("idle") ||
            name.includes("stand")
          ) {

            key = "idle";

          }

          if (!actions[key]) {

            actions[key] =
              mixer.clipAction(clip);

          }

        }
      );


      /* Buscar animaciones por nombres
         aunque el paquete utilice nombres
         diferentes */

      if (!actions.idle &&
          gltf.animations[0]) {

        actions.idle =
          mixer.clipAction(
            gltf.animations[0]
          );

      }

      if (!actions.walk &&
          gltf.animations[1]) {

        actions.walk =
          mixer.clipAction(
            gltf.animations[1]
          );

      }

      playAnimation("idle");

    },

    undefined,

    error => {

      console.warn(
        "No se pudieron cargar las animaciones UAL1",
        error
      );

    }

  );

}


/* =========================================
   CAMBIAR ANIMACIÓN
========================================= */

function playAnimation(name) {

  const next =
    actions[name];

  if (!next) return;

  if (activeAction === next)
    return;

  if (activeAction) {

    activeAction.fadeOut(
      0.18
    );

  }

  next.reset();

  next.fadeIn(
    0.18
  );

  next.play();

  activeAction =
    next;

}


/* =========================================
   MOVIMIENTO
========================================= */

function updateMovement(dt) {

  if (!player) return;

  let x = moveX;
  let y = moveY;


  if (keys.ArrowLeft ||
      keys.a) {

    x -= 1;

  }

  if (keys.ArrowRight ||
      keys.d) {

    x += 1;

  }

  if (keys.ArrowUp ||
      keys.w) {

    y -= 1;

  }

  if (keys.ArrowDown ||
      keys.s) {

    y += 1;

  }


  const length =
    Math.hypot(x, y);

  moving =
    length > 0.08;


  if (!moving) {

    playAnimation("idle");

    return;

  }


  x /= length;
  y /= length;


  /* Movimiento relativo a la cámara */

  const forward =
    new THREE.Vector3(
      -Math.sin(cameraYaw),
      0,
      -Math.cos(cameraYaw)
    );

  const right =
    new THREE.Vector3(
      Math.cos(cameraYaw),
      0,
      -Math.sin(cameraYaw)
    );


  const direction =
    new THREE.Vector3();

  direction.addScaledVector(
    right,
    x
  );

  direction.addScaledVector(
    forward,
    -y
  );

  direction.normalize();


  const speed =
    MOVE_SPEED *
    speedMultiplier *
    dt;


  player.position.addScaledVector(
    direction,
    speed
  );


  /* El personaje mira hacia donde camina */

  const targetRotation =
    Math.atan2(
      direction.x,
      direction.z
    );


  player.rotation.y =
    THREE.MathUtils.lerp(
      player.rotation.y,
      targetRotation,
      0.18
    );


  playAnimation(
    actions.run
      ? "run"
      : "walk"
  );


  /* Límites del mundo */

  player.position.x =
    THREE.MathUtils.clamp(
      player.position.x,
      -82,
      82
    );

  player.position.z =
    THREE.MathUtils.clamp(
      player.position.z,
      -82,
      82
    );

}


/* =========================================
   CÁMARA TERCERA PERSONA
========================================= */

function updateCamera(dt) {

  if (!player || !camera)
    return;


  const distance = 9;

  const horizontal =
    Math.cos(cameraPitch) *
    distance;

  const vertical =
    Math.sin(cameraPitch) *
    distance;


  const desired =
    new THREE.Vector3(

      player.position.x +
      Math.sin(cameraYaw) *
      horizontal,

      player.position.y +
      3.2 +
      vertical,

      player.position.z +
      Math.cos(cameraYaw) *
      horizontal

    );


  const smooth =
    1 -
    Math.pow(
      0.0005,
      Math.min(dt, 0.05)
    );


  camera.position.lerp(
    desired,
    smooth
  );


  const target =
    new THREE.Vector3(

      player.position.x,

      player.position.y +
      2.6,

      player.position.z

    );


  camera.lookAt(
    target
  );

}


/* =========================================
   CÁMARA TÁCTIL
========================================= */

function setupCameraTouch() {

  sceneEl.addEventListener(
    "pointerdown",
    event => {

      if (
        event.target.closest(
          "button,.chat,#joystick,.panel"
        )
      ) {

        return;

      }

      lookPointer =
        event.pointerId;

      lastLookX =
        event.clientX;

      lastLookY =
        event.clientY;

      sceneEl.setPointerCapture(
        event.pointerId
      );

    }
  );


  sceneEl.addEventListener(
    "pointermove",
    event => {

      if (
        event.pointerId !==
        lookPointer
      ) {

        return;

      }


      const dx =
        event.clientX -
        lastLookX;

      const dy =
        event.clientY -
        lastLookY;


      lastLookX =
        event.clientX;

      lastLookY =
        event.clientY;


      cameraYaw -=
        dx * 0.008;


      cameraPitch -=
        dy * 0.006;


      cameraPitch =
        THREE.MathUtils.clamp(
          cameraPitch,
          -0.25,
          0.9
        );

    }
  );


  const endLook =
    event => {

      if (
        event.pointerId ===
        lookPointer
      ) {

        lookPointer =
          null;

      }

    };


  sceneEl.addEventListener(
    "pointerup",
    endLook
  );

  sceneEl.addEventListener(
    "pointercancel",
    endLook
  );

}


/* =========================================
   JOYSTICK
========================================= */

function setupJoystick() {

  const joystick =
    $("joystick");

  if (!joystick) return;

  const stick =
    joystick.querySelector(
      ".stick"
    );

  if (!stick) return;


  function updateJoystick(
    event
  ) {

    const rect =
      joystick.getBoundingClientRect();

    const centerX =
      rect.left +
      rect.width / 2;

    const centerY =
      rect.top +
      rect.height / 2;


    let dx =
      event.clientX -
      centerX;

    let dy =
      event.clientY -
      centerY;


    const radius =
      rect.width * 0.38;


    const distance =
      Math.hypot(dx, dy);


    if (distance > radius) {

      dx =
        dx / distance *
        radius;

      dy =
        dy / distance *
        radius;

    }


    moveX =
      dx / radius;

    moveY =
      dy / radius;


    stick.style.transform =
      `translate(${dx}px, ${dy}px)`;

  }


  joystick.addEventListener(
    "pointerdown",
    event => {

      joyPointer =
        event.pointerId;

      joystick.setPointerCapture(
        event.pointerId
      );

      updateJoystick(event);

    }
  );


  joystick.addEventListener(
    "pointermove",
    event => {

      if (
        event.pointerId ===
        joyPointer
      ) {

        updateJoystick(event);

      }

    }
  );


  function releaseJoystick() {

    joyPointer =
      null;

    moveX = 0;
    moveY = 0;

    stick.style.transform =
      "translate(0,0)";

  }


  joystick.addEventListener(
    "pointerup",
    releaseJoystick
  );

  joystick.addEventListener(
    "pointercancel",
    releaseJoystick
  );

}


/* =========================================
   TECLADO
========================================= */

function setupKeyboard() {

  window.addEventListener(
    "keydown",
    event => {

      keys[event.key] =
        true;

    }
  );


  window.addEventListener(
    "keyup",
    event => {

      keys[event.key] =
        false;

    }
  );

}


/* =========================================
   REDIMENSIONAR
========================================= */

function resize() {

  if (!camera || !renderer)
    return;

  camera.aspect =
    window.innerWidth /
    window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

}
