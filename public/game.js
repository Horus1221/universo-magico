import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const $ = id => document.getElementById(id);
const socket = typeof io === "function" ? io() : null;

console.log("✨ UNIVERSO MÁGICO: game.js cargado");

const home = $("home");
const game = $("game");
const sceneEl = $("scene");

let scene, camera, renderer, clock;
let player = null;
let mixer = null;
let actions = {};
let currentAction = null;

let moveX = 0;
let moveY = 0;

let mana = 100;
let hp = 100;

let registerMode = false;

let yaw = 0;
let pitch = 0.48;

let draggingCamera = false;
let lastTouchX = 0;
let lastTouchY = 0;

let selectedRace = "humano";

let selectedAppearance = {
  cabello: "Corto",
  ropa: "Guerrero",
  accesorios: "Ninguno"
};

let currentHouse = null;
let interior = null;
let toastTimer;

const keys = {};

const houses = [];
const trees = [];

const state = {
  username: "Aventurero",
  character: null,
  insideHouse: false,
  flying: false
};

const assets = {
  character:
    "/assets/characters/Superhero_Male_FullBody_web.gltf",

  animations:
    "/assets/characters/UAL1_Standard.glb"
};

const loader = new GLTFLoader();

/* =========================================================
   AUTENTICACIÓN
========================================================= */

$("tabLogin")?.addEventListener(
  "click",
  () => {

    registerMode = false;

    $("tabLogin")?.classList.add(
      "active"
    );

    $("tabRegister")?.classList.remove(
      "active"
    );

    if ($("authSubmit")) {

      $("authSubmit").textContent =
        "⚡ ENTRAR AL UNIVERSO";
    }
  }
);

$("tabRegister")?.addEventListener(
  "click",
  () => {

    registerMode = true;

    $("tabRegister")?.classList.add(
      "active"
    );

    $("tabLogin")?.classList.remove(
      "active"
    );

    if ($("authSubmit")) {

      $("authSubmit").textContent =
        "✨ CREAR PERSONAJE";
    }
  }
);

$("authForm")?.addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    const username =
      ($("username")?.value || "")
        .trim();

    const password =
      $("password")?.value || "";

    if (
      username.length < 3
    ) {

      return authMessage(
        "El nombre debe tener al menos 3 caracteres."
      );
    }

    if (
      password.length < 6
    ) {

      return authMessage(
        "La contraseña debe tener al menos 6 caracteres."
      );
    }

    const button =
      $("authSubmit");

    if (button) {

      button.disabled = true;

      button.textContent =
        "✨ CONECTANDO...";
    }

    try {

      const endpoint =
        registerMode
          ? "/api/register"
          : "/api/login";

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              username,
              password
            })
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {

        throw new Error(
          data.error ||
          `Error ${response.status}`
        );
      }

      localStorage.setItem(
        "universo_magico_user",
        JSON.stringify(data)
      );

      startGame(
        data.username ||
          username,

        data.character ||
          null
      );

    } catch (err) {

      console.error(err);

      authMessage(
        err.message ||
        "No se pudo conectar con el reino."
      );

    } finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          registerMode
            ? "✨ CREAR PERSONAJE"
            : "⚡ ENTRAR AL UNIVERSO";
      }
    }
  }
);

function authMessage(
  text
) {

  const el =
    $("authMsg");

  if (!el) return;

  el.textContent =
    text;

  el.hidden =
    false;
}

function startGame(
  username,
  savedCharacter = null
) {

  state.username =
    username ||
    "Aventurero";

  state.character =
    savedCharacter;

  if ($("playerName")) {

    $("playerName").textContent =
      state.username;
  }

  if ($("hudName")) {

    $("hudName").textContent =
      state.username;
  }

  if ($("avatar")) {

    $("avatar").textContent =
      state.username[0]
        ?.toUpperCase() ||
      "A";
  }

  if (home) {

    home.hidden = true;
  }

  if (game) {

    game.hidden = false;
  }

  if (!renderer) {

    initWorld();
  }

  setTimeout(
    () => {

      openCharacterCreator(
        savedCharacter
      );

    },
    500
  );
}

/* =========================================================
   MUNDO 3D
========================================================= */

function initWorld() {

  clock =
    new THREE.Clock();

  scene =
    new THREE.Scene();

  scene.background =
    new THREE.Color(
      0x79a9c5
    );

  scene.fog =
    new THREE.FogExp2(
      0x79a9c5,
      0.0018
    );

  camera =
    new THREE.PerspectiveCamera(
      60,

      innerWidth /
        innerHeight,

      0.1,

      1600
    );

  camera.position.set(
    0,
    24,
    34
  );

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,

      powerPreference:
        "high-performance"
    });

  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      1.7
    )
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  renderer.shadowMap.enabled =
    true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  if (sceneEl) {

    sceneEl.appendChild(
      renderer.domElement
    );
  }

  const hemi =
    new THREE.HemisphereLight(
      0xd8f0ff,
      0x355034,
      1.8
    );

  scene.add(
    hemi
  );

  const sun =
    new THREE.DirectionalLight(
      0xfff0cf,
      3
    );

  sun.position.set(
    -120,
    180,
    90
  );

  sun.castShadow =
    true;

  sun.shadow.mapSize.set(
    2048,
    2048
  );

  scene.add(
    sun
  );

  createGround();
  createWater();
  createVillage();
  createForest();
  createMountains();
  createCastle();
  createMagicParticles();

  loadPlayer();

  setupJoystick();
  setupKeyboard();
  setupCameraTouch();
  setupCombat();

  setupChat();
  setupMap();
  setupHouse();

  setupCharacterCreator();

  addEventListener(
    "resize",
    resize
  );

  animate();
}

/* =========================================================
   TERRENO
========================================================= */

function createGround() {

  const ground =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        700,
        700,
        80,
        80
      ),

      new THREE.MeshStandardMaterial({
        color: 0x4f804d,
        roughness: 1
      })
    );

  ground.rotation.x =
    -Math.PI / 2;

  ground.receiveShadow =
    true;

  scene.add(
    ground
  );

  for (
    let i = 0;
    i < 2200;
    i++
  ) {

    const grass =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          0.35,

          THREE.MathUtils.randFloat(
            0.5,
            1.4
          )
        ),

        new THREE.MeshStandardMaterial({
          color: 0x6fa65a,

          side:
            THREE.DoubleSide
        })
      );

    grass.position.set(

      THREE.MathUtils.randFloat(
        -340,
        340
      ),

      0.18,

      THREE.MathUtils.randFloat(
        -340,
        340
      )
    );

    grass.rotation.y =
      Math.random() *
      Math.PI;

    scene.add(
      grass
    );
  }
}

/* =========================================================
   AGUA
========================================================= */

function createWater() {

  const water =
    new THREE.Mesh(

      new THREE.CircleGeometry(
        55,
        64
      ),

      new THREE.MeshPhysicalMaterial({

        color: 0x258ab0,

        transparent:
          true,

        opacity:
          0.78,

        roughness:
          0.12,

        metalness:
          0.08
      })
    );

  water.rotation.x =
    -Math.PI / 2;

  water.position.set(
    115,
    0.08,
    80
  );

  scene.add(
    water
  );
}

/* =========================================================
   ALDEA
========================================================= */

function createVillage() {

  const positions = [

    [-55, -45],
    [-20, -50],
    [20, -50],
    [55, -42],

    [-70, 0],
    [65, 5],

    [-45, 45],
    [5, 45],
    [55, 45],

    [0, 85]
  ];

  positions.forEach(
    ([x, z], i) => {

      const house =
        createHouse(
          x,
          z,
          i
        );

      houses.push(
        house
      );

      scene.add(
        house
      );
    }
  );

  const plaza =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        42,
        42,
        0.45,
        64
      ),

      new THREE.MeshStandardMaterial({
        color: 0x9b8c73,
        roughness: 0.9
      })
    );

  plaza.position.y =
    0.22;

  plaza.receiveShadow =
    true;

  scene.add(
    plaza
  );

  const fountain =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        8,
        10,
        1.5,
        40
      ),

      new THREE.MeshStandardMaterial({
        color: 0x858d93,
        roughness: 0.9
      })
    );

  fountain.position.y =
    0.75;

  fountain.castShadow =
    true;

  scene.add(
    fountain
  );
}

/* =========================================================
   CASAS EXTERIORES
========================================================= */

function createHouse(
  x,
  z,
  index
) {

  const group =
    new THREE.Group();

  group.position.set(
    x,
    0,
    z
  );

  const wall =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        22,
        10,
        18
      ),

      new THREE.MeshStandardMaterial({

        color:
          index % 2
            ? 0x956547
            : 0xa9714d,

        roughness:
          0.85
      })
    );

  wall.position.y =
    5;

  wall.castShadow =
    true;

  wall.receiveShadow =
    true;

  group.add(
    wall
  );

  const roof =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        15,
        9,
        4
      ),

      new THREE.MeshStandardMaterial({

        color:
          index % 3
            ? 0x63372d
            : 0x49302b,

        roughness:
          0.9
      })
    );

  roof.rotation.y =
    Math.PI / 4;

  roof.position.y =
    14;

  roof.castShadow =
    true;

  group.add(
    roof
  );

  const door =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.2,
        5.5,
        0.4
      ),

      new THREE.MeshStandardMaterial({
        color:
          0x35231c
      })
    );

  door.position.set(
    0,
    2.75,
    9.15
  );

  group.add(
    door
  );

  group.userData.house =
    true;

  group.userData.index =
    index;

  return group;
}

/* =========================================================
   BOSQUE
========================================================= */

function createForest() {

  for (
    let i = 0;
    i < 320;
    i++
  ) {

    const tree =
      new THREE.Group();

    const trunk =
      new THREE.Mesh(

        new THREE.CylinderGeometry(
          0.7,
          1.2,
          8,
          9
        ),

        new THREE.MeshStandardMaterial({
          color:
            0x63402a
        })
      );

    trunk.position.y =
      4;

    trunk.castShadow =
      true;

    tree.add(
      trunk
    );

    for (
      let j = 0;
      j < 8;
      j++
    ) {

      const leaf =
        new THREE.Mesh(

          new THREE.IcosahedronGeometry(
            THREE.MathUtils.randFloat(
              2.4,
              4
            ),
            1
          ),

          new THREE.MeshStandardMaterial({
            color:
              0x2f713d,

            roughness:
              1
          })
        );

      leaf.position.set(

        THREE.MathUtils.randFloat(
          -2,
          2
        ),

        THREE.MathUtils.randFloat(
          7,
          12
        ),

        THREE.MathUtils.randFloat(
          -2,
          2
        )
      );

      leaf.castShadow =
        true;

      tree.add(
        leaf
      );
    }

    const angle =
      Math.random() *
      Math.PI *
      2;

    const radius =
      THREE.MathUtils.randFloat(
        140,
        315
      );

    tree.position.set(

      Math.cos(angle) *
        radius,

      0,

      Math.sin(angle) *
        radius
    );

    tree.scale.setScalar(
      THREE.MathUtils.randFloat(
        0.8,
        1.5
      )
    );

    tree.userData.phase =
      Math.random() *
      10;

    scene.add(
      tree
    );

    trees.push(
      tree
    );
  }
}

/* =========================================================
   MONTAÑAS
========================================================= */

function createMountains() {

  for (
    let i = 0;
    i < 36;
    i++
  ) {

    const angle =
      i /
      36 *
      Math.PI *
      2;

    const radius =
      THREE.MathUtils.randFloat(
        300,
        325
      );

    const height =
      THREE.MathUtils.randFloat(
        55,
        110
      );

    const mountain =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          THREE.MathUtils.randFloat(
            24,
            42
          ),

          height,

          8
        ),

        new THREE.MeshStandardMaterial({
          color:
            0x4c6257,

          roughness:
            1
        })
      );

    mountain.position.set(

      Math.cos(angle) *
        radius,

      height / 2 - 3,

      Math.sin(angle) *
        radius
    );

    mountain.rotation.y =
      Math.random() *
      Math.PI;

    mountain.castShadow =
      true;

    mountain.receiveShadow =
      true;

    scene.add(
      mountain
    );

    const peak =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          THREE.MathUtils.randFloat(
            7,
            14
          ),

          height *
            0.22,

          8
        ),

        new THREE.MeshStandardMaterial({
          color:
            0xbcc9c6,

          roughness:
            1
        })
      );

    peak.position.copy(
      mountain.position
    );

    peak.position.y +=
      height *
      0.39;

    peak.scale.y =
      0.75;

    scene.add(
      peak
    );
  }
}

/* =========================================================
   CASTILLO
========================================================= */

