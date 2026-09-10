import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const $ = (id) => document.getElementById(id);
const socket = typeof io === "function" ? io() : null;

console.log("✨ UNIVERSO MÁGICO: game.js cargado");

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
let toastTimer = null;

const keys = {};

const houses = [];
const trees = [];
const mountains = [];
const solidObjects = [];

const WORLD_SIZE = 700;
const WORLD_LIMIT = WORLD_SIZE / 2 - 12;
const MOVE_SPEED = 13;

const state = {
  username: "Aventurero",
  character: null,
  insideHouse: false
};

const assets = {
  character:
    "/assets/characters/Superhero_Male_FullBody.gltf",

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
  async (event) => {

    event.preventDefault();

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

    const button = $("authSubmit");

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

            body:
              JSON.stringify({
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

    } catch (error) {

      console.error(
        "Error de autenticación:",
        error
      );

      authMessage(
        error.message ||
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


function authMessage(message) {

  const element = $("authMsg");

  if (!element) return;

  element.textContent = message;

  element.hidden = false;

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
      state.username
        .charAt(0)
        .toUpperCase();

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
    () => openCharacterCreator(savedCharacter),
    600
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
    new THREE.Color(0x79a9c5);

  scene.fog =
    new THREE.FogExp2(
      0x79a9c5,
      0.0017
    );


  camera =
    new THREE.PerspectiveCamera(
      60,
      window.innerWidth /
        window.innerHeight,
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
      window.devicePixelRatio,
      1.7
    )
  );


  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );


  renderer.shadowMap.enabled =
    true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure =
    1.1;


  if (sceneEl) {

    sceneEl.appendChild(
      renderer.domElement
    );

  }


  const hemisphere =
    new THREE.HemisphereLight(
      0xd8f0ff,
      0x30452f,
      1.8
    );

  scene.add(
    hemisphere
  );


  const sun =
    new THREE.DirectionalLight(
      0xfff0cf,
      3.2
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

  sun.shadow.camera.left =
    -300;

  sun.shadow.camera.right =
    300;

  sun.shadow.camera.top =
    300;

  sun.shadow.camera.bottom =
    -300;

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


  window.addEventListener(
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
        WORLD_SIZE,
        WORLD_SIZE,
        100,
        100
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


  /*
     CÉSPED
  */

  const grassMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x6da357,

      roughness: 1,

      side:
        THREE.DoubleSide

    });


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
            1.6
          )
        ),

        grassMaterial

      );


    grass.position.set(

      THREE.MathUtils.randFloat(
        -340,
        340
      ),

      0.2,

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


  /*
     PEQUEÑAS PIEDRAS
  */

  const rockMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x77756d,

      roughness: 1

    });


  for (
    let i = 0;
    i < 350;
    i++
  ) {

    const rock =
      new THREE.Mesh(

        new THREE.DodecahedronGeometry(
          THREE.MathUtils.randFloat(
            0.25,
            1
          ),
          0
        ),

        rockMaterial

      );


    rock.position.set(

      THREE.MathUtils.randFloat(
        -330,
        330
      ),

      0.25,

      THREE.MathUtils.randFloat(
        -330,
        330
      )

    );


    rock.scale.y =
      THREE.MathUtils.randFloat(
        0.4,
        0.8
      );


    rock.castShadow =
      true;


    scene.add(
      rock
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
        58,
        80
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


  water.userData.isWater =
    true;


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
    ([x, z], index) => {

      const house =
        createHouse(
          x,
          z,
          index
        );

      houses.push(
        house
      );

      solidObjects.push(
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


  createFountain();

}


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


  const wallMaterial =
    new THREE.MeshStandardMaterial({

      color:
        index % 2
          ? 0x956547
          : 0xa9714d,

      roughness: 0.85

    });


  const roofMaterial =
    new THREE.MeshStandardMaterial({

      color:
        index % 3 === 0
          ? 0x49302b
          : 0x63372d,

      roughness: 0.9

    });


  const body =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        22,
        10,
        18
      ),

      wallMaterial

    );


  body.position.y =
    5;


  body.castShadow =
    true;

  body.receiveShadow =
    true;


  group.add(
    body
  );


  const roof =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        15,
        9,
        4
      ),

      roofMaterial

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

        color: 0x35231c

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


  for (
    const side of [-1, 1]
  ) {

    const windowMesh =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          4,
          3,
          0.3
        ),

        new THREE.MeshStandardMaterial({

          color: 0x79c8e2,

          emissive: 0x194b60,

          emissiveIntensity:
            0.6

        })

      );


    windowMesh.position.set(
      side * 7,
      5.2,
      9.15
    );


    group.add(
      windowMesh
    );

  }


  const chimney =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        3,
        7,
        3
      ),

      new THREE.MeshStandardMaterial({

        color: 0x5c514a

      })

    );


  chimney.position.set(
    6,
    16,
    -3
  );


  chimney.castShadow =
    true;


  group.add(
    chimney
  );


  group.userData.isHouse =
    true;


  return group;

}


function createFountain() {

  const stone =
    new THREE.MeshStandardMaterial({

      color: 0x858d93,

      roughness: 0.9

    });


  const base =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        9,
        10,
        1.5,
        40
      ),

      stone

    );


  base.position.y =
    0.75;


  base.castShadow =
    true;


  scene.add(
    base
  );


  const water =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        7.8,
        7.8,
        0.3,
        40
      ),

      new THREE.MeshPhysicalMaterial({

        color: 0x4bb8d9,

        transparent: true,

        opacity: 0.75

      })

    );


  water.position.y =
    1.5;


  scene.add(
    water
  );

}
/* =========================================================
   ÁRBOLES
========================================================= */

function createForest() {

  for (let i = 0; i < 320; i++) {

    let x;
    let z;

    do {

      x = THREE.MathUtils.randFloat(
        -320,
        320
      );

      z = THREE.MathUtils.randFloat(
        -320,
        320
      );

    } while (
      Math.abs(x) < 100 &&
      Math.abs(z) < 100
    );


    const tree =
      createTree();

    tree.position.set(
      x,
      0,
      z
    );


    const scale =
      THREE.MathUtils.randFloat(
        0.75,
        1.45
      );

    tree.scale.setScalar(
      scale
    );


    tree.rotation.y =
      Math.random() *
      Math.PI;


    trees.push(tree);

    scene.add(tree);

  }

}


