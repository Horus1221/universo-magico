import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const socket = typeof io === "function" ? io() : null;
const $ = (id) => document.getElementById(id);

const home = $("home");
const game = $("game");
const sceneEl = $("scene");

let renderer, scene, camera, clock;
let player = null;
let mixer = null;
let animationActions = {};
let currentAction = null;
let water = null;
let mana = 100;
let hp = 100;
let moving = false;
let moveX = 0;
let moveY = 0;
let joystickPointer = null;
let registerMode = false;
let toastTimer = null;

const keys = {};
const houses = [];
const vegetation = [];

const WORLD_SIZE = 700;
const MOVE_SPEED = 13;

const state = {
  username: "Aventurero",
  insideHouse: false,
  currentHouse: null,
  currentInterior: null,
  lastZone: "Aldea Central"
};

const assets = {
  character: "/assets/characters/Superhero_Male_FullBody.gltf",
  animations: "/assets/characters/UAL1_Standard.glb"
};

const loader = new GLTFLoader();

/* =========================================================
   AUTH
   ========================================================= */

$("tabLogin")?.addEventListener("click", () => {
  registerMode = false;
  $("tabLogin")?.classList.add("active");
  $("tabRegister")?.classList.remove("active");
  if ($("authSubmit")) $("authSubmit").textContent = "⚡ ENTRAR AL UNIVERSO";
});

$("tabRegister")?.addEventListener("click", () => {
  registerMode = true;
  $("tabRegister")?.classList.add("active");
  $("tabLogin")?.classList.remove("active");
  if ($("authSubmit")) $("authSubmit").textContent = "✨ CREAR PERSONAJE";
});

$("authForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = $("username")?.value.trim();
  const password = $("password")?.value || "";

  if (!username || username.length < 3) {
    showAuthMessage("El usuario debe tener al menos 3 caracteres.");
    return;
  }
  if (password.length < 6) {
    showAuthMessage("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  if ($("authSubmit")) {
    $("authSubmit").disabled = true;
    $("authSubmit").textContent = "CARGANDO...";
  }

  try {
    const endpoint = registerMode ? "/api/register" : "/api/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 404) {
        startGame(username);
        return;
      }
      throw new Error(data.error || "No se pudo iniciar sesión.");
    }

    localStorage.setItem("universo_magico_user", JSON.stringify(data));
    startGame(username);
  } catch (error) {
    showAuthMessage(error.message || "No se pudo conectar con el servidor.");
  } finally {
    if ($("authSubmit")) {
      $("authSubmit").disabled = false;
      $("authSubmit").textContent = registerMode
        ? "✨ CREAR PERSONAJE"
        : "⚡ ENTRAR AL UNIVERSO";
    }
  }
});

$("guest")?.addEventListener("click", () => startGame("Aventurero"));

function showAuthMessage(message) {
  const element = $("authMsg");
  if (!element) return;
  element.textContent = message;
  setTimeout(() => (element.textContent = ""), 4000);
}

function startGame(username) {
  state.username = username || "Aventurero";

  if ($("hudName")) $("hudName").textContent = state.username;
  if ($("avatar")) $("avatar").textContent = state.username.charAt(0).toUpperCase();

  if (home) home.hidden = true;
  if (game) game.hidden = false;

  if (!renderer) initWorld();
}

/* =========================================================
   THREE.JS WORLD
   ========================================================= */

function initWorld() {
  if ($("map")) $("map").hidden = true;
  if ($("sideMap")) $("sideMap").hidden = true;

  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x86b7d5);
  scene.fog = new THREE.FogExp2(0x86b7d5, 0.0017);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1600
  );
  camera.position.set(0, 28, 38);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setSize(sceneEl?.clientWidth || window.innerWidth, sceneEl?.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  if (sceneEl) sceneEl.appendChild(renderer.domElement);

  const hemisphere = new THREE.HemisphereLight(0xbfe5ff, 0x34472f, 1.8);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff2d2, 3.2);
  sun.position.set(-120, 180, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -250;
  sun.shadow.camera.right = 250;
  sun.shadow.camera.top = 250;
  sun.shadow.camera.bottom = -250;
  scene.add(sun);

  createGround();
  createSky();
  createWater();
  createWorldPaths();
  createVillage();
  createForest();
  createMountains();
  createRuins();
  createCastle();
  createCrystals();

  // The old procedural player is gone.
  // We load the real GLTF character instead.
  loadPlayer();

  setupJoystick();
  setupKeyboard();
  setupCombat();
  setupChat();
  setupMap();
  setupHowTo();
  setupHouseButton();

  window.addEventListener("resize", resize);
  animate();
}