function createCastle() {

  const castle =
    new THREE.Group();

  castle.position.set(
    250,
    0,
    230
  );

  const stone =
    new THREE.MeshStandardMaterial({
      color:
        0x68757d,

      roughness:
        0.9
    });

  const darkStone =
    new THREE.MeshStandardMaterial({
      color:
        0x4e5961,

      roughness:
        0.95
    });

  const keep =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        70,
        28,
        55
      ),

      stone
    );

  keep.position.y =
    14;

  keep.castShadow =
    true;

  keep.receiveShadow =
    true;

  castle.add(
    keep
  );

  for (
    const [x, z] of [
      [-34, -26],
      [34, -26],
      [-34, 26],
      [34, 26]
    ]
  ) {

    const tower =
      new THREE.Mesh(

        new THREE.CylinderGeometry(
          8,
          9,
          38,
          12
        ),

        darkStone
      );

    tower.position.set(
      x,
      19,
      z
    );

    tower.castShadow =
      true;

    castle.add(
      tower
    );

    const roof =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          10,
          12,
          12
        ),

        new THREE.MeshStandardMaterial({
          color:
            0x382a35,

          roughness:
            0.8
        })
      );

    roof.position.set(
      x,
      44,
      z
    );

    castle.add(
      roof
    );
  }

  const gate =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        18,
        16,
        3
      ),

      new THREE.MeshStandardMaterial({
        color:
          0x2e211b,

        roughness:
          0.9
      })
    );

  gate.position.set(
    0,
    8,
    28
  );

  castle.add(
    gate
  );

  scene.add(
    castle
  );
}
/* =========================================================
   PARTÍCULAS MÁGICAS
========================================================= */

function createMagicParticles() {

  const geometry =
    new THREE.BufferGeometry();

  const count = 350;

  const positions =
    new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {

    positions[i * 3] =
      THREE.MathUtils.randFloat(-300, 300);

    positions[i * 3 + 1] =
      THREE.MathUtils.randFloat(1, 80);

    positions[i * 3 + 2] =
      THREE.MathUtils.randFloat(-300, 300);
  }

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );

  const material =
    new THREE.PointsMaterial({
      color: 0xffe8a3,
      size: 0.8,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

  const particles =
    new THREE.Points(
      geometry,
      material
    );

  particles.userData.magic =
    true;

  scene.add(
    particles
  );
}

/* =========================================================
   CARGAR PERSONAJE REAL
========================================================= */

function loadPlayer() {

  loader.load(

    assets.character,

    gltf => {

      player =
        gltf.scene;

      player.scale.set(
        1.9,
        1.9,
        1.9
      );

      player.position.set(
        0,
        0,
        15
      );

      player.traverse(
        object => {

          if (
            object.isMesh
          ) {

            object.castShadow =
              true;

            object.receiveShadow =
              true;

            if (
              object.material
            ) {

              object.material =
                object.material.clone();

              /*
               * Evitamos que las texturas
               * desaparezcan por el color
               * base del material.
               */

              object.material.needsUpdate =
                true;
            }
          }
        }
      );

      scene.add(
        player
      );

      /*
       * Aplicamos apariencia inicial.
       */

      applyCharacterVisuals();

      /*
       * Cargamos animaciones.
       */

      loadAnimations();

      updateCamera();

    },

    undefined,

    error => {

      console.error(
        "❌ Error cargando personaje:",
        error
      );

      createFallbackPlayer();
    }
  );
}

/* =========================================================
   PERSONAJE DE EMERGENCIA
========================================================= */

function createFallbackPlayer() {

  const group =
    new THREE.Group();

  const body =
    new THREE.Mesh(

      new THREE.CapsuleGeometry(
        0.65,
        1.8,
        8,
        16
      ),

      new THREE.MeshStandardMaterial({
        color: 0x3b64a0,
        roughness: 0.8
      })
    );

  body.position.y =
    1.3;

  body.castShadow =
    true;

  group.add(
    body
  );

  const head =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        0.62,
        24,
        24
      ),

      new THREE.MeshStandardMaterial({
        color: 0xf0c29b,
        roughness: 0.75
      })
    );

  head.position.y =
    2.75;

  head.castShadow =
    true;

  group.add(
    head
  );

  player =
    group;

  player.position.set(
    0,
    0,
    15
  );

  scene.add(
    player
  );

  applyCharacterVisuals();
}

/* =========================================================
   ANIMACIONES UAL
========================================================= */

function loadAnimations() {

  loader.load(

    assets.animations,

    gltf => {

      if (
        !player ||
        !gltf.animations ||
        !gltf.animations.length
      ) {

        console.warn(
          "⚠️ El archivo UAL no contiene animaciones."
        );

        return;
      }

      mixer =
        new THREE.AnimationMixer(
          player
        );

      console.log(
        "🎬 Animaciones encontradas:",
        gltf.animations.map(
          clip => clip.name
        )
      );

      gltf.animations.forEach(
        clip => {

          /*
           * UAL puede tener nombres
           * diferentes según la versión.
           */

          const action =
            mixer.clipAction(
              clip
            );

          actions[
            clip.name
          ] = action;
        }
      );

      /*
       * Buscamos una animación de
       * reposo.
       */

      const idle =
        findAnimation([
          "Idle",
          "idle",
          "Idle_01",
          "Standing",
          "Stand",
          "Breathing",
          "Breathing Idle",
          "UAL_Idle"
        ]);

      if (idle) {

        idle.reset();

        idle.fadeIn(
          0.15
        );

        idle.play();

        currentAction =
          idle;

      } else {

        /*
         * Si no encontramos Idle,
         * usamos la primera animación.
         */

        const first =
          gltf.animations[0];

        if (first) {

          const action =
            mixer.clipAction(
              first
            );

          action.play();

          currentAction =
            action;
        }
      }

    },

    undefined,

    error => {

      console.warn(
        "⚠️ No se pudieron cargar las animaciones UAL:",
        error
      );
    }
  );
}

/* =========================================================
   BUSCAR ANIMACIÓN
========================================================= */

function findAnimation(
  names
) {

  /*
   * Primero buscamos coincidencia
   * exacta.
   */

  for (
    const name of names
  ) {

    if (
      actions[name]
    ) {

      return actions[name];
    }
  }

  /*
   * Después buscamos coincidencia
   * ignorando mayúsculas.
   */

  const actionNames =
    Object.keys(actions);

  for (
    const wanted of names
  ) {

    const lower =
      wanted.toLowerCase();

    const found =
      actionNames.find(
        name =>
          name.toLowerCase() ===
          lower
      );

    if (found) {

      return actions[found];
    }
  }

  /*
   * Finalmente buscamos nombres
   * que contengan la palabra.
   */

  for (
    const wanted of names
  ) {

    const lower =
      wanted.toLowerCase();

    const found =
      actionNames.find(
        name =>
          name.toLowerCase()
            .includes(lower)
      );

    if (found) {

      return actions[found];
    }
  }

  return null;
}

/* =========================================================
   REPRODUCIR ANIMACIÓN
========================================================= */

function playAnimation(
  names
) {

  if (!mixer) {
    return;
  }

  const next =
    findAnimation(
      names
    );

  if (!next) {
    return;
  }

  if (
    currentAction ===
    next
  ) {

    if (
      !next.isRunning()
    ) {

      next.play();
    }

    return;
  }

  if (
    currentAction
  ) {

    currentAction.fadeOut(
      0.18
    );
  }

  next.reset();

  next.fadeIn(
    0.18
  );

  next.play();

  currentAction =
    next;
}

/* =========================================================
   APARIENCIA DEL PERSONAJE
========================================================= */

function applyCharacterVisuals() {

  if (!player) {
    return;
  }

  const character =
    state.character;

  if (
    character &&
    character.race
  ) {

    selectedRace =
      character.race;
  }

  if (
    character &&
    character.appearance
  ) {

    selectedAppearance =
      {
        ...selectedAppearance,
        ...character.appearance
      };
  }

  /*
   * Actualizamos los detalles
   * raciales.
   */

  updateRaceDetails();

  /*
   * Aplicamos ropa y accesorios.
   */

  applyClothingVisuals();

  /*
   * Actualizamos HUD.
   */

  updateHUDRace();
}

/* =========================================================
   DETALLES DE RAZA
========================================================= */

function updateRaceDetails() {

  if (!player) {
    return;
  }

  let details =
    player.getObjectByName(
      "raceDetails"
    );

  if (!details) {

    details =
      new THREE.Group();

    details.name =
      "raceDetails";

    player.add(
      details
    );
  }

  /*
   * Eliminamos detalles anteriores.
   */

  while (
    details.children.length
  ) {

    const child =
      details.children[
        0
      ];

    details.remove(
      child
    );

    disposeObject(
      child
    );
  }

  /*
   * HADA
   */

  if (
    selectedRace ===
    "hada"
  ) {

    createFairyWings(
      details
    );
  }

  /*
   * ELFO
   */

  if (
    selectedRace ===
    "elfo"
  ) {

    createElfDetails(
      details
    );
  }

  /*
   * DEMONIO
   */

  if (
    selectedRace ===
    "demonio"
  ) {

    createDemonDetails(
      details
    );
  }
}

/* =========================================================
   ALAS DE HADA
========================================================= */

function createFairyWings(
  parent
) {

  const wingMaterial =
    new THREE.MeshPhysicalMaterial({

      color:
        0xd9b8ff,

      transparent:
        true,

      opacity:
        0.62,

      roughness:
        0.18,

      metalness:
        0.05,

      side:
        THREE.DoubleSide,

      emissive:
        0x7b4eb5,

      emissiveIntensity:
        0.45
    });

  const positions = [

    [-0.55, 1.7, 0.15],
    [0.55, 1.7, 0.15],

    [-0.7, 1.1, 0.18],
    [0.7, 1.1, 0.18]
  ];

  positions.forEach(
    ([x, y, z], index) => {

      const wing =
        new THREE.Mesh(

          new THREE.SphereGeometry(
            0.65,
            24,
            16
          ),

          wingMaterial.clone()
        );

      wing.position.set(
        x,
        y,
        z
      );

      wing.scale.set(
        0.22,
        1.25,
        0.08
      );

      wing.rotation.z =
        x < 0
          ? -0.28
          : 0.28;

      wing.rotation.x =
        0.12;

      wing.userData.fairyWing =
        true;

      wing.userData.wingIndex =
        index;

      parent.add(
        wing
      );
    }
  );

  const light =
    new THREE.PointLight(
      0xdcb7ff,
      0.9,
      5
    );

  light.position.set(
    0,
    1.5,
    0
  );

  light.userData.fairyLight =
    true;

  parent.add(
    light
  );
}

/* =========================================================
   DETALLES DE ELFO
========================================================= */

function createElfDetails(
  parent
) {

  const material =
    new THREE.MeshStandardMaterial({
      color:
        0x78c99c,

      roughness:
        0.7
    });

  const earLeft =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        0.16,
        0.65,
        8
      ),

      material
    );

  earLeft.position.set(
    -0.65,
    2.8,
    0
  );

  earLeft.rotation.z =
    -Math.PI / 2;

  parent.add(
    earLeft
  );

  const earRight =
    earLeft.clone();

  earRight.position.x =
    0.65;

  earRight.rotation.z =
    Math.PI / 2;

  parent.add(
    earRight
  );

  /*
   * Pequeño brillo élfico.
   */

  const light =
    new THREE.PointLight(
      0x7dffb2,
      0.45,
      4
    );

  light.position.set(
    0,
    2,
    0
  );

  parent.add(
    light
  );
}

/* =========================================================
   DETALLES DE DEMONIO
========================================================= */

function createDemonDetails(
  parent
) {

  const hornMaterial =
    new THREE.MeshStandardMaterial({
      color:
        0x3b2025,

      roughness:
        0.7
    });

  [-0.38, 0.38]
    .forEach(
      x => {

        const horn =
          new THREE.Mesh(

            new THREE.ConeGeometry(
              0.18,
              0.85,
              10
            ),

            hornMaterial
          );

        horn.position.set(
          x,
          3.2,
          0
        );

        horn.rotation.z =
          x < 0
            ? -0.28
            : 0.28;

        parent.add(
          horn
        );
      }
    );
}

/* =========================================================
   DISPOSICIÓN DE OBJETOS
========================================================= */

function disposeObject(
  object
) {

  if (!object) {
    return;
  }

  object.traverse(
    child => {

      if (
        child.geometry
      ) {

        child.geometry.dispose();
      }

      if (
        child.material
      ) {

        if (
          Array.isArray(
            child.material
          )
        ) {

          child.material.forEach(
            material =>
              material.dispose()
          );

        } else {

          child.material.dispose();
        }
      }
    }
  );
}