function createTree() {

  const group =
    new THREE.Group();


  /*
     TRONCO
  */

  const trunkMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x60412d,

      roughness: 1

    });


  const trunk =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        0.9,
        1.25,
        9,
        8
      ),

      trunkMaterial

    );


  trunk.position.y =
    4.5;


  trunk.castShadow =
    true;


  group.add(
    trunk
  );


  /*
     RAMAS
  */

  const branchMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x553923,

      roughness: 1

    });


  for (
    let i = 0;
    i < 4;
    i++
  ) {

    const branch =
      new THREE.Mesh(

        new THREE.CylinderGeometry(
          0.22,
          0.45,
          5,
          7
        ),

        branchMaterial

      );


    branch.position.y =
      7 + i * 1.2;


    branch.rotation.z =
      THREE.MathUtils.randFloat(
        -0.7,
        0.7
      );


    branch.rotation.x =
      THREE.MathUtils.randFloat(
        -0.35,
        0.35
      );


    branch.castShadow =
      true;


    group.add(
      branch
    );

  }


  /*
     COPA
  */

  const leafMaterial =
    new THREE.MeshStandardMaterial({

      color:
        Math.random() > 0.5
          ? 0x356b38
          : 0x467e3d,

      roughness: 0.95

    });


  const crown1 =
    new THREE.Mesh(

      new THREE.IcosahedronGeometry(
        5.2,
        1
      ),

      leafMaterial

    );


  crown1.position.set(
    0,
    10.5,
    0
  );


  crown1.scale.set(
    1.15,
    1.1,
    1.05
  );


  crown1.castShadow =
    true;


  group.add(
    crown1
  );


  const crown2 =
    new THREE.Mesh(

      new THREE.IcosahedronGeometry(
        4,
        1
      ),

      leafMaterial

    );


  crown2.position.set(
    -2.8,
    13,
    0.5
  );


  crown2.castShadow =
    true;


  group.add(
    crown2
  );


  const crown3 =
    new THREE.Mesh(

      new THREE.IcosahedronGeometry(
        3.7,
        1
      ),

      leafMaterial

    );


  crown3.position.set(
    2.7,
    13.2,
    -0.5
  );


  crown3.castShadow =
    true;


  group.add(
    crown3
  );


  group.userData.isTree =
    true;


  return group;

}


/* =========================================================
   MONTAÑAS — LÍMITE DEL MAPA
========================================================= */

function createMountains() {

  for (let i = 0; i < 36; i++) {

    const angle =
      (i / 36) *
      Math.PI * 2;


    const radius =
      THREE.MathUtils.randFloat(
        300,
        325
      );


    const height =
      THREE.MathUtils.randFloat(
        35,
        75
      );


    const mountain =
      createMountain(
        height
      );


    mountain.position.set(

      Math.cos(angle) *
        radius,

      0,

      Math.sin(angle) *
        radius

    );


    mountain.rotation.y =
      Math.random() *
      Math.PI;


    mountains.push(
      mountain
    );


    scene.add(
      mountain
    );

  }

}


function createMountain(
  height
) {

  const group =
    new THREE.Group();


  const rockMaterial =
    new THREE.MeshStandardMaterial({

      color:
        0x59645e,

      roughness: 1

    });


  const mountain =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        THREE.MathUtils.randFloat(
          18,
          30
        ),
        height,
        7,
        2
      ),

      rockMaterial

    );


  mountain.position.y =
    height / 2;


  mountain.castShadow =
    true;


  mountain.receiveShadow =
    true;


  group.add(
    mountain
  );


  /*
     NIEVE EN LA CIMA
  */

  if (height > 52) {

    const snow =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          8,
          height * 0.22,
          7
        ),

        new THREE.MeshStandardMaterial({

          color: 0xe8ece8,

          roughness: 1

        })

      );


    snow.position.y =
      height * 0.84;


    snow.castShadow =
      true;


    group.add(
      snow
    );

  }


  return group;

}


/* =========================================================
   CASTILLO
========================================================= */

