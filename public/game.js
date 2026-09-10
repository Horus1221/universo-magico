import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const socket = typeof io === "function" ? io() : null;
const $ = (id) => document.getElementById(id);

const home = $("home");
const game = $("game");
const sceneEl = $("scene");

let renderer;
let scene;
let camera;
let clock;

let player = null;
let mixer = null;

let hp = 100;
let mana = 100;

let moving = false;
let moveX = 0;
let moveY = 0;
let joystickPointer = null;

const keys = {};

const WORLD_SIZE = 700;
const PLAYER_SPEED = 13;

const state = {
  username: "Aventurero",
  insideHouse: false,
  currentHouse: null,
  lastZone: "Aldea Central"
};

const houses = [];
const vegetation = [];

let water = null;

const loader = new GLTFLoader();

const assets = {
  character:
    "/assets/characters/Superhero_Male_FullBody.gltf",

  animations:
    "/assets/characters/UAL1_Standard.glb"
};


// =====================================================
// AUTENTICACIÓN
// =====================================================

let registerMode = false;

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
      $("username")?.value.trim();

    const password =
      $("password")?.value || "";

    if (!username || username.length < 3) {

      showAuthMessage(
        "El usuario debe tener al menos 3 caracteres."
      );

      return;
    }


    if (password.length < 6) {

      showAuthMessage(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
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

        if (response.status === 404) {

          startGame(username);

          return;
        }

        throw new Error(
          data.error ||
          "No se pudo iniciar sesión."
        );
      }


      localStorage.setItem(
        "universo_magico_user",
        JSON.stringify(data)
      );


      startGame(username);

    } catch (error) {

      showAuthMessage(
        error.message ||
        "Error de conexión."
      );
    }

  }
);


$("guest")?.addEventListener(
  "click",
  () => {

    startGame("Aventurero");

  }
);


function showAuthMessage(message) {

  const element =
    $("authMsg");

  if (!element) return;

  element.textContent =
    message;

}


// =====================================================
// INICIO
// =====================================================

function startGame(username) {

  state.username =
    username ||
    "Aventurero";


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


  if (home)
    home.hidden = true;


  if (game)
    game.hidden = false;


  if (!renderer)
    initWorld();

}


// =====================================================
// MUNDO 3D
// =====================================================

function initWorld() {

  clock =
    new THREE.Clock();


  scene =
    new THREE.Scene();


  scene.background =
    new THREE.Color(
      0x86b7d5
    );


  scene.fog =
    new THREE.FogExp2(
      0x86b7d5,
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
    28,
    38
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


  // LUZ DEL CIELO

  const hemisphere =
    new THREE.HemisphereLight(
      0xbfe5ff,
      0x34472f,
      1.8
    );


  scene.add(
    hemisphere
  );


  // SOL

  const sun =
    new THREE.DirectionalLight(
      0xfff2d2,
      3.2
    );


  sun.position.set(
    -120,
    180,
    80
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
  createSky();
  createWater();
  createPaths();
  createVillage();
  createForest();
  createMountains();
  createCastle();
  createCrystals();


  // ⭐ PERSONAJE REAL

  loadPlayer();


  setupJoystick();
  setupKeyboard();
  setupCombat();
  setupChat();
  setupMap();
  setupHowTo();
  setupHouseButton();


  window.addEventListener(
    "resize",
    resize
  );


  animate();

}


// =====================================================
// TERRENO
// =====================================================

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
        color: 0x416f45,
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

}


// =====================================================
// CIELO
// =====================================================

function createSky() {

  const sky =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        1000,
        32,
        16
      ),

      new THREE.MeshBasicMaterial({
        color: 0x78a9c9,
        side: THREE.BackSide
      })

    );


  scene.add(
    sky
  );

}


// =====================================================
// AGUA
// =====================================================