/* =========================================================
   MOVIMIENTO CON TECLADO
========================================================= */

function setupKeyboard() {

  addEventListener(
    "keydown",
    e => {

      keys[
        e.key.toLowerCase()
      ] = true;

      /*
       * Vuelo con F.
       */

      if (
        e.key.toLowerCase() ===
        "f"
      ) {

        toggleFlight();
      }
    }
  );

  addEventListener(
    "keyup",
    e => {

      keys[
        e.key.toLowerCase()
      ] = false;
    }
  );
}

/* =========================================================
   INPUT DE MOVIMIENTO
========================================================= */

function getMovementInput() {

  let x =
    moveX;

  let y =
    moveY;

  if (
    keys["a"] ||
    keys["arrowleft"]
  ) {

    x -= 1;
  }

  if (
    keys["d"] ||
    keys["arrowright"]
  ) {

    x += 1;
  }

  if (
    keys["w"] ||
    keys["arrowup"]
  ) {

    y += 1;
  }

  if (
    keys["s"] ||
    keys["arrowdown"]
  ) {

    y -= 1;
  }

  const length =
    Math.hypot(
      x,
      y
    );

  if (
    length > 1
  ) {

    x /= length;
    y /= length;
  }

  return {
    x,
    y
  };
}

/* =========================================================
   MOVIMIENTO DEL JUGADOR
========================================================= */

function updatePlayer(
  delta
) {

  if (!player) {
    return;
  }

  const input =
    getMovementInput();

  const moving =
    Math.abs(input.x) >
      0.03 ||
    Math.abs(input.y) >
      0.03;

  /*
   * MOVIMIENTO EN VUELO
   */

  if (
    state.flying &&
    (
      keys[" "] ||
      keys["arrowup"]
    )
  ) {

    player.position.y +=
      8 * delta;
  }

  if (
    state.flying &&
    keys["shift"]
  ) {

    player.position.y -=
      8 * delta;
  }

  /*
   * Altura mínima y máxima
   * durante el vuelo.
   */

  if (
    state.flying
  ) {

    player.position.y =
      THREE.MathUtils.clamp(
        player.position.y,
        0,
        35
      );

  } else {

    player.position.y =
      0;
  }

  if (moving) {

    const speed =
      state.flying
        ? 12
        : state.insideHouse
          ? 7
          : 9;

    const forward =
      new THREE.Vector3(
        -Math.sin(yaw),
        0,
        -Math.cos(yaw)
      );

    const right =
      new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
      );

    const direction =
      new THREE.Vector3();

    direction.addScaledVector(
      forward,
      input.y
    );

    direction.addScaledVector(
      right,
      input.x
    );

    if (
      direction.lengthSq() >
      0
    ) {

      direction.normalize();

      const newPosition =
        player.position.clone();

      newPosition.addScaledVector(
        direction,
        speed * delta
      );

      if (
        canMoveTo(
          newPosition
        )
      ) {

        player.position.copy(
          newPosition
        );
      }

      const targetRotation =
        Math.atan2(
          direction.x,
          direction.z
        );

      player.rotation.y =
        THREE.MathUtils.lerp(
          player.rotation.y,
          targetRotation,
          Math.min(
            1,
            delta * 10
          )
        );
    }

    if (
      state.flying
    ) {

      playAnimation([
        "Fly",
        "Flying",
        "Flight",
        "Glide",
        "Run"
      ]);

    } else {

      playAnimation([
        "Walk",
        "Walking",
        "Run",
        "Running"
      ]);
    }

  } else {

    if (
      state.flying
    ) {

      playAnimation([
        "Fly",
        "Flying",
        "Flight",
        "Glide",
        "Idle"
      ]);

    } else {

      playAnimation([
        "Idle",
        "idle",
        "Stand",
        "Breathing"
      ]);
    }
  }

  if (mixer) {

    mixer.update(
      delta
    );
  }
}

/* =========================================================
   COLISIONES
========================================================= */

function canMoveTo(
  position
) {

  /*
   * Dentro de una casa:
   * solamente existen las paredes
   * interiores.
   */

  if (
    state.insideHouse
  ) {

    return canMoveInsideHouse(
      position
    );
  }

  /*
   * Durante el vuelo no chocamos
   * contra las casas desde arriba,
   * pero mantenemos el límite del mapa.
   */

  const boundary =
    Math.hypot(
      position.x,
      position.z
    );

  if (
    boundary > 292
  ) {

    return false;
  }

  /*
   * Colisiones de casas.
   */

  for (
    const house of houses
  ) {

    const dx =
      position.x -
      house.position.x;

    const dz =
      position.z -
      house.position.z;

    if (
      Math.abs(dx) <
        13 &&

      Math.abs(dz) <
        11
    ) {

      return false;
    }
  }

  return true;
}
/* =========================================================
   INTERIOR DE LAS CASAS
========================================================= */

function canMoveInsideHouse(
  position
) {

  if (
    !state.insideHouse ||
    !interior
  ) {

    return true;
  }

  const localX =
    position.x -
    interior.worldX;

  const localZ =
    position.z -
    interior.worldZ;

  const limitX =
    interior.width / 2 -
    1.35;

  const limitZ =
    interior.depth / 2 -
    1.35;

  /*
   * Nunca dejamos al jugador
   * tocar las paredes.
   */

  return (
    localX > -limitX &&
    localX < limitX &&
    localZ > -limitZ &&
    localZ < limitZ
  );
}

/* =========================================================
   ENTRAR A CASA
========================================================= */

function enterHouse(
  house
) {

  if (
    !house ||
    !player ||
    state.insideHouse
  ) {

    return;
  }

  /*
   * Guardamos la posición exterior.
   */

  currentHouse =
    house;

  house.userData
    .outsidePosition =
      player.position.clone();

  state.insideHouse =
    true;

  state.flying =
    false;

  /*
   * Ocultamos COMPLETAMENTE
   * la casa exterior.
   */

  house.visible =
    false;

  /*
   * Creamos el interior.
   */

  createHouseInterior(
    house
  );

  /*
   * Aparecemos dentro,
   * frente a la puerta.
   */

  player.position.set(

    house.position.x,

    0,

    house.position.z + 3.5
  );

  player.rotation.y =
    Math.PI;

  /*
   * Reiniciamos cámara.
   */

  yaw = 0;

  pitch =
    0.32;

  updateInteriorCamera();

  /*
   * Botones.
   */

  updateEnterButton(
    false
  );

  showExitHouseButton(
    true
  );

  showToast(
    "🏠 Entraste a la casa"
  );
}

/* =========================================================
   SALIR DE CASA
========================================================= */

function exitHouse() {

  if (
    !state.insideHouse ||
    !currentHouse
  ) {

    return;
  }

  const house =
    currentHouse;

  const outside =
    house.userData
      .outsidePosition;

  /*
   * Primero destruimos
   * el interior.
   */

  removeHouseInterior();

  /*
   * Volvemos a mostrar
   * la casa exterior.
   */

  house.visible =
    true;

  state.insideHouse =
    false;

  state.flying =
    false;

  /*
   * Sacamos al jugador
   * claramente fuera de la pared.
   */

  if (
    outside
  ) {

    player.position.copy(
      outside
    );

    player.position.z +=
      4.5;

  } else {

    player.position.set(

      house.position.x,

      0,

      house.position.z +
        15
    );
  }

  currentHouse =
    null;

  /*
   * Cámara exterior.
   */

  yaw = 0;

  pitch =
    0.48;

  updateCamera();

  showExitHouseButton(
    false
  );

  updateEnterButton(
    false
  );

  showToast(
    "🌿 Saliste de la casa"
  );
}

/* =========================================================
   CREAR INTERIOR
========================================================= */

function createHouseInterior(
  house
) {

  removeHouseInterior();

  const width =
    20;

  const depth =
    16;

  const height =
    8;

  interior = {

    group:
      new THREE.Group(),

    width,

    depth,

    height,

    worldX:
      house.position.x,

    worldZ:
      house.position.z
  };

  const group =
    interior.group;

  group.position.set(
    house.position.x,
    0,
    house.position.z
  );

  /*
   * =====================================================
   * PISO
   * =====================================================
   */

  const floor =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width,
        0.35,
        depth
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x765139,

        roughness:
          0.88
      })
    );

  floor.position.y =
    0.05;

  floor.receiveShadow =
    true;

  group.add(
    floor
  );

  /*
   * =====================================================
   * ALFOMBRA
   * =====================================================
   */

  const carpet =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        7,
        0.12,
        5
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x713e58,

        roughness:
          0.95
      })
    );

  carpet.position.set(
    0,
    0.28,
    1
  );

  carpet.receiveShadow =
    true;

  group.add(
    carpet
  );

  /*
   * =====================================================
   * MATERIAL DE PAREDES
   * =====================================================
   */

  const wallMaterial =
    new THREE.MeshStandardMaterial({

      color:
        0x936246,

      roughness:
        0.9,

      side:
        THREE.FrontSide
    });

  /*
   * =====================================================
   * PARED TRASERA
   * =====================================================
   */

  const backWall =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width,
        height,
        0.5
      ),

      wallMaterial
    );

  backWall.position.set(
    0,
    height / 2,
    -depth / 2
  );

  backWall.receiveShadow =
    true;

  group.add(
    backWall
  );

  /*
   * =====================================================
   * PARED IZQUIERDA
   * =====================================================
   */

  const leftWall =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        0.5,
        height,
        depth
      ),

      wallMaterial
    );

  leftWall.position.set(
    -width / 2,
    height / 2,
    0
  );

  leftWall.receiveShadow =
    true;

  group.add(
    leftWall
  );

  /*
   * =====================================================
   * PARED DERECHA
   * =====================================================
   */

  const rightWall =
    leftWall.clone();

  rightWall.position.x =
    width / 2;

  group.add(
    rightWall
  );

  /*
   * =====================================================
   * PARED FRONTAL
   *
   * Cerrada. La puerta es solamente
   * decorativa porque para salir
   * usamos el botón.
   * =====================================================
   */

  const frontWall =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width,
        height,
        0.5
      ),

      wallMaterial
    );

  frontWall.position.set(
    0,
    height / 2,
    depth / 2
  );

  frontWall.receiveShadow =
    true;

  group.add(
    frontWall
  );

  /*
   * =====================================================
   * TECHO COMPLETO
   *
   * Esto evita que la cámara pueda
   * mirar hacia el exterior.
   * =====================================================
   */

  const ceiling =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width + 1,
        0.5,
        depth + 1
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x50372b,

        roughness:
          1,

        side:
          THREE.FrontSide
      })
    );

  ceiling.position.y =
    height;

  ceiling.receiveShadow =
    true;

  group.add(
    ceiling
  );

  /*
   * =====================================================
   * PUERTA DECORATIVA
   * =====================================================
   */

  const door =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.2,
        5.2,
        0.35
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x38251c,

        roughness:
          0.75
      })
    );

  door.position.set(
    0,
    2.6,
    depth / 2 +
      0.05
  );

  group.add(
    door
  );

  /*
   * =====================================================
   * MARCO
   * =====================================================
   */

  const frameMaterial =
    new THREE.MeshStandardMaterial({

      color:
        0x3e271d,

      roughness:
        0.8
    });

  const frameLeft =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        0.35,
        5.8,
        0.55
      ),

      frameMaterial
    );

  frameLeft.position.set(
    -1.75,
    2.9,
    depth / 2
  );

  group.add(
    frameLeft
  );

  const frameRight =
    frameLeft.clone();

  frameRight.position.x =
    1.75;

  group.add(
    frameRight
  );

  const frameTop =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.8,
        0.35,
        0.55
      ),

      frameMaterial
    );

  frameTop.position.set(
    0,
    5.65,
    depth / 2
  );

  group.add(
    frameTop
  );

  /*
   * =====================================================
   * CHIMENEA
   * =====================================================
   */

  createFireplace(
    group,
    -6.8,
    -7.2
  );

  /*
   * =====================================================
   * CAMA
   * =====================================================
   */

  createBed(
    group,
    5.8,
    -4.7
  );

  /*
   * =====================================================
   * MESA
   * =====================================================
   */

  createTable(
    group,
    0,
    -2.5
  );

  /*
   * =====================================================
   * SILLAS
   * =====================================================
   */

  createChair(
    group,
    -3,
    -2.5
  );

  createChair(
    group,
    3,
    -2.5
  );

  /*
   * =====================================================
   * ESTANTERÍA
   * =====================================================
   */

  createBookshelf(
    group,
    -7.4,
    -3.7
  );

  /*
   * =====================================================
   * BAÚL
   * =====================================================
   */

  createChest(
    group,
    7,
    2.8
  );

  /*
   * =====================================================
   * VELAS
   * =====================================================
   */

  createCandle(
    group,
    -2.5,
    -2.5
  );

  createCandle(
    group,
    2.7,
    -2.5
  );

  /*
   * =====================================================
   * LUCES
   * =====================================================
   */

  createInteriorLight(
    group,
    0,
    5.7,
    0
  );

  createInteriorLight(
    group,
    -5,
    3.7,
    2
  );

  /*
   * =====================================================
   * DECORACIÓN
   * =====================================================
   */

  createInteriorDecorations(
    group
  );

  scene.add(
    group
  );
}

