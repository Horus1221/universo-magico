
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
/* =========================================
   CREADOR DE PERSONAJE
========================================= */

function openCharacterCreator(saved) {

  const creator =
    $("characterCreator");

  if (!creator) {

    /* Si todavía no existe el panel,
       elegimos humano como base */

    if (!state.race) {

      state.race = "Humano";

    }

    updateRaceUI();

    return;

  }

  creator.hidden = false;

  setupRaceButtons();

  if (saved?.race) {

    state.race =
      saved.race;

  }

  updateRaceUI();

}


/* =========================================
   SELECCIÓN DE RAZA
========================================= */

function setupRaceButtons() {

  document
    .querySelectorAll(
      "[data-race]"
    )
    .forEach(button => {

      button.onclick = () => {

        state.race =
          button.dataset.race;

        updateRaceUI();

        applyRaceAppearance(
          state.race
        );

      };

    });

}


/* =========================================
   ACTUALIZAR INTERFAZ DE RAZA
========================================= */

function updateRaceUI() {

  const race =
    state.race ||
    "Humano";

  const abilities =
    RACES[race];

  if ($("playerRace")) {

    $("playerRace").textContent =
      race;

  }

  if ($("abilityRace")) {

    $("abilityRace").textContent =
      race;

  }


  abilities.forEach(
    (ability, index) => {

      const button =
        $(`ability${index}`);

      if (!button) return;

      button.textContent =
        `${ability[0]} · ${costs[index]} MP`;

      button.title =
        ability[1];

      button.onclick =
        () => useAbility(index);

    }
  );

}


/* =========================================
   APARIENCIA SEGÚN RAZA
========================================= */

function applyRaceAppearance(
  race
) {

  if (!player) return;


  /* Guardamos la raza */

  state.race =
    race;


  player.traverse(
    object => {

      if (!object.isMesh)
        return;


      const name =
        (
          object.name ||
          ""
        ).toLowerCase();


      /* =========================
         ELFOS
      ========================= */

      if (
        race === "Elfo" &&
        (
          name.includes("ear") ||
          name.includes("head")
        )
      ) {

        object.scale.x *=
          1.12;

      }


      /* =========================
         ORCOS
      ========================= */

      if (
        race === "Orco" &&
        (
          name.includes("head") ||
          name.includes("face")
        )
      ) {

        object.scale.multiplyScalar(
          1.08
        );

      }


      /* =========================
         DRACÓNIDO
      ========================= */

      if (
        race === "Dracónido" &&
        (
          name.includes("head") ||
          name.includes("helmet")
        )
      ) {

        object.scale.multiplyScalar(
          1.05
        );

      }

    }
  );

}


/* =========================================
   PODERES
========================================= */

function useAbility(index) {

  const race =
    state.race ||
    "Humano";

  const ability =
    RACES[race]?.[index];

  if (!ability) return;


  const cost =
    costs[index];


  if (mana < cost) {

    toast(
      "💧 No tenés suficiente maná"
    );

    return;

  }


  mana -= cost;

  updateHUD();


  ability[2]();

}


/* =========================================
   VIDA
========================================= */

function restoreHP(
  amount
) {

  hp =
    Math.min(
      100,
      hp + amount
    );

  updateHUD();

  toast(
    `❤️ +${amount} vida`
  );

}


/* =========================================
   MANÁ
========================================= */

function restoreMana(
  amount
) {

  mana =
    Math.min(
      100,
      mana + amount
    );

  updateHUD();

  toast(
    `💧 +${amount} maná`
  );

}


/* =========================================
   REGENERACIÓN
========================================= */

function regen(
  amount,
  seconds
) {

  const interval =
    setInterval(
      () => {

        restoreHP(
          amount
        );

      },
      1000
    );


  setTimeout(
    () => {

      clearInterval(
        interval
      );

    },
    seconds * 1000
  );

}


/* =========================================
   VELOCIDAD
========================================= */

function buffSpeed(
  multiplier,
  seconds
) {

  speedMultiplier =
    multiplier;

  toast(
    "⚡ Velocidad aumentada"
  );


  setTimeout(
    () => {

      speedMultiplier =
        1;

    },
    seconds * 1000
  );

}


/* =========================================
   DASH
========================================= */

function dash(
  distance
) {

  if (!player) return;


  const direction =
    new THREE.Vector3(
      0,
      0,
      -1
    );

  direction.applyAxisAngle(
    new THREE.Vector3(
      0,
      1,
      0
    ),
    player.rotation.y
  );


  player.position.addScaledVector(
    direction,
    distance
  );


  sparkle();

}