function createWater() {

  water =
    new THREE.Mesh(

      new THREE.CircleGeometry(
        55,
        80
      ),

      new THREE.MeshPhysicalMaterial({
        color: 0x237da0,
        transparent: true,
        opacity: 0.78,
        roughness: 0.15
      })

    );


  water.rotation.x =
    -Math.PI / 2;


  water.position.set(
    100,
    0.08,
    70
  );


  scene.add(
    water
  );

}


// =====================================================
// CAMINOS
// =====================================================

function createPaths() {

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x8d704d,
      roughness: 1
    });


  const paths = [

    [0, 0, 25, 520],

    [0, 0, 520, 25],

    [-120, -70, 350, 18],

    [120, 110, 280, 16]

  ];


  for (
    const [x, z, w, h]
    of paths
  ) {

    const path =
      new THREE.Mesh(

        new THREE.PlaneGeometry(
          w,
          h
        ),

        material

      );


    path.rotation.x =
      -Math.PI / 2;


    path.position.set(
      x,
      0.03,
      z
    );


    scene.add(
      path
    );

  }

}


// =====================================================
// ALDEA
// =====================================================

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

      createHouse(
        x,
        z,
        index
      );

    }
  );


  const plaza =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        42,
        42,
        0.5,
        64
      ),

      new THREE.MeshStandardMaterial({
        color: 0x9a8a70,
        roughness: 0.9
      })

    );


  plaza.position.y =
    0.25;


  plaza.receiveShadow =
    true;


  scene.add(
    plaza
  );

}


// =====================================================
// CASAS
// =====================================================

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
          ? 0x8f6042
          : 0x9b6948,

      roughness:
        0.85

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

      new THREE.MeshStandardMaterial({
        color: 0x50312a,
        roughness: 0.9
      })

    );


  roof.rotation.y =
    Math.PI / 4;


  roof.position.y =
    14;


  group.add(
    roof
  );


  scene.add(
    group
  );


  houses.push(
    group
  );

}


// =====================================================
// BOSQUE
// =====================================================

function createForest() {

  for (
    let i = 0;
    i < 230;
    i++
  ) {

    const angle =
      Math.random() *
      Math.PI *
      2;


    const radius =
      THREE.MathUtils.randFloat(
        130,
        320
      );


    const tree =
      createTree();


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


    scene.add(
      tree
    );


    vegetation.push(
      tree
    );

  }

}


function createTree() {

  const group =
    new THREE.Group();


  const trunk =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        0.7,
        1.2,
        9,
        10
      ),

      new THREE.MeshStandardMaterial({
        color: 0x62402a
      })

    );


  trunk.position.y =
    4.5;


  group.add(
    trunk
  );


  const leavesMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x326f3d
    });


  for (
    let i = 0;
    i < 9;
    i++
  ) {

    const leaves =
      new THREE.Mesh(

        new THREE.IcosahedronGeometry(
          THREE.MathUtils.randFloat(
            2.5,
            4.5
          ),
          1
        ),

        leavesMaterial

      );


    leaves.position.set(

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


    group.add(
      leaves
    );

  }


  group.userData.wind =
    Math.random() *
    Math.PI *
    2;


  return group;

}


// =====================================================
// MONTAÑAS
// =====================================================

function createMountains() {

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x45574e,
      roughness: 1
    });


  for (
    let i = 0;
    i < 28;
    i++
  ) {

    const angle =
      (i / 28) *
      Math.PI *
      2;


    const mountain =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          THREE.MathUtils.randFloat(
            25,
            45
          ),

          THREE.MathUtils.randFloat(
            50,
            100
          ),

          8
        ),

        material

      );


    mountain.position.set(

      Math.cos(angle) *
        325,

      25,

      Math.sin(angle) *
        325

    );


    scene.add(
      mountain
    );

  }

}


// =====================================================
// CASTILLO
// =====================================================

