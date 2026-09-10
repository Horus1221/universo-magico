import * as THREE from "https://esm.sh/three@0.161.0";
import { OrbitControls } from "https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js";

const sceneContainer = document.getElementById("scene");

let scene;
let camera;
let renderer;
let controls;
let player;

let hp = 100;
let energy = 6;
let round = 1;

const socket = io();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101827);

  camera = new THREE.PerspectiveCamera(
    60,
    sceneContainer.clientWidth / sceneContainer.clientHeight,
    0.1,
    1000
  );

  camera.position.set(10, 9, 14);

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setSize(
    sceneContainer.clientWidth,
    sceneContainer.clientHeight
  );

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  sceneContainer.innerHTML = "";
  sceneContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 5;
  controls.maxDistance = 30;

  createLights();
  createWorld();
  createPlayer();

  window.addEventListener("resize", resize);

  animate();
}

function createLights() {
  const ambient = new THREE.AmbientLight(
    0x9bb7ff,
    1.8
  );

  scene.add(ambient);

  const moon = new THREE.DirectionalLight(
    0xffffff,
    2
  );

  moon.position.set(10, 20, 10);
  scene.add(moon);
}

function createWorld() {
  // Terreno
  const groundGeometry = new THREE.PlaneGeometry(
    80,
    80
  );

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x173b32,
    roughness: 1
  });

  const ground = new THREE.Mesh(
    groundGeometry,
    groundMaterial
  );

  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Lago
  const lakeGeometry = new THREE.CircleGeometry(
    10,
    48
  );

  const lakeMaterial = new THREE.MeshStandardMaterial({
    color: 0x176b91,
    transparent: true,
    opacity: 0.8,
    roughness: 0.2,
    metalness: 0.1
  });

  const lake = new THREE.Mesh(
    lakeGeometry,
    lakeMaterial
  );

  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-10, 0.03, -5);

  scene.add(lake);

  // Árboles
  for (let i = 0; i < 35; i++) {
    createTree(
      (Math.random() - 0.5) * 65,
      (Math.random() - 0.5) * 65
    );
  }

  // Cristales mágicos
  for (let i = 0; i < 18; i++) {
    createCrystal(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50
    );
  }

  // Tronos
  createThrone(-18, -14);
  createThrone(18, 12);

  // Runa central
  createRune(0, 0);
}

function createTree(x, z) {
  const trunkGeometry = new THREE.CylinderGeometry(
    0.35,
    0.55,
    3,
    6
  );

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x543821
  });

  const trunk = new THREE.Mesh(
    trunkGeometry,
    trunkMaterial
  );

  trunk.position.set(x, 1.5, z);

  scene.add(trunk);

  const crownGeometry = new THREE.ConeGeometry(
    2.2,
    4.5,
    7
  );

  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0x17633f
  });

  const crown = new THREE.Mesh(
    crownGeometry,
    crownMaterial
  );

  crown.position.set(x, 5, z);

  scene.add(crown);
}

function createCrystal(x, z) {
  const geometry = new THREE.OctahedronGeometry(
    0.8,
    0
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0x9c5cff,
    emissive: 0x5425aa,
    emissiveIntensity: 1
  });

  const crystal = new THREE.Mesh(
    geometry,
    material
  );

  crystal.position.set(
    x,
    0.8,
    z
  );

  crystal.rotation.y =
    Math.random() * Math.PI;

  scene.add(crystal);
}

function createThrone(x, z) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b6b32,
    metalness: 0.5,
    roughness: 0.4
  });

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.6, 2),
    material
  );

  seat.position.set(x, 1.5, z);

  scene.add(seat);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(3, 4, 0.6),
    material
  );

  back.position.set(x, 3.4, z + 0.7);

  scene.add(back);

  for (const dx of [-1.1, 1.1]) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.25,
        0.25,
        4,
        8
      ),
      material
    );

    pillar.position.set(
      x + dx,
      3.5,
      z + 0.7
    );

    scene.add(pillar);
  }
}

