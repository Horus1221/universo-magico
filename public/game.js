import * as THREE from "https://esm.sh/three@0.161.0";
import { OrbitControls } from "https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js";

const socket = io();

const box = document.getElementById("scene");

let scene;
let camera;
let renderer;
let controls;
let player;

let hp = 100;
let mana = 100;

let moving = {
  x: 0,
  z: 0
};

const keys = {};

const clock = new THREE.Clock();


// =====================================================
// MATERIALES
// =====================================================

function material(color, emissive = 0x000000) {

  return new THREE.MeshStandardMaterial({

    color,

    emissive,

    emissiveIntensity:
      emissive !== 0x000000 ? 1.2 : 0,

    roughness: .85,

    metalness: .05

  });

}


// =====================================================
// AÑADIR OBJETO
// =====================================================

function add(object) {

  scene.add(object);

  return object;

}


// =====================================================
// TERRENO
// =====================================================

function createGround() {

  const geometry =
    new THREE.PlaneGeometry(
      220,
      220,
      30,
      30
    );

  const materialGround =
    new THREE.MeshStandardMaterial({

      color: 0x285c3b,

      roughness: 1

    });

  const ground =
    new THREE.Mesh(
      geometry,
      materialGround
    );

  ground.rotation.x =
    -Math.PI / 2;

  ground.receiveShadow = true;

  add(ground);


  // pequeñas zonas de hierba

  for (let i = 0; i < 700; i++) {

    const grass =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          .035,
          .25 + Math.random() * .3,
          3
        ),

        material(
          0x397447
        )

      );

    grass.position.set(

      (Math.random() - .5) * 210,

      .12,

      (Math.random() - .5) * 210

    );

    grass.rotation.y =
      Math.random() * Math.PI;

    add(grass);

  }

}


// =====================================================
// ÁRBOLES
// =====================================================

function createTree(x, z, scale = 1) {

  const tree =
    new THREE.Group();


  const trunk =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        .35 * scale,
        .6 * scale,
        3 * scale,
        8
      ),

      material(
        0x5a3b24
      )

    );

  trunk.position.y =
    1.5 * scale;

  trunk.castShadow = true;

  tree.add(trunk);


  const leaves1 =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        2.4 * scale,
        4.5 * scale,
        9
      ),

      material(
        0x185a38
      )

    );

  leaves1.position.y =
    4 * scale;

  leaves1.castShadow = true;

  tree.add(leaves1);


  const leaves2 =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        1.7 * scale,
        3.4 * scale,
        9
      ),

      material(
        0x237047
      )

    );

  leaves2.position.y =
    5.5 * scale;

  leaves2.castShadow = true;

  tree.add(leaves2);


  tree.position.set(
    x,
    0,
    z
  );

  add(tree);

}


// =====================================================
// BOSQUE
// =====================================================

function createForest() {

  for (let i = 0; i < 150; i++) {

    let x =
      (Math.random() - .5) * 200;

    let z =
      (Math.random() - .5) * 200;


    // deja libre la aldea central

    if (
      Math.abs(x) < 18 &&
      Math.abs(z) < 18
    ) {

      i--;

      continue;

    }


    createTree(
      x,
      z,
      .65 + Math.random() * .75
    );

  }

}


// =====================================================
// CASAS
// =====================================================

function createHouse(x, z) {

  const house =
    new THREE.Group();


  const walls =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        5,
        3.2,
        4.5
      ),

      material(
        0x806449
      )

    );

  walls.position.y =
    1.6;

  walls.castShadow = true;

  house.add(walls);


  const roof =
    new THREE.Mesh(

      new THREE.ConeGeometry(
        3.8,
        2.5,
        4
      ),

      material(
        0x4b3024
      )

    );

  roof.position.y =
    4.3;

  roof.rotation.y =
    Math.PI / 4;

  roof.castShadow = true;

  house.add(roof);


  // puerta

  const door =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        .9,
        1.8,
        .15
      ),

      material(
        0x2b1a13
      )

    );

  door.position.set(
    0,
    .9,
    2.3
  );

  house.add(door);


  // ventanas

  for (
    const side of [-1, 1]
  ) {

    const window =
      new THREE.Mesh(

        new THREE.BoxGeometry(
          .75,
          .8,
          .12
        ),

        new THREE.MeshStandardMaterial({

          color: 0x82dfff,

          emissive: 0x3bbfff,

          emissiveIntensity: 1.5

        })

      );

    window.position.set(
      side * 1.3,
      1.8,
      2.3
    );

    house.add(window);

  }


  house.position.set(
    x,
    0,
    z
  );

  add(house);

}