function createCastle() {

  const group =
    new THREE.Group();


  group.position.set(
    250,
    0,
    230
  );


  const stone =
    new THREE.MeshStandardMaterial({
      color: 0x68737b,
      roughness: 0.9
    });


  const wall =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        70,
        28,
        45
      ),

      stone

    );


  wall.position.y =
    14;


  group.add(
    wall
  );


  scene.add(
    group
  );

}


// =====================================================
// CRISTALES
// =====================================================

function createCrystals() {

  const material =
    new THREE.MeshStandardMaterial({

      color: 0xb47cff,

      emissive: 0x6d2eff,

      emissiveIntensity: 2

    });


  for (
    let i = 0;
    i < 40;
    i++
  ) {

    const crystal =
      new THREE.Mesh(

        new THREE.OctahedronGeometry(
          THREE.MathUtils.randFloat(
            0.8,
            2.4
          )
        ),

        material

      );


    crystal.position.set(

      THREE.MathUtils.randFloat(
        -300,
        300
      ),

      THREE.MathUtils.randFloat(
        1,
        3
      ),

      THREE.MathUtils.randFloat(
        -300,
        300
      )

    );


    crystal.userData.phase =
      Math.random() *
      Math.PI *
      2;


    scene.add(
      crystal
    );

  }

}


// =====================================================
// ⭐ PERSONAJE 3D REAL
// =====================================================

async function loadPlayer() {

  try {

    console.log(
      "Cargando personaje..."
    );


    const gltf =
      await loader.loadAsync(
        assets.character
      );


    player =
      gltf.scene;


    player.position.set(
      0,
      0,
      25
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

        }

      }
    );


    scene.add(
      player
    );


    console.log(
      "✅ PERSONAJE 3D CARGADO"
    );


    // ===============================================
    // ANIMACIONES
    // ===============================================

    mixer =
      new THREE.AnimationMixer(
        player
      );


    try {

      const animations =
        await loader.loadAsync(
          assets.animations
        );


      console.log(
        "Animaciones encontradas:",
        animations.animations.length
      );


      /*
       * Por ahora NO aplicamos automáticamente
       * las animaciones.
       *
       * Primero verificamos que el personaje
       * y el GLB carguen correctamente.
       */

    } catch (animationError) {

      console.warn(
        "No se pudieron cargar las animaciones:",
        animationError
      );

    }


    showToast(
      "✨ Personaje 3D cargado"
    );


  } catch (error) {

    console.error(
      "❌ ERROR DEL PERSONAJE:",
      error
    );


    showToast(
      "❌ No se pudo cargar el personaje."
    );

  }

}


// =====================================================
// MOVIMIENTO
// =====================================================

function updateMovement(
  delta
) {

  if (!player)
    return;


  let x =
    moveX;


  let y =
    moveY;


  if (
    keys["w"] ||
    keys["W"] ||
    keys["ArrowUp"]
  )
    y += 1;


  if (
    keys["s"] ||
    keys["S"] ||
    keys["ArrowDown"]
  )
    y -= 1;


  if (
    keys["a"] ||
    keys["A"] ||
    keys["ArrowLeft"]
  )
    x -= 1;


  if (
    keys["d"] ||
    keys["D"] ||
    keys["ArrowRight"]
  )
    x += 1;


  const length =
    Math.hypot(
      x,
      y
    );


  if (
    length > 0
  ) {

    x /= length;
    y /= length;

    moving = true;

  } else {

    moving = false;

  }


  player.position.x +=
    x *
    PLAYER_SPEED *
    delta;


  player.position.z -=
    y *
    PLAYER_SPEED *
    delta;


  const limit =
    WORLD_SIZE / 2 -
    15;


  player.position.x =
    THREE.MathUtils.clamp(
      player.position.x,
      -limit,
      limit
    );


  player.position.z =
    THREE.MathUtils.clamp(
      player.position.z,
      -limit,
      limit
    );


  if (moving) {

    player.rotation.y =
      Math.atan2(
        x,
        y
      );

  }

}


