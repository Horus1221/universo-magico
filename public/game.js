import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const $ = id => document.getElementById(id);
const socket = typeof io === "function" ? io() : null;

console.log("✨ UNIVERSO MÁGICO — GAME.JS CARGADO");

const home = $("home");
const game = $("game");
const sceneEl = $("scene");

let scene;
let camera;
let renderer;
let clock;

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
  insideHouse: false
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

$("tabLogin")?.addEventListener("click", () => {

  registerMode = false;

  $("tabLogin")?.classList.add("active");
  $("tabRegister")?.classList.remove("active");

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      "⚡ ENTRAR AL UNIVERSO";
  }
});

$("tabRegister")?.addEventListener("click", () => {

  registerMode = true;

  $("tabRegister")?.classList.add("active");
  $("tabLogin")?.classList.remove("active");

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      "✨ CREAR PERSONAJE";
  }
});

$("authForm")?.addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    const username =
      ($("username")?.value || "").trim();

    const password =
      $("password")?.value || "";

    if (username.length < 3) {

      authMessage(
        "El nombre debe tener al menos 3 caracteres."
      );

      return;
    }

    if (password.length < 6) {

      authMessage(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
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
          .catch(() => ({}));

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
        data.username || username,
        data.character || null
      );

    } catch (err) {

      console.error(err);

      authMessage(
        err.message ||
        "No se pudo conectar con el reino."
      );

    } finally {

      if (button) {

        button.disabled = false;

        button.textContent =
          registerMode
            ? "✨ CREAR PERSONAJE"
            : "⚡ ENTRAR AL UNIVERSO";
      }
    }
  }
);

function authMessage(text) {

  const el = $("authMsg");

  if (!el) return;

  el.textContent = text;
  el.hidden = false;
}

function startGame(
  username,
  savedCharacter = null
) {

  state.username =
    username || "Aventurero";

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
      state.username[0]?.toUpperCase() ||
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
   INICIO DEL MUNDO
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
      innerWidth / innerHeight,
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

  scene.add(hemi);

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

  sun.castShadow = true;

  sun.shadow.mapSize.set(
    2048,
    2048
  );

  scene.add(sun);

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

  scene.add(ground);

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

    scene.add(grass);
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
        transparent: true,
        opacity: 0.78,
        roughness: 0.12,
        metalness: 0.08
      })
    );

  water.rotation.x =
    -Math.PI / 2;

  water.position.set(
    115,
    0.08,
    80
  );

  scene.add(water);
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

      houses.push(house);

      scene.add(house);
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

  scene.add(plaza);

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

  scene.add(fountain);
}

/* =========================================================
   CASA EXTERIOR
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

        roughness: 0.85
      })
    );

  wall.position.y =
    5;

  wall.castShadow =
    true;

  wall.receiveShadow =
    true;

  group.add(wall);

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

        roughness: 0.9
      })
    );

  roof.rotation.y =
    Math.PI / 4;

  roof.position.y =
    14;

  roof.castShadow =
    true;

  group.add(roof);

  const door =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3.2,
        5.5,
        0.4
      ),

      new THREE.MeshStandardMaterial({
        color: 0x35231c
      })
    );

  door.position.set(
    0,
    2.75,
    9.15
  );

  group.add(door);

  group.userData.house =
    true;

  group.userData.houseIndex =
    index;

  group.userData.worldPosition =
    new THREE.Vector3(
      x,
      0,
      z
    );

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
          color: 0x63402a
        })
      );

    trunk.position.y =
      4;

    trunk.castShadow =
      true;

    tree.add(trunk);

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
            color: 0x2f713d,
            roughness: 1
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

      tree.add(leaf);
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
      Math.random() * 10;

    scene.add(tree);

    trees.push(tree);
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
      i / 36 *
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
          color: 0x4c6257,
          roughness: 1
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

    scene.add(mountain);

    const peak =
      new THREE.Mesh(
        new THREE.ConeGeometry(
          THREE.MathUtils.randFloat(
            7,
            14
          ),

          height * 0.22,

          8
        ),

        new THREE.MeshStandardMaterial({
          color: 0xbcc9c6,
          roughness: 1
        })
      );

    peak.position.copy(
      mountain.position
    );

    peak.position.y +=
      height * 0.39;

    peak.scale.y =
      0.75;

    scene.add(peak);
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
      color: 0x68757d,
      roughness: 0.9
    });

  const darkStone =
    new THREE.MeshStandardMaterial({
      color: 0x4e5961,
      roughness: 0.95
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

  castle.add(keep);

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

    castle.add(tower);

    const roof =
      new THREE.Mesh(
        new THREE.ConeGeometry(
          10,
          12,
          12
        ),

        new THREE.MeshStandardMaterial({
          color: 0x382a35,
          roughness: 0.8
        })
      );

    roof.position.set(
      x,
      44,
      z
    );

    castle.add(roof);
  }

  const gate =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        18,
        16,
        3
      ),

      new THREE.MeshStandardMaterial({
        color: 0x2e211b,
        roughness: 0.9
      })
    );

  gate.position.set(
    0,
    8,
    28
  );

  castle.add(gate);

  scene.add(castle);
}
/* =========================================================
   PARTÍCULAS MÁGICAS
========================================================= */