// =====================================================
// ALDEA
// =====================================================

function createVillage() {

  const positions = [

    [-10, -9],
    [0, -11],
    [10, -9],
    [-11, 4],
    [11, 5],
    [-7, 11],
    [7, 11]

  ];


  positions.forEach(
    p =>
      createHouse(
        p[0],
        p[1]
      )
  );


  // plaza

  const plaza =
    new THREE.Mesh(

      new THREE.CircleGeometry(
        8,
        32
      ),

      material(
        0x8c704e
      )

    );

  plaza.rotation.x =
    -Math.PI / 2;

  plaza.position.y =
    .025;

  add(plaza);


  // fuente

  const fountain =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        2.3,
        2.5,
        .5,
        24
      ),

      material(
        0x737c86
      )

    );

  fountain.position.y =
    .25;

  add(fountain);


  const water =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        1.8,
        1.8,
        .1,
        24
      ),

      new THREE.MeshStandardMaterial({

        color: 0x39c8ef,

        emissive: 0x147da0,

        emissiveIntensity: 1

      })

    );

  water.position.y =
    .55;

  add(water);

}


// =====================================================
// LAGO
// =====================================================

function createLake() {

  const lake =
    new THREE.Mesh(

      new THREE.CircleGeometry(
        20,
        64
      ),

      new THREE.MeshStandardMaterial({

        color: 0x1c7190,

        transparent: true,

        opacity: .82,

        roughness: .12,

        metalness: .15

      })

    );

  lake.rotation.x =
    -Math.PI / 2;

  lake.position.set(
    38,
    .05,
    30
  );

  add(lake);


  // pequeñas islas

  for (let i = 0; i < 8; i++) {

    const rock =
      new THREE.Mesh(

        new THREE.DodecahedronGeometry(
          1 + Math.random()
        ),

        material(
          0x52665c
        )

      );

    rock.position.set(

      38 +
      (Math.random() - .5) * 25,

      .4,

      30 +
      (Math.random() - .5) * 25

    );

    add(rock);

  }

}


// =====================================================
// CRISTALES
// =====================================================

function createCrystal(x, z) {

  const group =
    new THREE.Group();


  const crystal =
    new THREE.Mesh(

      new THREE.OctahedronGeometry(
        1.15
      ),

      new THREE.MeshStandardMaterial({

        color: 0xa66cff,

        emissive: 0x6a2cff,

        emissiveIntensity: 1.7,

        roughness: .2,

        metalness: .25

      })

    );

  crystal.position.y =
    1.15;

  crystal.castShadow = true;

  group.add(crystal);


  const light =
    new THREE.PointLight(
      0x9b63ff,
      2.5,
      8
    );

  light.position.y =
    1.5;

  group.add(light);


  group.position.set(
    x,
    0,
    z
  );

  group.userData.crystal =
    true;

  add(group);

}


// =====================================================
// CRISTALES DEL REINO
// =====================================================

function createCrystals() {

  for (let i = 0; i < 35; i++) {

    let x =
      (Math.random() - .5) * 180;

    let z =
      (Math.random() - .5) * 180;


    if (
      Math.abs(x) < 20 &&
      Math.abs(z) < 20
    ) {

      i--;

      continue;

    }


    createCrystal(
      x,
      z
    );

  }

}


// =====================================================
// CASTILLO
// =====================================================