// =====================================================
// JOYSTICK
// =====================================================

function setupJoystick() {

  const joystick =
    $("joystick");


  const stick =
    $("stick");


  if (
    !joystick ||
    !stick
  )
    return;


  function move(
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


    const max =
      rect.width / 2 -
      stick.offsetWidth / 2 -
      5;


    const distance =
      Math.hypot(
        dx,
        dy
      );


    if (
      distance > max
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


    stick.style.transform =
      `translate(${dx}px,${dy}px)`;


    moveX =
      dx / max;


    moveY =
      -dy / max;

  }


  joystick.addEventListener(
    "pointerdown",
    event => {

      joystickPointer =
        event.pointerId;


      joystick.setPointerCapture(
        event.pointerId
      );


      move(event);

    }
  );


  joystick.addEventListener(
    "pointermove",
    event => {

      if (
        event.pointerId !==
        joystickPointer
      )
        return;


      move(event);

    }
  );


  function release() {

    joystickPointer =
      null;


    moveX =
      0;


    moveY =
      0;


    stick.style.transform =
      "translate(0,0)";

  }


  joystick.addEventListener(
    "pointerup",
    release
  );


  joystick.addEventListener(
    "pointercancel",
    release
  );


  joystick.addEventListener(
    "lostpointercapture",
    release
  );

}


// =====================================================
// TECLADO
// =====================================================

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


// =====================================================
// COMBATE
// =====================================================

function setupCombat() {

  document
    .querySelectorAll(
      ".combat button"
    )
    .forEach(
      button => {

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

}


function castSpell(
  type
) {

  const costs = {

    fire: 20,

    water: 20,

    arcane: 30,

    attack: 0

  };


  const cost =
    costs[type] ??
    20;


  if (
    mana < cost
  ) {

    showToast(
      "💧 No tenés suficiente maná."
    );

    return;

  }


  mana -=
    cost;


  updateBars();


  if (socket) {

    socket.emit(
      "spell",
      {
        type,
        username:
          state.username
      }
    );

  }


  showToast(
    `✨ ${type}`
  );

}


// =====================================================
// BARRAS
// =====================================================

function updateBars() {

  if ($("hp"))
    $("hp").textContent =
      Math.round(hp);


  if ($("mana"))
    $("mana").textContent =
      Math.round(mana);


  if ($("hpbar"))
    $("hpbar").style.width =
      `${hp}%`;


  if ($("manabar"))
    $("manabar").style.width =
      `${mana}%`;

}


// =====================================================
// CHAT
// =====================================================

function setupChat() {

  const chat =
    $("chat");


  const toggle =
    $("chatToggle");


  const form =
    $("form");


  const input =
    $("input");


  toggle?.addEventListener(
    "click",
    () => {

      chat?.classList.toggle(
        "chatMin"
      );

    }
  );


  form?.addEventListener(
    "submit",
    event => {

      event.preventDefault();


      const message =
        input?.value.trim();


      if (!message)
        return;


      if (socket) {

        socket.emit(
          "chat",
          message
        );

      } else {

        addChatMessage(
          state.username,
          message
        );

      }


      input.value =
        "";

    }
  );


  socket?.on(
    "chat",
    message => {

      addChatMessage(
        "Jugador",
        message
      );

    }
  );


  socket?.on(
    "system",
    message => {

      addSystemMessage(
        message
      );

    }
  );

}


function addChatMessage(
  username,
  message
) {

  const msgs =
    $("msgs");


  if (!msgs)
    return;


  const p =
    document.createElement(
      "p"
    );


  p.className =
    "msg";


  const b =
    document.createElement(
      "b"
    );


  b.textContent =
    username +
    ": ";


  p.appendChild(
    b
  );


  p.appendChild(
    document.createTextNode(
      message
    )
  );


  msgs.appendChild(
    p
  );


  msgs.scrollTop =
    msgs.scrollHeight;

}


function addSystemMessage(
  message
) {

  const msgs =
    $("msgs");


  if (!msgs)
    return;


  const p =
    document.createElement(
      "p"
    );


  p.className =
    "sys";


  p.textContent =
    message;


  msgs.appendChild(
    p
  );

}


// =====================================================
// MAPA
// =====================================================

function setupMap() {

  $("mapBtn")?.addEventListener(
    "click",
    () => {

      if ($("map"))
        $("map").hidden =
          false;

    }
  );


  $("sideMap")?.addEventListener(
    "click",
    () => {

      if ($("map"))
        $("map").hidden =
          false;

    }
  );


  $("closeMap")?.addEventListener(
    "click",
    () => {

      if ($("map"))
        $("map").hidden =
          true;

    }
  );

}


// =====================================================
// CÓMO JUGAR
// =====================================================

function setupHowTo() {

  $("how")?.addEventListener(
    "click",
    () => {

      if ($("howModal"))
        $("howModal").hidden =
          false;

    }
  );


  $("closeHow")?.addEventListener(
    "click",
    () => {

      if ($("howModal"))
        $("howModal").hidden =
          true;

    }
  );


  $("okHow")?.addEventListener(
    "click",
    () => {

      if ($("howModal"))
        $("howModal").hidden =
          true;

    }
  );

}


// =====================================================
// ACTUALIZACIÓN
// =====================================================

function animate() {

  requestAnimationFrame(
    animate
  );


  const delta =
    Math.min(
      clock.getDelta(),
      0.05
    );


  updateMovement(
    delta
  );


  updateCamera();


  updateVegetation();


  updateWater();


  updateCrystals();


  mana =
    Math.min(
      100,
      mana +
        delta *
        4
    );


  updateBars();


  if (mixer) {

    mixer.update(
      delta
    );

  }


  renderer.render(
    scene,
    camera
  );

}


// =====================================================
// CÁMARA
// =====================================================

function updateCamera() {

  if (!player)
    return;


  const target =
    new THREE.Vector3(
      player.position.x,
      4,
      player.position.z
    );


  const desired =
    new THREE.Vector3(
      player.position.x,
      28,
      player.position.z + 38
    );


  camera.position.lerp(
    desired,
    0.08
  );


  camera.lookAt(
    target
  );

}


// =====================================================
// VIENTO
// =====================================================

function updateVegetation() {

  const time =
    clock.elapsedTime;


  for (
    const tree
    of vegetation
  ) {

    const phase =
      tree.userData.wind ||
      0;


    tree.rotation.z =
      Math.sin(
        time * 1.2 +
        phase
      ) *
      0.025;


    tree.rotation.x =
      Math.cos(
        time * 0.9 +
        phase
      ) *
      0.018;

  }

}


// =====================================================
// AGUA
// =====================================================

function updateWater() {

  if (!water)
    return;


  const time =
    clock.elapsedTime;


  water.scale.set(

    1 +
      Math.sin(
        time * 1.4
      ) *
      0.008,

    1,

    1 +
      Math.cos(
        time * 1.2
      ) *
      0.008

  );

}


// =====================================================
// CRISTALES
// =====================================================

function updateCrystals() {

  scene?.traverse(
    object => {

      if (
        object.userData &&
        object.userData.phase !==
          undefined
      ) {

        object.rotation.y +=
          0.01;


        object.position.y =
          2 +
          Math.sin(
            clock.elapsedTime *
              2 +
              object.userData.phase
          ) *
          0.4;

      }

    }
  );

}


// =====================================================
// TOAST
// =====================================================

function showToast(
  message
) {

  const toast =
    $("toast");


  if (!toast)
    return;


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    window.toastTimer
  );


  window.toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


// =====================================================
// RESIZE
// =====================================================

function resize() {

  if (
    !camera ||
    !renderer
  )
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


updateBars();