/* =========================================================
   CHIMENEA
========================================================= */

function createFireplace(
  group,
  x,
  z
) {

  const stoneMaterial =
    new THREE.MeshStandardMaterial({

      color:
        0x514b49,

      roughness:
        0.95
    });

  const base =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        5,
        0.8,
        2
      ),

      stoneMaterial
    );

  base.position.set(
    x,
    0.45,
    z
  );

  group.add(
    base
  );

  for (
    let i = 0;
    i < 5;
    i++
  ) {

    const stone =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          0.9,
          0.65,
          0.8
        ),

        stoneMaterial
      );

    stone.position.set(

      x -
        1.8 +
        i * 0.9,

      0.75,

      z
    );

    stone.rotation.y =
      (Math.random() -
        0.5) *
      0.25;

    group.add(
      stone
    );
  }

  const fire =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        0.9,
        2.3,
        12
      ),

      new THREE.MeshBasicMaterial({

        color:
          0xff6b19,

        transparent:
          true,

        opacity:
          0.82
      })
    );

  fire.position.set(
    x,
    1.8,
    z - 0.2
  );

  fire.userData.fire =
    true;

  group.add(
    fire
  );

  const light =
    new THREE.PointLight(
      0xff7b2e,
      3,
      12
    );

  light.position.set(
    x,
    2,
    z
  );

  light.userData.fireLight =
    true;

  group.add(
    light
  );
}

/* =========================================================
   CAMA
========================================================= */

function createBed(
  group,
  x,
  z
) {

  const wood =
    new THREE.MeshStandardMaterial({

      color:
        0x563525,

      roughness:
        0.82
    });

  const frame =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        4.2,
        0.9,
        7
      ),

      wood
    );

  frame.position.set(
    x,
    0.7,
    z
  );

  frame.castShadow =
    true;

  group.add(
    frame
  );

  const mattress =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.8,
        0.65,
        6.5
      ),

      new THREE.MeshStandardMaterial({

        color:
          0xd9d0c4,

        roughness:
          0.9
      })
    );

  mattress.position.set(
    x,
    1.35,
    z
  );

  group.add(
    mattress
  );

  const blanket =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.85,
        0.15,
        3.2
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x596b86,

        roughness:
          0.9
      })
    );

  blanket.position.set(
    x,
    1.72,
    z + 1.25
  );

  group.add(
    blanket
  );

  const pillow =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.3,
        0.35,
        1.15
      ),

      new THREE.MeshStandardMaterial({

        color:
          0xf2e9dc,

        roughness:
          0.9
      })
    );

  pillow.position.set(
    x,
    1.72,
    z - 2.25
  );

  group.add(
    pillow
  );
}

/* =========================================================
   MESA
========================================================= */

function createTable(
  group,
  x,
  z
) {

  const wood =
    new THREE.MeshStandardMaterial({

      color:
        0x674329,

      roughness:
        0.85
    });

  const top =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        5,
        0.45,
        2.6
      ),

      wood
    );

  top.position.set(
    x,
    2.2,
    z
  );

  top.castShadow =
    true;

  group.add(
    top
  );

  for (
    const dx of [
      -1.9,
      1.9
    ]
  ) {

    for (
      const dz of [
        -0.8,
        0.8
      ]
    ) {

      const leg =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            0.35,
            2,
            0.35
          ),

          wood
        );

      leg.position.set(
        x + dx,
        1,
        z + dz
      );

      group.add(
        leg
      );
    }
  }

  const book =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.1,
        0.18,
        0.75
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x8b3042,

        roughness:
          0.8
      })
    );

  book.position.set(
    x - 1,
    2.52,
    z
  );

  group.add(
    book
  );

  const cup =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        0.22,
        0.18,
        0.45,
        12
      ),

      new THREE.MeshStandardMaterial({

        color:
          0xd8c8a8,

        roughness:
          0.7
      })
    );

  cup.position.set(
    x + 1.2,
    2.65,
    z
  );

  group.add(
    cup
  );
}

/* =========================================================
   SILLA
========================================================= */

function createChair(
  group,
  x,
  z
) {

  const material =
    new THREE.MeshStandardMaterial({

      color:
        0x5b3925,

      roughness:
        0.85
    });

  const seat =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.7,
        0.35,
        1.7
      ),

      material
    );

  seat.position.set(
    x,
    1.25,
    z
  );

  group.add(
    seat
  );

  for (
    const dx of [
      -0.55,
      0.55
    ]
  ) {

    for (
      const dz of [
        -0.55,
        0.55
      ]
    ) {

      const leg =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            0.2,
            1.2,
            0.2
          ),

          material
        );

      leg.position.set(
        x + dx,
        0.6,
        z + dz
      );

      group.add(
        leg
      );
    }
  }

  const back =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.7,
        2,
        0.25
      ),

      material
    );

  back.position.set(
    x,
    2,
    z + 0.7
  );

  group.add(
    back
  );
}

/* =========================================================
   ESTANTERÍA
========================================================= */

function createBookshelf(
  group,
  x,
  z
) {

  const wood =
    new THREE.MeshStandardMaterial({

      color:
        0x543522,

      roughness:
        0.9
    });

  const body =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.2,
        6,
        0.7
      ),

      wood
    );

  body.position.set(
    x,
    3.2,
    z
  );

  body.castShadow =
    true;

  group.add(
    body
  );

  for (
    let i = 0;
    i < 4;
    i++
  ) {

    const board =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          3.6,
          0.18,
          0.9
        ),

        wood
      );

    board.position.set(

      x,

      1.2 +
        i * 1.35,

      z + 0.42
    );

    group.add(
      board
    );
  }

  const colors = [
    0x7e3040,
    0x365b78,
    0x8b6b35,
    0x4d754c,
    0x704a73,
    0x9b553d
  ];

  for (
    let i = 0;
    i < 18;
    i++
  ) {

    const book =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          0.35,
          THREE.MathUtils.randFloat(
            0.75,
            1.15
          ),
          0.45
        ),

        new THREE.MeshStandardMaterial({

          color:
            colors[
              i %
              colors.length
            ],

          roughness:
            0.85
        })
      );

    const row =
      Math.floor(
        i / 6
      );

    const col =
      i % 6;

    book.position.set(

      x -
        1.15 +
        col * 0.42,

      1.45 +
        row * 1.35,

      z + 0.55
    );

    group.add(
      book
    );
  }
}
/* =========================================================
   BAÚL
========================================================= */

function createChest(group, x, z) {

  const wood =
    new THREE.MeshStandardMaterial({
      color: 0x694025,
      roughness: 0.8
    });

  const metal =
    new THREE.MeshStandardMaterial({
      color: 0x81745d,
      metalness: 0.55,
      roughness: 0.45
    });

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3,
        1.5,
        1.8
      ),
      wood
    );

  body.position.set(
    x,
    0.9,
    z
  );

  body.castShadow = true;

  group.add(body);

  const lid =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3.1,
        0.35,
        1.9
      ),
      wood
    );

  lid.position.set(
    x,
    1.8,
    z
  );

  group.add(lid);

  const lock =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        0.45,
        0.55,
        0.2
      ),
      metal
    );

  lock.position.set(
    x,
    1.25,
    z + 0.95
  );

  group.add(lock);
}

/* =========================================================
   VELAS
========================================================= */

function createCandle(group, x, z) {

  const candle =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.12,
        0.15,
        0.7,
        12
      ),
      new THREE.MeshStandardMaterial({
        color: 0xe9dfc4,
        roughness: 0.75
      })
    );

  candle.position.set(
    x,
    2.85,
    z
  );

  group.add(candle);

  const flame =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.13,
        12,
        12
      ),
      new THREE.MeshBasicMaterial({
        color: 0xffb52e
      })
    );

  flame.scale.y = 1.7;

  flame.position.set(
    x,
    3.32,
    z
  );

  flame.userData.flame = true;

  group.add(flame);

  const light =
    new THREE.PointLight(
      0xffad45,
      0.75,
      5
    );

  light.position.set(
    x,
    3.35,
    z
  );

  light.userData.candleLight =
    true;

  group.add(light);
}

/* =========================================================
   LUCES INTERIORES
========================================================= */

function createInteriorLight(
  group,
  x,
  y,
  z
) {

  const lamp =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.3,
        16,
        16
      ),
      new THREE.MeshBasicMaterial({
        color: 0xffd98a
      })
    );

  lamp.position.set(
    x,
    y,
    z
  );

  group.add(lamp);

  const light =
    new THREE.PointLight(
      0xffc978,
      1.4,
      13
    );

  light.position.set(
    x,
    y,
    z
  );

  group.add(light);
}

/* =========================================================
   DECORACIÓN
========================================================= */

function createInteriorDecorations(
  group
) {

  const frame =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3.2,
        2.2,
        0.18
      ),
      new THREE.MeshStandardMaterial({
        color: 0x4a2c20
      })
    );

  frame.position.set(
    3.5,
    4.7,
    -7.72
  );

  group.add(frame);

  const painting =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        2.65,
        1.65,
        0.08
      ),
      new THREE.MeshStandardMaterial({
        color: 0x5c7890,
        roughness: 0.8
      })
    );

  painting.position.set(
    3.5,
    4.7,
    -7.58
  );

  group.add(painting);

  const vase =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.35,
        0.48,
        1.1,
        16
      ),
      new THREE.MeshStandardMaterial({
        color: 0x6f547e,
        roughness: 0.6
      })
    );

  vase.position.set(
    -3,
    0.95,
    -5
  );

  group.add(vase);

  for (
    let i = 0;
    i < 5;
    i++
  ) {

    const leaf =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.35,
          12,
          12
        ),
        new THREE.MeshStandardMaterial({
          color: 0x3c7c4a,
          roughness: 0.85
        })
      );

    leaf.position.set(
      -3 +
        Math.cos(i) * 0.35,
      1.8 +
        i * 0.12,
      -5 +
        Math.sin(i) * 0.35
    );

    leaf.scale.set(
      0.7,
      1.5,
      0.5
    );

    group.add(leaf);
  }

  const barrel =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.8,
        0.8,
        1.8,
        18
      ),
      new THREE.MeshStandardMaterial({
        color: 0x69442b,
        roughness: 0.9
      })
    );

  barrel.position.set(
    7,
    1,
    -5.8
  );

  group.add(barrel);
}

/* =========================================================
   SALIDA DE CASA — BOTÓN SIEMPRE VISIBLE
========================================================= */

function createExitButton() {

  let button =
    $("exitHouse");

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "exitHouse";

    document.body.appendChild(
      button
    );
  }

  button.type =
    "button";

  button.textContent =
    "🚪 SALIR DE LA CASA";

  button.style.position =
    "fixed";

  button.style.left =
    "50%";

  button.style.bottom =
    "24px";

  button.style.transform =
    "translateX(-50%)";

  button.style.zIndex =
    "2147483647";

  button.style.padding =
    "15px 24px";

  button.style.border =
    "2px solid rgba(255,255,255,.65)";

  button.style.borderRadius =
    "18px";

  button.style.background =
    "rgba(35,20,16,.95)";

  button.style.color =
    "#fff";

  button.style.fontSize =
    "16px";

  button.style.fontWeight =
    "800";

  button.style.boxShadow =
    "0 5px 25px rgba(0,0,0,.55)";

  button.style.pointerEvents =
    "auto";

  button.style.touchAction =
    "manipulation";

  button.style.display =
    "none";

  /*
   * Eliminamos listeners anteriores
   * reemplazando el nodo.
   */

  const newButton =
    button.cloneNode(true);

  button.replaceWith(
    newButton
  );

  button =
    newButton;

  const exit =
    e => {

      e.preventDefault();
      e.stopPropagation();

      exitHouse();
    };

  button.addEventListener(
    "click",
    exit
  );

  button.addEventListener(
    "touchend",
    exit,
    {
      passive: false
    }
  );

  return button;
}

function showExitHouseButton(
  visible
) {

  const button =
    createExitButton();

  button.style.display =
    visible
      ? "block"
      : "none";

  button.hidden =
    !visible;

  button.style.pointerEvents =
    visible
      ? "auto"
      : "none";
}

