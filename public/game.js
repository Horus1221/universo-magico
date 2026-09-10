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
let moveX = 0, moveY = 0;
let mana = 100, hp = 100;
let registerMode = false;
let yaw = 0, pitch = 0.48;
let draggingCamera = false;
let lastTouchX = 0, lastTouchY = 0;

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
const mountains = [];

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
  async (e) => {

    e.preventDefault();

    const username =
      ($("username")?.value || "").trim();

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
          .catch(
            () => ({})
          );


      if (
        !response.ok
      ) {

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

      console.error(
        err
      );


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


function authMessage(text) {

  const el =
    $("authMsg");


  if (!el) {

    return;

  }


  el.textContent =
    text;

  el.hidden =
    false;

}


/* =========================================================
   INICIAR JUEGO
========================================================= */

function startGame(
  username,
  savedCharacter = null
) {

  state.username =
    username ||
    "Aventurero";


  state.character =
    savedCharacter;


  if (
    $("playerName")
  ) {

    $("playerName").textContent =
      state.username;

  }


  if (
    $("hudName")
  ) {

    $("hudName").textContent =
      state.username;

  }


  if (
    $("avatar")
  ) {

    $("avatar").textContent =
      state.username
        .charAt(0)
        .toUpperCase();

  }


  if (home) {

    home.hidden =
      true;

  }


  if (game) {

    game.hidden =
      false;

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
   INICIALIZAR MUNDO
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
        700,
        700,
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
     PIEDRAS
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


/* =========================================================
   CASA
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


    trees.push(
      tree
    );


    scene.add(
      tree
    );

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
      7 +
      i * 1.2;


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
     COPA DEL ÁRBOL
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

      color: 0x59645e,

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
     NIEVE EN LAS CIMAS
  */

  if (
    height > 52
  ) {

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


  /*
     TORRE CENTRAL
  */

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
         TECHO
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
     ARCO
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

        10 +
          row * 12,

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

  const wallFront =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        95,
        16,
        5
      ),

      stoneMaterial

    );


  wallFront.position.set(
    0,
    8,
    -43
  );


  wallFront.castShadow =
    true;


  castle.add(
    wallFront
  );


  const wallBack =
    wallFront.clone();


  wallBack.position.z =
    43;


  castle.add(
    wallBack
  );


  const wallLeft =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        5,
        16,
        85
      ),

      stoneMaterial

    );


  wallLeft.position.set(
    -45,
    8,
    0
  );


  castle.add(
    wallLeft
  );


  const wallRight =
    wallLeft.clone();


  wallRight.position.x =
    45;


  castle.add(
    wallRight
  );


  castle.userData.isCastle =
    true;


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


  const count =
    280;


  const positions =
    new Float32Array(
      count * 3
    );


  for (
    let i = 0;
    i < count;
    i++
  ) {

    positions[
      i * 3
    ] =
      THREE.MathUtils.randFloat(
        -300,
        300
      );


    positions[
      i * 3 + 1
    ] =
      THREE.MathUtils.randFloat(
        1,
        35
      );


    positions[
      i * 3 + 2
    ] =
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


  particles.userData.magic =
    true;


  scene.add(
    particles
  );

}
/* =========================================================
   PERSONAJE 3D CON SKIN
========================================================= */

function loadPlayer() {

  loader.load(

    assets.character,

    (gltf) => {

      player =
        gltf.scene;


      player.position.set(
        0,
        0,
        28
      );


      player.scale.setScalar(
        1.8
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


            /*
               Aseguramos que las
               texturas del personaje
               sean visibles.
            */

            if (
              object.material
            ) {

              object.material
                .side =
                THREE.DoubleSide;

            }

          }

        }
      );


      scene.add(
        player
      );


      /*
         ANIMACIONES
      */

      mixer =
        new THREE.AnimationMixer(
          player
        );


      loader.load(

        assets.animations,

        (animationGLTF) => {

          if (
            animationGLTF.animations
          ) {

            animationGLTF.animations
              .forEach(
                (clip) => {

                  actions[
                    clip.name
                  ] =
                    mixer.clipAction(
                      clip
                    );

                }
              );

          }


          const idle =
            findAnimation([
              "Idle",
              "Idle_01",
              "Breathing_Idle",
              "Idle_2",
              "Standing"
            ]);


          if (idle) {

            playAnimation(
              idle
            );

          }

        },

        undefined,

        () => {

          console.warn(
            "⚠️ No se pudieron cargar las animaciones UAL1."
          );

        }

      );


      /*
         APLICAR RAZA Y ASPECTO
      */

      applyCharacterVisuals();

    },

    undefined,

    (error) => {

      console.error(
        "❌ No se pudo cargar el personaje:",
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


  const skinMaterial =
    new THREE.MeshStandardMaterial({

      color: 0xd5a17c,

      roughness: 0.85

    });


  const clothesMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x64498c,

      roughness: 0.8

    });


  const body =
    new THREE.Mesh(

      new THREE.CapsuleGeometry(
        1.2,
        3.2,
        8,
        12
      ),

      clothesMaterial

    );


  body.position.y =
    3;


  body.castShadow =
    true;


  group.add(
    body
  );


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

        clothesMaterial

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


  player =
    group;


  player.position.set(
    0,
    0,
    28
  );


  player.scale.setScalar(
    1.8
  );


  scene.add(
    player
  );


  applyCharacterVisuals();

}