function createRune(x, z) {
  const geometry = new THREE.RingGeometry(
    3,
    3.15,
    64
  );

  const material = new THREE.MeshBasicMaterial({
    color: 0x8f6cff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  const rune = new THREE.Mesh(
    geometry,
    material
  );

  rune.rotation.x = -Math.PI / 2;

  rune.position.set(
    x,
    0.06,
    z
  );

  scene.add(rune);
}

function createPlayer() {
  player = new THREE.Group();

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x4d6cff
    });

  const skinMaterial =
    new THREE.MeshStandardMaterial({
      color: 0xd9a27d
    });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.7,
      0.9,
      1.8,
      8
    ),
    bodyMaterial
  );

  body.position.y = 1.2;

  player.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.65,
      16,
      16
    ),
    skinMaterial
  );

  head.position.y = 2.65;

  player.add(head);

  // Capa
  const capeMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x29164d,
      side: THREE.DoubleSide
    });

  const cape = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.8),
    capeMaterial
  );

  cape.position.set(
    0,
    1.6,
    0.65
  );

  cape.rotation.x = -0.15;

  player.add(cape);

  player.position.set(
    0,
    0,
    8
  );

  scene.add(player);
}

function updateStats() {
  const hpElement =
    document.getElementById("hp");

  const energyElement =
    document.getElementById("energy");

  const roundElement =
    document.getElementById("round");

  if (hpElement) {
    hpElement.textContent = hp;
  }

  if (energyElement) {
    energyElement.textContent = energy;
  }

  if (roundElement) {
    roundElement.textContent = round;
  }
}

function useSpell(type) {
  if (energy <= 0) {
    addMessage(
      "No tenés suficiente energía.",
      "system"
    );

    return;
  }

  energy--;

  if (type === "fire") {
    addMessage(
      "🔥 Lanzaste un hechizo de fuego.",
      "system"
    );
  }

  if (type === "water") {
    hp = Math.min(100, hp + 20);

    addMessage(
      "💧 Recuperaste 20 puntos de vida.",
      "system"
    );
  }

  if (type === "magic") {
    addMessage(
      "✨ Una poderosa energía mágica te rodea.",
      "system"
    );
  }

  updateStats();

  socket.emit("spell", {
    type
  });
}

function addMessage(message, type = "") {
  const messages =
    document.getElementById("msgs");

  if (!messages) return;

  const div =
    document.createElement("div");

  div.className = `msg ${type}`;

  div.textContent = message;

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;
}

document
  .querySelectorAll("[data-e]")
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        useSpell(
          button.dataset.e
        );
      }
    );
  });

document
  .getElementById("end")
  ?.addEventListener(
    "click",
    () => {
      round++;

      energy = 6;

      addMessage(
        `🌙 Comenzó la ronda ${round}.`,
        "system"
      );

      updateStats();
    }
  );

document
  .getElementById("play")
  ?.addEventListener(
    "click",
    () => {
      document.getElementById(
        "home"
      ).style.display = "none";

      document.getElementById(
        "game"
      ).style.display = "block";

      setTimeout(() => {
        init();
      }, 100);
    }
  );

const modal =
  document.getElementById("modal");

document
  .getElementById("how")
  ?.addEventListener(
    "click",
    () => {
      modal.classList.add("show");
    }
  );

document
  .getElementById("close")
  ?.addEventListener(
    "click",
    () => {
      modal.classList.remove("show");
    }
  );

document
  .getElementById("ok")
  ?.addEventListener(
    "click",
    () => {
      modal.classList.remove("show");
    }
  );

// Chat
const form =
  document.getElementById("form");

const input =
  document.getElementById("input");

form?.addEventListener(
  "submit",
  event => {
    event.preventDefault();

    const message =
      input.value.trim();

    if (!message) return;

    socket.emit(
      "chat",
      message
    );

    input.value = "";
  }
);

socket.on(
  "chat",
  message => {
    addMessage(
      message
    );
  }
);

socket.on(
  "system",
  message => {
    addMessage(
      message,
      "system"
    );
  }
);

socket.on(
  "connect",
  () => {
    console.log(
      "Conectado al servidor"
    );
  }
);

function resize() {
  if (!renderer) return;

  camera.aspect =
    sceneContainer.clientWidth /
    sceneContainer.clientHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    sceneContainer.clientWidth,
    sceneContainer.clientHeight
  );
}

function animate() {
  requestAnimationFrame(
    animate
  );

  if (controls) {
    controls.update();
  }

  if (player) {
    player.rotation.y += 0.002;
  }

  renderer.render(
    scene,
    camera
  );
}

updateStats();