function createMagicParticles() {

  const geometry =
    new THREE.BufferGeometry();

  const count = 350;

  const positions =
    new Float32Array(
      count * 3
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {

    positions[i * 3] =
      THREE.MathUtils.randFloat(
        -300,
        300
      );

    positions[i * 3 + 1] =
      THREE.MathUtils.randFloat(
        1,
        80
      );

    positions[i * 3 + 2] =
      THREE.MathUtils.randFloat(
        -300,
        300
      );
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

  scene.add(particles);
}

/* =========================================================
   JUGADOR
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
          }
        }
      );

      scene.add(player);

      applyCharacterVisuals();

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

  group.add(body);

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

  group.add(head);

  player = group;

  player.position.set(
    0,
    0,
    15
  );

  scene.add(player);

  applyCharacterVisuals();
}

/* =========================================================
   ANIMACIONES
========================================================= */

function loadAnimations() {

  loader.load(
    assets.animations,

    gltf => {

      if (
        !player ||
        !gltf.animations
      ) {
        return;
      }

      mixer =
        new THREE.AnimationMixer(
          player
        );

      gltf.animations.forEach(
        clip => {

          const action =
            mixer.clipAction(
              clip
            );

          actions[
            clip.name
          ] = action;
        }
      );

      const idle =
        findAnimation([
          "Idle",
          "idle",
          "Stand",
          "Breathing"
        ]);

      if (idle) {

        idle.play();

        currentAction =
          idle;
      }
    },

    undefined,

    error => {

      console.warn(
        "⚠️ No se pudieron cargar las animaciones:",
        error
      );
    }
  );
}

function findAnimation(
  names
) {

  for (
    const name of names
  ) {

    if (
      actions[name]
    ) {
      return actions[name];
    }
  }

  const keys =
    Object.keys(actions);

  if (
    keys.length > 0
  ) {
    return actions[keys[0]];
  }

  return null;
}

function playAnimation(
  names
) {

  if (!mixer) return;

  const next =
    findAnimation(names);

  if (!next) return;

  if (
    currentAction === next
  ) {
    return;
  }

  if (currentAction) {

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

  if (!player) return;

  const character =
    state.character;

  if (character?.race) {

    selectedRace =
      character.race;
  }

  if (
    character?.appearance
  ) {

    selectedAppearance =
      {
        ...selectedAppearance,
        ...character.appearance
      };
  }

  player.traverse(
    object => {

      if (
        !object.isMesh
      ) {
        return;
      }

      const name =
        (
          object.name ||
          ""
        ).toLowerCase();

      if (
        selectedRace ===
        "hada"
      ) {

        if (
          name.includes("body") ||
          name.includes("skin") ||
          name.includes("face") ||
          name.includes("head") ||
          name.includes("hand") ||
          name.includes("arm") ||
          name.includes("leg") ||
          name.includes("foot") ||
          name.includes(
            "superhero_male"
          )
        ) {

          if (
            object.material
          ) {

            object.material =
              object.material.clone();

            object.material.color.set(
              0xe5b59f
            );
          }
        }
      }
    }
  );

  updateRaceDetails();
}

/* =========================================================
   DETALLES DE RAZA
========================================================= */

function updateRaceDetails() {

  if (!player) return;

  let details =
    player.getObjectByName(
      "raceDetails"
    );

  if (!details) {

    details =
      new THREE.Group();

    details.name =
      "raceDetails";

    player.add(details);
  }

  while (
    details.children.length
  ) {

    details.remove(
      details.children[0]
    );
  }

  if (
    selectedRace ===
    "hada"
  ) {

    createFairyWings(
      details
    );
  }

  if (
    selectedRace ===
    "elfo"
  ) {

    createElfDetails(
      details
    );
  }

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
      color: 0xd9b8ff,
      transparent: true,
      opacity: 0.55,
      transmission: 0.15,
      roughness: 0.18,
      side: THREE.DoubleSide,
      emissive: 0x7b4eb5,
      emissiveIntensity: 0.45
    });

  const glowMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xe9cfff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
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
          index < 2
            ? wingMaterial.clone()
            : glowMaterial.clone()
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

      wing.castShadow =
        false;

      parent.add(wing);
    }
  );

  const light =
    new THREE.PointLight(
      0xdcb7ff,
      0.8,
      5
    );

  light.position.set(
    0,
    1.5,
    0
  );

  parent.add(light);
}

/* =========================================================
   DETALLES ELFOS
========================================================= */

function createElfDetails(
  parent
) {

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x78c99c,
      roughness: 0.7
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
}

/* =========================================================
   DETALLES DEMONIO
========================================================= */

function createDemonDetails(
  parent
) {

  const hornMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x3b2025,
      roughness: 0.7
    });

  [-0.38, 0.38]
    .forEach(x => {

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
    });
}

/* =========================================================
   MOVIMIENTO
========================================================= */

function setupKeyboard() {

  addEventListener(
    "keydown",
    e => {

      keys[e.key.toLowerCase()] =
        true;
    }
  );

  addEventListener(
    "keyup",
    e => {

      keys[e.key.toLowerCase()] =
        false;
    }
  );
}

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

function updatePlayer(
  delta
) {

  if (
    !player
  ) {
    return;
  }

  const input =
    getMovementInput();

  const moving =
    Math.abs(input.x) >
      0.03 ||
    Math.abs(input.y) >
      0.03;

  if (moving) {

    const speed =
      state.insideHouse
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
      direction.lengthSq()
        > 0
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

    playAnimation([
      "Walk",
      "Walking",
      "Run",
      "Running"
    ]);

  } else {

    playAnimation([
      "Idle",
      "idle",
      "Stand"
    ]);
  }

  if (
    mixer
  ) {

    mixer.update(
      delta
    );
  }
}

/* =========================================================
   COLISIONES GENERALES
========================================================= */

function canMoveTo(
  position
) {

  if (
    state.insideHouse
  ) {

    return canMoveInsideHouse(
      position
    );
  }

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

  for (
    const house of houses
  ) {

    const hp =
      house.position;

    const dx =
      position.x - hp.x;

    const dz =
      position.z - hp.z;

    if (
      Math.abs(dx) < 13 &&
      Math.abs(dz) < 11
    ) {

      return false;
    }
  }

  return true;
}
/* =========================================================
   INTERIOR DE LAS CASAS
========================================================= */

function canMoveInsideHouse(position) {

  if (!state.insideHouse || !interior) {
    return true;
  }

  const localX =
    position.x -
    interior.worldX;

  const localZ =
    position.z -
    interior.worldZ;

  const limitX =
    interior.width / 2 - 1.3;

  const limitZ =
    interior.depth / 2 - 1.3;

  return (
    localX > -limitX &&
    localX < limitX &&
    localZ > -limitZ &&
    localZ < limitZ
  );
}

function enterHouse(house) {

  if (
    !house ||
    state.insideHouse
  ) {
    return;
  }

  currentHouse =
    house;

  state.insideHouse =
    true;

  /*
   * Guardamos la posición exterior.
   * Esto permite volver exactamente
   * al lugar donde estaba el jugador.
   */
  house.userData.previousPlayerPosition =
    player
      ? player.position.clone()
      : null;

  /*
   * Ocultamos completamente
   * el exterior de la casa.
   */
  house.visible =
    false;

  createHouseInterior(
    house
  );

  /*
   * Posición inicial del jugador
   * dentro del interior.
   */
  if (player) {

    player.position.set(
      house.position.x,
      0,
      house.position.z + 4
    );

    player.rotation.y =
      Math.PI;
  }

  /*
   * Cámara cercana.
   */
  yaw = 0;
  pitch = 0.35;

  updateCamera();

  showExitHouseButton(
    true
  );

  showToast(
    "🏠 Entraste a tu casa"
  );
}