/* =========================================================
   ASPECTO DEL PERSONAJE
========================================================= */

function applyCharacterVisuals() {

  if (
    !player
  ) {

    return;

  }


  /*
     Escala según raza.
  */

  const raceScale = {

    humano: 1.8,

    elfo: 1.75,

    enano: 1.45,

    orco: 1.95,

    hada: 1.45,

    vampiro: 1.8

  };


  player.scale.setScalar(

    raceScale[
      selectedRace
    ] || 1.8

  );


  /*
     Eliminar detalles
     anteriores.
  */

  const oldDetails =
    player.getObjectByName(
      "raceDetails"
    );


  if (
    oldDetails
  ) {

    player.remove(
      oldDetails
    );

  }


  const details =
    new THREE.Group();


  details.name =
    "raceDetails";


  /*
     HACER DETALLES SEGÚN RAZA
  */

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

    createElfEars(
      details
    );

  }


  if (
    selectedRace ===
    "orco"
  ) {

    createOrcTusks(
      details
    );

  }


  if (
    selectedRace ===
    "vampiro"
  ) {

    createVampireDetails(
      details
    );

  }


  player.add(
    details
  );

}


/* =========================================================
   ALAS DE HADA
========================================================= */

function createFairyWings(
  parent
) {

  const wingMaterial =
    new THREE.MeshPhysicalMaterial({

      color: 0xdca7ff,

      transparent: true,

      opacity: 0.58,

      roughness: 0.2,

      metalness: 0.05,

      transmission: 0.15,

      emissive: 0x7d3fb0,

      emissiveIntensity: 0.35,

      side:
        THREE.DoubleSide

    });


  const wingPositions = [

    [-1.0, 3.9, 0],

    [1.0, 3.9, 0],

    [-0.9, 2.9, 0],

    [0.9, 2.9, 0]

  ];


  wingPositions.forEach(
    ([x, y, z], index) => {

      const wing =
        new THREE.Mesh(

          new THREE.SphereGeometry(
            1,
            24,
            16
          ),

          wingMaterial
        );


      wing.position.set(
        x,
        y,
        z - 0.25
      );


      wing.scale.set(

        1.55,

        2.5,

        0.12

      );


      /*
         Curvatura de las alas
      */

      wing.rotation.z =
        x < 0
          ? -0.25
          : 0.25;


      wing.rotation.y =
        x < 0
          ? -0.18
          : 0.18;


      wing.castShadow =
        true;


      parent.add(
        wing
      );

    }
  );


  /*
     Brillo alrededor
  */

  const glow =
    new THREE.PointLight(
      0xc87cff,
      1.5,
      7
    );


  glow.position.set(
    0,
    3.5,
    -0.5
  );


  parent.add(
    glow
  );

}


/* =========================================================
   OREJAS DE ELFO
========================================================= */