/* =========================================
   EFECTO DE PARTÍCULAS
========================================= */

function sparkle() {

  if (!player) return;


  const group =
    new THREE.Group();


  for (
    let i = 0;
    i < 35;
    i++
  ) {

    const particle =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.08,
          6,
          6
        ),

        new THREE.MeshBasicMaterial({
          color: 0xd9a7ff
        })

      );


    particle.position.set(

      (Math.random() - 0.5) *
      2,

      Math.random() *
      3,

      (Math.random() - 0.5) *
      2

    );


    group.add(
      particle
    );

  }


  group.position.copy(
    player.position
  );

  scene.add(
    group
  );


  const start =
    performance.now();


  function animateParticles(
    time
  ) {

    const progress =
      (time - start) /
      900;


    group.children.forEach(
      particle => {

        particle.position.y +=
          0.015;

        particle.scale.setScalar(
          1 - progress
        );

      }
    );


    if (progress < 1) {

      requestAnimationFrame(
        animateParticles
      );

    } else {

      scene.remove(
        group
      );

    }

  }


  requestAnimationFrame(
    animateParticles
  );

}


/* =========================================
   ONDA DE ENERGÍA
========================================= */

function shockwave() {

  if (!player) return;


  const ring =
    new THREE.Mesh(

      new THREE.RingGeometry(
        0.4,
        0.65,
        40
      ),

      new THREE.MeshBasicMaterial({
        color: 0xb58cff,
        transparent: true,
        side: THREE.DoubleSide
      })

    );


  ring.rotation.x =
    -Math.PI / 2;

  ring.position.copy(
    player.position
  );

  ring.position.y =
    0.08;

  scene.add(
    ring
  );


  const start =
    performance.now();


  function animateRing(
    time
  ) {

    const p =
      (time - start) /
      700;


    ring.scale.setScalar(
      1 + p * 10
    );


    ring.material.opacity =
      1 - p;


    if (p < 1) {

      requestAnimationFrame(
        animateRing
      );

    } else {

      scene.remove(
        ring
      );

    }

  }


  requestAnimationFrame(
    animateRing
  );

}


/* =========================================
   ALIENTO DRACÓNICO
========================================= */

function breath() {

  if (!player) return;


  const group =
    new THREE.Group();


  for (
    let i = 0;
    i < 25;
    i++
  ) {

    const fire =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.12 +
          Math.random() * 0.15,
          8,
          8
        ),

        new THREE.MeshBasicMaterial({
          color: 0xff8a38
        })

      );


    fire.position.set(
      0,
      2,
      -1
    );


    fire.userData.velocity =
      new THREE.Vector3(
        (Math.random() - 0.5) *
        0.4,

        (Math.random() - 0.5) *
        0.3,

        -0.8 -
        Math.random()
      );


    group.add(
      fire
    );

  }


  group.position.copy(
    player.position
  );


  group.rotation.y =
    player.rotation.y;


  scene.add(
    group
  );


  const start =
    performance.now();


  function animateBreath(
    time
  ) {

    const p =
      (time - start) /
      1000;


    group.children.forEach(
      particle => {

        particle.position.add(
          particle.userData.velocity
        );

        particle.scale.multiplyScalar(
          0.97
        );

      }
    );


    if (p < 1) {

      requestAnimationFrame(
        animateBreath
      );

    } else {

      scene.remove(
        group
      );

    }

  }


  requestAnimationFrame(
    animateBreath
  );

}


/* =========================================
   VISIÓN MÁGICA
========================================= */

function reveal() {

  toast(
    "👁️ La visión élfica revela el reino"
  );

  scene.fog.near =
    10;

  scene.fog.far =
    260;


  setTimeout(
    () => {

      scene.fog.near =
        35;

      scene.fog.far =
        180;

    },
    5000
  );

}


/* =========================================
   HUD
========================================= */

function updateHUD() {

  const hpBar =
    $("hpBar");

  const manaBar =
    $("manaBar");


  if (hpBar) {

    hpBar.style.width =
      `${hp}%`;

  }


  if (manaBar) {

    manaBar.style.width =
      `${mana}%`;

  }

}


/* =========================================
   TOAST
========================================= */

function toast(
  message
) {

  let element =
    $("gameToast");


  if (!element) {

    element =
      document.createElement(
        "div"
      );

    element.id =
      "gameToast";

    document.body.appendChild(
      element
    );

  }


  element.textContent =
    message;

  element.classList.add(
    "show"
  );


  clearTimeout(
    element._timer
  );


  element._timer =
    setTimeout(
      () => {

        element.classList.remove(
          "show"
        );

      },
      2200
    );

}