/* =========================================================
   GROUND / SKY / WATER
   ========================================================= */

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 100, 100),
    new THREE.MeshStandardMaterial({ color: 0x416f45, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x5f914f,
    roughness: 1
  });

  for (let i = 0; i < 1000; i++) {
    const blade = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, THREE.MathUtils.randFloat(0.5, 1.5)),
      grassMaterial
    );
    blade.position.set(
      THREE.MathUtils.randFloat(-WORLD_SIZE / 2, WORLD_SIZE / 2),
      0.25,
      THREE.MathUtils.randFloat(-WORLD_SIZE / 2, WORLD_SIZE / 2)
    );
    blade.rotation.y = Math.random() * Math.PI;
    scene.add(blade);
  }
}

function createSky() {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 16),
    new THREE.MeshBasicMaterial({
      color: 0x78a9c9,
      side: THREE.BackSide
    })
  );
  scene.add(sky);

  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5
  });

  for (let i = 0; i < 20; i++) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(THREE.MathUtils.randFloat(10, 25), 16, 8),
      cloudMaterial
    );
    cloud.position.set(
      THREE.MathUtils.randFloat(-300, 300),
      THREE.MathUtils.randFloat(100, 180),
      THREE.MathUtils.randFloat(-300, 300)
    );
    cloud.scale.y = 0.3;
    scene.add(cloud);
  }
}

function createWater() {
  water = new THREE.Mesh(
    new THREE.CircleGeometry(55, 80),
    new THREE.MeshPhysicalMaterial({
      color: 0x237da0,
      transparent: true,
      opacity: 0.78,
      roughness: 0.15,
      metalness: 0.05
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(100, 0.08, 70);
  scene.add(water);
}

function createWorldPaths() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x8d704d,
    roughness: 1
  });

  const paths = [
    [0, 0, 25, 520],
    [0, 0, 520, 25],
    [-120, -70, 350, 18],
    [120, 110, 280, 16]
  ];

  for (const [x, z, w, h] of paths) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      material
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.03, z);
    scene.add(mesh);
  }
}

/* =========================================================
   VILLAGE / HOUSES
   ========================================================= */

function createVillage() {
  const positions = [
    [-55, -45], [-20, -50], [20, -50], [55, -42],
    [-70, 0], [65, 5], [-45, 45], [5, 45],
    [55, 45], [0, 85]
  ];

  positions.forEach(([x, z], i) => {
    houses.push(createDetailedHouse(x, z, i));
  });

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(42, 42, 0.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x9a8a70, roughness: 0.9 })
  );
  plaza.position.y = 0.25;
  plaza.receiveShadow = true;
  scene.add(plaza);

  createFountain();
}

function createDetailedHouse(x, z, index) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: index % 2 ? 0x8f6042 : 0x9b6948,
    roughness: 0.85
  });

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: index % 3 === 0 ? 0x4b3028 : 0x63382d,
    roughness: 0.9
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(22, 10, 18),
    wallMaterial
  );
  body.position.y = 5;
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(15, 9, 4),
    roofMaterial
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 14;
  roof.castShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 5.5, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x39251d, roughness: 0.8 })
  );
  door.position.set(0, 2.75, 9.15);
  group.add(door);

  for (const side of [-1, 1]) {
    const windowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x82c8df,
        emissive: 0x194b60,
        emissiveIntensity: 0.5
      })
    );
    windowMesh.position.set(side * 7, 5.2, 9.15);
    group.add(windowMesh);
  }

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(3, 7, 3),
    new THREE.MeshStandardMaterial({ color: 0x5c514a })
  );
  chimney.position.set(6, 16, -3);
  chimney.castShadow = true;
  group.add(chimney);

  group.userData = { type: "house", index };
  scene.add(group);
  return group;
}