/* =========================================================
   BOTÓN ENTRAR
========================================================= */

function createEnterButton() {

  let button =
    $("enterHouse");

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "enterHouse";

    document.body.appendChild(
      button
    );
  }

  button.type =
    "button";

  button.textContent =
    "🏠 ENTRAR A LA CASA";

  button.style.position =
    "fixed";

  button.style.left =
    "50%";

  button.style.bottom =
    "90px";

  button.style.transform =
    "translateX(-50%)";

  button.style.zIndex =
    "2147483646";

  button.style.padding =
    "14px 23px";

  button.style.border =
    "2px solid rgba(255,255,255,.6)";

  button.style.borderRadius =
    "18px";

  button.style.background =
    "rgba(48,29,20,.95)";

  button.style.color =
    "#fff";

  button.style.fontSize =
    "16px";

  button.style.fontWeight =
    "800";

  button.style.boxShadow =
    "0 5px 25px rgba(0,0,0,.5)";

  button.style.pointerEvents =
    "auto";

  button.style.touchAction =
    "manipulation";

  button.style.display =
    "none";

  const newButton =
    button.cloneNode(true);

  button.replaceWith(
    newButton
  );

  button =
    newButton;

  const enter =
    e => {

      e.preventDefault();
      e.stopPropagation();

      const nearest =
        findNearestHouse();

      if (nearest) {

        enterHouse(
          nearest
        );
      }
    };

  button.addEventListener(
    "click",
    enter
  );

  button.addEventListener(
    "touchend",
    enter,
    {
      passive: false
    }
  );

  return button;
}

/* =========================================================
   BUSCAR CASA CERCANA
========================================================= */

function findNearestHouse() {

  if (
    !player ||
    state.insideHouse
  ) {

    return null;
  }

  let nearest =
    null;

  let nearestDistance =
    Infinity;

  for (
    const house of houses
  ) {

    const distance =
      player.position.distanceTo(
        house.position
      );

    if (
      distance <
      nearestDistance
    ) {

      nearestDistance =
        distance;

      nearest =
        house;
    }
  }

  if (
    nearestDistance <=
    18
  ) {

    return nearest;
  }

  return null;
}

/* =========================================================
   SISTEMA DE CASAS
========================================================= */

function setupHouse() {

  const enterButton =
    createEnterButton();

  createExitButton();

  /*
   * Revisamos cada 100 ms.
   */

  setInterval(
    () => {

      if (
        !player
      ) {
        return;
      }

      if (
        state.insideHouse
      ) {

        enterButton.style.display =
          "none";

        enterButton.style.pointerEvents =
          "none";

        return;
      }

      const nearest =
        findNearestHouse();

      if (nearest) {

        enterButton.style.display =
          "block";

        enterButton.hidden =
          false;

        enterButton.style.pointerEvents =
          "auto";

      } else {

        enterButton.style.display =
          "none";

        enterButton.hidden =
          true;

        enterButton.style.pointerEvents =
          "none";
      }

    },
    100
  );
}

/* =========================================================
   CREAR INTERIOR
========================================================= */

function removeHouseInterior() {

  if (
    !interior
  ) {

    return;
  }

  if (
    interior.group
  ) {

    scene.remove(
      interior.group
    );

    disposeObject(
      interior.group
    );
  }

  interior =
    null;
}

function createHouseInterior(
  house
) {

  removeHouseInterior();

  const width =
    20;

  const depth =
    16;

  const height =
    8;

  interior = {

    group:
      new THREE.Group(),

    width,

    depth,

    height,

    worldX:
      house.position.x,

    worldZ:
      house.position.z
  };

  const group =
    interior.group;

  group.position.set(
    house.position.x,
    0,
    house.position.z
  );

  /*
   * Piso.
   */

  const floor =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width,
        0.35,
        depth
      ),

      new THREE.MeshStandardMaterial({
        color:
          0x765139,

        roughness:
          0.88
      })
    );

  floor.position.y =
    0.05;

  floor.receiveShadow =
    true;

  group.add(
    floor
  );

  /*
   * Alfombra.
   */

  const carpet =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        7,
        0.12,
        5
      ),

      new THREE.MeshStandardMaterial({
        color:
          0x713e58,

        roughness:
          0.95
      })
    );

  carpet.position.set(
    0,
    0.28,
    1
  );

  group.add(
    carpet
  );

  /*
   * Material de paredes.
   */

  const wallMaterial =
    new THREE.MeshStandardMaterial({

      color:
        0x936246,

      roughness:
        0.9
    });

  /*
   * Pared trasera.
   */

  const back =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width,
        height,
        0.5
      ),

      wallMaterial
    );

  back.position.set(
    0,
    height / 2,
    -depth / 2
  );

  group.add(
    back
  );

  /*
   * Pared izquierda.
   */

  const left =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        0.5,
        height,
        depth
      ),

      wallMaterial
    );

  left.position.set(
    -width / 2,
    height / 2,
    0
  );

  group.add(
    left
  );

  /*
   * Pared derecha.
   */

  const right =
    left.clone();

  right.position.x =
    width / 2;

  group.add(
    right
  );

  /*
   * Pared frontal completamente cerrada.
   */

  const front =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width,
        height,
        0.5
      ),

      wallMaterial
    );

  front.position.set(
    0,
    height / 2,
    depth / 2
  );

  group.add(
    front
  );

  /*
   * Techo completamente sólido.
   */

  const ceiling =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        width + 1,
        0.5,
        depth + 1
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x50372b,

        roughness:
          1
      })
    );

  ceiling.position.y =
    height;

  group.add(
    ceiling
  );

  /*
   * Puerta decorativa.
   */

  const door =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3.2,
        5.2,
        0.35
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x38251c,

        roughness:
          0.75
      })
    );

  door.position.set(
    0,
    2.6,
    depth / 2 +
      0.05
  );

  group.add(
    door
  );

  /*
   * Marco.
   */

  const frameMaterial =
    new THREE.MeshStandardMaterial({

      color:
        0x3e271d,

      roughness:
        0.8
    });

  const frameLeft =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        0.35,
        5.8,
        0.55
      ),

      frameMaterial
    );

  frameLeft.position.set(
    -1.75,
    2.9,
    depth / 2
  );

  group.add(
    frameLeft
  );

  const frameRight =
    frameLeft.clone();

  frameRight.position.x =
    1.75;

  group.add(
    frameRight
  );

  /*
   * Decoración.
   */

  createFireplace(
    group,
    -6.8,
    -7.2
  );

  createBed(
    group,
    5.8,
    -4.7
  );

  createTable(
    group,
    0,
    -2.5
  );

  createChair(
    group,
    -3,
    -2.5
  );

  createChair(
    group,
    3,
    -2.5
  );

  createBookshelf(
    group,
    -7.4,
    -3.7
  );

  createChest(
    group,
    7,
    2.8
  );

  createCandle(
    group,
    -2.5,
    -2.5
  );

  createCandle(
    group,
    2.7,
    -2.5
  );

  createInteriorLight(
    group,
    0,
    5.7,
    0
  );

  createInteriorLight(
    group,
    -5,
    3.7,
    2
  );

  createInteriorDecorations(
    group
  );

  scene.add(
    group
  );
}

/* =========================================================
   CÁMARA
========================================================= */

function updateCamera() {

  if (
    !camera ||
    !player
  ) {
    return;
  }

  if (
    state.insideHouse
  ) {

    updateInteriorCamera();

    return;
  }

  const distance =
    18;

  const height =
    8;

  const offset =
    new THREE.Vector3(

      Math.sin(yaw) *
        distance,

      height +
        Math.sin(pitch) *
        5,

      Math.cos(yaw) *
        distance
    );

  const target =
    player.position.clone();

  target.y +=
    3;

  const desired =
    target.clone()
      .add(offset);

  camera.position.lerp(
    desired,
    0.15
  );

  camera.lookAt(
    target
  );
}

/* =========================================================
   CÁMARA DEL INTERIOR
========================================================= */

function updateInteriorCamera() {

  if (
    !state.insideHouse ||
    !interior ||
    !player
  ) {
    return;
  }

  const minX =
    interior.worldX -
    interior.width / 2 +
    1.6;

  const maxX =
    interior.worldX +
    interior.width / 2 -
    1.6;

  const minZ =
    interior.worldZ -
    interior.depth / 2 +
    1.6;

  const maxZ =
    interior.worldZ +
    interior.depth / 2 -
    1.6;

  /*
   * El jugador no puede salir.
   */

  player.position.x =
    THREE.MathUtils.clamp(
      player.position.x,
      minX,
      maxX
    );

  player.position.z =
    THREE.MathUtils.clamp(
      player.position.z,
      minZ,
      maxZ
    );

  const distance =
    5.8;

  const target =
    player.position.clone();

  target.y +=
    2.4;

  const offset =
    new THREE.Vector3(

      Math.sin(yaw) *
        distance,

      3.2,

      Math.cos(yaw) *
        distance
    );

  const desired =
    target.clone()
      .add(offset);

  /*
   * La cámara también queda
   * dentro de las paredes.
   */

  desired.x =
    THREE.MathUtils.clamp(
      desired.x,
      minX + 0.4,
      maxX - 0.4
    );

  desired.z =
    THREE.MathUtils.clamp(
      desired.z,
      minZ + 0.4,
      maxZ - 0.4
    );

  desired.y =
    THREE.MathUtils.clamp(
      desired.y,
      1.5,
      interior.height -
        0.8
    );

  camera.position.lerp(
    desired,
    0.25
  );

  camera.lookAt(
    target
  );
}

/* =========================================================
   CÁMARA TÁCTIL
========================================================= */

function setupCameraTouch() {

  if (!renderer) {
    return;
  }

  const canvas =
    renderer.domElement;

  canvas.addEventListener(
    "touchstart",
    e => {

      if (
        e.touches.length !== 1
      ) {
        return;
      }

      const target =
        e.target;

      if (
        target.closest(
          "#joystick"
        ) ||
        target.closest(
          "#chat"
        ) ||
        target.closest(
          "#chatToggle"
        ) ||
        target.closest(
          "#sideMap"
        ) ||
        target.closest(
          "#mapPanel"
        ) ||
        target.closest(
          "button"
        )
      ) {

        return;
      }

      draggingCamera =
        true;

      lastTouchX =
        e.touches[0]
          .clientX;

      lastTouchY =
        e.touches[0]
          .clientY;
    },
    {
      passive: true
    }
  );

  canvas.addEventListener(
    "touchmove",
    e => {

      if (
        !draggingCamera ||
        e.touches.length !== 1
      ) {
        return;
      }

      const touch =
        e.touches[0];

      const dx =
        touch.clientX -
        lastTouchX;

      const dy =
        touch.clientY -
        lastTouchY;

      lastTouchX =
        touch.clientX;

      lastTouchY =
        touch.clientY;

      yaw -=
        dx * 0.008;

      pitch +=
        dy * 0.004;

      pitch =
        THREE.MathUtils.clamp(
          pitch,
          -0.15,
          0.8
        );

      if (
        state.insideHouse
      ) {

        updateInteriorCamera();

      } else {

        updateCamera();
      }
    },
    {
      passive: true
    }
  );

  canvas.addEventListener(
    "touchend",
    () => {

      draggingCamera =
        false;
    }
  );
}

/* =========================================================
   REDIMENSIONAR
========================================================= */

function resize() {

  if (
    !camera ||
    !renderer
  ) {
    return;
  }

  camera.aspect =
    innerWidth /
    innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    innerWidth,
    innerHeight
  );
}
/* =========================================================
   VUELO — HADAS Y ELFOS
========================================================= */

function canFly() {

  return (
    selectedRace === "hada" ||
    selectedRace === "elfo"
  );
}

function toggleFlight() {

  if (!canFly()) {

    showToast(
      "🪽 Solo las Hadas y los Elfos pueden volar"
    );

    return;
  }

  state.flying =
    !state.flying;

  if (
    state.flying
  ) {

    player.position.y =
      Math.max(
        player.position.y,
        4
      );

    showToast(
      selectedRace === "hada"
        ? "🧚 ¡Has comenzado a volar!"
        : "🧝 ¡Elfo en vuelo!"
    );

  } else {

    player.position.y =
      0;

    showToast(
      "🌿 Has aterrizado"
    );
  }

  updateFlightButton();
}

/* =========================================================
   BOTÓN DE VUELO PARA IPHONE
========================================================= */