function createCastle() {

  const castle =
    new THREE.Group();


  castle.position.set(
    0,
    0,
    190
  );


  /*
     BASE
  */

  const stoneMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x74767a,

      roughness: 0.95

    });


  const darkStone =
    new THREE.MeshStandardMaterial({

      color: 0x4d5156,

      roughness: 1

    });


  const keep =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        55,
        45,
        45
      ),

      stoneMaterial

    );


  keep.position.y =
    22.5;


  keep.castShadow =
    true;


  keep.receiveShadow =
    true;


  castle.add(
    keep
  );


  /*
     TORRES
  */

  const towerPositions = [

    [-32, -25],

    [32, -25],

    [-32, 25],

    [32, 25]

  ];


  towerPositions.forEach(
    ([x, z]) => {

      const tower =
        new THREE.Mesh(

          new THREE.CylinderGeometry(
            8,
            9,
            55,
            12
          ),

          darkStone

        );


      tower.position.set(
        x,
        27.5,
        z
      );


      tower.castShadow =
        true;


      castle.add(
        tower
      );


      /*
         TECHO DE TORRE
      */

      const roof =
        new THREE.Mesh(

          new THREE.ConeGeometry(
            10,
            12,
            12
          ),

          new THREE.MeshStandardMaterial({

            color: 0x302b3c,

            roughness: 0.9

          })

        );


      roof.position.set(
        x,
        61,
        z
      );


      roof.castShadow =
        true;


      castle.add(
        roof
      );


      /*
         BANDERA
      */

      const pole =
        new THREE.Mesh(

          new THREE.CylinderGeometry(
            0.18,
            0.18,
            8,
            6
          ),

          new THREE.MeshStandardMaterial({

            color: 0xc0a75b,

            metalness: 0.5,

            roughness: 0.4

          })

        );


      pole.position.set(
        x,
        69,
        z
      );


      castle.add(
        pole
      );


      const flag =
        new THREE.Mesh(

          new THREE.PlaneGeometry(
            5,
            3
          ),

          new THREE.MeshStandardMaterial({

            color: 0x713c63,

            side:
              THREE.DoubleSide,

            roughness: 0.8

          })

        );


      flag.position.set(
        x + 2.3,
        70,
        z
      );


      flag.rotation.y =
        Math.PI / 2;


      castle.add(
        flag
      );

    }
  );


  /*
     PUERTA PRINCIPAL
  */

  const gate =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        14,
        20,
        3
      ),

      new THREE.MeshStandardMaterial({

        color: 0x30231d,

        roughness: 0.9

      })

    );


  gate.position.set(
    0,
    10,
    -24
  );


  castle.add(
    gate
  );


  /*
     ARCO DE ENTRADA
  */

  const arch =
    new THREE.Mesh(

      new THREE.TorusGeometry(
        8,
        2,
        8,
        32,
        Math.PI
      ),

      stoneMaterial

    );


  arch.position.set(
    0,
    20,
    -25
  );


  arch.rotation.x =
    Math.PI / 2;


  castle.add(
    arch
  );


  /*
     VENTANAS
  */

  for (
    let row = 0;
    row < 3;
    row++
  ) {

    for (
      let col = -1;
      col <= 1;
      col++
    ) {

      const windowMesh =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            4,
            6,
            0.4
          ),

          new THREE.MeshStandardMaterial({

            color: 0x83c8dc,

            emissive: 0x164c5d,

            emissiveIntensity:
              0.75

          })

        );


      windowMesh.position.set(

        col * 13,

        10 + row * 12,

        -23

      );


      castle.add(
        windowMesh
      );

    }

  }


  /*
     MURALLAS
  */

  const wall1 =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        95,
        16,
        5
      ),

      stoneMaterial

    );


  wall1.position.set(
    0,
    8,
    -43
  );


  wall1.castShadow =
    true;


  castle.add(
    wall1
  );


  const wall2 =
    wall1.clone();


  wall2.position.z =
    43;


  castle.add(
    wall2
  );


  const wall3 =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        5,
        16,
        85
      ),

      stoneMaterial

    );


  wall3.position.set(
    -45,
    8,
    0
  );


  castle.add(
    wall3
  );


  const wall4 =
    wall3.clone();


  wall4.position.x =
    45;


  castle.add(
    wall4
  );


  /*
     CASTILLO ELEVADO
  */

  castle.userData.isCastle =
    true;


  solidObjects.push(
    castle
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


  const count = 280;

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
        35
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

      color: 0xd7c4ff,

      size: 0.8,

      transparent: true,

      opacity: 0.65,

      depthWrite: false

    });


  const particles =
    new THREE.Points(
      geometry,
      material
    );


  scene.add(
    particles
  );


  particles.userData.magic =
    true;

}
/* =========================================================
   PERSONAJE 3D
========================================================= */

function loadPlayer() {

  loader.load(

    assets.character,

    (gltf) => {

      player = gltf.scene;

      player.position.set(
        0,
        0,
        15
      );

      player.scale.setScalar(
        1.25
      );

      player.traverse(
        (object) => {

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


      scene.add(
        player
      );


      /*
         ANIMACIONES DEL PERSONAJE
      */

      if (
        gltf.animations &&
        gltf.animations.length
      ) {

        mixer =
          new THREE.AnimationMixer(
            player
          );


        gltf.animations.forEach(
          (clip) => {

            actions[
              clip.name
            ] =
              mixer.clipAction(
                clip
              );

          }
        );


        const first =
          gltf.animations[0];

        if (first) {

          playAnimation(
            first.name
          );

        }

      }


      /*
         CARGAR ANIMACIONES UNIVERSALES
      */

      loader.load(

        assets.animations,

        (animationGLTF) => {

          if (
            !mixer ||
            !animationGLTF.animations
          ) {

            return;

          }


          animationGLTF.animations
            .forEach(
              (clip) => {

                const action =
                  mixer.clipAction(
                    clip
                  );

                actions[
                  clip.name
                ] =
                  action;

              }
            );


          const idle =
            findAnimation(
              [
                "Idle",
                "idle",
                "Standing"
              ]
            );


          if (idle) {

            playAnimation(
              idle
            );

          }

        },

        undefined,

        (error) => {

          console.warn(
            "No se pudieron cargar las animaciones UAL1:",
            error
          );

        }

      );

    },

    undefined,

    (error) => {

      console.error(
        "Error cargando personaje:",
        error
      );

      createFallbackPlayer();

    }

  );

}


/* =========================================================
   PERSONAJE DE RESPALDO
========================================================= */

function createFallbackPlayer() {

  const group =
    new THREE.Group();


  const bodyMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x6b4a8e,

      roughness: 0.75

    });


  const skinMaterial =
    new THREE.MeshStandardMaterial({

      color: 0xd4a078,

      roughness: 0.85

    });


  /*
     CUERPO
  */

  const body =
    new THREE.Mesh(

      new THREE.CapsuleGeometry(
        1.2,
        3.2,
        8,
        12
      ),

      bodyMaterial

    );


  body.position.y =
    3;


  body.castShadow =
    true;


  group.add(
    body
  );


  /*
     CABEZA
  */

  const head =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        1.15,
        20,
        20
      ),

      skinMaterial

    );


  head.position.y =
    5.5;


  head.castShadow =
    true;


  group.add(
    head
  );


  /*
     BRAZOS
  */

  for (
    const side of [-1, 1]
  ) {

    const arm =
      new THREE.Mesh(

        new THREE.CapsuleGeometry(
          0.35,
          2,
          6,
          8
        ),

        bodyMaterial

      );


    arm.position.set(
      side * 1.5,
      3.4,
      0
    );


    arm.rotation.z =
      side * 0.15;


    arm.castShadow =
      true;


    group.add(
      arm
    );

  }


  /*
     PIERNAS
  */

  for (
    const side of [-1, 1]
  ) {

    const leg =
      new THREE.Mesh(

        new THREE.CapsuleGeometry(
          0.42,
          2.3,
          6,
          8
        ),

        new THREE.MeshStandardMaterial({

          color: 0x292c38,

          roughness: 0.9

        })

      );


    leg.position.set(
      side * 0.55,
      0.9,
      0
    );


    leg.castShadow =
      true;


    group.add(
      leg
    );

  }


  group.position.set(
    0,
    0,
    15
  );


  player =
    group;


  scene.add(
    player
  );

}