function createFountain() {
  const stone = new THREE.MeshStandardMaterial({
    color: 0x87909a,
    roughness: 0.9
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 10, 1.5, 40),
    stone
  );
  base.position.y = 0.75;
  base.castShadow = true;
  scene.add(base);

  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(7.8, 7.8, 0.3, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0x4bb8d9,
      transparent: true,
      opacity: 0.75
    })
  );
  fountainWater.position.y = 1.5;
  scene.add(fountainWater);
}

/* =========================================================
   FOREST / MOUNTAINS / RUINS / CASTLE / CRYSTALS
   ========================================================= */

function createForest() {
  for (let i = 0; i < 230; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = THREE.MathUtils.randFloat(130, 320);
    const tree = createNaturalTree();

    tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    tree.scale.setScalar(THREE.MathUtils.randFloat(0.8, 1.5));
    scene.add(tree);
    vegetation.push(tree);
  }
}

function createNaturalTree() {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 1.2, 9, 10),
    new THREE.MeshStandardMaterial({ color: 0x62402a, roughness: 1 })
  );
  trunk.position.y = 4.5;
  trunk.castShadow = true;
  group.add(trunk);

  const leavesMaterial = new THREE.MeshStandardMaterial({
    color: 0x326f3d,
    roughness: 1
  });

  for (let i = 0; i < 9; i++) {
    const leaves = new THREE.Mesh(
      new THREE.IcosahedronGeometry(THREE.MathUtils.randFloat(2.5, 4.5), 1),
      leavesMaterial
    );
    leaves.position.set(
      THREE.MathUtils.randFloat(-2, 2),
      THREE.MathUtils.randFloat(7, 12),
      THREE.MathUtils.randFloat(-2, 2)
    );
    leaves.scale.y = THREE.MathUtils.randFloat(0.8, 1.4);
    leaves.castShadow = true;
    group.add(leaves);
  }

  group.userData.wind = Math.random() * Math.PI * 2;
  return group;
}

function createMountains() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x45574e,
    roughness: 1
  });

  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(
        THREE.MathUtils.randFloat(25, 45),
        THREE.MathUtils.randFloat(50, 100),
        8
      ),
      material
    );
    mountain.position.set(Math.cos(angle) * 325, 25, Math.sin(angle) * 325);
    mountain.castShadow = true;
    scene.add(mountain);
  }
}

function createRuins() {
  const group = new THREE.Group();
  group.position.set(230, 0, -170);

  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x686d70,
    roughness: 1
  });

  for (let i = 0; i < 12; i++) {
    const height = THREE.MathUtils.randFloat(6, 14);
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(5, height, 5),
      stoneMaterial
    );
    pillar.position.set(
      THREE.MathUtils.randFloat(-35, 35),
      height / 2,
      THREE.MathUtils.randFloat(-30, 30)
    );
    pillar.rotation.y = Math.random();
    pillar.castShadow = true;
    group.add(pillar);
  }

  scene.add(group);
}

function createCastle() {
  const group = new THREE.Group();
  group.position.set(250, 0, 230);

  const stone = new THREE.MeshStandardMaterial({
    color: 0x68737b,
    roughness: 0.9
  });

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(70, 28, 45),
    stone
  );
  wall.position.y = 14;
  wall.castShadow = true;
  group.add(wall);

  for (const [x, z] of [[-35, -22], [35, -22], [-35, 22], [35, 22]]) {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 11, 42, 16),
      stone
    );
    tower.position.set(x, 21, z);
    tower.castShadow = true;
    group.add(tower);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(12, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x3e2933 })
    );
    roof.position.set(x, 48, z);
    group.add(roof);
  }

  scene.add(group);
}

function createCrystals() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xb47cff,
    emissive: 0x6d2eff,
    emissiveIntensity: 2
  });

  for (let i = 0; i < 40; i++) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(THREE.MathUtils.randFloat(0.8, 2.4)),
      material
    );
    crystal.position.set(
      THREE.MathUtils.randFloat(-300, 300),
      THREE.MathUtils.randFloat(1, 3),
      THREE.MathUtils.randFloat(-300, 300)
    );
    crystal.userData.phase = Math.random() * Math.PI * 2;
    scene.add(crystal);
  }
}