function createCastle() {

  const castle =
    new THREE.Group();


  const main =
    new THREE.Mesh(

      new THREE.BoxGeometry(
        14,
        8,
        10
      ),

      material(
        0x535966
      )

    );

  main.position.y =
    4;

  main.castShadow = true;

  castle.add(main);


  for (
    const x of [-7, 7]
  ) {

    for (
      const z of [-5, 5]
    ) {

      const tower =
        new THREE.Mesh(

          new THREE.CylinderGeometry(
            2,
            2.3,
            12,
            10
          ),

          material(
            0x444852
          )

        );

      tower.position.set(
        x,
        6,
        z
      );

      tower.castShadow = true;

      castle.add(tower);


      const roof =
        new THREE.Mesh(

          new THREE.ConeGeometry(
            2.8,
            3,
            10
          ),

          material(
            0x30253e
          )

        );

      roof.position.set(
        x,
        13,
        z
      );

      castle.add(roof);

    }

  }


  castle.position.set(
    65,
    0,
    -55
  );

  add(castle);

}


// =====================================================
// MONTAÑAS
// =====================================================

function createMountains() {

  for (let i = 0; i < 25; i++) {

    const mountain =
      new THREE.Mesh(

        new THREE.ConeGeometry(
          8 + Math.random() * 8,
          15 + Math.random() * 20,
          7
        ),

        material(
          0x35454a
        )

      );

    const angle =
      Math.random() * Math.PI * 2;

    const distance =
      85 + Math.random() * 20;

    mountain.position.set(

      Math.cos(angle) *
      distance,

      8,

      Math.sin(angle) *
      distance

    );

    mountain.castShadow = true;

    add(mountain);

  }

}


// =====================================================
// PERSONAJE
// =====================================================

function createPlayer() {

  player =
    new THREE.Group();


  // cuerpo

  const body =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        .7,
        .95,
        1.8,
        10
      ),

      material(
        0x5145a4
      )

    );

  body.position.y =
    1.25;

  body.castShadow = true;

  player.add(body);


  // cabeza

  const head =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        .65,
        20,
        16
      ),

      material(
        0xd8a17d
      )

    );

  head.position.y =
    2.65;

  head.castShadow = true;

  player.add(head);


  // pelo

  const hair =
    new THREE.Mesh(

      new THREE.SphereGeometry(
        .68,
        20,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      ),

      material(
        0x493021
      )

    );

  hair.position.y =
    2.85;

  player.add(hair);


  // capa

  const cape =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        2,
        3
      ),

      new THREE.MeshStandardMaterial({

        color: 0x17122c,

        side:
          THREE.DoubleSide

      })

    );

  cape.position.set(
    0,
    1.55,
    .7
  );

  cape.rotation.x =
    -.12;

  player.add(cape);


  // bastón

  const staff =
    new THREE.Mesh(

      new THREE.CylinderGeometry(
        .08,
        .11,
        3.4,
        8
      ),

      material(
        0x5a3823
      )

    );

  staff.position.set(
    .9,
    1.65,
    0
  );

  staff.rotation.z =
    -.15;

  player.add(staff);


  // gema del bastón

  const gem =
    new THREE.Mesh(

      new THREE.OctahedronGeometry(
        .3
      ),

      new THREE.MeshStandardMaterial({

        color: 0xb25cff,

        emissive: 0x7225d8,

        emissiveIntensity: 2

      })

    );

  gem.position.set(
    1.1,
    3.25,
    0
  );

  player.add(gem);


  player.position.set(
    0,
    0,
    8
  );


  player.userData.walkTime =
    0;


  add(player);

}


// =====================================================
// LUCES
// =====================================================