function createElfEars(
  parent
) {

  const material =
    new THREE.MeshStandardMaterial({

      color: 0xc98f73,

      roughness: 0.8

    });


  for (
    const side of [-1, 1]
  ) {

    const ear =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          0.28,
          1.1,
          12
        ),

        material

      );


    ear.position.set(

      side * 1.0,

      5.45,

      0

    );


    ear.rotation.z =
      side < 0
        ? Math.PI / 2
        : -Math.PI / 2;


    parent.add(
      ear
    );

  }

}


/* =========================================================
   COLMILLOS DE ORCO
========================================================= */

function createOrcTusks(
  parent
) {

  const material =
    new THREE.MeshStandardMaterial({

      color: 0xf2eee2,

      roughness: 0.7

    });


  for (
    const side of [-1, 1]
  ) {

    const tusk =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          0.18,
          0.7,
          10
        ),

        material

      );


    tusk.position.set(

      side * 0.45,

      4.8,

      0.95

    );


    tusk.rotation.x =
      Math.PI;


    parent.add(
      tusk
    );

  }

}


/* =========================================================
   DETALLES DE VAMPIRO
========================================================= */

function createVampireDetails(
  parent
) {

  const eyeMaterial =
    new THREE.MeshBasicMaterial({

      color: 0xff3030

    });


  for (
    const side of [-1, 1]
  ) {

    const eye =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.12,
          12,
          12
        ),

        eyeMaterial

      );


    eye.position.set(

      side * 0.38,

      5.65,

      0.98

    );


    parent.add(
      eye
    );

  }


  const capeMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x24142e,

      roughness: 0.8,

      side:
        THREE.DoubleSide

    });


  const cape =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        3.2,
        4.8
      ),

      capeMaterial

    );


  cape.position.set(
    0,
    2.7,
    -0.7
  );


  cape.rotation.x =
    0.08;


  parent.add(
    cape
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


  if (
    currentAction
  ) {

    currentAction.fadeOut(
      0.2
    );

  }


  next
    .reset()
    .fadeIn(0.2)
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


  let x =
    moveX;

  let z =
    moveY;


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
        "Idle_01",
        "Breathing_Idle",
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
    13 *
    delta;


  tryMovePlayer(
    direction,
    distance
  );


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


  const nextX =
    player.position.x +
    direction.x *
    distance;


  const nextZ =
    player.position.z +
    direction.z *
    distance;


  if (
    Math.abs(nextX) >
      288 ||
    Math.abs(nextZ) >
      288
  ) {

    return;

  }


  if (
    collidesWithMountains(
      nextX,
      nextZ
    )
  ) {

    return;

  }


  if (
    !state.insideHouse &&
    collidesWithHouse(
      nextX,
      nextZ
    )
  ) {

    return;

  }


  if (
    !state.insideHouse &&
    collidesWithCastle(
      nextX,
      nextZ
    )
  ) {

    return;

  }


  if (
    !state.insideHouse &&
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


/* =========================================================
   COLISIÓN MONTAÑAS
========================================================= */

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


/* =========================================================
   COLISIÓN CASAS
========================================================= */

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


    if (

      x >
        hx - 13 &&

      x <
        hx + 13 &&

      z >
        hz - 12 &&

      z <
        hz + 12

    ) {

      return true;

    }

  }


  return false;

}


/* =========================================================
   COLISIÓN CASTILLO
========================================================= */