function exitHouse() {

  if (
    !state.insideHouse ||
    !currentHouse
  ) {
    return;
  }

  /*
   * Guardamos la posición
   * exterior antes de destruir
   * el interior.
   */
  const exitPosition =
    currentHouse
      .userData
      .previousPlayerPosition;

  removeHouseInterior();

  currentHouse.visible =
    true;

  state.insideHouse =
    false;

  if (
    player
  ) {

    if (
      exitPosition
    ) {

      player.position.copy(
        exitPosition
      );

      /*
       * Lo desplazamos un poco
       * hacia afuera para evitar
       * quedar dentro de la pared.
       */
      const direction =
        new THREE.Vector3(
          0,
          0,
          1
        );

      direction.applyEuler(
        currentHouse.rotation
      );

      player.position.addScaledVector(
        direction,
        3
      );

    } else {

      player.position.set(
        currentHouse.position.x,
        0,
        currentHouse.position.z + 14
      );
    }
  }

  currentHouse =
    null;

  showExitHouseButton(
    false
  );

  updateCamera();

  showToast(
    "🌿 Volviste a la aldea"
  );
}

/* =========================================================
   CREACIÓN DEL INTERIOR
========================================================= */

function createHouseInterior(
  house
) {

  removeHouseInterior();

  const width = 20;
  const depth = 16;
  const height = 8;

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

  group.userData.interior =
    true;

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
        color: 0x765139,
        roughness: 0.88
      })
    );

  floor.position.y =
    0.05;

  floor.receiveShadow =
    true;

  group.add(floor);

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
        color: 0x713e58,
        roughness: 0.95
      })
    );

  carpet.position.set(
    0,
    0.28,
    1
  );

  carpet.receiveShadow =
    true;

  group.add(carpet);

  /*
   * =====================================================
   * PAREDES
   *
   * Son cerradas completamente.
   * No tienen ventanas abiertas.
   * =====================================================
   */

  const wallMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x9b6848,
      roughness: 0.9
    });

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

  group.add(backWall);

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

  group.add(leftWall);

  const rightWall =
    leftWall.clone();

  rightWall.position.x =
    width / 2;

  group.add(
    rightWall
  );

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

  group.add(frontWall);

  /*
   * =====================================================
   * TECHO
   *
   * Es sólido para que la cámara
   * nunca pueda mirar al exterior.
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
        color: 0x5b4031,
        roughness: 1
      })
    );

  ceiling.position.y =
    height;

  ceiling.receiveShadow =
    true;

  group.add(ceiling);

  /*
   * =====================================================
   * PUERTA INTERIOR
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
        color: 0x38251c,
        roughness: 0.75
      })
    );

  door.position.set(
    0,
    2.6,
    depth / 2 + 0.05
  );

  group.add(door);

  /*
   * =====================================================
   * MARCO DE PUERTA
   * =====================================================
   */

  const frameMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x3e271d,
      roughness: 0.8
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
    4.2
  );

  /*
   * =====================================================
   * CAMA
   * =====================================================
   */

  createBed(
    group,
    5.8,
    -5
  );

  /*
   * =====================================================
   * MESA
   * =====================================================
   */

  createTable(
    group,
    0,
    -3.5
  );

  /*
   * =====================================================
   * SILLAS
   * =====================================================
   */

  createChair(
    group,
    -2.8,
    -3.5
  );

  createChair(
    group,
    2.8,
    -3.5
  );

  /*
   * =====================================================
   * ESTANTERÍA
   * =====================================================
   */

  createBookshelf(
    group,
    -7.5,
    -5
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
    0
  );

  createCandle(
    group,
    3,
    -3.5
  );

  /*
   * =====================================================
   * LÁMPARAS
   * =====================================================
   */

  createInteriorLight(
    group,
    0,
    4.8,
    0
  );

  createInteriorLight(
    group,
    -6,
    3.5,
    4
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
      color: 0x514b49,
      roughness: 0.95
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
      x - 1.8 +
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
        color: 0xff6b19,
        transparent: true,
        opacity: 0.82
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
      color: 0x563525,
      roughness: 0.82
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
        color: 0xd9d0c4,
        roughness: 0.9
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
        color: 0x596b86,
        roughness: 0.9
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
        color: 0xf2e9dc,
        roughness: 0.9
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

  for (
    const side of [-1, 1]
  ) {

    const post =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.16,
          0.16,
          2.5,
          10
        ),
        wood
      );

    post.position.set(
      x +
        side * 1.8,
      1.7,
      z - 2.8
    );

    group.add(
      post
    );
  }
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
      color: 0x674329,
      roughness: 0.85
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
    const dx of [-1.9, 1.9]
  ) {

    for (
      const dz of [-0.8, 0.8]
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

  /*
   * Pequeños objetos sobre la mesa.
   */

  const book =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.1,
        0.18,
        0.75
      ),

      new THREE.MeshStandardMaterial({
        color: 0x8b3042,
        roughness: 0.8
      })
    );

  book.position.set(
    x - 1,
    2.52,
    z
  );

  book.rotation.y =
    -0.18;

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
        color: 0xd8c8a8,
        roughness: 0.7
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
      color: 0x5b3925,
      roughness: 0.85
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
    const dx of [-0.55, 0.55]
  ) {

    for (
      const dz of [-0.55, 0.55]
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

function createBookshelf(group, x, z) {

  const wood =
    new THREE.MeshStandardMaterial({
      color: 0x543522,
      roughness: 0.9
    });

  const shelf =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        3.2,
        6,
        0.7
      ),
      wood
    );

  shelf.position.set(
    x,
    3.2,
    z
  );

  shelf.castShadow = true;

  group.add(shelf);

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
      1.2 + i * 1.35,
      z + 0.42
    );

    group.add(board);
  }

  const bookColors = [
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
          THREE.MathUtils.randFloat(
            0.28,
            0.55
          ),
          THREE.MathUtils.randFloat(
            0.75,
            1.15
          ),
          0.45
        ),

        new THREE.MeshStandardMaterial({
          color:
            bookColors[
              i %
              bookColors.length
            ],
          roughness: 0.85
        })
      );

    const row =
      Math.floor(i / 6);

    const column =
      i % 6;

    book.position.set(
      x - 1.15 +
        column * 0.42,

      1.45 +
        row * 1.35,

      z + 0.55
    );

    book.rotation.z =
      (Math.random() - 0.5) *
      0.12;

    group.add(book);
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
   VELA
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

  flame.scale.y =
    1.7;

  flame.position.set(
    x,
    3.32,
    z
  );

  flame.userData.flame =
    true;

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
   LUZ INTERIOR
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
   DECORACIONES INTERIORES