/* =========================================================
   ANIMACIONES
========================================================= */

function findAnimation(
  possibleNames
) {

  for (
    const name of possibleNames
  ) {

    if (
      actions[name]
    ) {

      return name;

    }

  }


  const names =
    Object.keys(
      actions
    );


  for (
    const name of names
  ) {

    const lower =
      name.toLowerCase();


    for (
      const wanted
      of possibleNames
    ) {

      if (
        lower.includes(
          wanted.toLowerCase()
        )
      ) {

        return name;

      }

    }

  }


  return null;

}


function playAnimation(
  name
) {

  if (
    !mixer ||
    !actions[name]
  ) {

    return;

  }


  const next =
    actions[name];


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


  next
    .reset()
    .fadeIn(0.18)
    .play();


  currentAction =
    next;

}


/* =========================================================
   MOVIMIENTO
========================================================= */

function setupKeyboard() {

  window.addEventListener(
    "keydown",
    (event) => {

      keys[
        event.key.toLowerCase()
      ] = true;

    }
  );


  window.addEventListener(
    "keyup",
    (event) => {

      keys[
        event.key.toLowerCase()
      ] = false;

    }
  );

}


function updateMovement(
  delta
) {

  if (
    !player
  ) {

    return;

  }


  let x = moveX;

  let z = moveY;


  /*
     TECLADO
  */

  if (
    keys["w"] ||
    keys["arrowup"]
  ) {

    z -= 1;

  }


  if (
    keys["s"] ||
    keys["arrowdown"]
  ) {

    z += 1;

  }


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


  const length =
    Math.sqrt(
      x * x +
      z * z
    );


  if (
    length < 0.05
  ) {

    const idle =
      findAnimation([
        "Idle",
        "idle",
        "Standing"
      ]);


    if (idle) {

      playAnimation(
        idle
      );

    }

    return;

  }


  x /= length;
  z /= length;


  /*
     MOVIMIENTO RELATIVO
     A LA CÁMARA
  */

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
    right,
    x
  );


  direction.addScaledVector(
    forward,
    -z
  );


  direction.normalize();


  const distance =
    MOVE_SPEED *
    delta;


  tryMovePlayer(
    direction,
    distance
  );


  /*
     GIRAR PERSONAJE
  */

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


  /*
     ANIMACIÓN CAMINANDO
  */

  const walk =
    findAnimation([
      "Walk",
      "Walking",
      "Run"
    ]);


  if (walk) {

    playAnimation(
      walk
    );

  }

}


/* =========================================================
   COLISIONES
========================================================= */

function tryMovePlayer(
  direction,
  distance
) {

  if (
    !player
  ) {

    return;

  }


  const current =
    player.position.clone();


  const nextX =
    current.x +
    direction.x *
    distance;


  const nextZ =
    current.z +
    direction.z *
    distance;


  /*
     LÍMITE GENERAL
  */

  if (
    Math.abs(nextX) >
      WORLD_LIMIT ||
    Math.abs(nextZ) >
      WORLD_LIMIT
  ) {

    return;

  }


  /*
     MONTAÑAS
  */

  if (
    collidesWithMountains(
      nextX,
      nextZ
    )
  ) {

    return;

  }


  /*
     CASAS
  */

  if (
    collidesWithHouse(
      nextX,
      nextZ
    )
  ) {

    return;

  }


  /*
     CASTILLO
  */

  if (
    collidesWithCastle(
      nextX,
      nextZ
    )
  ) {

    return;

  }


  /*
     ÁRBOLES
  */

  if (
    collidesWithTrees(
      nextX,
      nextZ
    )
  ) {

    return;

  }


  player.position.x =
    nextX;

  player.position.z =
    nextZ;


  resolvePlayerHeight();

}


function collidesWithMountains(
  x,
  z
) {

  const distance =
    Math.sqrt(
      x * x +
      z * z
    );


  return distance >
    292;

}


function collidesWithHouse(
  x,
  z
) {

  for (
    const house of houses
  ) {

    const hx =
      house.position.x;

    const hz =
      house.position.z;


    const halfX =
      13;

    const halfZ =
      12;


    if (

      x >
        hx - halfX &&
      x <
        hx + halfX &&
      z >
        hz - halfZ &&
      z <
        hz + halfZ

    ) {

      return true;

    }

  }


  return false;

}


function collidesWithCastle(
  x,
  z
) {

  /*
     Castillo situado
     aproximadamente en Z=190
  */

  const cx = 0;
  const cz = 190;


  if (

    x >
      cx - 52 &&
    x <
      cx + 52 &&
    z >
      cz - 50 &&
    z <
      cz + 50

  ) {

    /*
       Permitimos el acceso
       por el frente central
    */

    if (
      Math.abs(x) < 9 &&
      z < 166
    ) {

      return false;

    }


    return true;

  }


  return false;

}


function collidesWithTrees(
  x,
  z
) {

  for (
    const tree of trees
  ) {

    const dx =
      x -
      tree.position.x;


    const dz =
      z -
      tree.position.z;


    const distance =
      Math.sqrt(
        dx * dx +
        dz * dz
      );


    if (
      distance < 3.2
    ) {

      return true;

    }

  }


  return false;

}


/* =========================================================
   AGUA Y PROFUNDIDAD
========================================================= */

function isInWater(
  x,
  z
) {

  const waterX =
    115;

  const waterZ =
    80;

  const dx =
    x - waterX;

  const dz =
    z - waterZ;


  const distance =
    Math.sqrt(
      dx * dx +
      dz * dz
    );


  return distance <
    54;

}


function resolvePlayerHeight() {

  if (
    !player
  ) {

    return;

  }


  if (
    isInWater(
      player.position.x,
      player.position.z
    )
  ) {

    /*
       El personaje se hunde
       parcialmente en el agua.
    */

    player.position.y =
      -0.8;

  } else {

    player.position.y =
      0;

  }

}