/* =========================================================
   REAL 3D PLAYER + ANIMATIONS
   ========================================================= */

async function loadPlayer() {
  try {
    const gltf = await loader.loadAsync(assets.character);

    player = gltf.scene;
    player.position.set(0, 0, 25);
    player.scale.setScalar(1.8);

    player.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (object.material) {
          object.material.needsUpdate = true;
        }
      }
    });

    scene.add(player);

    mixer = new THREE.AnimationMixer(player);

    // The character file itself has no animations.
    // UAL1 contains the animation clips; both packs use the same humanoid rig names.
    try {
      const animationGLTF = await loader.loadAsync(assets.animations);
      installAnimations(animationGLTF.animations || []);
    } catch (animationError) {
      console.warn("No se pudieron cargar las animaciones:", animationError);
    }

    playAnimation("Idle_Loop", 0.15);
    showToast("✨ Personaje 3D cargado");
  } catch (error) {
    console.error("Error cargando personaje 3D:", error);
    createFallbackPlayer();
    showToast("No se pudo cargar el personaje 3D; usando personaje temporal.");
  }
}

function createFallbackPlayer() {
  if (!scene || player) return;

  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(1.1, 2.6, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x6d4aff, roughness: 0.75 })
  );
  body.position.y = 2.0;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8b58b, roughness: 0.8 })
  );
  head.position.y = 4.1;
  head.castShadow = true;
  group.add(head);

  group.position.set(0, 0, 25);
  player = group;
  scene.add(player);
}

function installAnimations(clips) {
  if (!mixer || !player) return;

  for (const clip of clips) {
    // Only keep clips that have useful bone tracks.
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    animationActions[clip.name] = action;
  }

  // Some animation packs use different capitalization.
  // These aliases make the game code easier to maintain.
  animationActions.idle = animationActions["Idle_Loop"];
  animationActions.walk = animationActions["Walk_Loop"];
  animationActions.jog = animationActions["Jog_Fwd_Loop"];
  animationActions.sprint = animationActions["Sprint_Loop"];
  animationActions.jump = animationActions["Jump_Loop"];
  animationActions.death = animationActions["Death01"];
  animationActions.spell = animationActions["Spell_Simple_Shoot"];
  animationActions.sword = animationActions["Sword_Attack"];
  animationActions.punch = animationActions["Punch_Cross"];
}

function playAnimation(name, fade = 0.18) {
  if (!mixer) return;

  const action = animationActions[name];
  if (!action) return;

  if (currentAction === action) return;

  if (currentAction) {
    currentAction.fadeOut(fade);
  }

  action.reset().fadeIn(fade).play();
  currentAction = action;
}

/* =========================================================
   MOVEMENT
   ========================================================= */

function updateMovement(delta) {
  if (!player) return;

  let x = moveX;
  let y = moveY;

  if (keys["w"] || keys["W"] || keys["ArrowUp"]) y += 1;
  if (keys["s"] || keys["S"] || keys["ArrowDown"]) y -= 1;
  if (keys["a"] || keys["A"] || keys["ArrowLeft"]) x -= 1;
  if (keys["d"] || keys["D"] || keys["ArrowRight"]) x += 1;

  const length = Math.hypot(x, y);

  if (length > 0) {
    x /= length;
    y /= length;
    moving = true;
  } else {
    moving = false;
  }

  const speed = moving ? MOVE_SPEED : 0;

  player.position.x += x * speed * delta;
  player.position.z -= y * speed * delta;

  const limit = WORLD_SIZE / 2 - 15;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);

  if (moving) {
    player.rotation.y = Math.atan2(x, y);
    playAnimation("Walk_Loop", 0.12);
  } else {
    playAnimation("Idle_Loop", 0.16);
  }
}

/* =========================================================
   JOYSTICK / KEYBOARD
   ========================================================= */