function createFlightButton() {

  let button =
    $("flightButton");

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "flightButton";

    document.body.appendChild(
      button
    );
  }

  button.type =
    "button";

  button.style.position =
    "fixed";

  button.style.right =
    "20px";

  button.style.bottom =
    "25px";

  button.style.zIndex =
    "2147483645";

  button.style.padding =
    "13px 18px";

  button.style.border =
    "2px solid rgba(255,255,255,.55)";

  button.style.borderRadius =
    "18px";

  button.style.background =
    "rgba(52,35,80,.94)";

  button.style.color =
    "#fff";

  button.style.fontSize =
    "15px";

  button.style.fontWeight =
    "800";

  button.style.boxShadow =
    "0 5px 25px rgba(0,0,0,.45)";

  button.style.touchAction =
    "manipulation";

  const newButton =
    button.cloneNode(true);

  button.replaceWith(
    newButton
  );

  button =
    newButton;

  const activate =
    e => {

      e.preventDefault();
      e.stopPropagation();

      toggleFlight();
    };

  button.addEventListener(
    "click",
    activate
  );

  button.addEventListener(
    "touchend",
    activate,
    {
      passive: false
    }
  );

  updateFlightButton();

  return button;
}

function updateFlightButton() {

  const button =
    $("flightButton");

  if (!button) {
    return;
  }

  if (!canFly()) {

    button.style.display =
      "none";

    return;
  }

  button.style.display =
    "block";

  button.textContent =
    state.flying
      ? "🪽 ATERRIZAR"
      : "🪽 VOLAR";
}

/* =========================================================
   CHAT — TOTALMENTE INDEPENDIENTE
========================================================= */

function setupChat() {

  let chat =
    $("chat");

  let toggle =
    $("chatToggle");

  /*
   * Si el HTML no tiene botón,
   * creamos uno.
   */

  if (!toggle) {

    toggle =
      document.createElement(
        "button"
      );

    toggle.id =
      "chatToggle";

    toggle.type =
      "button";

    toggle.textContent =
      "💬";

    document.body.appendChild(
      toggle
    );
  }

  /*
   * Si no existe el panel,
   * lo creamos.
   */

  if (!chat) {

    chat =
      document.createElement(
        "div"
      );

    chat.id =
      "chat";

    chat.innerHTML = `
      <div class="magic-chat-header">
        <strong>💬 CHAT DEL REINO</strong>
        <button
          type="button"
          id="magicChatClose">
          ×
        </button>
      </div>

      <div id="chatMessages"></div>

      <form id="chatForm">
        <input
          id="chatInput"
          type="text"
          autocomplete="off"
          placeholder="Escribe un mensaje..."
        />

        <button type="submit">
          ➤
        </button>
      </form>
    `;

    document.body.appendChild(
      chat
    );
  }

  /*
   * BOTÓN FLOTANTE
   */

  toggle.style.position =
    "fixed";

  toggle.style.right =
    "20px";

  toggle.style.bottom =
    "145px";

  toggle.style.zIndex =
    "2147483640";

  toggle.style.width =
    "55px";

  toggle.style.height =
    "55px";

  toggle.style.border =
    "2px solid rgba(255,255,255,.55)";

  toggle.style.borderRadius =
    "50%";

  toggle.style.background =
    "rgba(35,40,75,.95)";

  toggle.style.color =
    "#fff";

  toggle.style.fontSize =
    "25px";

  toggle.style.pointerEvents =
    "auto";

  toggle.style.touchAction =
    "manipulation";

  /*
   * PANEL
   */

  chat.style.position =
    "fixed";

  chat.style.right =
    "15px";

  chat.style.bottom =
    "80px";

  chat.style.width =
    "min(88vw, 360px)";

  chat.style.height =
    "min(65vh, 470px)";

  chat.style.zIndex =
    "2147483641";

  chat.style.background =
    "rgba(20,25,43,.97)";

  chat.style.border =
    "2px solid rgba(255,255,255,.18)";

  chat.style.borderRadius =
    "20px";

  chat.style.boxShadow =
    "0 10px 45px rgba(0,0,0,.55)";

  chat.style.display =
    "none";

  chat.style.flexDirection =
    "column";

  chat.style.overflow =
    "hidden";

  chat.style.pointerEvents =
    "auto";

  chat.style.touchAction =
    "manipulation";

  /*
   * HEADER
   */

  let header =
    chat.querySelector(
      ".magic-chat-header"
    );

  if (!header) {

    header =
      document.createElement(
        "div"
      );

    header.className =
      "magic-chat-header";

    chat.prepend(
      header
    );
  }

  header.style.height =
    "52px";

  header.style.display =
    "flex";

  header.style.alignItems =
    "center";

  header.style.justifyContent =
    "space-between";

  header.style.padding =
    "0 12px 0 16px";

  header.style.color =
    "#fff";

  /*
   * BOTÓN X
   */

  let close =
    $("magicChatClose") ||
    chat.querySelector(
      ".magic-chat-close"
    );

  if (!close) {

    close =
      document.createElement(
        "button"
      );

    close.id =
      "magicChatClose";

    close.textContent =
      "×";

    close.type =
      "button";

    header.appendChild(
      close
    );
  }

  close.style.width =
    "38px";

  close.style.height =
    "38px";

  close.style.border =
    "0";

  close.style.borderRadius =
    "50%";

  close.style.background =
    "rgba(0,0,0,.6)";

  close.style.color =
    "#fff";

  close.style.fontSize =
    "27px";

  close.style.pointerEvents =
    "auto";

  close.style.touchAction =
    "manipulation";

  function openChat() {

    chat.style.display =
      "flex";

    chat.style.visibility =
      "visible";

    chat.style.opacity =
      "1";

    chat.style.pointerEvents =
      "auto";

    chat.hidden =
      false;
  }

  function closeChat() {

    chat.style.display =
      "none";

    chat.style.visibility =
      "hidden";

    chat.style.opacity =
      "0";

    chat.style.pointerEvents =
      "none";

    chat.hidden =
      true;

    document.activeElement
      ?.blur();
  }

  const toggleChat =
    e => {

      e.preventDefault();
      e.stopPropagation();

      if (
        chat.style.display ===
        "none"
      ) {

        openChat();

      } else {

        closeChat();
      }
    };

  /*
   * Evitamos registrar el mismo
   * evento dos veces.
   */

  toggle.onclick =
    null;

  toggle.ontouchend =
    null;

  toggle.addEventListener(
    "click",
    toggleChat
  );

  toggle.addEventListener(
    "touchend",
    toggleChat,
    {
      passive: false
    }
  );

  const closeChatEvent =
    e => {

      e.preventDefault();
      e.stopPropagation();

      closeChat();
    };

  close.addEventListener(
    "click",
    closeChatEvent
  );

  close.addEventListener(
    "touchend",
    closeChatEvent,
    {
      passive: false
    }
  );

  /*
   * MENSAJES
   */

  let messages =
    $("chatMessages");

  if (!messages) {

    messages =
      document.createElement(
        "div"
      );

    messages.id =
      "chatMessages";

    chat.appendChild(
      messages
    );
  }

  messages.style.flex =
    "1";

  messages.style.overflowY =
    "auto";

  messages.style.padding =
    "12px";

  messages.style.color =
    "#fff";

  /*
   * FORMULARIO
   */

  let form =
    $("chatForm");

  let input =
    $("chatInput");

  if (!form) {

    form =
      document.createElement(
        "form"
      );

    form.id =
      "chatForm";

    chat.appendChild(
      form
    );
  }

  if (!input) {

    input =
      document.createElement(
        "input"
      );

    input.id =
      "chatInput";

    input.type =
      "text";

    input.placeholder =
      "Escribe un mensaje...";

    form.appendChild(
      input
    );
  }

  input.style.flex =
    "1";

  input.style.minWidth =
    "0";

  input.style.padding =
    "11px";

  input.style.borderRadius =
    "12px";

  input.style.border =
    "1px solid rgba(255,255,255,.2)";

  input.style.background =
    "rgba(255,255,255,.08)";

  input.style.color =
    "#fff";

  /*
   * FORM SUBMIT
   */

  form.onsubmit =
    e => {

      e.preventDefault();

      const text =
        input.value.trim();

      if (!text) {
        return;
      }

      addChatMessage(
        state.username,
        text
      );

      if (socket) {

        socket.emit(
          "chat",
          {
            username:
              state.username,

            text
          }
        );
      }

      input.value =
        "";
    };

  /*
   * SOCKET
   */

  if (
    socket &&
    !socket.userDataChatReady
  ) {

    socket.userDataChatReady =
      true;

    socket.on(
      "chat",
      data => {

        if (!data) {
          return;
        }

        addChatMessage(
          data.username ||
            "Jugador",

          data.text ||
            ""
        );
      }
    );

    socket.on(
      "system",
      message => {

        addChatMessage(
          "🌎 Sistema",
          message
        );
      }
    );
  }

  /*
   * IMPORTANTE:
   * El panel empieza cerrado,
   * pero el botón 💬 queda visible.
   */

  closeChat();
}

function addChatMessage(
  username,
  text
) {

  const container =
    $("chatMessages");

  if (!container) {
    return;
  }

  const message =
    document.createElement(
      "div"
    );

  message.style.padding =
    "8px 5px";

  message.style.marginBottom =
    "5px";

  message.style.borderBottom =
    "1px solid rgba(255,255,255,.08)";

  const name =
    document.createElement(
      "strong"
    );

  name.textContent =
    username + ": ";

  const content =
    document.createElement(
      "span"
    );

  content.textContent =
    text;

  message.appendChild(
    name
  );

  message.appendChild(
    content
  );

  container.appendChild(
    message
  );

  container.scrollTop =
    container.scrollHeight;
}

/* =========================================================
   MAPA
========================================================= */

function setupMap() {

  let button =
    $("mapButton");

  /*
   * Si el botón no existe,
   * creamos uno.
   */

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "mapButton";

    button.type =
      "button";

    button.textContent =
      "🗺️";

    document.body.appendChild(
      button
    );
  }

  button.style.position =
    "fixed";

  button.style.right =
    "20px";

  button.style.top =
    "20px";

  button.style.zIndex =
    "2147483630";

  button.style.width =
    "54px";

  button.style.height =
    "54px";

  button.style.border =
    "2px solid rgba(255,255,255,.55)";

  button.style.borderRadius =
    "50%";

  button.style.background =
    "rgba(35,40,75,.95)";

  button.style.color =
    "#fff";

  button.style.fontSize =
    "24px";

  button.style.pointerEvents =
    "auto";

  button.style.touchAction =
    "manipulation";

  /*
   * MUY IMPORTANTE:
   * usamos un ID diferente al botón.
   */

  let panel =
    $("mapPanel");

  if (!panel) {

    panel =
      document.createElement(
        "div"
      );

    panel.id =
      "mapPanel";

    panel.innerHTML = `
      <div class="map-title">
        🗺️ MAPA DEL REINO
        <button
          id="mapClose"
          type="button">
          ×
        </button>
      </div>

      <div id="magicMap">
        <div class="map-village">
          🏘️
        </div>

        <div class="map-castle">
          🏰
        </div>

        <div class="map-water">
          💧
        </div>

        <div id="mapPlayerMarker">
          🔵
        </div>
      </div>
    `;

    document.body.appendChild(
      panel
    );
  }

  /*
   * PANEL
   */

  panel.style.position =
    "fixed";

  panel.style.inset =
    "0";

  panel.style.zIndex =
    "2147483640";

  panel.style.background =
    "rgba(12,18,30,.97)";

  panel.style.padding =
    "18px";

  panel.style.boxSizing =
    "border-box";

  panel.style.display =
    "none";

  panel.style.pointerEvents =
    "none";

  panel.style.touchAction =
    "manipulation";

  /*
   * TÍTULO
   */

  const title =
    panel.querySelector(
      ".map-title"
    );

  if (title) {

    title.style.height =
      "60px";

    title.style.display =
      "flex";

    title.style.alignItems =
      "center";

    title.style.justifyContent =
      "space-between";

    title.style.color =
      "#fff";

    title.style.fontSize =
      "20px";

    title.style.fontWeight =
      "800";
  }

  /*
   * X
   */

  let close =
    $("mapClose");

  if (!close) {

    close =
      document.createElement(
        "button"
      );

    close.id =
      "mapClose";

    close.textContent =
      "×";

    close.type =
      "button";

    panel.appendChild(
      close
    );
  }

  close.style.width =
    "42px";

  close.style.height =
    "42px";

  close.style.border =
    "0";

  close.style.borderRadius =
    "50%";

  close.style.background =
    "rgba(0,0,0,.65)";

  close.style.color =
    "#fff";

  close.style.fontSize =
    "30px";

  close.style.pointerEvents =
    "auto";

  close.style.touchAction =
    "manipulation";

  /*
   * MAPA VISUAL
   */

  const map =
    $("magicMap");

  if (map) {

    map.style.position =
      "relative";

    map.style.width =
      "min(90vw, 650px)";

    map.style.height =
      "min(70vh, 600px)";

    map.style.margin =
      "30px auto";

    map.style.borderRadius =
      "30px";

    map.style.overflow =
      "hidden";

    map.style.background =
      "linear-gradient(145deg,#4f8c61,#78a866,#d1bd82)";

    map.style.border =
      "5px solid rgba(72,45,25,.7)";

    map.style.boxShadow =
      "inset 0 0 50px rgba(0,0,0,.25)";
  }

  /*
   * LAGO
   */

  const lake =
    panel.querySelector(
      ".map-water"
    );

  if (lake) {

    lake.style.position =
      "absolute";

    lake.style.width =
      "180px";

    lake.style.height =
      "130px";

    lake.style.left =
      "12%";

    lake.style.bottom =
      "15%";

    lake.style.borderRadius =
      "50%";

    lake.style.background =
      "#338eb0";

    lake.style.opacity =
      ".9";
  }

  /*
   * ALDEA
   */

  const village =
    panel.querySelector(
      ".map-village"
    );

  if (village) {

    village.style.position =
      "absolute";

    village.style.left =
      "48%";

    village.style.top =
      "48%";

    village.style.fontSize =
      "55px";
  }

  /*
   * CASTILLO
   */

  const castle =
    panel.querySelector(
      ".map-castle"
    );

  if (castle) {

    castle.style.position =
      "absolute";

    castle.style.right =
      "12%";

    castle.style.top =
      "12%";

    castle.style.fontSize =
      "55px";
  }

  /*
   * MARCADOR
   */

  const marker =
    $("mapPlayerMarker");

  if (marker) {

    marker.style.position =
      "absolute";

    marker.style.left =
      "50%";

    marker.style.top =
      "50%";

    marker.style.fontSize =
      "28px";

    marker.style.transform =
      "translate(-50%,-50%)";

    marker.style.zIndex =
      "5";
  }

  function openMap() {

    panel.style.display =
      "block";

    panel.style.visibility =
      "visible";

    panel.style.opacity =
      "1";

    panel.style.pointerEvents =
      "auto";

    panel.hidden =
      false;

    updateMapMarker();
  }

  function closeMap() {

    panel.style.display =
      "none";

    panel.style.visibility =
      "hidden";

    panel.style.opacity =
      "0";

    panel.style.pointerEvents =
      "none";

    panel.hidden =
      true;
  }

  const toggleMap =
    e => {

      e.preventDefault();
      e.stopPropagation();

      if (
        panel.style.display ===
        "none"
      ) {

        openMap();

      } else {

        closeMap();
      }
    };

  button.addEventListener(
    "click",
    toggleMap
  );

  button.addEventListener(
    "touchend",
    toggleMap,
    {
      passive: false
    }
  );

  const closeMapEvent =
    e => {

      e.preventDefault();
      e.stopPropagation();

      closeMap();
    };

  close.addEventListener(
    "click",
    closeMapEvent
  );

  close.addEventListener(
    "touchend",
    closeMapEvent,
    {
      passive: false
    }
  );

  closeMap();
}