/* =========================================
   CHAT
========================================= */

function setupChat() {

  const form =
    $("chatForm");

  const input =
    $("chatInput");


  if (!form || !input)
    return;


  form.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      const message =
        input.value.trim();


      if (!message)
        return;


      if (socket) {

        socket.emit(
          "chat",
          {
            username:
              state.username,

            message
          }
        );

      }


      input.value = "";

    }
  );


  if (socket) {

    socket.on(
      "chat",
      data => {

        addChatMessage(
          data
        );

      }
    );


    socket.on(
      "system",
      message => {

        addChatMessage({
          username:
            "Sistema",

          message
        });

      }
    );

  }


  /* Botón para ocultar chat */

  const toggle =
    $("chatToggle");


  toggle?.addEventListener(
    "click",
    () => {

      const chat =
        $("chat");


      if (!chat) return;


      chat.classList.toggle(
        "chat-hidden"
      );


      toggle.textContent =
        chat.classList.contains(
          "chat-hidden"
        )
          ? "💬"
          : "×";

    }
  );

}


/* =========================================
   MENSAJE DE CHAT
========================================= */

function addChatMessage(
  data
) {

  const chatMessages =
    $("chatMessages");


  if (!chatMessages)
    return;


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "chat-message";


  const username =
    data?.username ||
    "Jugador";


  const message =
    data?.message ||
    "";


  row.textContent =
    `${username}: ${message}`;


  chatMessages.appendChild(
    row
  );


  while (
    chatMessages.children.length >
    40
  ) {

    chatMessages.firstChild
      ?.remove();

  }


  chatMessages.scrollTop =
    chatMessages.scrollHeight;

}


/* =========================================
   MAPA
========================================= */

function setupMap() {

  const button =
    $("mapButton");

  const map =
    $("sideMap");


  if (!button || !map)
    return;


  button.addEventListener(
    "click",
    () => {

      map.classList.toggle(
        "open"
      );

      updateMapMarker();

    }
  );

}


/* =========================================
   MARCADOR DEL JUGADOR
========================================= */

function updateMapMarker() {

  const marker =
    $("playerMarker");


  if (
    !marker ||
    !player
  ) return;


  const mapSize =
    260;

  const worldSize =
    164;


  const x =
    (
      player.position.x /
      worldSize
    ) *
    mapSize;


  const z =
    (
      player.position.z /
      worldSize
    ) *
    mapSize;


  marker.style.left =
    `${50 + x}%`;


  marker.style.top =
    `${50 + z}%`;

}


/* =========================================
   CASAS
========================================= */

function setupHouseControls() {

  const enter =
    $("enterHouse");

  const exit =
    $("exitHouse");


  enter?.addEventListener(
    "click",
    enterNearestHouse
  );


  exit?.addEventListener(
    "click",
    exitHouse
  );

}


function checkHouseProximity() {

  if (
    !player ||
    inside
  ) return;


  nearHouse =
    null;


  let closest =
    Infinity;


  houses.forEach(
    house => {

      const distance =
        player.position.distanceTo(
          new THREE.Vector3(
            house.x,
            0,
            house.z
          )
        );


      if (
        distance < 7 &&
        distance < closest
      ) {

        closest =
          distance;

        nearHouse =
          house;

      }

    }
  );


  const button =
    $("enterHouse");


  if (button) {

    button.hidden =
      !nearHouse;

  }

}


/* =========================================
   ENTRAR EN CASA
========================================= */

function enterNearestHouse() {

  if (!nearHouse ||
      !player)
    return;


  inside = true;


  player.position.set(
    0,
    0,
    0
  );


  createInterior(
    nearHouse.name
  );


  $("enterHouse")?.setAttribute(
    "hidden",
    ""
  );

  $("exitHouse")?.removeAttribute(
    "hidden"
  );


  toast(
    `🏠 ${nearHouse.name}`
  );

}


/* =========================================
   INTERIOR
========================================= */