/* =========================================================
   JOYSTICK TÁCTIL
========================================================= */

function setupJoystick() {

  const joystick =
    $("joystick");

  const stick =
    joystick?.querySelector(
      ".stick"
    );


  if (
    !joystick ||
    !stick
  ) {

    return;

  }


  let active = false;


  const updateStick =
    (clientX, clientY) => {

      const rect =
        joystick.getBoundingClientRect();


      const centerX =
        rect.left +
        rect.width / 2;


      const centerY =
        rect.top +
        rect.height / 2;


      let dx =
        clientX -
        centerX;


      let dy =
        clientY -
        centerY;


      const max =
        rect.width *
        0.32;


      const length =
        Math.sqrt(
          dx * dx +
          dy * dy
        );


      if (
        length > max
      ) {

        dx =
          dx / length *
          max;

        dy =
          dy / length *
          max;

      }


      moveX =
        dx / max;

      moveY =
        dy / max;


      stick.style.transform =
        `translate(${dx}px, ${dy}px)`;

    };


  const resetStick =
    () => {

      active =
        false;

      moveX =
        0;

      moveY =
        0;

      stick.style.transform =
        "translate(0,0)";

    };


  joystick.addEventListener(
    "pointerdown",
    (event) => {

      active =
        true;

      joystick.setPointerCapture(
        event.pointerId
      );

      updateStick(
        event.clientX,
        event.clientY
      );

    }
  );


  joystick.addEventListener(
    "pointermove",
    (event) => {

      if (
        !active
      ) {

        return;

      }


      updateStick(
        event.clientX,
        event.clientY
      );

    }
  );


  joystick.addEventListener(
    "pointerup",
    resetStick
  );


  joystick.addEventListener(
    "pointercancel",
    resetStick
  );

}


/* =========================================================
   CÁMARA EN TERCERA PERSONA
========================================================= */

function setupCameraTouch() {

  if (
    !sceneEl
  ) {

    return;

  }


  sceneEl.addEventListener(
    "pointerdown",
    (event) => {

      /*
         Si toca el joystick,
         no mover cámara.
      */

      if (
        event.target.closest(
          "#joystick"
        )
      ) {

        return;

      }


      draggingCamera =
        true;


      lastTouchX =
        event.clientX;

      lastTouchY =
        event.clientY;


      sceneEl.setPointerCapture?.(
        event.pointerId
      );

    }
  );


  sceneEl.addEventListener(
    "pointermove",
    (event) => {

      if (
        !draggingCamera
      ) {

        return;

      }


      const dx =
        event.clientX -
        lastTouchX;


      const dy =
        event.clientY -
        lastTouchY;


      lastTouchX =
        event.clientX;


      lastTouchY =
        event.clientY;


      yaw -=
        dx * 0.008;


      pitch -=
        dy * 0.005;


      pitch =
        THREE.MathUtils.clamp(
          pitch,
          0.15,
          1.15
        );

    }
  );


  sceneEl.addEventListener(
    "pointerup",
    () => {

      draggingCamera =
        false;

    }
  );


  sceneEl.addEventListener(
    "pointercancel",
    () => {

      draggingCamera =
        false;

    }
  );

}


function updateCamera() {

  if (
    !player ||
    !camera
  ) {

    return;

  }


  const distance =
    18;


  const horizontal =
    Math.cos(
      pitch
    ) *
    distance;


  const vertical =
    Math.sin(
      pitch
    ) *
    distance;


  const targetX =
    player.position.x -
    Math.sin(yaw) *
    horizontal;


  const targetZ =
    player.position.z -
    Math.cos(yaw) *
    horizontal;


  const targetY =
    player.position.y +
    5 +
    vertical;


  const desired =
    new THREE.Vector3(
      targetX,
      targetY,
      targetZ
    );


  camera.position.lerp(
    desired,
    0.12
  );


  const lookAt =
    new THREE.Vector3(

      player.position.x,

      player.position.y +
        4.5,

      player.position.z

    );


  camera.lookAt(
    lookAt
  );

}


/* =========================================================
   COMBATE
========================================================= */

function setupCombat() {

  document
    .querySelectorAll(
      "[data-spell]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            castSpell(
              button.dataset.spell
            );

          }
        );

      }
    );


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    $(`ability${i}`)
      ?.addEventListener(
        "click",
        () => {

          castSpell(
            String(i)
          );

        }
      );

  }

}


function castSpell(
  spell
) {

  const costs = {
    "0": 12,
    "1": 20,
    "2": 30,
    fire: 12,
    water: 18,
    nature: 15,
    shadow: 25
  };


  const cost =
    costs[spell] || 10;


  if (
    mana < cost
  ) {

    showToast(
      "No tienes suficiente maná."
    );

    return;

  }


  mana -=
    cost;


  updateBars();


  createSpellEffect(
    spell
  );


  if (socket) {

    socket.emit(
      "system",
      `${state.username} lanzó un hechizo ${spell}.`
    );

  }

}


function createSpellEffect(
  spell
) {

  if (
    !player
  ) {

    return;

  }


  const colors = {

    "0": 0x8c7cff,

    "1": 0x43d9ff,

    "2": 0xffb84d,

    fire: 0xff5b3d,

    water: 0x3db9ff,

    nature: 0x72dc6b,

    shadow: 0x9b5cff

  };


  const color =
    colors[spell] ||
    0xc084ff;


  const geometry =
    new THREE.SphereGeometry(
      0.55,
      16,
      16
    );


  const material =
    new THREE.MeshBasicMaterial({

      color,

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
    3.5;


  scene.add(
    effect
  );


  const start =
    performance.now();


  const animateEffect =
    (now) => {

      const elapsed =
        now - start;


      effect.position.y +=
        0.025;


      effect.scale.setScalar(

        1 +
        Math.sin(
          elapsed * 0.012
        ) *
        0.35

      );


      effect.material.opacity =
        Math.max(
          0,
          1 -
            elapsed / 1000
        );


      if (
        elapsed < 1000
      ) {

        requestAnimationFrame(
          animateEffect
        );

      } else {

        scene.remove(
          effect
        );

        effect.geometry.dispose();

        effect.material.dispose();

      }

    };


  requestAnimationFrame(
    animateEffect
  );

}


/* =========================================================
   HUD
========================================================= */

function updateBars() {

  if ($("hpBar")) {

    $("hpBar").style.width =
      `${hp}%`;

  }


  if ($("manaBar")) {

    $("manaBar").style.width =
      `${mana}%`;

  }

}


function showToast(
  message
) {

  const toast =
    $("gameToast") ||
    $("toast");


  if (
    !toast
  ) {

    return;

  }


  toast.textContent =
    message;


  toast.hidden =
    false;


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.hidden =
          true;

      },
      2600
    );

}