function updateMapMarker() {

  const marker =
    $("mapPlayerMarker");

  if (
    !marker ||
    !player
  ) {
    return;
  }

  const x =
    THREE.MathUtils.clamp(
      player.position.x /
        350,

      -1,
      1
    );

  const z =
    THREE.MathUtils.clamp(
      player.position.z /
        350,

      -1,
      1
    );

  marker.style.left =
    `${50 + x * 40}%`;

  marker.style.top =
    `${50 + z * 40}%`;
}

/* =========================================================
   SELECCIÓN DE RAZA
========================================================= */

function setupCharacterCreator() {

  document
    .querySelectorAll(
      ".race-button"
    )
    .forEach(
      button => {

        const select =
          e => {

            e.preventDefault();
            e.stopPropagation();

            selectedRace =
              (
                button.dataset.race ||
                "humano"
              ).toLowerCase();

            document
              .querySelectorAll(
                ".race-button"
              )
              .forEach(
                other =>
                  other.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );

            /*
             * Aplicamos inmediatamente
             * la nueva raza.
             */

            updateRaceDetails();

            updateHUDRace();

            updateFlightButton();

            showToast(
              `✨ Raza elegida: ${getRaceName(selectedRace)}`
            );
          };

        button.addEventListener(
          "click",
          select
        );

        button.addEventListener(
          "touchend",
          select,
          {
            passive: false
          }
        );
      }
    );

  createAppearanceMenu();

  const finish =
    $("finishCharacter");

  if (finish) {

    const finishEvent =
      e => {

        e.preventDefault();
        e.stopPropagation();

        saveCharacter();
      };

    finish.addEventListener(
      "click",
      finishEvent
    );

    finish.addEventListener(
      "touchend",
      finishEvent,
      {
        passive: false
      }
    );
  }

  /*
   * Botón de vuelo.
   */

  createFlightButton();
}

/* =========================================================
   MENÚ DE APARIENCIA
========================================================= */

function createAppearanceMenu() {

  const creator =
    $("characterCreator");

  if (!creator) {
    return;
  }

  creator
    .querySelector(
      ".magic-appearance-menu"
    )
    ?.remove();

  const menu =
    document.createElement(
      "div"
    );

  menu.className =
    "magic-appearance-menu";

  menu.innerHTML = `
    <div class="appearance-menu-card">

      <h3>✨ PERSONALIZA TU PERSONAJE</h3>

      <div class="appearance-section">

        <strong>💇 Cabello</strong>

        <div
          class="appearance-choice-grid"
          data-type="cabello">

          <button
            type="button"
            class="appearance-choice"
            data-value="Corto">
            Corto
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Medio">
            Medio
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Largo">
            Largo
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Rapado">
            Rapado
          </button>

        </div>
      </div>

      <div class="appearance-section">

        <strong>👕 Ropa</strong>

        <div
          class="appearance-choice-grid"
          data-type="ropa">

          <button
            type="button"
            class="appearance-choice"
            data-value="Guerrero">
            ⚔️ Guerrero
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Mago">
            🔮 Mago
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Noble">
            👑 Noble
          </button>

        </div>
      </div>

      <div class="appearance-section">

        <strong>👑 Accesorios</strong>

        <div
          class="appearance-choice-grid"
          data-type="accesorios">

          <button
            type="button"
            class="appearance-choice"
            data-value="Ninguno">
            ❌ Ninguno
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Capa">
            🧥 Capa
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Corona">
            👑 Corona
          </button>

          <button
            type="button"
            class="appearance-choice"
            data-value="Amuleto">
            🔮 Amuleto
          </button>

        </div>
      </div>

    </div>
  `;

  creator.appendChild(
    menu
  );

  /*
   * Estilos directos.
   */

  menu.style.position =
    "relative";

  menu.style.zIndex =
    "999999";

  menu.style.pointerEvents =
    "auto";

  menu.style.touchAction =
    "manipulation";

  const card =
    menu.querySelector(
      ".appearance-menu-card"
    );

  if (card) {

    card.style.position =
      "relative";

    card.style.zIndex =
      "1000000";

    card.style.pointerEvents =
      "auto";
  }

  menu
    .querySelectorAll(
      ".appearance-choice"
    )
    .forEach(
      button => {

        button.style.position =
          "relative";

        button.style.zIndex =
          "1000001";

        button.style.pointerEvents =
          "auto";

        button.style.touchAction =
          "manipulation";

        const grid =
          button.parentElement;

        const type =
          grid?.dataset?.type;

        const value =
          button.dataset.value;

        const choose =
          e => {

            e.preventDefault();
            e.stopPropagation();

            if (
              !type ||
              !value
            ) {
              return;
            }

            selectedAppearance[
              type
            ] = value;

            menu
              .querySelectorAll(
                `.appearance-choice-grid[data-type="${type}"] .appearance-choice`
              )
              .forEach(
                other =>
                  other.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );

            /*
             * Aplicamos inmediatamente
             * el cambio.
             */

            applyAppearance();

            showToast(
              `${type}: ${value}`
            );
          };

        button.addEventListener(
          "click",
          choose
        );

        button.addEventListener(
          "touchend",
          choose,
          {
            passive: false
          }
        );
      }
    );

  updateAppearanceButtons();
}

/* =========================================================
   APARIENCIA
========================================================= */

function updateAppearanceButtons() {

  document
    .querySelectorAll(
      ".appearance-choice"
    )
    .forEach(
      button => {

        const type =
          button.parentElement
            ?.dataset
            ?.type;

        if (
          selectedAppearance[
            type
          ] ===
          button.dataset.value
        ) {

          button.classList.add(
            "selected"
          );

        } else {

          button.classList.remove(
            "selected"
          );
        }
      }
    );
}

function applyAppearance() {

  if (!player) {
    return;
  }

  updateHair();

  updateClothes();

  updateAccessories();
}

/* =========================================================
   CABELLO
========================================================= */

function updateHair() {

  if (!player) {
    return;
  }

  let hairGroup =
    player.getObjectByName(
      "customHair"
    );

  if (!hairGroup) {

    hairGroup =
      new THREE.Group();

    hairGroup.name =
      "customHair";

    player.add(
      hairGroup
    );
  }

  while (
    hairGroup.children.length
  ) {

    const child =
      hairGroup.children[0];

    hairGroup.remove(
      child
    );

    disposeObject(
      child
    );
  }

  const style =
    selectedAppearance.cabello;

  if (
    style ===
    "Rapado"
  ) {

    return;
  }

  const hairMaterial =
    new THREE.MeshStandardMaterial({
      color:
        0x4b3024,

      roughness:
        0.8
    });

  let scale =
    0.85;

  if (
    style ===
    "Medio"
  ) {

    scale =
      1.0;

  } else if (
    style ===
    "Largo"
  ) {

    scale =
      1.25;
  }

  const hair =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        0.72,
        20,
        16
      ),

      hairMaterial
    )
  ;

  hair.scale.set(
    scale,
    0.72 * scale,
    scale
  );

  hair.position.set(
    0,
    3.1,
    -0.04
  );

  hairGroup.add(
    hair
  );

  /*
   * Mechones.
   */

  if (
    style ===
      "Medio" ||
    style ===
      "Largo"
  ) {

    for (
      let i = -2;
      i <= 2;
      i++
    ) {

      const lock =
        new THREE.Mesh(

          new THREE.CapsuleGeometry(
            0.12,
            style ===
              "Largo"
              ? 1.25
              : 0.75,

            6,
            10
          ),

          hairMaterial
        );

      lock.position.set(
        i * 0.23,
        style ===
          "Largo"
          ? 2.35
          : 2.55,

        -0.25
      );

      hairGroup.add(
        lock
      );
    }
  }
}

/* =========================================================
   ROPA
========================================================= */

function updateClothes() {

  if (!player) {
    return;
  }

  let group =
    player.getObjectByName(
      "customClothes"
    );

  if (!group) {

    group =
      new THREE.Group();

    group.name =
      "customClothes";

    player.add(
      group
    );
  }

  while (
    group.children.length
  ) {

    const child =
      group.children[0];

    group.remove(
      child
    );

    disposeObject(
      child
    );
  }

  let color =
    0x42658f;

  if (
    selectedAppearance.ropa ===
    "Mago"
  ) {

    color =
      0x65439b;

  } else if (
    selectedAppearance.ropa ===
    "Noble"
  ) {

    color =
      0xb58a32;
  }

  const material =
    new THREE.MeshStandardMaterial({
      color,
      roughness:
        0.72
    });

  /*
   * Túnica/armadura visual.
   */

  const torso =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.55,
        1.65,
        0.75
      ),

      material
    );

  torso.position.set(
    0,
    1.85,
    0
  );

  torso.castShadow =
    true;

  group.add(
    torso
  );

  /*
   * Cinturón.
   */

  const belt =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        1.65,
        0.22,
        0.82
      ),

      new THREE.MeshStandardMaterial({
        color:
          0x3d281c,

        roughness:
          0.8
      })
    );

  belt.position.set(
    0,
    1.35,
    0
  );

  group.add(
    belt
  );
}

/* =========================================================
   ACCESORIOS
========================================================= */