========================================================= */

function createInteriorDecorations(
  group
) {

  /*
   * Cuadro 1
   */

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

  /*
   * Jarrón
   */

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

  /*
   * Planta
   */

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
        Math.cos(i) *
        0.35,

      1.8 +
        i * 0.12,

      -5 +
        Math.sin(i) *
        0.35
    );

    leaf.scale.set(
      0.7,
      1.5,
      0.5
    );

    group.add(leaf);
  }

  /*
   * Barril
   */

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
   BOTÓN DE SALIDA
========================================================= */

function showExitHouseButton(
  visible
) {

  let button =
    $("exitHouse");

  /*
   * Si no existe en el HTML,
   * lo creamos automáticamente.
   */

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "exitHouse";

    button.textContent =
      "🚪 SALIR DE LA CASA";

    document.body.appendChild(
      button
    );

    button.addEventListener(
      "click",
      e => {

        e.preventDefault();
        e.stopPropagation();

        exitHouse();
      }
    );

    button.addEventListener(
      "touchend",
      e => {

        e.preventDefault();
        e.stopPropagation();

        exitHouse();
      },
      {
        passive: false
      }
    );
  }

  button.style.position =
    "fixed";

  button.style.left =
    "50%";

  button.style.bottom =
    "25px";

  button.style.transform =
    "translateX(-50%)";

  button.style.zIndex =
    "999999";

  button.style.padding =
    "14px 22px";

  button.style.borderRadius =
    "18px";

  button.style.border =
    "2px solid rgba(255,255,255,.55)";

  button.style.background =
    "rgba(40,25,20,.92)";

  button.style.color =
    "#fff";

  button.style.fontSize =
    "16px";

  button.style.fontWeight =
    "700";

  button.style.boxShadow =
    "0 5px 25px rgba(0,0,0,.45)";

  button.style.pointerEvents =
    visible
      ? "auto"
      : "none";

  button.style.display =
    visible
      ? "block"
      : "none";

  button.hidden =
    !visible;
}

/* =========================================================
   BOTÓN ENTRAR
========================================================= */

function ensureEnterHouseButton() {

  let button =
    $("enterHouse");

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "enterHouse";

    button.textContent =
      "🏠 ENTRAR";

    document.body.appendChild(
      button
    );
  }

  button.style.position =
    "fixed";

  button.style.left =
    "50%";

  button.style.bottom =
    "95px";

  button.style.transform =
    "translateX(-50%)";

  button.style.zIndex =
    "999998";

  button.style.padding =
    "13px 25px";

  button.style.borderRadius =
    "18px";

  button.style.border =
    "2px solid rgba(255,255,255,.55)";

  button.style.background =
    "rgba(57,35,24,.94)";

  button.style.color =
    "#fff";

  button.style.fontSize =
    "16px";

  button.style.fontWeight =
    "800";

  button.style.boxShadow =
    "0 5px 25px rgba(0,0,0,.4)";

  button.style.display =
    "none";

  button.style.pointerEvents =
    "none";

  /*
   * Limpiamos listeners anteriores
   * reemplazando el botón.
   */

  const fresh =
    button.cloneNode(true);

  button.replaceWith(
    fresh
  );

  button = fresh;

  const activate = e => {

    e.preventDefault();
    e.stopPropagation();

    if (
      currentHouse
    ) {

      enterHouse(
        currentHouse
      );

    } else {

      const nearest =
        findNearestHouse();

      if (nearest) {

        enterHouse(
          nearest
        );
      }
    }
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

  let distance =
    Infinity;

  houses.forEach(
    house => {

      const d =
        player.position.distanceTo(
          house.position
        );

      if (
        d < distance
      ) {

        distance =
          d;

        nearest =
          house;
      }
    }
  );

  return distance <= 18
    ? nearest
    : null;
}

/* =========================================================
   SISTEMA DE CASAS
========================================================= */

function setupHouse() {

  const enterButton =
    ensureEnterHouseButton();

  /*
   * Botón de salida.
   */

  showExitHouseButton(
    false
  );

  /*
   * Compatibilidad con HTML
   * antiguo.
   */

  const oldEnter =
    $("enterHouse");

  if (
    oldEnter &&
    oldEnter !== enterButton
  ) {

    oldEnter.addEventListener(
      "click",
      e => {

        e.preventDefault();

        const house =
          findNearestHouse();

        if (house) {
          enterHouse(
            house
          );
        }
      }
    );
  }

  /*
   * Revisamos continuamente
   * si hay una casa cerca.
   */

  setInterval(
    () => {

      if (
        !player ||
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

        currentHouse =
          nearest;

        enterButton.textContent =
          "🏠 ENTRAR A LA CASA";

        enterButton.style.display =
          "block";

        enterButton.style.pointerEvents =
          "auto";

        enterButton.hidden =
          false;

      } else {

        currentHouse =
          null;

        enterButton.style.display =
          "none";

        enterButton.style.pointerEvents =
          "none";

        enterButton.hidden =
          true;
      }

    },
    120
  );
}

/* =========================================================
   ELIMINAR INTERIOR
========================================================= */

function removeHouseInterior() {

  if (
    !interior
  ) {
    return;
  }

  if (
    interior.group &&
    scene
  ) {

    scene.remove(
      interior.group
    );

    interior.group.traverse(
      object => {

        if (
          object.geometry
        ) {

          object.geometry.dispose();
        }

        if (
          object.material
        ) {

          if (
            Array.isArray(
              object.material
            )
          ) {

            object.material.forEach(
              material =>
                material.dispose()
            );

          } else {

            object.material.dispose();
          }
        }
      }
    );
  }

  interior =
    null;
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

  let distance;
  let height;

  if (
    state.insideHouse
  ) {

    /*
     * Cámara corta dentro
     * del interior.
     */

    distance = 7;
    height = 3.6;

  } else {

    distance = 18;
    height = 8;
  }

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
    player.position
      .clone();

  target.y += 3;

  camera.position.lerp(
    target.clone().add(
      offset
    ),
    0.15
  );

  camera.lookAt(
    target
  );
}

/* =========================================================
   CÁMARA TÁCTIL
========================================================= */