function collidesWithCastle(
  x,
  z
) {

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
       Entrada principal.
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


/* =========================================================
   COLISIÓN ÁRBOLES
========================================================= */

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
   AGUA
========================================================= */

function isInWater(
  x,
  z
) {

  const dx =
    x - 115;


  const dz =
    z - 80;


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
       Se hunde un poco
       en el agua.
    */

    player.position.y =
      -0.8;

  } else {

    player.position.y =
      0;

  }

}
/* =========================================================
   JOYSTICK
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

    console.warn(
      "⚠️ No se encontró el joystick."
    );

    return;

  }


  let active =
    false;


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

  }


  function resetStick() {

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
    "pointerdown",
    (event) => {

      active =
        true;


      joystick.setPointerCapture?.(
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
   CÁMARA TÁCTIL
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

      if (
        event.target.closest(
          "#joystick"
        ) ||
        event.target.closest(
          "#chat"
        ) ||
        event.target.closest(
          "#abilitiesPanel"
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


/* =========================================================
   CÁMARA TERCERA PERSONA
========================================================= */

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


  const desired =
    new THREE.Vector3(

      player.position.x -
        Math.sin(yaw) *
        horizontal,

      player.position.y +
        5 +
        vertical,

      player.position.z -
        Math.cos(yaw) *
        horizontal

    );


  camera.position.lerp(
    desired,
    0.12
  );


  camera.lookAt(

    player.position.x,

    player.position.y +
      4.5,

    player.position.z

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
    costs[spell] ||
    10;


  if (
    mana < cost
  ) {

    showToast(
      "💧 No tienes suficiente maná."
    );

    return;

  }


  mana -=
    cost;


  updateBars();


  createSpellEffect(
    spell
  );


  if (
    socket
  ) {

    socket.emit(
      "system",
      `${state.username} lanzó un hechizo.`
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


  const geometry =
    new THREE.SphereGeometry(
      0.55,
      16,
      16
    );


  const material =
    new THREE.MeshBasicMaterial({

      color:
        colors[spell] ||
        0xc084ff,

      transparent:
        true,

      opacity:
        0.9

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


  function animateEffect(
    now
  ) {

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


      geometry.dispose();

      material.dispose();

    }

  }


  requestAnimationFrame(
    animateEffect
  );

}


/* =========================================================
   VIDA Y MANÁ
========================================================= */

function updateBars() {

  if (
    $("hpBar")
  ) {

    $("hpBar").style.width =
      `${Math.max(0, hp)}%`;

  }


  if (
    $("manaBar")
  ) {

    $("manaBar").style.width =
      `${Math.max(0, mana)}%`;

  }

}


/* =========================================================
   TOAST
========================================================= */

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
      2600
    );

}


/* =========================================================
   CHAT — ABRIR / CERRAR
========================================================= */

function setupChat() {

  const chat =
    $("chat");


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
    !chat
  ) {

    return;

  }


  /*
     BOTÓN X
  */

  const closeButton =
    chat.querySelector(
      ".close-chat"
    ) ||
    chat.querySelector(
      "[data-close-chat]"
    );


  closeButton?.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();

      closeChat();

    }
  );


  /*
     Si el HTML usa un botón
     específico con texto X.
  */

  chat
    .querySelectorAll(
      "button"
    )
    .forEach(
      (button) => {

        const text =
          (
            button.textContent ||
            ""
          ).trim();


        if (
          text === "×" ||
          text === "✕" ||
          text === "X"
        ) {

          button.addEventListener(
            "click",
            (event) => {

              event.preventDefault();

              event.stopPropagation();

              closeChat();

            }
          );

        }

      }
    );


  /*
     BOTÓN PRINCIPAL DEL CHAT
  */

  $("chatToggle")
    ?.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopPropagation();

        toggleChat();

      }
    );


  /*
     ENVIAR MENSAJES
  */

  if (
    form &&
    input
  ) {

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

  }


  /*
     MENSAJES RECIBIDOS
  */

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

          data?.username ||
            "Jugador",

          data?.message ||
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


function closeChat() {

  const chat =
    $("chat");


  if (
    !chat
  ) {

    return;

  }


  chat.hidden =
    true;


  chat.style.display =
    "none";


  chat.classList.add(
    "chat-closed"
  );

}


function openChat() {

  const chat =
    $("chat");


  if (
    !chat
  ) {

    return;

  }


  chat.hidden =
    false;


  chat.style.display =
    "";


  chat.classList.remove(
    "chat-closed"
  );

}