function updateAccessories() {

  if (!player) {
    return;
  }

  let group =
    player.getObjectByName(
      "customAccessories"
    );

  if (!group) {

    group =
      new THREE.Group();

    group.name =
      "customAccessories";

    player.add(
      group
    );
  }

  while (
    group.children.length
  ) {

    const child =
      group.children[0];

    group.remove(
      child
    );

    disposeObject(
      child
    );
  }

  const accessory =
    selectedAppearance
      .accesorios;

  /*
   * CAPA
   */

  if (
    accessory ===
    "Capa"
  ) {

    const cape =
      new THREE.Mesh(

        new THREE.PlaneGeometry(
          2.1,
          3.2
        ),

        new THREE.MeshStandardMaterial({

          color:
            0x54275e,

          side:
            THREE.DoubleSide,

          roughness:
            0.82
        })
      );

    cape.position.set(
      0,
      2,
      0.48
    );

    cape.rotation.x =
      0.04;

    group.add(
      cape
    );
  }

  /*
   * CORONA
   */

  if (
    accessory ===
    "Corona"
  ) {

    const crown =
      new THREE.Mesh(

        new THREE.CylinderGeometry(
          0.52,
          0.68,
          0.42,
          6
        ),

        new THREE.MeshStandardMaterial({

          color:
            0xd7a72d,

          metalness:
            0.75,

          roughness:
            0.28
        })
      );

    crown.position.set(
      0,
      3.55,
      0
    );

    group.add(
      crown
    );

    for (
      let i = 0;
      i < 6;
      i++
    ) {

      const point =
        new THREE.Mesh(

          new THREE.ConeGeometry(
            0.08,
            0.45,
            6
          ),

          new THREE.MeshStandardMaterial({

            color:
              0xf0c84c,

            metalness:
              0.75,

            roughness:
              0.25
          })
        );

      const angle =
        i /
        6 *
        Math.PI *
        2;

      point.position.set(

        Math.cos(angle) *
          0.45,

        3.85,

        Math.sin(angle) *
          0.45
      );

      group.add(
        point
      );
    }
  }

  /*
   * AMULETO
   */

  if (
    accessory ===
    "Amuleto"
  ) {

    const chain =
      new THREE.Mesh(

        new THREE.TorusGeometry(
          0.28,
          0.04,
          8,
          24
        ),

        new THREE.MeshStandardMaterial({

          color:
            0xd5b45b,

          metalness:
            0.75,

          roughness:
            0.3
        })
      );

    chain.position.set(
      0,
      2.25,
      -0.48
    );

    chain.rotation.x =
      Math.PI / 2;

    group.add(
      chain
    );

    const gem =
      new THREE.Mesh(

        new THREE.OctahedronGeometry(
          0.25
        ),

        new THREE.MeshPhysicalMaterial({

          color:
            0x62d9ff,

          emissive:
            0x257da0,

          emissiveIntensity:
            0.7,

          roughness:
            0.2,

          metalness:
            0.15
        })
      );

    gem.position.set(
      0,
      1.85,
      -0.55
    );

    group.add(
      gem
    );
  }
}

/* =========================================================
   GUARDAR PERSONAJE
========================================================= */

function saveCharacter() {

  const character = {

    race:
      selectedRace,

    appearance:
      {
        ...selectedAppearance
      }
  };

  state.character =
    character;

  localStorage.setItem(
    "universo_magico_character",
    JSON.stringify(
      character
    )
  );

  fetch(
    "/api/character",
    {
      method:
        "POST",

      headers:
        {
          "Content-Type":
            "application/json"
        },

      body:
        JSON.stringify({
          username:
            state.username,

          character
        })
    }
  )
    .catch(
      error =>
        console.warn(
          "No se pudo guardar personaje:",
          error
        )
    );

  applyCharacterVisuals();

  applyAppearance();

  const creator =
    $("characterCreator");

  if (creator) {

    creator.hidden =
      true;

    creator.style.display =
      "none";
  }

  updateHUDRace();

  updateFlightButton();

  showToast(
    "✨ Personaje guardado"
  );
}

/* =========================================================
   ABRIR CREATOR
========================================================= */

function openCharacterCreator(
  savedCharacter
) {

  const creator =
    $("characterCreator");

  if (!creator) {
    return;
  }

  if (
    savedCharacter
  ) {

    state.character =
      savedCharacter;

    selectedRace =
      (
        savedCharacter.race ||
        "humano"
      ).toLowerCase();

    selectedAppearance =
      {
        ...selectedAppearance,

        ...(savedCharacter.appearance ||
          {})
      };

    creator.hidden =
      true;

    creator.style.display =
      "none";

    updateRaceDetails();

    applyAppearance();

    updateHUDRace();

    updateFlightButton();

    return;
  }

  creator.hidden =
    false;

  creator.style.display =
    "block";

  updateRaceDetails();

  updateAppearanceButtons();

  updateFlightButton();
}

/* =========================================================
   HUD
========================================================= */

function getRaceName(
  race
) {

  const names = {

    humano:
      "Humano",

    hada:
      "Hada",

    elfo:
      "Elfo",

    demonio:
      "Demonio"
  };

  return (
    names[race] ||
    race
  );
}

function updateHUDRace() {

  const race =
    $("playerRace");

  if (!race) {
    return;
  }

  race.textContent =
    getRaceName(
      selectedRace
    );

  const abilityRace =
    $("abilityRace");

  if (abilityRace) {

    abilityRace.textContent =
      getRaceName(
        selectedRace
      );
  }
}

function updateBars() {

  const hpBar =
    $("hpBar");

  const manaBar =
    $("manaBar");

  if (hpBar) {

    hpBar.style.width =
      `${Math.max(
        0,
        Math.min(
          100,
          hp
        )
      )}%`;
  }

  if (manaBar) {

    manaBar.style.width =
      `${Math.max(
        0,
        Math.min(
          100,
          mana
        )
      )}%`;
  }
}

/* =========================================================
   HABILIDADES
========================================================= */

function setupCombat() {

  [
    $("ability0"),
    $("ability1"),
    $("ability2")
  ]
    .forEach(
      (button, index) => {

        if (!button) {
          return;
        }

        const cast =
          e => {

            e.preventDefault();
            e.stopPropagation();

            castAbility(
              index
            );
          };

        button.addEventListener(
          "click",
          cast
        );

        button.addEventListener(
          "touchend",
          cast,
          {
            passive: false
          }
        );
      }
    );
}

function castAbility(
  index
) {

  const costs =
    [
      15,
      25,
      40
    ];

  const cost =
    costs[index] ||
    15;

  if (
    mana <
    cost
  ) {

    showToast(
      "🔵 No tienes suficiente maná"
    );

    return;
  }

  mana -=
    cost;

  updateBars();

  createSpellEffect(
    index
  );

  showToast(
    "✨ Hechizo lanzado"
  );
}

function createSpellEffect(
  index
) {

  if (!player) {
    return;
  }

  const colors =
    [
      0x75bfff,
      0xb777ff,
      0xff83d0
    ];

  const effect =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        0.25 +
          index * 0.12,

        16,
        16
      ),

      new THREE.MeshBasicMaterial({

        color:
          colors[index] ||
          0xffffff,

        transparent:
          true,

        opacity:
          0.9
      })
    );

  effect.position.copy(
    player.position
  );

  effect.position.y +=
    2.4;

  effect.userData.life =
    0.7;

  effect.userData.magicEffect =
    true;

  scene.add(
    effect
  );
}

/* =========================================================
   TOAST
========================================================= */

function showToast(
  message
) {

  const toast =
    $("gameToast");

  if (!toast) {

    console.log(
      message
    );

    return;
  }

  toast.textContent =
    message;

  toast.hidden =
    false;

  toast.style.display =
    "block";

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {

        toast.hidden =
          true;

        toast.style.display =
          "none";

      },
      2200
    );
}

/* =========================================================
   JOYSTICK
========================================================= */

function setupJoystick() {

  const joystick =
    $("joystick");

  if (!joystick) {
    return;
  }

  const stick =
    joystick.querySelector(
      ".stick"
    );

  if (!stick) {
    return;
  }

  let active =
    false;

  function moveStick(
    x,
    y
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
      x -
      centerX;

    let dy =
      y -
      centerY;

    const max =
      rect.width *
      0.32;

    const distance =
      Math.hypot(
        dx,
        dy
      );

    if (
      distance >
      max
    ) {

      dx =
        dx /
        distance *
        max;

      dy =
        dy /
        distance *
        max;
    }

    moveX =
      dx /
      max;

    moveY =
      -dy /
      max;

    stick.style.transform =
      `translate(${dx}px,${dy}px)`;
  }

  function reset() {

    active =
      false;

    moveX =
      0;

    moveY =
      0;

    stick.style.transform =
      "translate(0,0)";
  }

  joystick.addEventListener(
    "touchstart",
    e => {

      e.preventDefault();

      active =
        true;

      moveStick(
        e.touches[0]
          .clientX,

        e.touches[0]
          .clientY
      );
    },
    {
      passive:
        false
    }
  );

  joystick.addEventListener(
    "touchmove",
    e => {

      if (!active) {
        return;
      }

      e.preventDefault();

      moveStick(
        e.touches[0]
          .clientX,

        e.touches[0]
          .clientY
      );
    },
    {
      passive:
        false
    }
  );

  joystick.addEventListener(
    "touchend",
    e => {

      e.preventDefault();

      reset();
    },
    {
      passive:
        false
    }
  );

  joystick.addEventListener(
    "touchcancel",
    reset
  );
}

/* =========================================================
   EFECTOS
========================================================= */

function updateEffects(
  delta
) {

  if (!scene) {
    return;
  }

  const remove =
    [];

  scene.traverse(
    object => {

      if (
        object.userData
          ?.magicEffect
      ) {

        object.userData.life -=
          delta;

        object.scale.multiplyScalar(
          1 +
          delta *
          1.5
        );

        if (
          object.material
        ) {

          object.material.opacity =
            Math.max(
              0,
              object.userData
                .life
            );
        }

        if (
          object.userData.life <=
          0
        ) {

          remove.push(
            object
          );
        }
      }

      if (
        object.userData
          ?.fairyWing
      ) {

        const t =
          performance.now() *
          0.004;

        const side =
          object.position.x <
          0
            ? -1
            : 1;

        object.rotation.z =
          side *
          (
            0.28 +
            Math.sin(
              t +
              object.userData
                .wingIndex
            ) *
            0.12
          );

        object.rotation.y =
          Math.sin(
            t * 0.8 +
            object.userData
              .wingIndex
          ) *
          0.15;
      }

      if (
        object.userData
          ?.fairyLight
      ) {

        object.intensity =
          0.65 +
          Math.sin(
            performance.now() *
            0.006
          ) *
          0.25;
      }

      if (
        object.userData
          ?.fire
      ) {

        const pulse =
          1 +
          Math.sin(
            performance.now() *
            0.018
          ) *
          0.15;

        object.scale.set(
          pulse,
          pulse *
            1.25,
          pulse
        );
      }

      if (
        object.userData
          ?.flame
      ) {

        const pulse =
          1 +
          Math.sin(
            performance.now() *
            0.02
          ) *
          0.18;

        object.scale.set(
          pulse,
          pulse * 1.5,
          pulse
        );
      }

      if (
        object.userData
          ?.fireLight
      ) {

        object.intensity =
          2.5 +
          Math.sin(
            performance.now() *
            0.015
          ) *
          0.5;
      }

      if (
        object.userData
          ?.candleLight
      ) {

        object.intensity =
          0.6 +
          Math.sin(
            performance.now() *
            0.018
          ) *
          0.15;
      }
    }
  );

  remove.forEach(
    object => {

      scene.remove(
        object
      );

      disposeObject(
        object
      );
    }
  );
}

/* =========================================================
   ANIMACIÓN DE ÁRBOLES
========================================================= */

function animateTrees() {

  const time =
    performance.now() *
    0.001;

  trees.forEach(
    tree => {

      const phase =
        tree.userData.phase ||
        0;

      tree.rotation.z =
        Math.sin(
          time *
          0.7 +
          phase
        ) *
        0.018;

      tree.rotation.x =
        Math.cos(
          time *
          0.55 +
          phase
        ) *
        0.012;
    }
  );
}

/* =========================================================
   LOOP
========================================================= */

function animate() {

  requestAnimationFrame(
    animate
  );

  if (
    !renderer ||
    !scene
  ) {

    return;
  }

  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );

  updatePlayer(
    delta
  );

  if (
    state.insideHouse
  ) {

    updateInteriorCamera();

  } else {

    updateCamera();
  }

  updateEffects(
    delta
  );

  animateTrees();

  updateMapMarker();

  /*
   * Regeneración de maná.
   */

  if (
    mana <
    100
  ) {

    mana =
      Math.min(
        100,
        mana +
        delta *
        3
      );

    updateBars();
  }

  /*
   * Animaciones.
   */

  if (
    mixer
  ) {

    mixer.update(
      delta
    );
  }

  renderer.render(
    scene,
    camera
  );
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */

updateBars();

console.log(
  "🌎 UNIVERSO MÁGICO — GAME.JS COMPLETO"
);