function setupCameraTouch() {

  if (!renderer) return;

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

      /*
       * No mover cámara si el dedo
       * está sobre controles.
       */

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
          "#sideMap"
        ) ||
        target.closest(
          "#map"
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
        e.touches[0].clientX;

      lastTouchY =
        e.touches[0].clientY;

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

      updateCamera();

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
   JOYSTICK
========================================================= */

function setupJoystick() {

  const joystick =
    $("joystick");

  if (!joystick) return;

  const stick =
    joystick.querySelector(
      ".stick"
    );

  if (!stick) return;

  let active = false;

  function updateStick(
    clientX,
    clientY
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
      clientX - centerX;

    let dy =
      clientY - centerY;

    const max =
      rect.width * 0.32;

    const distance =
      Math.hypot(
        dx,
        dy
      );

    if (
      distance > max
    ) {

      dx =
        dx / distance * max;

      dy =
        dy / distance * max;
    }

    moveX =
      dx / max;

    moveY =
      -dy / max;

    stick.style.transform =
      `translate(${dx}px, ${dy}px)`;
  }

  function resetStick() {

    active = false;

    moveX = 0;
    moveY = 0;

    stick.style.transform =
      "translate(0px, 0px)";
  }

  joystick.addEventListener(
    "touchstart",
    e => {

      e.preventDefault();

      active = true;

      const touch =
        e.touches[0];

      updateStick(
        touch.clientX,
        touch.clientY
      );
    },
    {
      passive: false
    }
  );

  joystick.addEventListener(
    "touchmove",
    e => {

      if (!active) return;

      e.preventDefault();

      const touch =
        e.touches[0];

      updateStick(
        touch.clientX,
        touch.clientY
      );
    },
    {
      passive: false
    }
  );

  joystick.addEventListener(
    "touchend",
    e => {

      e.preventDefault();

      resetStick();
    },
    {
      passive: false
    }
  );

  joystick.addEventListener(
    "touchcancel",
    resetStick
  );
}

/* =========================================================
   COMBATE
========================================================= */

function setupCombat() {

  const abilities =
    [
      $("ability0"),
      $("ability1"),
      $("ability2")
    ];

  abilities.forEach(
    (button, index) => {

      if (!button) return;

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

function castAbility(index) {

  const costs = [
    15,
    25,
    40
  ];

  const damages = [
    15,
    28,
    50
  ];

  const cost =
    costs[index] ||
    15;

  if (
    mana < cost
  ) {

    showToast(
      "🔵 No tienes suficiente maná"
    );

    return;
  }

  mana -= cost;

  updateBars();

  createSpellEffect(
    index
  );

  showToast(
    `✨ Hechizo lanzado — ${damages[index]} daño`
  );

  if (socket) {

    socket.emit(
      "system",
      `${state.username} lanzó un hechizo.`
    );
  }
}

function createSpellEffect(
  index
) {

  if (!player) return;

  const colors = [
    0x75bfff,
    0xb777ff,
    0xff83d0
  ];

  const geometry =
    new THREE.SphereGeometry(
      0.22 +
        index * 0.12,
      16,
      16
    );

  const material =
    new THREE.MeshBasicMaterial({
      color:
        colors[index] ||
        0xffffff,
      transparent: true,
      opacity: 0.9
    });

  const effect =
    new THREE.Mesh(
      geometry,
      material
    );

  effect.position.copy(
    player.position
  );

  effect.position.y +=
    2.5;

  effect.userData.life =
    0.65;

  effect.userData.magicEffect =
    true;

  scene.add(effect);

  for (
    let i = 0;
    i < 8;
    i++
  ) {

    const spark =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          0.07,
          8,
          8
        ),

        new THREE.MeshBasicMaterial({
          color:
            colors[index] ||
            0xffffff
        })
      );

    spark.position.copy(
      effect.position
    );

    spark.userData.velocity =
      new THREE.Vector3(
        (Math.random() - 0.5) *
          5,

        Math.random() * 4,

        (Math.random() - 0.5) *
          5
      );

    spark.userData.life =
      0.8;

    spark.userData.magicEffect =
      true;

    scene.add(
      spark
    );
  }
}

/* =========================================================
   CHAT — SISTEMA ROBUSTO PARA IPHONE
========================================================= */

function setupChat() {

  const chat =
    $("chat");

  if (!chat) {
    console.warn(
      "⚠️ No existe #chat"
    );
    return;
  }

  const toggle =
    $("chatToggle");

  const form =
    $("chatForm") ||
    chat.querySelector(
      "form"
    );

  const input =
    $("chatInput") ||
    chat.querySelector(
      "input"
    );

  /*
   * Ocultamos inicialmente
   * el chat.
   */

  chat.hidden = true;

  chat.style.display =
    "none";

  chat.style.pointerEvents =
    "none";

  /*
   * Creamos una X propia.
   * No dependemos del HTML.
   */

  let closeButton =
    chat.querySelector(
      ".magic-chat-close"
    );

  if (!closeButton) {

    closeButton =
      document.createElement(
        "button"
      );

    closeButton.className =
      "magic-chat-close";

    closeButton.type =
      "button";

    closeButton.textContent =
      "×";

    chat.prepend(
      closeButton
    );
  }

  closeButton.style.position =
    "absolute";

  closeButton.style.top =
    "8px";

  closeButton.style.right =
    "8px";

  closeButton.style.width =
    "36px";

  closeButton.style.height =
    "36px";

  closeButton.style.zIndex =
    "1000000";

  closeButton.style.display =
    "flex";

  closeButton.style.alignItems =
    "center";

  closeButton.style.justifyContent =
    "center";

  closeButton.style.border =
    "0";

  closeButton.style.borderRadius =
    "50%";

  closeButton.style.background =
    "rgba(0,0,0,.65)";

  closeButton.style.color =
    "#fff";

  closeButton.style.fontSize =
    "28px";

  closeButton.style.lineHeight =
    "1";

  closeButton.style.pointerEvents =
    "auto";

  closeButton.style.touchAction =
    "manipulation";

  function openChat() {

    chat.hidden =
      false;

    chat.style.display =
      "flex";

    chat.style.visibility =
      "visible";

    chat.style.opacity =
      "1";

    chat.style.pointerEvents =
      "auto";

    chat.style.zIndex =
      "999999";

    if (input) {

      setTimeout(
        () => input.focus(),
        80
      );
    }
  }

  function closeChat() {

    chat.hidden =
      true;

    chat.style.display =
      "none";

    chat.style.visibility =
      "hidden";

    chat.style.opacity =
      "0";

    chat.style.pointerEvents =
      "none";

    if (input) {
      input.blur();
    }
  }

  function toggleChat(
    e
  ) {

    e?.preventDefault();
    e?.stopPropagation();

    const isOpen =
      !chat.hidden &&
      chat.style.display !==
        "none";

    if (isOpen) {

      closeChat();

    } else {

      openChat();
    }
  }

  if (toggle) {

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
  }

  closeButton.addEventListener(
    "click",
    e => {

      e.preventDefault();
      e.stopPropagation();

      closeChat();
    }
  );

  closeButton.addEventListener(
    "touchend",
    e => {

      e.preventDefault();
      e.stopPropagation();

      closeChat();
    },
    {
      passive: false
    }
  );

  if (form) {

    form.addEventListener(
      "submit",
      e => {

        e.preventDefault();

        const text =
          input
            ?.value
            ?.trim();

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

        input.value = "";
      }
    );
  }

  if (socket) {

    socket.on(
      "chat",
      data => {

        if (!data) return;

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
      text => {

        addChatMessage(
          "🌎 Sistema",
          text
        );
      }
    );
  }
}

function addChatMessage(
  username,
  text
) {

  const container =
    $("chatMessages");

  if (!container) return;

  const message =
    document.createElement(
      "div"
    );

  message.className =
    "chat-message";

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
   MAPA — APERTURA Y CIERRE FORZADOS
========================================================= */

function setupMap() {

  const mapButton =
    $("mapButton");

  let map =
    $("sideMap") ||
    $("map");

  if (!mapButton) {

    console.warn(
      "⚠️ No existe #mapButton"
    );

    return;
  }

  /*
   * Si no existe el mapa,
   * lo creamos automáticamente.
   */

  if (!map) {

    map =
      document.createElement(
        "div"
      );

    map.id =
      "sideMap";

    document.body.appendChild(
      map
    );

    map.innerHTML = `
      <div class="magic-map-header">
        <strong>🗺️ MAPA DEL REINO</strong>
        <button type="button"
                class="magic-map-close">
          ×
        </button>
      </div>

      <div class="magic-map-body">
        <div class="magic-map-land">
          <div class="magic-map-village">
            🏘️
          </div>

          <div class="magic-map-castle">
            🏰
          </div>

          <div class="magic-map-lake">
            💧
          </div>

          <div id="playerMarker">
            🔵
          </div>
        </div>
      </div>
    `;
  }

  /*
   * Estilos directos para evitar
   * problemas del CSS anterior.
   */

  map.style.position =
    "fixed";

  map.style.top =
    "0";

  map.style.right =
    "0";

  map.style.width =
    "min(92vw, 420px)";

  map.style.height =
    "100vh";

  map.style.background =
    "rgba(18,23,38,.97)";

  map.style.zIndex =
    "999990";

  map.style.boxSizing =
    "border-box";

  map.style.padding =
    "18px";

  map.style.overflow =
    "hidden";

  map.style.pointerEvents =
    "auto";

  map.style.touchAction =
    "manipulation";

  map.style.display =
    "none";

  map.hidden =
    true;

  /*
   * X del mapa.
   */

  let close =
    map.querySelector(
      ".magic-map-close"
    );

  if (!close) {

    close =
      document.createElement(
        "button"
      );

    close.className =
      "magic-map-close";

    close.textContent =
      "×";

    close.type =
      "button";

    map.prepend(
      close
    );
  }

  close.style.position =
    "absolute";

  close.style.top =
    "12px";

  close.style.right =
    "12px";

  close.style.zIndex =
    "1000001";

  close.style.width =
    "38px";

  close.style.height =
    "38px";

  close.style.border =
    "0";

  close.style.borderRadius =
    "50%";

  close.style.background =
    "rgba(0,0,0,.7)";

  close.style.color =
    "#fff";

  close.style.fontSize =
    "28px";

  close.style.pointerEvents =
    "auto";

  function openMap() {

    map.hidden =
      false;

    map.style.display =
      "block";

    map.style.visibility =
      "visible";

    map.style.opacity =
      "1";

    map.style.pointerEvents =
      "auto";

    updateMapMarker();
  }

  function closeMap() {

    map.hidden =
      true;

    map.style.display =
      "none";

    map.style.visibility =
      "hidden";

    map.style.opacity =
      "0";

    map.style.pointerEvents =
      "none";
  }

  function toggleMap(e) {

    e?.preventDefault();
    e?.stopPropagation();

    const opened =
      !map.hidden &&
      map.style.display !==
        "none";

    if (opened) {

      closeMap();

    } else {

      openMap();
    }
  }

  mapButton.addEventListener(
    "click",
    toggleMap
  );

  mapButton.addEventListener(
    "touchend",
    toggleMap,
    {
      passive: false
    }
  );

  close.addEventListener(
    "click",
    e => {

      e.preventDefault();
      e.stopPropagation();

      closeMap();
    }
  );

  close.addEventListener(
    "touchend",
    e => {

      e.preventDefault();
      e.stopPropagation();

      closeMap();
    },
    {
      passive: false
    }
  );
}

function updateMapMarker() {

  const marker =
    $("playerMarker");

  if (
    !marker ||
    !player
  ) {
    return;
  }

  /*
   * Convertimos la posición
   * del mundo a un pequeño mapa.
   */

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

  marker.style.position =
    "absolute";

  marker.style.left =
    `${50 + x * 43}%`;

  marker.style.top =
    `${50 + z * 43}%`;

  marker.style.fontSize =
    "24px";

  marker.style.transform =
    "translate(-50%, -50%)";
}

/* =========================================================
   CREACIÓN DE PERSONAJE
========================================================= */

function setupCharacterCreator() {

  document
    .querySelectorAll(
      ".race-button"
    )
    .forEach(
      button => {

        const selectRace =
          e => {

            e.preventDefault();

            e.stopPropagation();

            selectedRace =
              button.dataset.race ||
              "humano";

            document
              .querySelectorAll(
                ".race-button"
              )
              .forEach(
                b =>
                  b.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );

            updateRacePreview();

            showToast(
              `✨ Raza: ${selectedRace}`
            );
          };

        button.addEventListener(
          "click",
          selectRace
        );

        button.addEventListener(
          "touchend",
          selectRace,
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

    const finishCharacter =
      e => {

        e.preventDefault();
        e.stopPropagation();

        saveCharacter();
      };

    finish.addEventListener(
      "click",
      finishCharacter
    );

    finish.addEventListener(
      "touchend",
      finishCharacter,
      {
        passive: false
      }
    );
  }
}

/* =========================================================
   MENÚ DE APARIENCIA
========================================================= */

function createAppearanceMenu() {

  const creator =
    $("characterCreator");

  if (!creator) return;

  /*
   * Si ya existe un menú generado,
   * lo eliminamos para evitar
   * duplicados.
   */

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

      <h3>💇 APARIENCIA</h3>

      <div class="appearance-section">
        <strong>Cabello</strong>

        <div class="appearance-choice-grid"
             data-type="cabello">

          <button type="button"
                  class="appearance-choice"
                  data-value="Corto">
            💇 Corto
          </button>

          <button type="button"
                  class="appearance-choice"
                  data-value="Largo">
            💇 Largo
          </button>

          <button type="button"
                  class="appearance-choice"
                  data-value="Medio">
            💇 Medio
          </button>

          <button type="button"
                  class="appearance-choice"
                  data-value="Rapado">
            💇 Rapado
          </button>

        </div>
      </div>

      <div class="appearance-section">
        <strong>Ropa</strong>

        <div class="appearance-choice-grid"
             data-type="ropa">

          <button type="button"
                  class="appearance-choice"
                  data-value="Guerrero">
            ⚔️ Guerrero
          </button>

          <button type="button"
                  class="appearance-choice"
                  data-value="Mago">
            🔮 Mago
          </button>

          <button type="button"
                  class="appearance-choice"
                  data-value="Noble">
            👑 Noble
          </button>

        </div>
      </div>

      <div class="appearance-section">
        <strong>Accesorios</strong>

        <div class="appearance-choice-grid"
             data-type="accesorios">

          <button type="button"
                  class="appearance-choice"
                  data-value="Ninguno">
            ❌ Ninguno
          </button>

          <button type="button"
                  class="appearance-choice"
                  data-value="Capa">
            🧥 Capa
          </button>

          <button type="button"
                  class="appearance-choice"
                  data-value="Corona">
            👑 Corona
          </button>

        </div>
      </div>

    </div>
  `;

  creator.appendChild(
    menu
  );

  /*
   * ESTILOS DIRECTOS
   *
   * Esto es importante porque
   * el CSS anterior no tenía
   * todas estas clases.
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

    card.style.pointerEvents =
      "auto";

    card.style.touchAction =
      "manipulation";
  }

  menu
    .querySelectorAll(
      ".appearance-choice"
    )
    .forEach(
      button => {

        button.style.pointerEvents =
          "auto";

        button.style.touchAction =
          "manipulation";

        button.style.cursor =
          "pointer";

        const type =
          button
            .parentElement
            ?.dataset
            ?.type;

        const value =
          button.dataset.value;

        const select =
          e => {

            e.preventDefault();

            e.stopPropagation();

            if (
              type &&
              value
            ) {

              selectedAppearance[
                type
              ] = value;
            }

            menu
              .querySelectorAll(
                `.appearance-choice-grid[data-type="${type}"] .appearance-choice`
              )
              .forEach(
                b =>
                  b.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );

            updateAppearancePreview();

            showToast(
              `${type}: ${value}`
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

  updateAppearanceButtons();
}

function updateAppearanceButtons() {

  document
    .querySelectorAll(
      ".appearance-choice"
    )
    .forEach(
      button => {

        const type =
          button
            .parentElement
            ?.dataset
            ?.type;

        if (
          selectedAppearance[type] ===
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

/* =========================================================
   PREVISUALIZACIÓN
========================================================= */

function updateRacePreview() {

  updateRaceDetails();

  updateHUDRace();
}

function updateAppearancePreview() {

  updateAppearanceButtons();

  applyClothingVisuals();
}

function applyClothingVisuals() {

  if (!player) return;

  /*
   * No reemplazamos el modelo entero.
   * Cambiamos materiales y añadimos
   * detalles visuales.
   */

  const clothing =
    selectedAppearance.ropa;

  let clothingColor =
    0x3f5c83;

  if (
    clothing ===
    "Mago"
  ) {

    clothingColor =
      0x573f86;

  } else if (
    clothing ===
    "Noble"
  ) {

    clothingColor =
      0x9a7937;
  }

  player.traverse(
    object => {

      if (
        !object.isMesh ||
        !object.material
      ) {
        return;
      }

      const name =
        (
          object.name ||
          ""
        ).toLowerCase();

      /*
       * Solamente intentamos
       * colorear partes que parecen
       * pertenecer a la ropa.
       */

      if (
        name.includes("cloth") ||
        name.includes("shirt") ||
        name.includes("armor") ||
        name.includes("outfit") ||
        name.includes("torso") ||
        name.includes("chest") ||
        name.includes("pants") ||
        name.includes("boot")
      ) {

        object.material =
          object.material.clone();

        object.material.color.setHex(
          clothingColor
        );
      }
    }
  );

  updateAccessoryDetails();
}

function updateAccessoryDetails() {

  if (!player) return;

  let group =
    player.getObjectByName(
      "appearanceDetails"
    );

  if (!group) {

    group =
      new THREE.Group();

    group.name =
      "appearanceDetails";

    player.add(
      group
    );
  }

  while (
    group.children.length
  ) {

    group.remove(
      group.children[0]
    );
  }

  /*
   * CAPA
   */

  if (
    selectedAppearance.accesorios ===
    "Capa"
  ) {

    const cape =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          1.8,
          2.8
        ),

        new THREE.MeshStandardMaterial({
          color: 0x4c1d5c,
          side: THREE.DoubleSide,
          roughness: 0.8
        })
      );

    cape.position.set(
      0,
      1.9,
      0.45
    );

    cape.rotation.x =
      -0.05;

    group.add(
      cape
    );
  }

  /*
   * CORONA
   */

  if (
    selectedAppearance.accesorios ===
    "Corona"
  ) {

    const crown =
      new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.5,
          0.62,
          0.45,
          6
        ),

        new THREE.MeshStandardMaterial({
          color: 0xd9aa32,
          metalness: 0.7,
          roughness: 0.3
        })
      );

    crown.position.set(
      0,
      3.45,
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

      const jewel =
        new THREE.Mesh(
          new THREE.SphereGeometry(
            0.08,
            10,
            10
          ),

          new THREE.MeshBasicMaterial({
            color: 0x8ee8ff
          })
        );

      const angle =
        i /
        6 *
        Math.PI *
        2;

      jewel.position.set(
        Math.cos(angle) *
          0.42,

        3.7,

        Math.sin(angle) *
          0.42
      );

      group.add(
        jewel
      );
    }
  }
}

/* =========================================================
   CREATOR
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
      savedCharacter.race ||
      "humano";

    selectedAppearance =
      {
        ...selectedAppearance,

        ...(savedCharacter.appearance ||
          {})
      };

    creator.hidden =
      true;

    applyCharacterVisuals();
    applyClothingVisuals();

    updateHUDRace();

    return;
  }

  creator.hidden =
    false;

  creator.style.display =
    "block";

  updateRacePreview();
  updateAppearancePreview();
}

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
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        username:
          state.username,

        character
      })
    }
  )
    .catch(
      error =>
        console.warn(
          "No se pudo guardar en servidor:",
          error
        )
    );

  if (player) {

    applyCharacterVisuals();
    applyClothingVisuals();
  }

  const creator =
    $("characterCreator");

  if (creator) {

    creator.hidden =
      true;

    creator.style.display =
      "none";
  }

  updateHUDRace();

  showToast(
    "✨ Tu personaje ha sido creado"
  );
}

/* =========================================================
   HUD
========================================================= */

function updateHUDRace() {

  const race =
    $("playerRace");

  if (!race) return;

  const names = {
    humano: "Humano",
    hada: "Hada",
    elfo: "Elfo",
    demonio: "Demonio"
  };

  race.textContent =
    names[selectedRace] ||
    selectedRace;
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
   FÍSICA Y EFECTOS
========================================================= */

function updateEffects(
  delta
) {

  if (!scene) return;

  const remove = [];

  scene.traverse(
    object => {

      if (
        object.userData
          ?.magicEffect
      ) {

        object.userData.life -=
          delta;

        if (
          object.userData
            .velocity
        ) {

          object.position.addScaledVector(
            object.userData
              .velocity,

            delta
          );

          object.userData
            .velocity.y -=
            5 * delta;
        }

        object.scale.multiplyScalar(
          1 + delta * 1.8
        );

        object.material.opacity =
          Math.max(
            0,
            object.userData.life
          );

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
          ?.fire
      ) {

        const pulse =
          1 +
          Math.sin(
            performance.now() *
              0.012
          ) *
          0.12;

        object.scale.set(
          pulse,
          pulse *
            (0.9 +
              Math.random() *
              0.12),
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
              0.018
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
              0.014
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
              0.02
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

      object.geometry
        ?.dispose();

      object.material
        ?.dispose();
    }
  );
}

/* =========================================================
   ALAS DE HADA — ANIMACIÓN
========================================================= */

function animateFairyWings() {

  if (
    !player ||
    selectedRace !==
      "hada"
  ) {
    return;
  }

  const details =
    player.getObjectByName(
      "raceDetails"
    );

  if (!details) return;

  const time =
    performance.now() *
    0.004;

  details.children
    .forEach(
      (wing, index) => {

        if (
          wing.isMesh
        ) {

          const direction =
            wing.position.x <
            0
              ? -1
              : 1;

          wing.rotation.z =
            direction *
            (
              0.28 +
              Math.sin(
                time +
                  index
              ) *
              0.08
            );

          wing.rotation.y =
            Math.sin(
              time * 0.7 +
                index
            ) *
            0.12;
        }
      }
    );
}

/* =========================================================
   MOVIMIENTO DE ÁRBOLES
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
          time * 0.7 +
            phase
        ) *
        0.018;

      tree.rotation.x =
        Math.cos(
          time * 0.55 +
            phase
        ) *
        0.012;
    }
  );
}

/* =========================================================
   ACTUALIZAR CÁMARA DENTRO DE CASA
========================================================= */

function updateInteriorCamera() {

  if (
    !state.insideHouse ||
    !interior ||
    !player
  ) {
    return;
  }

  /*
   * Limitar la posición del jugador.
   */

  const minX =
    interior.worldX -
    interior.width / 2 +
    1.4;

  const maxX =
    interior.worldX +
    interior.width / 2 -
    1.4;

  const minZ =
    interior.worldZ -
    interior.depth / 2 +
    1.4;

  const maxZ =
    interior.worldZ +
    interior.depth / 2 -
    1.4;

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

  /*
   * Cámara todavía más controlada
   * para que el exterior nunca
   * aparezca.
   */

  const distance =
    6.5;

  const cameraHeight =
    3.4;

  const offset =
    new THREE.Vector3(
      Math.sin(yaw) *
        distance,

      cameraHeight,

      Math.cos(yaw) *
        distance
    );

  const target =
    player.position.clone();

  target.y += 2.3;

  const desired =
    target.clone()
      .add(offset);

  /*
   * Limitamos la cámara a las
   * dimensiones del interior.
   */

  desired.x =
    THREE.MathUtils.clamp(
      desired.x,
      minX + 0.5,
      maxX - 0.5
    );

  desired.z =
    THREE.MathUtils.clamp(
      desired.z,
      minZ + 0.5,
      maxZ - 0.5
    );

  desired.y =
    THREE.MathUtils.clamp(
      desired.y,
      1.5,
      interior.height - 0.8
    );

  camera.position.lerp(
    desired,
    0.22
  );

  camera.lookAt(
    target
  );
}

/* =========================================================
   LOOP PRINCIPAL
========================================================= */

function animate() {

  requestAnimationFrame(
    animate
  );

  if (!renderer || !scene) {
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

  animateFairyWings();

  animateTrees();

  updateMapMarker();

  /*
   * Regeneración suave de maná.
   */

  if (
    mana < 100
  ) {

    mana =
      Math.min(
        100,
        mana +
          delta * 3
      );

    updateBars();
  }

  /*
   * Agua animada.
   */

  if (scene) {

    scene.traverse(
      object => {

        if (
          object.isMesh &&
          object.material &&
          object.material
            .isMeshPhysicalMaterial &&
          object.geometry &&
          object.geometry
            .type ===
            "CircleGeometry"
        ) {

          object.rotation.z +=
            delta * 0.015;
        }
      }
    );
  }

  renderer.render(
    scene,
    camera
  );
}

/* =========================================================
   INICIALIZACIÓN EXTRA
========================================================= */

updateBars();

console.log(
  "🌎 UNIVERSO MÁGICO — SISTEMA COMPLETO CARGADO"
);