function toggleChat() {

  const chat =
    $("chat");


  if (
    !chat
  ) {

    return;

  }


  const closed =
    chat.hidden ||
    chat.classList.contains(
      "chat-closed"
    ) ||
    getComputedStyle(
      chat
    ).display ===
      "none";


  if (
    closed
  ) {

    openChat();

  } else {

    closeChat();

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
   MAPA — ABRIR / CERRAR
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

    console.warn(
      "⚠️ No se encontró el mapa."
    );

    return;

  }


  button.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();


      const isClosed =
        map.hidden ||
        getComputedStyle(
          map
        ).display ===
          "none";


      if (
        isClosed
      ) {

        map.hidden =
          false;


        map.style.display =
          "block";


        map.classList.remove(
          "hidden"
        );


        updatePlayerMarker();

      } else {

        map.hidden =
          true;


        map.style.display =
          "none";


        map.classList.add(
          "hidden"
        );

      }

    }
  );


  $("closeMap")
    ?.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopPropagation();


        map.hidden =
          true;


        map.style.display =
          "none";

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


  const percentageX =
    (
      player.position.x +
      350
    ) /
    700;


  const percentageZ =
    (
      player.position.z +
      350
    ) /
    700;


  marker.style.left =
    `${Math.max(
      0,
      Math.min(
        100,
        percentageX * 100
      )
    )}%`;


  marker.style.top =
    `${Math.max(
      0,
      Math.min(
        100,
        percentageZ * 100
      )
    )}%`;

}
/* =========================================================
   CASAS E INTERIORES
========================================================= */

function setupHouse() {

  const enterButton =
    $("enterHouse");

  const exitButton =
    $("exitHouse");


  if (enterButton) {

    enterButton.hidden =
      true;

    enterButton.style.display =
      "none";


    enterButton.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopPropagation();

        enterNearestHouse();

      }
    );

  }


  if (exitButton) {

    exitButton.hidden =
      true;

    exitButton.style.display =
      "none";


    exitButton.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopPropagation();

        exitHouse();

      }
    );

  }

}


/* =========================================================
   DETECTAR CASA CERCANA
========================================================= */