function createInterior(
  name
) {

  /* Limpiamos solamente
     decoraciones interiores
     anteriores */

  scene.traverse(
    object => {

      if (
        object.userData &&
        object.userData.interior
      ) {

        object.parent?.remove(
          object
        );

      }

    }
  );


  const interior =
    new THREE.Group();


  interior.userData.interior =
    true;


  /* Piso */

  const floor =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        18,
        0.2,
        14
      ),

      new THREE.MeshStandardMaterial({
        color: 0x75533b,
        roughness: 0.9
      })

    );


  floor.position.y =
    -0.1;

  floor.receiveShadow = true;

  interior.add(
    floor
  );


  /* Paredes */

  const wallMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xb88c62,
      roughness: 0.9
    });


  const wallBack =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        18,
        5,
        0.3
      ),

      wallMaterial

    );


  wallBack.position.set(
    0,
    2.5,
    -7
  );


  wallBack.castShadow = true;

  interior.add(
    wallBack
  );


  const wallLeft =
    wallBack.clone();


  wallLeft.scale.set(
    14 / 18,
    1,
    1
  );


  wallLeft.rotation.y =
    Math.PI / 2;


  wallLeft.position.set(
    -9,
    2.5,
    0
  );


  interior.add(
    wallLeft
  );


  const wallRight =
    wallLeft.clone();


  wallRight.position.x =
    9;


  interior.add(
    wallRight
  );


  /* Cama */

  const bed =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3,
        0.65,
        5
      ),

      new THREE.MeshStandardMaterial({
        color: 0x6b4432
      })

    );


  bed.position.set(
    -4,
    0.45,
    -3
  );


  bed.castShadow = true;

  interior.add(
    bed
  );


  /* Cobertor */

  const blanket =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        2.8,
        0.18,
        3.8
      ),

      new THREE.MeshStandardMaterial({
        color: 0x785f9e
      })

    );


  blanket.position.set(
    -4,
    0.82,
    -3
  );


  interior.add(
    blanket
  );


  /* Mesa */

  const table =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3,
        1.2,
        1.8
      ),

      new THREE.MeshStandardMaterial({
        color: 0x593d2b
      })

    );


  table.position.set(
    3,
    0.7,
    -2
  );


  table.castShadow = true;

  interior.add(
    table
  );


  /* Lámpara */

  const light =
    new THREE.PointLight(
      0xffc66d,
      7,
      16
    );


  light.position.set(
    0,
    4,
    0
  );


  interior.add(
    light
  );


  scene.add(
    interior
  );

}


/* =========================================
   SALIR DE CASA
========================================= */

function exitHouse() {

  if (!inside ||
      !player)
    return;


  inside = false;


  scene.traverse(
    object => {

      if (
        object.userData &&
        object.userData.interior
      ) {

        object.parent?.remove(
          object
        );

      }

    }
  );


  if (nearHouse) {

    player.position.set(
      nearHouse.x,
      0,
      nearHouse.z + 7
    );

  } else {

    player.position.set(
      0,
      0,
      18
    );

  }


  $("exitHouse")?.setAttribute(
    "hidden",
    ""
  );


  toast(
    "🌿 Has salido de la casa"
  );

}


/* =========================================
   COMBATE
========================================= */

function setupCombat() {

  document
    .querySelectorAll(
      ".ability-button"
    )
    .forEach(
      (button, index) => {

        button.onclick =
          () => useAbility(index);

      }
    );

}


/* =========================================
   BUCLE PRINCIPAL
========================================= */

function animate() {

  requestAnimationFrame(
    animate
  );


  const dt =
    Math.min(
      clock.getDelta(),
      0.05
    );


  updateMovement(
    dt
  );


  if (mixer) {

    mixer.update(
      dt
    );

  }


  updateCamera(
    dt
  );


  checkHouseProximity();

  updateMapMarker();


  if (renderer &&
      scene &&
      camera) {

    renderer.render(
      scene,
      camera
    );

  }

}


/* =========================================
   RECUPERACIÓN DE MANÁ
========================================= */

setInterval(
  () => {

    if (
      game &&
      !game.hidden &&
      mana < 100
    ) {

      mana =
        Math.min(
          100,
          mana + 1
        );

      updateHUD();

    }

  },
  1000
);
/* =========================================
   FINALIZAR CREACIÓN DEL PERSONAJE
========================================= */

$("finishCharacter")?.addEventListener(
  "click",
  async () => {

    const race =
      state.race || "Humano";

    state.race = race;

    state.character = {
      race: race,
      appearance: {
        hair: "default",
        clothes: "default",
        accessory: "none"
      }
    };

    /* Aplicar inmediatamente la raza */

    applyRaceAppearance(
      race
    );

    updateRaceUI();

    /* Guardar personaje */

    try {

      await fetch(
        "/api/character",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            username:
              state.username,

            character:
              state.character
          })
        }
      );

    } catch (error) {

      console.warn(
        "No se pudo guardar el personaje",
        error
      );

    }

    /* Cerrar creador */

    const creator =
      $("characterCreator");

    if (creator) {

      creator.hidden =
        true;

    }

    toast(
      `✨ ${race}: tu aventura comienza`
    );

  }
);