function setupJoystick() {
  const joystick = $("joystick");
  const stick = $("stick");
  if (!joystick || !stick) return;

  function move(event) {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;

    const max = rect.width / 2 - stick.offsetWidth / 2 - 5;
    const distance = Math.hypot(dx, dy);

    if (distance > max) {
      dx = (dx / distance) * max;
      dy = (dy / distance) * max;
    }

    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    moveX = dx / max;
    moveY = -dy / max;
  }

  joystick.addEventListener("pointerdown", (event) => {
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    move(event);
  });

  joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId === joystickPointer) move(event);
  });

  function release() {
    joystickPointer = null;
    moveX = 0;
    moveY = 0;
    stick.style.transform = "translate(0,0)";
  }

  joystick.addEventListener("pointerup", release);
  joystick.addEventListener("pointercancel", release);
  joystick.addEventListener("lostpointercapture", release);
}

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    keys[event.key] = true;
  });

  window.addEventListener("keyup", (event) => {
    keys[event.key] = false;
  });
}

/* =========================================================
   COMBAT
   ========================================================= */

function setupCombat() {
  document.querySelectorAll(".combat button").forEach((button) => {
    button.addEventListener("click", () => castSpell(button.dataset.spell));
  });
}

function castSpell(type) {
  const costs = {
    fire: 20,
    water: 20,
    arcane: 30,
    attack: 0
  };

  const cost = costs[type] ?? 20;

  if (mana < cost) {
    showToast("💧 No tenés suficiente maná.");
    return;
  }

  mana -= cost;
  updateBars();

  const icons = {
    fire: "🔥",
    water: "💧",
    arcane: "✦",
    attack: "⚔️"
  };

  const effect = document.createElement("div");
  effect.className = `spellFX ${type}FX`;
  effect.textContent = icons[type] || "✨";
  document.body.appendChild(effect);
  setTimeout(() => effect.remove(), 800);

  if (type === "attack") {
    playAnimation("Sword_Attack", 0.08);
  } else {
    playAnimation("Spell_Simple_Shoot", 0.08);
  }

  if (socket) {
    socket.emit("spell", {
      type,
      username: state.username
    });
  }
}

function updateBars() {
  if ($("hp")) $("hp").textContent = Math.round(hp);
  if ($("mana")) $("mana").textContent = Math.round(mana);
  if ($("hpbar")) $("hpbar").style.width = `${hp}%`;
  if ($("manabar")) $("manabar").style.width = `${mana}%`;
}

/* =========================================================
   CHAT
   ========================================================= */

function setupChat() {
  const chat = $("chat");
  const toggle = $("chatToggle");
  const form = $("form");
  const input = $("input");

  toggle?.addEventListener("click", () => {
    chat?.classList.toggle("chatMin");
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input?.value.trim();
    if (!message) return;

    if (socket) socket.emit("chat", message);
    else addChatMessage(state.username, message);

    input.value = "";
  });

  socket?.on("chat", (message) => addChatMessage("Jugador", message));
  socket?.on("system", (message) => addSystemMessage(message));
}

function addChatMessage(username, message) {
  const msgs = $("msgs");
  if (!msgs) return;

  const p = document.createElement("p");
  p.className = "msg";

  const b = document.createElement("b");
  b.textContent = `${username}: `;

  p.appendChild(b);
  p.appendChild(document.createTextNode(message));
  msgs.appendChild(p);
  msgs.scrollTop = msgs.scrollHeight;
}

function addSystemMessage(message) {
  const msgs = $("msgs");
  if (!msgs) return;

  const p = document.createElement("p");
  p.className = "sys";
  p.textContent = message;
  msgs.appendChild(p);
  msgs.scrollTop = msgs.scrollHeight;
}

/* =========================================================
   MAP / HOW TO / HOUSES
   ========================================================= */

function setupMap() {
  $("mapBtn")?.addEventListener("click", openMap);
  $("sideMap")?.addEventListener("click", openMap);
  $("closeMap")?.addEventListener("click", () => {
    if ($("map")) $("map").hidden = true;
  });
}

function openMap() {
  if ($("map")) $("map").hidden = false;
}

function setupHowTo() {
  $("how")?.addEventListener("click", () => {
    if ($("howModal")) $("howModal").hidden = false;
  });

  $("closeHow")?.addEventListener("click", () => {
    if ($("howModal")) $("howModal").hidden = true;
  });

  $("okHow")?.addEventListener("click", () => {
    if ($("howModal")) $("howModal").hidden = true;
  });
}