function getNearestHouse() {

  if (
    !player
  ) {

    return {
      house: null,
      distance: Infinity
    };

  }


  let nearest =
    null;


  let nearestDistance =
    Infinity;


  for (
    const house of houses
  ) {

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


  return {

    house:
      nearest,

    distance:
      nearestDistance

  };

}


/* =========================================================
   MOSTRAR BOTÓN DE CASA
========================================================= */

function updateHouseButton() {

  const enterButton =
    $("enterHouse");


  const exitButton =
    $("exitHouse");


  if (
    !enterButton ||
    !player
  ) {

    return;

  }


  if (
    state.insideHouse
  ) {

    enterButton.hidden =
      true;

    enterButton.style.display =
      "none";


    if (
      exitButton
    ) {

      exitButton.hidden =
        false;

      exitButton.style.display =
        "block";

    }


    return;

  }


  const nearest =
    getNearestHouse();


  if (
    nearest.house &&
    nearest.distance <
      22
  ) {

    enterButton.hidden =
      false;

    enterButton.style.display =
      "block";


    enterButton.textContent =
      "🏠 ENTRAR";


  } else {

    enterButton.hidden =
      true;

    enterButton.style.display =
      "none";

  }


  if (
    exitButton
  ) {

    exitButton.hidden =
      true;

    exitButton.style.display =
      "none";

  }

}


/* =========================================================
   ENTRAR EN CASA
========================================================= */

function enterNearestHouse() {

  if (
    !player ||
    state.insideHouse
  ) {

    return;

  }


  const nearest =
    getNearestHouse();


  if (
    !nearest.house ||
    nearest.distance >
      24
  ) {

    showToast(
      "🏠 Acércate a una casa para entrar."
    );

    return;

  }


  currentHouse =
    nearest.house;


  createInterior();


  state.insideHouse =
    true;


  /*
     Teletransportar al interior.
  */

  player.position.set(
    0,
    0,
    5
  );


  player.rotation.y =
    Math.PI;


  const enterButton =
    $("enterHouse");


  const exitButton =
    $("exitHouse");


  if (
    enterButton
  ) {

    enterButton.hidden =
      true;

    enterButton.style.display =
      "none";

  }


  if (
    exitButton
  ) {

    exitButton.hidden =
      false;

    exitButton.style.display =
      "block";

    exitButton.textContent =
      "🚪 SALIR";

  }


  showToast(
    "🏠 Entraste a la casa."
  );

}


/* =========================================================
   CREAR INTERIOR
========================================================= */

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


  interior.name =
    "houseInterior";


  /*
     PISO
  */

  const floorMaterial =
    new THREE.MeshStandardMaterial({

      color: 0x72523c,

      roughness: 0.95

    });


  const floor =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        34,
        0.5,
        28
      ),

      floorMaterial

    );


  floor.position.y =
    -0.25;


  floor.receiveShadow =
    true;


  interior.add(
    floor
  );


  /*
     PAREDES
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
     PARED DEL FRENTE
     CON ABERTURA CENTRAL
  */

  const frontLeft =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        13,
        12,
        0.6
      ),

      wallMaterial

    );


  frontLeft.position.set(
    -10.5,
    6,
    14
  );


  interior.add(
    frontLeft
  );


  const frontRight =
    frontLeft.clone();


  frontRight.position.x =
    10.5;


  interior.add(
    frontRight
  );


  /*
     TECHO
  */

  const ceiling =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        34,
        0.5,
        28
      ),

      new THREE.MeshStandardMaterial({

        color: 0x49352c,

        roughness: 1

      })

    );


  ceiling.position.y =
    12;


  interior.add(
    ceiling
  );


  /*
     CHIMENEA
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
    -13.2
  );


  interior.add(
    fireplace
  );


  /*
     FUEGO
  */

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


  const fireLight =
    new THREE.PointLight(
      0xff8a4a,
      8,
      28
    );


  fireLight.position.set(
    0,
    3,
    -10
  );


  interior.add(
    fireLight
  );


  /*
     MESA
  */

  const wood =
    new THREE.MeshStandardMaterial({

      color: 0x513525,

      roughness: 0.9

    });


  const table =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        7,
        0.7,
        3.5
      ),

      wood

    );


  table.position.y =
    3.5;


  interior.add(
    table
  );


  /*
     PATAS
  */

  for (
    const x of [-2.8, 2.8]
  ) {

    for (
      const z of [-1.2, 1.2]
    ) {

      const leg =
        new THREE.Mesh(

          new THREE.BoxGeometry(
            0.45,
            3,
            0.45
          ),

          wood

        );


      leg.position.set(
        x,
        1.5,
        z
      );


      interior.add(
        leg
      );

    }

  }


  /*
     BANCOS
  */

  for (
    const z of [-3, 3]
  ) {

    const bench =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          7,
          1,
          1.3
        ),

        wood

      );


    bench.position.set(
      0,
      1.2,
      z
    );


    interior.add(
      bench
    );

  }


  /*
     CAMA
  */

  const bed =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        7,
        1.2,
        4
      ),

      new THREE.MeshStandardMaterial({

        color: 0x58405f,

        roughness: 0.85

      })

    );


  bed.position.set(
    -10,
    1,
    -5
  );


  interior.add(
    bed
  );


  /*
     ALMOHADA
  */

  const pillow =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        2.5,
        0.6,
        3
      ),

      new THREE.MeshStandardMaterial({

        color: 0xd8cde0,

        roughness: 0.9

      })

    );


  pillow.position.set(
    -11.8,
    1.8,
    -5
  );


  interior.add(
    pillow
  );


  /*
     LUZ
  */

  const light =
    new THREE.PointLight(
      0xffc17d,
      7,
      35
    );


  light.position.set(
    0,
    9,
    0
  );


  interior.add(
    light
  );


  scene.add(
    interior
  );

}


/* =========================================================
   SALIR DE CASA
========================================================= */

function exitHouse() {

  if (
    !state.insideHouse ||
    !player
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
        19

    );

  }


  const exitButton =
    $("exitHouse");


  if (
    exitButton
  ) {

    exitButton.hidden =
      true;

    exitButton.style.display =
      "none";

  }


  currentHouse =
    null;


  showToast(
    "🚪 Saliste de la casa."
  );

}


/* =========================================================
   CABELLO / ROPA / ACCESORIOS
========================================================= */