/* =========================================================
   LOOP PRINCIPAL
========================================================= */

function animate() {

  requestAnimationFrame(
    animate
  );


  if (
    !renderer ||
    !scene ||
    !camera
  ) {

    return;

  }


  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );


  if (mixer) {

    mixer.update(
      delta
    );

  }


  updateMovement(
    delta
  );


  updateCamera();


  /*
     Partículas mágicas
  */

  scene.traverse(
    (object) => {

      if (
        object.userData?.magic
      ) {

        object.rotation.y +=
          delta * 0.08;

      }

    }
  );


  renderer.render(
    scene,
    camera
  );

}


/* =========================================================
   RESIZE
========================================================= */

function resize() {

  if (
    !camera ||
    !renderer
  ) {

    return;

  }


  camera.aspect =
    window.innerWidth /
    window.innerHeight;


  camera.updateProjectionMatrix();


  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

}


/* =========================================================
   ESTADO INICIAL
========================================================= */

updateBars();
/* =========================================================
   CREADOR DE PERSONAJE
========================================================= */

function setupCharacterCreator() {

  document
    .querySelectorAll(
      ".race-button"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".race-button"
              )
              .forEach(
                (item) =>
                  item.classList.remove(
                    "selected"
                  )
              );


            button.classList.add(
              "selected"
            );


            selectedRace =
              button.dataset.race ||
              "humano";


            if (
              $("playerRace")
            ) {

              $("playerRace")
                .textContent =
                selectedRace;

            }


            applyAppearance();

            updateAbilities();

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".appearance-button"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const appearance =
              button.dataset.appearance ||
              "";


            if (
              appearance
                .toLowerCase()
                .includes("cabello")
            ) {

              selectedAppearance.cabello =
                appearance;

            }


            if (
              appearance
                .toLowerCase()
                .includes("ropa")
            ) {

              selectedAppearance.ropa =
                appearance;

            }


            if (
              appearance
                .toLowerCase()
                .includes("accesorio")
            ) {

              selectedAppearance.accesorios =
                appearance;

            }


            document
              .querySelectorAll(
                ".appearance-button"
              )
              .forEach(
                (item) =>
                  item.classList.remove(
                    "selected"
                  )
              );


            button.classList.add(
              "selected"
            );


            applyAppearance();

          }
        );

      }
    );


  $("finishCharacter")
    ?.addEventListener(
      "click",
      saveCharacter
    );

}


/* =========================================================
   ABRIR CREADOR
========================================================= */

function openCharacterCreator(
  savedCharacter
) {

  const creator =
    $("characterCreator");


  if (
    !creator
  ) {

    return;

  }


  if (
    savedCharacter
  ) {

    selectedRace =
      savedCharacter.race ||
      "humano";


    selectedAppearance =
      savedCharacter.appearance ||
      selectedAppearance;


    if (
      $("playerRace")
    ) {

      $("playerRace")
        .textContent =
        selectedRace;

    }


    applyAppearance();

    updateAbilities();


    creator.hidden =
      true;


    showToast(
      `Bienvenido nuevamente, ${state.username}.`
    );


    return;

  }


  creator.hidden =
    false;


  updateAbilities();

}


/* =========================================================
   APARIENCIA
========================================================= */

function applyAppearance() {

  if (
    !player
  ) {

    return;

  }


  /*
     Escala según raza.
  */

  const raceScale = {

    humano: 1.25,

    elfo: 1.18,

    enano: 0.95,

    orco: 1.38,

    hada: 0.85,

    vampiro: 1.22

  };


  const scale =
    raceScale[
      selectedRace
    ] || 1.25;


  player.scale.setScalar(
    scale
  );


  /*
     Algunos colores
     según raza para el
     personaje procedural
     o partes compatibles.
  */

  player.traverse(
    (object) => {

      if (
        !object.isMesh ||
        !object.material
      ) {

        return;

      }


      const material =
        object.material;


      if (
        !material.color
      ) {

        return;

      }


      /*
         No reemplazamos
         texturas originales
         del modelo GLTF.
      */

    }
  );

}


/* =========================================================
   HABILIDADES POR RAZA
========================================================= */

function updateAbilities() {

  const abilities = {

    humano: [
      "Golpe de energía",
      "Escudo arcano",
      "Luz sagrada"
    ],

    elfo: [
      "Flecha de naturaleza",
      "Curación",
      "Tormenta verde"
    ],

    enano: [
      "Martillazo",
      "Piel de piedra",
      "Terremoto"
    ],

    orco: [
      "Furia",
      "Golpe brutal",
      "Rugido oscuro"
    ],

    hada: [
      "Polvo mágico",
      "Curación feérica",
      "Lluvia de estrellas"
    ],

    vampiro: [
      "Mordida",
      "Sombra",
      "Drenaje vital"
    ]

  };


  const list =
    abilities[
      selectedRace
    ] ||
    abilities.humano;


  list.forEach(
    (name, index) => {

      const button =
        $(`ability${index}`);


      if (
        !button
      ) {

        return;

      }


      const label =
        button.querySelector(
          ".ability-name"
        );


      if (label) {

        label.textContent =
          name;

      } else {

        button.title =
          name;

      }

    }
  );


  if (
    $("abilityRace")
  ) {

    $("abilityRace")
      .textContent =
      selectedRace;

  }

}


/* =========================================================
   GUARDAR PERSONAJE
========================================================= */