function setupHouseButton() {
  $("enterHouse")?.addEventListener("click", enterNearestHouse);
}

function checkHouseProximity() {
  if (!player) return;

  let closest = null;
  let closestDistance = Infinity;

  for (const house of houses) {
    const dx = player.position.x - house.position.x;
    const dz = player.position.z - house.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = house;
    }
  }

  const button = $("enterHouse");
  if (!button) return;

  if (closest && closestDistance < 18 && !state.insideHouse) {
    button.hidden = false;
    state.currentHouse = closest;
  } else {
    button.hidden = true;
  }
}

function enterNearestHouse() {
  if (!state.currentHouse) return;

  state.insideHouse = true;
  if ($("enterHouse")) $("enterHouse").hidden = true;

  createInterior(state.currentHouse);
  showToast("🏠 Entraste a la casa.");
}

function createInterior(house) {
  if (state.currentInterior) {
    scene.remove(state.currentInterior);
  }

  const interior = new THREE.Group();
  interior.position.copy(house.position);
  interior.position.y = 0.1;

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.4, 14),
    new THREE.MeshStandardMaterial({ color: 0x77583e })
  );
  floor.position.y = 0.2;
  interior.add(floor);

  const furnitureMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c3828
  });

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.6, 2.5),
    furnitureMaterial
  );
  table.position.set(0, 2.5, 0);
  interior.add(table);

  const bed = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1, 3),
    furnitureMaterial
  );
  bed.position.set(-5, 1, -4);
  interior.add(bed);

  scene.add(interior);
  state.currentInterior = interior;
}

/* =========================================================
   UPDATE LOOP
   ========================================================= */

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updateMovement(delta);
  updateCamera(delta);
  updateVegetation();
  updateWater();
  updateCrystals();
  checkHouseProximity();
  updateZone();
  regenerateMana(delta);

  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}

function updateCamera(delta) {
  if (!player) return;

  const target = new THREE.Vector3(
    player.position.x,
    4,
    player.position.z
  );

  const desired = new THREE.Vector3(
    player.position.x,
    28,
    player.position.z + 38
  );

  camera.position.lerp(
    desired,
    1 - Math.pow(0.001, delta)
  );

  camera.lookAt(target);
}

function updateVegetation() {
  const time = clock.elapsedTime;

  for (const tree of vegetation) {
    const phase = tree.userData.wind || 0;
    tree.rotation.z = Math.sin(time * 1.2 + phase) * 0.025;
    tree.rotation.x = Math.cos(time * 0.9 + phase) * 0.018;
  }
}

function updateWater() {
  if (!water) return;

  const time = clock.elapsedTime;
  water.scale.set(
    1 + Math.sin(time * 1.4) * 0.008,
    1 + Math.cos(time * 1.1) * 0.008,
    1 + Math.sin(time * 1.7) * 0.008
  );
}

function updateCrystals() {
  if (!scene) return;

  scene.traverse((object) => {
    if (object.userData?.phase !== undefined) {
      object.rotation.y += 0.01;
      object.position.y =
        2 + Math.sin(clock.elapsedTime * 2 + object.userData.phase) * 0.4;
    }
  });
}

function updateZone() {
  if (!player) return;

  const x = player.position.x;
  const z = player.position.z;
  let zone = "Aldea Central";

  if (Math.abs(x) > 120 || Math.abs(z) > 120) zone = "Tierras Salvajes";
  if (x > 160 && z < -100) zone = "Ruinas Antiguas";
  if (x > 170 && z > 150) zone = "Castillo del Trono";
  if (x > 50 && z > 20 && x < 160 && z < 140) zone = "Lago Sagrado";

  if (zone !== state.lastZone) {
    state.lastZone = zone;
    if ($("zone")) $("zone").textContent = zone;
  }
}

function regenerateMana(delta) {
  mana = Math.min(100, mana + delta * 4);
  updateBars();
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function resize() {
  if (!camera || !renderer) return;

  const width = sceneEl?.clientWidth || window.innerWidth;
  const height = sceneEl?.clientHeight || window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

updateBars();