function setupCharacterCreator() {

  /*
     RAZAS
  */

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
                b =>
                  b.classList.remove(
                    "selected"
                  )
              );


            button.classList.add(
              "selected"
            );


            selectedRace =
              (
                button.dataset.race ||
                "humano"
              ).toLowerCase();


            if (
              $("playerRace")
            ) {

              $("playerRace")
                .textContent =
                selectedRace;

            }


            applyCharacterVisuals();

            updateAbilities();

          }
        );

      }
    );


  /*
     BOTONES DE APARIENCIA
  */

  document
    .querySelectorAll(
      ".appearance-button"
    )
    .forEach(
      connectAppearanceButton
    );


  /*
     BOTÓN TERMINAR
  */

  $("finishCharacter")
    ?.addEventListener(
      "click",
      saveCharacter
    );


  /*
     CREAR NUESTRO PROPIO
     SELECTOR DE APARIENCIA
  */

  createAppearanceMenu();

}


/* =========================================================
   CONECTAR BOTÓN APARIENCIA
========================================================= */

function connectAppearanceButton(
  button
) {

  if (
    button.dataset.connected ===
    "true"
  ) {

    return;

  }


  button.dataset.connected =
    "true";


  button.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();


      const type =
        (
          button.dataset.type ||
          button.dataset.appearanceType ||
          ""
        ).toLowerCase();


      const value =
        button.dataset.value ||
        button.dataset.appearance ||
        button.textContent.trim();


      if (
        type.includes(
          "cabello"
        ) ||
        value.toLowerCase().includes(
          "cabello"
        )
      ) {

        selectedAppearance.cabello =
          value;

      }


      else if (
        type.includes(
          "ropa"
        ) ||
        value.toLowerCase().includes(
          "ropa"
        )
      ) {

        selectedAppearance.ropa =
          value;

      }


      else if (
        type.includes(
          "accesorio"
        ) ||
        value.toLowerCase().includes(
          "accesorio"
        )
      ) {

        selectedAppearance.accesorios =
          value;

      }


      document
        .querySelectorAll(
          ".appearance-button"
        )
        .forEach(
          b =>
            b.classList.remove(
              "selected"
            )
        );


      document
        .querySelectorAll(
          ".appearance-choice"
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


      applyCharacterVisuals();


      showToast(
        `✨ ${value} seleccionado`
      );

    }
  );

}


/* =========================================================
   MENÚ DE APARIENCIA
========================================================= */