async function saveCharacter() {

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


  /*
     Guardar localmente
  */

  try {

    const stored =
      JSON.parse(
        localStorage.getItem(
          "universo_magico_user"
        ) || "{}"
      );


    stored.character =
      character;


    localStorage.setItem(
      "universo_magico_user",
      JSON.stringify(
        stored
      )
    );

  } catch (
    error
  ) {

    console.warn(
      "No se pudo guardar localmente:",
      error
    );

  }


  /*
     Guardar en servidor
  */

  try {

    const response =
      await fetch(
        "/api/character",
        {

          method: "POST",

          headers: {

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
      );


    if (
      !response.ok
    ) {

      console.warn(
        "El servidor no pudo guardar el personaje."
      );

    }

  } catch (
    error
  ) {

    console.warn(
      "Guardado remoto no disponible:",
      error
    );

  }


  const creator =
    $("characterCreator");


  if (
    creator
  ) {

    creator.hidden =
      true;

  }


  if (
    $("playerRace")
  ) {

    $("playerRace")
      .textContent =
      selectedRace;

  }


  showToast(
    "✨ Tu personaje ha sido creado."
  );

}


/* =========================================================
   CHAT MULTIJUGADOR
========================================================= */

function setupChat() {

  const form =
    $("chatForm") ||
    $("form");


  const input =
    $("chatInput") ||
    $("input");


  const messages =
    $("chatMessages") ||
    $("msgs");


  if (
    !form ||
    !input ||
    !messages
  ) {

    return;

  }


  form.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();


      const text =
        input.value.trim();


      if (
        !text
      ) {

        return;

      }


      if (
        socket
      ) {

        socket.emit(
          "chat",
          {
            username:
              state.username,

            message:
              text
          }
        );

      } else {

        addChatMessage(
          state.username,
          text
        );

      }


      input.value =
        "";

    }
  );


  $("chatToggle")
    ?.addEventListener(
      "click",
      () => {

        const chat =
          $("chat");


        if (
          !chat
        ) {

          return;

        }


        chat.classList.toggle(
          "hidden"
        );

      }
    );


  if (
    socket
  ) {

    socket.on(
      "chat",
      (data) => {

        if (
          typeof data ===
          "string"
        ) {

          addChatMessage(
            "Jugador",
            data
          );

          return;

        }


        addChatMessage(

          data.username ||
            "Jugador",

          data.message ||
            ""

        );

      }
    );


    socket.on(
      "system",
      (message) => {

        addChatMessage(
          "✨ Sistema",
          message
        );

      }
    );

  }

}


function addChatMessage(
  username,
  message
) {

  const messages =
    $("chatMessages") ||
    $("msgs");


  if (
    !messages
  ) {

    return;

  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "chat-message";


  const name =
    document.createElement(
      "strong"
    );


  name.textContent =
    `${username}: `;


  const text =
    document.createElement(
      "span"
    );


  text.textContent =
    message;


  row.appendChild(
    name
  );


  row.appendChild(
    text
  );


  messages.appendChild(
    row
  );


  /*
     Evita que el chat crezca
     infinitamente.
  */

  while (
    messages.children.length >
    80
  ) {

    messages.removeChild(
      messages.firstChild
    );

  }


  messages.scrollTop =
    messages.scrollHeight;

}


/* =========================================================
   MAPA
========================================================= */

function setupMap() {

  const button =
    $("mapButton") ||
    $("mapBtn");


  const map =
    $("sideMap") ||
    $("map");


  if (
    !button ||
    !map
  ) {

    return;

  }


  button.addEventListener(
    "click",
    () => {

      map.classList.toggle(
        "hidden"
      );


      map.hidden =
        !map.hidden;

      updatePlayerMarker();

    }
  );


  $("closeMap")
    ?.addEventListener(
      "click",
      () => {

        map.hidden =
          true;

      }
    );

}


function updatePlayerMarker() {

  const marker =
    $("playerMarker");


  if (
    !marker ||
    !player
  ) {

    return;

  }


  /*
     Convertimos las coordenadas
     del mundo al mapa.
  */

  const percentageX =
    (
      player.position.x +
      350
    ) / 700;


  const percentageZ =
    (
      player.position.z +
      350
    ) / 700;


  marker.style.left =
    `${percentageX * 100}%`;


  marker.style.top =
    `${percentageZ * 100}%`;

}


/* =========================================================
   CASAS E INTERIORES
========================================================= */

function setupHouse() {

  $("enterHouse")
    ?.addEventListener(
      "click",
      () => {

        enterNearestHouse();

      }
    );


  $("exitHouse")
    ?.addEventListener(
      "click",
      () => {

        exitHouse();

      }
    );

}


function enterNearestHouse() {

  if (
    !player ||
    state.insideHouse
  ) {

    return;

  }


  let nearest =
    null;


  let nearestDistance =
    Infinity;


  houses.forEach(
    (house) => {

      const dx =
        player.position.x -
        house.position.x;


      const dz =
        player.position.z -
        house.position.z;


      const distance =
        Math.sqrt(
          dx * dx +
          dz * dz
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
  );


  if (
    !nearest ||
    nearestDistance > 20
  ) {

    showToast(
      "Acércate a una casa para entrar."
    );

    return;

  }


  createInterior();

  state.insideHouse =
    true;

  currentHouse =
    nearest;


  player.position.set(
    0,
    0,
    0
  );


  if (
    $("enterHouse")
  ) {

    $("enterHouse").hidden =
      true;

  }


  if (
    $("exitHouse")
  ) {

    $("exitHouse").hidden =
      false;

  }


  showToast(
    "🏠 Has entrado en la casa."
  );

}


function createInterior() {

  if (
    interior
  ) {

    scene.remove(
      interior
    );

  }


  interior =
    new THREE.Group();


  /*
     Piso
  */

  const floor =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        34,
        0.5,
        28
      ),

      new THREE.MeshStandardMaterial({

        color: 0x72523c,

        roughness: 0.95

      })

    );


  floor.position.y =
    -0.25;


  floor.receiveShadow =
    true;


  interior.add(
    floor
  );


  /*
     Paredes
  */

  const wallMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x9d7353,

      roughness: 0.9

    });


  const backWall =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        34,
        12,
        0.6
      ),

      wallMaterial

    );


  backWall.position.set(
    0,
    6,
    -14
  );


  interior.add(
    backWall
  );


  const leftWall =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        0.6,
        12,
        28
      ),

      wallMaterial

    );


  leftWall.position.set(
    -17,
    6,
    0
  );


  interior.add(
    leftWall
  );


  const rightWall =
    leftWall.clone();


  rightWall.position.x =
    17;


  interior.add(
    rightWall
  );


  /*
     Chimenea
  */

  const fireplace =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        7,
        7,
        2
      ),

      new THREE.MeshStandardMaterial({

        color: 0x554640,

        roughness: 1

      })

    );


  fireplace.position.set(
    0,
    3.5,
    -13.3
  );


  interior.add(
    fireplace
  );


  const fire =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        1.2,
        16,
        16
      ),

      new THREE.MeshBasicMaterial({

        color: 0xff7138

      })

    );


  fire.position.set(
    0,
    2,
    -12
  );


  interior.add(
    fire
  );


  /*
     Mesa
  */

  const table =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        7,
        0.7,
        3.5
      ),

      new THREE.MeshStandardMaterial({

        color: 0x513525,

        roughness: 0.9

      })

    );


  table.position.y =
    3.5;


  interior.add(
    table
  );


  /*
     Bancos
  */

  for (
    const side of [-1, 1]
  ) {

    const bench =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          7,
          1,
          1.3
        ),

        new THREE.MeshStandardMaterial({

          color: 0x60412d,

          roughness: 1

        })

      );


    bench.position.set(
      0,
      1.2,
      side * 3
    );


    interior.add(
      bench
    );

  }


  /*
     Luz interior
  */

  const light =
    new THREE.PointLight(
      0xffb36a,
      8,
      35
    );


  light.position.set(
    0,
    8,
    0
  );


  interior.add(
    light
  );


  scene.add(
    interior
  );

}