function createLights() {

  const hemi =
    new THREE.HemisphereLight(

      0xaacbff,

      0x183820,

      2.3

    );

  add(hemi);


  const sun =
    new THREE.DirectionalLight(
      0xffffff,
      2.8
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

  add(sun);


  // luna

  const moon =
    new THREE.PointLight(
      0x657fff,
      1.8,
      120
    );

  moon.position.set(
    -35,
    25,
    -45
  );

  add(moon);

}


// =====================================================
// EFECTO DE ATAQUE
// =====================================================

function spell(type) {

  if (mana < 15) {

    return;

  }


  mana -= 15;


  updateStats();


  const effect =
    document.createElement(
      "div"
    );


  effect.className =
    "spellFX " +
    type +
    "FX";


  document
    .getElementById("game")
    .appendChild(effect);


  setTimeout(
    () => effect.remove(),
    800
  );


  // animación del personaje

  player.rotation.y +=
    Math.PI * .4;


  player.scale.set(
    1.15,
    1.15,
    1.15
  );


  setTimeout(
    () => {

      player.scale.set(
        1,
        1,
        1
      );

    },
    180
  );


  socket.emit(
    "spell",
    {
      type
    }
  );

}


// =====================================================
// STATS
// =====================================================

function updateStats() {

  document
    .getElementById("hp")
    .textContent =
      hp;


  document
    .getElementById("mana")
    .textContent =
      mana;


  document
    .getElementById("hpbar")
    .style.width =
      hp + "%";


  document
    .getElementById("manabar")
    .style.width =
      mana + "%";

}


// =====================================================
// MOVIMIENTO
// =====================================================

function movePlayer(delta) {

  let x =
    moving.x;

  let z =
    moving.z;


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
    Math.hypot(
      x,
      z
    );


  if (
    length === 0
  ) {

    return;

  }


  x /= length;

  z /= length;


  const speed =
    9 * delta;


  player.position.x +=
    x * speed;

  player.position.z +=
    z * speed;


  // límites del mapa

  player.position.x =
    THREE.MathUtils.clamp(
      player.position.x,
      -100,
      100
    );


  player.position.z =
    THREE.MathUtils.clamp(
      player.position.z,
      -100,
      100
    );


  player.rotation.y =
    Math.atan2(
      x,
      z
    );


  // animación caminar

  player.userData.walkTime +=
    delta * 12;


  const bounce =
    Math.sin(
      player.userData.walkTime
    ) * .08;


  player.position.y =
    Math.abs(bounce);


  // cámara sigue al jugador

  controls.target.lerp(
    player.position,
    .12
  );

}


// =====================================================
// JOYSTICK
// =====================================================

function setupJoystick() {

  const joystick =
    document.getElementById(
      "joystick"
    );

  const stick =
    document.getElementById(
      "stick"
    );


  let active = false;


  function update(e) {

    if (!active) {

      return;

    }


    const rect =
      joystick.getBoundingClientRect();


    const point =
      e.touches
        ? e.touches[0]
        : e;


    let x =
      point.clientX -
      (
        rect.left +
        rect.width / 2
      );


    let y =
      point.clientY -
      (
        rect.top +
        rect.height / 2
      );


    const distance =
      Math.hypot(
        x,
        y
      );


    const max =
      48;


    if (
      distance > max
    ) {

      x =
        x / distance * max;

      y =
        y / distance * max;

    }


    moving.x =
      x / max;

    moving.z =
      y / max;


    stick.style.transform =
      `translate(${x}px,${y}px)`;

  }


  joystick.addEventListener(
    "pointerdown",
    e => {

      active = true;

      joystick.setPointerCapture(
        e.pointerId
      );

      update(e);

    }
  );


  joystick.addEventListener(
    "pointermove",
    update
  );


  joystick.addEventListener(
    "pointerup",
    () => {

      active = false;

      moving.x = 0;

      moving.z = 0;

      stick.style.transform =
        "translate(0,0)";

    }
  );

}


// =====================================================
// MAPA
// =====================================================

function setupMap() {

  const map =
    document.getElementById(
      "map"
    );


  document
    .getElementById("mapBtn")
    .onclick =
      () => {

        map.hidden =
          false;

      };


  document
    .getElementById("sideMap")
    .onclick =
      () => {

        map.hidden =
          false;

      };


  document
    .getElementById("closeMap")
    .onclick =
      () => {

        map.hidden =
          true;

      };

}


// =====================================================
// CHAT
// =====================================================

function setupChat() {

  const chat =
    document.getElementById(
      "chat"
    );


  document
    .getElementById(
      "chatToggle"
    )
    .onclick =
      () => {

        chat.classList.toggle(
          "chatMin"
        );

      };


  document
    .getElementById(
      "form"
    )
    .onsubmit =
      e => {

        e.preventDefault();


        const input =
          document.getElementById(
            "input"
          );


        const message =
          input.value.trim();


        if (!message) {

          return;

        }


        socket.emit(
          "chat",
          message
        );


        input.value =
          "";

      };


  socket.on(
    "chat",
    message => {

      addChatMessage(
        message,
        false
      );

    }
  );


  socket.on(
    "system",
    message => {

      addChatMessage(
        message,
        true
      );

    }
  );

}


function addChatMessage(
  message,
  system
) {

  const messages =
    document.getElementById(
      "msgs"
    );


  const p =
    document.createElement(
      "p"
    );


  if (system) {

    p.className =
      "sys";

  }


  p.textContent =
    message;


  messages.appendChild(
    p
  );


  messages.scrollTop =
    messages.scrollHeight;

}


// =====================================================
// MODALES
// =====================================================

function setupModals() {

  const modal =
    document.getElementById(
      "howModal"
    );


  document
    .getElementById("how")
    .onclick =
      () => {

        modal.hidden =
          false;

      };


  document
    .getElementById("closeHow")
    .onclick =
      () => {

        modal.hidden =
          true;

      };


  document
    .getElementById("okHow")
    .onclick =
      () => {

        modal.hidden =
          true;

      };

}


// =====================================================
// INICIALIZACIÓN
// =====================================================

function init() {

  scene =
    new THREE.Scene();


  scene.background =
    new THREE.Color(
      0x101b29
    );


  scene.fog =
    new THREE.Fog(
      0x101b29,
      45,
      170
    );


  camera =
    new THREE.PerspectiveCamera(

      55,

      innerWidth /
      innerHeight,

      .1,

      400

    );


  camera.position.set(
    0,
    16,
    25
  );


  renderer =
    new THREE.WebGLRenderer({

      antialias: true

    });


  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      2
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


  box.innerHTML =
    "";


  box.appendChild(
    renderer.domElement
  );


  createLights();

  createGround();

  createForest();

  createVillage();

  createLake();

  createCrystals();

  createCastle();

  createMountains();

  createPlayer();


  controls =
    new OrbitControls(
      camera,
      renderer.domElement
    );


  controls.enableDamping =
    true;

  controls.enablePan =
    false;

  controls.maxPolarAngle =
    1.45;

  controls.minDistance =
    7;

  controls.maxDistance =
    32;

  controls.target.copy(
    player.position
  );


  addEventListener(
    "resize",
    () => {

      camera.aspect =
        innerWidth /
        innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        innerWidth,
        innerHeight
      );

    }
  );


  addEventListener(
    "keydown",
    e => {

      keys[
        e.key.toLowerCase()
      ] = true;

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


  setupJoystick();

  setupMap();

  setupChat();

  setupModals();

  updateStats();


  animate();

}


// =====================================================
// ANIMACIÓN
// =====================================================

function animate() {

  requestAnimationFrame(
    animate
  );


  const delta =
    Math.min(
      clock.getDelta(),
      .05
    );


  movePlayer(delta);


  scene.traverse(
    object => {

      if (
        object.userData &&
        object.userData.crystal
      ) {

        object.rotation.y +=
          delta * .8;

        object.position.y =
          Math.sin(
            performance.now() * .002 +
            object.position.x
          ) * .15;

      }

    }
  );


  controls.update();


  renderer.render(
    scene,
    camera
  );

}


// =====================================================
// BOTÓN ENTRAR
// =====================================================

document
  .getElementById("play")
  .onclick =
    () => {

      document.getElementById(
        "home"
      ).hidden = true;


      document.getElementById(
        "game"
      ).hidden = false;


      setTimeout(
        init,
        100
      );

    };