/* =========================================
   SELECCIÓN VISUAL DE RAZA
========================================= */

function refreshRaceSelection() {

  document
    .querySelectorAll(
      "[data-race]"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "selected",
          button.dataset.race ===
          state.race
        );

      }
    );

}


/* Reemplazamos el comportamiento
   de los botones de raza */

document
  .querySelectorAll(
    "[data-race]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          state.race =
            button.dataset.race;

          refreshRaceSelection();

          updateRaceUI();

          applyRaceAppearance(
            state.race
          );

          toast(
            `✨ Raza elegida: ${state.race}`
          );

        }
      );

    }
  );


/* =========================================
   OPCIONES DE APARIENCIA
========================================= */

document
  .querySelectorAll(
    "[data-appearance]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          openAppearanceMenu(
            button.dataset.appearance
          );

        }
      );

    }
  );


/* =========================================
   MENÚ DE APARIENCIA
========================================= */

function openAppearanceMenu(
  type
) {

  let menu =
    $("appearanceMenu");


  if (menu) {

    menu.remove();

  }


  menu =
    document.createElement(
      "div"
    );

  menu.id =
    "appearanceMenu";

  menu.className =
    "appearance-menu";


  let title =
    "APARIENCIA";


  if (type === "cabello") {

    title =
      "💇 ELEGÍ TU CABELLO";

  }

  if (type === "ropa") {

    title =
      "👕 ELEGÍ TU ROPA";

  }

  if (type === "accesorios") {

    title =
      "💎 ELEGÍ TU ACCESORIO";

  }


  menu.innerHTML = `

    <div class="appearance-menu-card">

      <button
        class="appearance-close"
        id="closeAppearance"
        type="button"
      >
        ×
      </button>

      <h2>
        ${title}
      </h2>

      <div
        class="appearance-choice-grid"
      >

        ${
          type === "cabello"
          ? `
            <button
              type="button"
              data-choice="corto"
            >
              💇
              <span>Corto</span>
            </button>

            <button
              type="button"
              data-choice="largo"
            >
              🧑
              <span>Largo</span>
            </button>

            <button
              type="button"
              data-choice="oscuro"
            >
              🖤
              <span>Oscuro</span>
            </button>

            <button
              type="button"
              data-choice="claro"
            >
              🌟
              <span>Claro</span>
            </button>
          `
          : ""
        }

        ${
          type === "ropa"
          ? `
            <button
              type="button"
              data-choice="aventurero"
            >
              🛡️
              <span>Aventurero</span>
            </button>

            <button
              type="button"
              data-choice="mago"
            >
              🧙
              <span>Mago</span>
            </button>

            <button
              type="button"
              data-choice="guerrero"
            >
              ⚔️
              <span>Guerrero</span>
            </button>

            <button
              type="button"
              data-choice="noble"
            >
              👑
              <span>Noble</span>
            </button>
          `
          : ""
        }

        ${
          type === "accesorios"
          ? `
            <button
              type="button"
              data-choice="ninguno"
            >
              🚫
              <span>Ninguno</span>
            </button>

            <button
              type="button"
              data-choice="collar"
            >
              📿
              <span>Collar</span>
            </button>

            <button
              type="button"
              data-choice="capa"
            >
              🧥
              <span>Capa</span>
            </button>

            <button
              type="button"
              data-choice="corona"
            >
              👑
              <span>Corona</span>
            </button>
          `
          : ""
        }

      </div>

    </div>

  `;


  document.body.appendChild(
    menu
  );


  $("closeAppearance")?.addEventListener(
    "click",
    () => menu.remove()
  );


  menu
    .querySelectorAll(
      "[data-choice]"
    )
    .forEach(
      choice => {

        choice.addEventListener(
          "click",
          () => {

            const selected =
              choice.dataset.choice;


            if (
              type === "cabello"
            ) {

              state.character =
                state.character || {};

              state.character.appearance =
                state.character.appearance || {};

              state.character.appearance.hair =
                selected;

              toast(
                `💇 Cabello: ${selected}`
              );

            }


            if (
              type === "ropa"
            ) {

              state.character =
                state.character || {};

              state.character.appearance =
                state.character.appearance || {};

              state.character.appearance.clothes =
                selected;

              toast(
                `👕 Ropa: ${selected}`
              );

            }


            if (
              type === "accesorios"
            ) {

              state.character =
                state.character || {};

              state.character.appearance =
                state.character.appearance || {};

              state.character.appearance.accessory =
                selected;

              toast(
                `💎 Accesorio: ${selected}`
              );

            }


            menu.remove();

          }
        );

      }
    );

}