function createAppearanceMenu() {

  const creator =
    $("characterCreator");


  if (
    !creator
  ) {

    return;

  }


  let menu =
    creator.querySelector(
      ".appearance-menu"
    );


  if (
    !menu
  ) {

    menu =
      document.createElement(
        "div"
      );


    menu.className =
      "appearance-menu";


    menu.innerHTML = `

      <div class="appearance-menu-card">

        <h3>✨ Personalización</h3>

        <div class="appearance-section">

          <strong>💇 Cabello</strong>

          <div class="appearance-choice-grid">

            <button
              type="button"
              class="appearance-choice"
              data-type="cabello"
              data-value="Cabello corto">

              Cabello corto

            </button>

            <button
              type="button"
              class="appearance-choice"
              data-type="cabello"
              data-value="Cabello largo">

              Cabello largo

            </button>

          </div>

        </div>


        <div class="appearance-section">

          <strong>👕 Ropa</strong>

          <div class="appearance-choice-grid">

            <button
              type="button"
              class="appearance-choice"
              data-type="ropa"
              data-value="Ropa de guerrero">

              ⚔️ Guerrero

            </button>

            <button
              type="button"
              class="appearance-choice"
              data-type="ropa"
              data-value="Ropa de mago">

              🪄 Mago

            </button>

            <button
              type="button"
              class="appearance-choice"
              data-type="ropa"
              data-value="Ropa noble">

              👑 Noble

            </button>

          </div>

        </div>


        <div class="appearance-section">

          <strong>💎 Accesorios</strong>

          <div class="appearance-choice-grid">

            <button
              type="button"
              class="appearance-choice"
              data-type="accesorios"
              data-value="Capa">

              🧥 Capa

            </button>

            <button
              type="button"
              class="appearance-choice"
              data-type="accesorios"
              data-value="Corona">

              👑 Corona

            </button>

            <button
              type="button"
              class="appearance-choice"
              data-type="accesorios"
              data-value="Ninguno">

              ❌ Ninguno

            </button>

          </div>

        </div>

      </div>

    `;


    creator.appendChild(
      menu
    );

  }


  /*
     Conectar botones dinámicos.
  */

  menu
    .querySelectorAll(
      ".appearance-choice"
    )
    .forEach(
      button => {

        if (
          button.dataset.connected ===
          "true"
        ) {

          return;

        }


        button.dataset.connected =
          "true";


        button.addEventListener(
          "click",
          (event) => {

            event.preventDefault();

            event.stopPropagation();


            const type =
              button.dataset.type;


            const value =
              button.dataset.value;


            if (
              type ===
              "cabello"
            ) {

              selectedAppearance.cabello =
                value;

            }


            if (
              type ===
              "ropa"
            ) {

              selectedAppearance.ropa =
                value;

            }


            if (
              type ===
              "accesorios"
            ) {

              selectedAppearance.accesorios =
                value;

            }


            menu
              .querySelectorAll(
                ".appearance-choice"
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


            applyCharacterVisuals();


            showToast(
              `✨ ${value} seleccionado`
            );

          }
        );

      }
    );

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
     GUARDADO LOCAL
  */

  try {

    const saved =
      JSON.parse(
        localStorage.getItem(
          "universo_magico_user"
        ) || "{}"
      );


    saved.username =
      state.username;


    saved.character =
      character;


    localStorage.setItem(
      "universo_magico_user",
      JSON.stringify(
        saved
      )
    );

  } catch (
    error
  ) {

    console.warn(
      error
    );

  }


  /*
     GUARDADO SERVIDOR
  */

  try {

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

  } catch (
    error
  ) {

    console.warn(
      "No se pudo guardar remotamente:",
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
    "✨ Personaje guardado."
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
      (
        savedCharacter.race ||
        "humano"
      ).toLowerCase();


    selectedAppearance =
      {

        cabello:
          savedCharacter
            .appearance
            ?.cabello ||
          "Cabello corto",

        ropa:
          savedCharacter
            .appearance
            ?.ropa ||
          "Ropa de guerrero",

        accesorios:
          savedCharacter
            .appearance
            ?.accesorios ||
          "Ninguno"

      };


    if (
      $("playerRace")
    ) {

      $("playerRace")
        .textContent =
        selectedRace;

    }


    applyCharacterVisuals();

    updateAbilities();


    creator.hidden =
      true;


    return;

  }


  creator.hidden =
    false;


  createAppearanceMenu();

  updateAbilities();

}


/* =========================================================
   HABILIDADES
========================================================= */

function updateAbilities() {

  const abilities = {

    humano: [
      "Golpe de energía",
      "Escudo arcano",
      "Luz sagrada"
    ],

    elfo: [
      "Flecha natural",
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


      if (
        label
      ) {

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
   SESIÓN
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
      saved?.username &&
      $("username")
    ) {

      $("username").value =
        saved.username;

    }

  } catch (
    error
  ) {

    console.warn(
      error
    );

  }

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


  if (
    mixer
  ) {

    mixer.update(
      delta
    );

  }


  updateMovement(
    delta
  );


  updateCamera();


  /*
     Alas de hada flotando
  */

  if (
    player &&
    selectedRace ===
      "hada"
  ) {

    const wings =
      player.getObjectByName(
        "raceDetails"
      );


    if (
      wings
    ) {

      wings.rotation.y =
        Math.sin(
          performance.now() *
          0.0015
        ) *
        0.08;

      wings.position.y =
        Math.sin(
          performance.now() *
          0.003
        ) *
        0.08;

    }

  }


  /*
     Actualizar botones
  */

  updateHouseButton();

  updatePlayerMarker();


  /*
     Animación de partículas
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
   ACTUALIZACIÓN DEL MAPA
========================================================= */

setInterval(
  () => {

    updatePlayerMarker();

    updateHouseButton();

  },
  250
);


/* =========================================================
   ERRORES
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


/* =========================================================
   INICIO
========================================================= */

restoreSession();

updateBars();

console.log(
  "🌎 UNIVERSO MÁGICO — SISTEMA COMPLETO CARGADO"
);