function exitHouse() {

  if (
    !state.insideHouse
  ) {

    return;

  }


  state.insideHouse =
    false;


  if (
    interior
  ) {

    scene.remove(
      interior
    );

    interior =
      null;

  }


  if (
    currentHouse
  ) {

    player.position.set(

      currentHouse.position.x,

      0,

      currentHouse.position.z +
        18

    );

  }


  if (
    $("enterHouse")
  ) {

    $("enterHouse").hidden =
      false;

  }


  if (
    $("exitHouse")
  ) {

    $("exitHouse").hidden =
      true;

  }


  currentHouse =
    null;


  showToast(
    "🚪 Has salido de la casa."
  );

}


/* =========================================================
   RESPALDO DE SESIÓN
========================================================= */

function restoreSession() {

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          "universo_magico_user"
        ) || "null"
      );


    if (
      saved &&
      saved.username
    ) {

      /*
         No entramos automáticamente
         si todavía estamos en la pantalla
         de login. El usuario puede hacerlo
         manualmente.
      */

      if (
        $("username")
      ) {

        $("username").value =
          saved.username;

      }

    }

  } catch (
    error
  ) {

    console.warn(
      "No se pudo restaurar la sesión:",
      error
    );

  }

}


/* =========================================================
   BOTONES DE APARIENCIA DINÁMICOS
========================================================= */

function createAppearanceMenu() {

  const creator =
    $("characterCreator");


  if (
    !creator
  ) {

    return;

  }


  if (
    creator.querySelector(
      ".appearance-menu"
    )
  ) {

    return;

  }


  const menu =
    document.createElement(
      "div"
    );


  menu.className =
    "appearance-menu";


  menu.innerHTML = `

    <div class="appearance-menu-card">

      <h3>✨ Apariencia</h3>

      <p>Personaliza tu aventurero</p>

      <div class="appearance-choice-grid">

        <button
          class="appearance-choice"
          data-type="cabello"
          data-value="Cabello corto">
          💇 Cabello corto
        </button>

        <button
          class="appearance-choice"
          data-type="cabello"
          data-value="Cabello largo">
          💇 Cabello largo
        </button>

        <button
          class="appearance-choice"
          data-type="ropa"
          data-value="Ropa de guerrero">
          ⚔️ Guerrero
        </button>

        <button
          class="appearance-choice"
          data-type="ropa"
          data-value="Ropa de mago">
          🪄 Mago
        </button>

        <button
          class="appearance-choice"
          data-type="ropa"
          data-value="Ropa noble">
          👑 Noble
        </button>

        <button
          class="appearance-choice"
          data-type="accesorios"
          data-value="Capa">
          🧥 Capa
        </button>

        <button
          class="appearance-choice"
          data-type="accesorios"
          data-value="Corona">
          👑 Corona
        </button>

        <button
          class="appearance-choice"
          data-type="accesorios"
          data-value="Ninguno">
          ❌ Ninguno
        </button>

      </div>

    </div>

  `;


  creator.appendChild(
    menu
  );


  menu
    .querySelectorAll(
      ".appearance-choice"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const type =
              button.dataset.type;


            const value =
              button.dataset.value;


            if (
              type
            ) {

              selectedAppearance[
                type ===
                "accesorios"
                  ? "accesorios"
                  : type
              ] =
                value;

            }


            menu
              .querySelectorAll(
                ".appearance-choice"
              )
              .forEach(
                (item) =>
                  item.classList.remove(
                    "selected"
                  )
              );


            button.classList.add(
              "selected"
            );


            applyAppearance();

          }
        );

      }
    );

}


/* =========================================================
   ACTUALIZACIÓN DEL MAPA
========================================================= */

setInterval(
  () => {

    if (
      !player
    ) {

      return;

    }


    updatePlayerMarker();

  },
  250
);


/* =========================================================
   INICIAR
========================================================= */

restoreSession();


setTimeout(
  () => {

    createAppearanceMenu();

  },
  500
);


/* =========================================================
   PROTECCIÓN CONTRA ERRORES
========================================================= */

window.addEventListener(
  "error",
  (event) => {

    console.error(
      "Error del juego:",
      event.error ||
      event.message
    );

  }
);


console.log(
  "🌎 Universo Mágico iniciado correctamente."
);
