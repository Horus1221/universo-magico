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
let selectedAppearance = { cabello:"Corto", ropa:"Guerrero", accesorios:"Ninguno" };
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
  character: "/assets/characters/Superhero_Male_FullBody_web.gltf",
  animations: "/assets/characters/UAL1_Standard.glb"
};

const loader = new GLTFLoader();

function normalizeRace(race) {
  const r=String(race||"").toLowerCase();
  if(r.includes("hada")||r.includes("fairy")) return "hada";
  if(r.includes("elf")) return "elfo";
  if(r.includes("enano")) return "enano";
  if(r.includes("orco")) return "orco";
  if(r.includes("dracon")||r.includes("drag")) return "draconido";
  return "humano";
}

/* =========================
   AUTENTICACIÓN
========================= */

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

$("authForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const username = ($("username")?.value || "").trim();
  const password = $("password")?.value || "";

  if (username.length < 3) return authMessage("El nombre debe tener al menos 3 caracteres.");
  if (password.length < 6) return authMessage("La contraseña debe tener al menos 6 caracteres.");

  const button = $("authSubmit");
  if (button) {
    button.disabled = true;
    button.textContent = "✨ CONECTANDO...";
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
      throw new Error(data.error || `Error ${response.status}`);
    }

    localStorage.setItem("universo_magico_user", JSON.stringify(data));
    startGame(data.username || username, data.character || null);
  } catch (err) {
    console.error(err);
    authMessage(err.message || "No se pudo conectar con el reino.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = registerMode ? "✨ CREAR PERSONAJE" : "⚡ ENTRAR AL UNIVERSO";
    }
  }
});

function authMessage(text) {
  const el = $("authMsg");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
}

function startGame(username, savedCharacter = null) {
  state.username = username || "Aventurero";
  state.character = savedCharacter || JSON.parse(localStorage.getItem("universo_magico_character") || "null");

  if ($("playerName")) $("playerName").textContent = state.username;
  if ($("hudName")) $("hudName").textContent = state.username;
  if ($("avatar")) $("avatar").textContent = state.username[0]?.toUpperCase() || "A";

  if (home) home.hidden = true;
  if (game) game.hidden = false;

  if (!renderer) initWorld();

  setTimeout(() => openCharacterCreator(savedCharacter), 500);
}

/* =========================
   MUNDO 3D
========================= */

function initWorld() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x79a9c5);
  scene.fog = new THREE.FogExp2(0x79a9c5, 0.0018);

  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1600);
  camera.position.set(0, 24, 34);

  renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:"high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  if (sceneEl) sceneEl.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xd8f0ff, 0x355034, 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0cf, 3);
  sun.position.set(-120, 180, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
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
  setupFlightButton();

  addEventListener("resize", resize);
  animate();
}

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700,700,80,80),
    new THREE.MeshStandardMaterial({ color:0x4f804d, roughness:1 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i=0;i<2200;i++) {
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(.35,THREE.MathUtils.randFloat(.5,1.4)),
      new THREE.MeshStandardMaterial({color:0x6fa65a, side:THREE.DoubleSide})
    );
    grass.position.set(
      THREE.MathUtils.randFloat(-340,340),
      .18,
      THREE.MathUtils.randFloat(-340,340)
    );
    grass.rotation.y = Math.random()*Math.PI;
    scene.add(grass);
  }
}

function createWater() {
  const w = new THREE.Mesh(
    new THREE.CircleGeometry(55,64),
    new THREE.MeshPhysicalMaterial({
      color:0x258ab0, transparent:true, opacity:.78, roughness:.12, metalness:.08
    })
  );
  w.rotation.x = -Math.PI/2;
  w.position.set(115,.08,80);
  scene.add(w);
}

function createVillage() {
  const positions = [
    [-55,-45],[-20,-50],[20,-50],[55,-42],
    [-70,0],[65,5],[-45,45],[5,45],[55,45],[0,85]
  ];

  positions.forEach(([x,z],i) => {
    const h = createHouse(x,z,i);
    houses.push(h);
    scene.add(h);
  });

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(42,42,.45,64),
    new THREE.MeshStandardMaterial({color:0x9b8c73,roughness:.9})
  );
  plaza.position.y=.22;
  plaza.receiveShadow=true;
  scene.add(plaza);

  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(8,10,1.5,40),
    new THREE.MeshStandardMaterial({color:0x858d93,roughness:.9})
  );
  fountain.position.y=.75;
  fountain.castShadow=true;
  scene.add(fountain);
}

function createHouse(x,z,index) {
  const g = new THREE.Group();
  g.position.set(x,0,z);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(22,10,18),
    new THREE.MeshStandardMaterial({color:index%2?0x956547:0xa9714d,roughness:.85})
  );
  wall.position.y=5;
  wall.castShadow=wall.receiveShadow=true;
  g.add(wall);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(15,9,4),
    new THREE.MeshStandardMaterial({color:index%3?0x63372d:0x49302b,roughness:.9})
  );
  roof.rotation.y=Math.PI/4;
  roof.position.y=14;
  roof.castShadow=true;
  g.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(3.2,5.5,.4),
    new THREE.MeshStandardMaterial({color:0x35231c})
  );
  door.position.set(0,2.75,9.15);
  g.add(door);

  g.userData.house = true;
  return g;
}

function createForest() {
  for (let i=0;i<320;i++) {
    const t = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(.7,1.2,8,9),
      new THREE.MeshStandardMaterial({color:0x63402a})
    );
    trunk.position.y=4;
    trunk.castShadow=true;
    t.add(trunk);

    for(let j=0;j<8;j++) {
      const leaf = new THREE.Mesh(
        new THREE.IcosahedronGeometry(THREE.MathUtils.randFloat(2.4,4),1),
        new THREE.MeshStandardMaterial({color:0x2f713d,roughness:1})
      );
      leaf.position.set(
        THREE.MathUtils.randFloat(-2,2),
        THREE.MathUtils.randFloat(7,12),
        THREE.MathUtils.randFloat(-2,2)
      );
      leaf.castShadow=true;
      t.add(leaf);
    }

    const a=Math.random()*Math.PI*2;
    const r=THREE.MathUtils.randFloat(140,315);
    t.position.set(Math.cos(a)*r,0,Math.sin(a)*r);
    t.scale.setScalar(THREE.MathUtils.randFloat(.8,1.5));
    t.userData.phase=Math.random()*10;
    scene.add(t);
    trees.push(t);
  }
}

function createMountains() {
  for(let i=0;i<36;i++) {
    const a=i/36*Math.PI*2;
    const radius=THREE.MathUtils.randFloat(300,325);
    const height=THREE.MathUtils.randFloat(55,110);

    const mountain=new THREE.Mesh(
      new THREE.ConeGeometry(
        THREE.MathUtils.randFloat(24,42),
        height,
        8
      ),
      new THREE.MeshStandardMaterial({
        color:0x4c6257,
        roughness:1
      })
    );

    mountain.position.set(
      Math.cos(a)*radius,
      height/2-3,
      Math.sin(a)*radius
    );
    mountain.rotation.y=Math.random()*Math.PI;
    mountain.castShadow=true;
    mountain.receiveShadow=true;
    scene.add(mountain);

    const peak=new THREE.Mesh(
      new THREE.ConeGeometry(THREE.MathUtils.randFloat(7,14),height*.22,8),
      new THREE.MeshStandardMaterial({
        color:0xbcc9c6,
        roughness:1
      })
    );
    peak.position.copy(mountain.position);
    peak.position.y += height*.39;
    peak.scale.y=.75;
    scene.add(peak);
  }
}

function createCastle() {
  const g = new THREE.Group();
  g.position.set(250, 0, 230);

  const stone = new THREE.MeshStandardMaterial({
    color: 0x68757d,
    roughness: .9
  });

  const darkStone = new THREE.MeshStandardMaterial({
    color: 0x4e5961,
    roughness: .95
  });

  const keep = new THREE.Mesh(
    new THREE.BoxGeometry(70, 28, 45),
    stone
  );
  keep.position.y = 14;
  keep.castShadow = keep.receiveShadow = true;
  g.add(keep);

  for (let x = -30; x <= 30; x += 10) {
    for (const z of [-23, 23]) {
      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(5, 4, 5),
        darkStone
      );
      merlon.position.set(x, 30, z);
      g.add(merlon);
    }
  }

  for (let z = -15; z <= 15; z += 10) {
    for (const x of [-37, 37]) {
      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(5, 4, 5),
        darkStone
      );
      merlon.position.set(x, 30, z);
      g.add(merlon);
    }
  }

  const towerPositions = [
    [-40, -28], [40, -28], [-40, 28], [40, 28]
  ];

  towerPositions.forEach(([x,z]) => {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 12, 42, 12),
      stone
    );
    tower.position.set(x,21,z);
    tower.castShadow=true;
    tower.receiveShadow=true;
    g.add(tower);

    const towerRoof = new THREE.Mesh(
      new THREE.ConeGeometry(13,12,12),
      new THREE.MeshStandardMaterial({
        color:0x382b3b,
        roughness:.85
      })
    );
    towerRoof.position.set(x,48,z);
    g.add(towerRoof);
  });

  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(18,18,4),
    new THREE.MeshStandardMaterial({color:0x30241f,roughness:.8})
  );
  gate.position.set(0,9,24);
  g.add(gate);

  scene.add(g);
}

function createMagicParticles() {
  const group = new THREE.Group();

  for(let i=0;i<350;i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(THREE.MathUtils.randFloat(.035,.11),8,8),
      new THREE.MeshBasicMaterial({
        color: i%3===0 ? 0xf7d87a : i%3===1 ? 0xb28cff : 0x8ce8ff,
        transparent:true,
        opacity:.8
      })
    );

    p.position.set(
      THREE.MathUtils.randFloat(-160,160),
      THREE.MathUtils.randFloat(.5,35),
      THREE.MathUtils.randFloat(-160,160)
    );

    p.userData.phase=Math.random()*Math.PI*2;
    p.userData.speed=THREE.MathUtils.randFloat(.3,1.1);
    group.add(p);
  }

  scene.add(group);

  scene.userData.magicParticles=group;
}

async function loadPlayer() {
  try {
    const gltf = await loader.loadAsync(assets.character);

    player = gltf.scene;
    player.scale.setScalar(1.8);
    player.position.set(0,0,12);

    player.traverse(o => {
      if(o.isMesh) {
        o.castShadow=true;
        o.receiveShadow=true;
      }
    });

    scene.add(player);

    try {
      const animGltf = await loader.loadAsync(assets.animations);
      mixer = new THREE.AnimationMixer(player);

      animGltf.animations.forEach(clip => {
        actions[clip.name]=mixer.clipAction(clip);
      });

      const idle =
        actions["Idle"] ||
        actions["idle"] ||
        Object.values(actions)[0];

      if(idle) {
        idle.play();
        currentAction=idle;
      }
    } catch(animationError) {
      console.warn("No se pudieron cargar animaciones:",animationError);
    }

    applyAppearance();
    updateRaceUI();
  } catch(error) {
    console.error("Error cargando personaje:",error);
    showToast("⚠️ No se pudo cargar el personaje.");
  }
}
function setupJoystick() {
  const joystick = $("joystick");
  const knob = $("joystickKnob") || $("stick");

  if(!joystick || !knob) return;

  const reset=()=>{
    moveX=0;
    moveY=0;
    knob.style.transform="translate(-50%,-50%)";
  };

  const move=e=>{
    const touch=e.touches?.[0] || e;
    const r=joystick.getBoundingClientRect();
    const cx=r.left+r.width/2;
    const cy=r.top+r.height/2;

    let dx=touch.clientX-cx;
    let dy=touch.clientY-cy;

    const max=r.width*.38;
    const len=Math.hypot(dx,dy);

    if(len>max){
      dx=dx/len*max;
      dy=dy/len*max;
    }

    moveX=dx/max;
    moveY=dy/max;

    knob.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };

  joystick.addEventListener("touchstart",e=>{
    e.preventDefault();
    move(e);
  },{passive:false});

  joystick.addEventListener("touchmove",e=>{
    e.preventDefault();
    move(e);
  },{passive:false});

  joystick.addEventListener("touchend",e=>{
    e.preventDefault();
    reset();
  },{passive:false});

  joystick.addEventListener("touchcancel",reset);
}

function setupKeyboard() {
  addEventListener("keydown",e=>{
    keys[e.key.toLowerCase()]=true;
  });

  addEventListener("keyup",e=>{
    keys[e.key.toLowerCase()]=false;
  });
}

function setupCameraTouch() {
  const el=sceneEl || renderer?.domElement;
  if(!el)return;

  el.addEventListener("touchstart",e=>{
    if(e.touches.length!==1)return;

    draggingCamera=true;
    lastTouchX=e.touches[0].clientX;
    lastTouchY=e.touches[0].clientY;
  },{passive:true});

  el.addEventListener("touchmove",e=>{
    if(!draggingCamera || e.touches.length!==1)return;

    const x=e.touches[0].clientX;
    const y=e.touches[0].clientY;

    const dx=x-lastTouchX;
    const dy=y-lastTouchY;

    lastTouchX=x;
    lastTouchY=y;

    yaw-=dx*.008;
    pitch-=dy*.006;

    pitch=THREE.MathUtils.clamp(pitch,.12,1.15);
  },{passive:true});

  el.addEventListener("touchend",()=>{
    draggingCamera=false;
  },{passive:true});
}

function updateMovement(delta) {
  if(!player)return;

  let x=moveX;
  let y=moveY;

  if(keys["a"]||keys["arrowleft"])x-=1;
  if(keys["d"]||keys["arrowright"])x+=1;
  if(keys["w"]||keys["arrowup"])y-=1;
  if(keys["s"]||keys["arrowdown"])y+=1;

  const len=Math.hypot(x,y);

  if(len>.05){
    x/=len;
    y/=len;

    const speed=selectedRace==="hada" && player.userData.flying ? 18 : 10;

    const forward=new THREE.Vector3(
      Math.sin(yaw),
      0,
      Math.cos(yaw)
    );

    const right=new THREE.Vector3(
      Math.cos(yaw),
      0,
      -Math.sin(yaw)
    );

    player.position.addScaledVector(forward,-y*speed*delta);
    player.position.addScaledVector(right,x*speed*delta);

    const targetRotation=Math.atan2(
      x,
      -y
    ) + yaw;

    player.rotation.y=THREE.MathUtils.lerp(
      player.rotation.y,
      targetRotation,
      .16
    );

    playAnimation(["Run","run","Walk","walk"]);
  } else {
    playAnimation(["Idle","idle"]);
  }

  if(player.userData.flying) {
    if(keys[" "] || moveY<-.25) {
      player.position.y += 9*delta;
    }

    if(keys["shift"] || moveY>.25) {
      player.position.y -= 9*delta;
    }

    player.position.y=THREE.MathUtils.clamp(player.position.y,2,80);
  }
}

function playAnimation(names) {
  if(!mixer)return;

  let next=null;

  for(const name of names) {
    if(actions[name]) {
      next=actions[name];
      break;
    }
  }

  if(!next || next===currentAction)return;

  if(currentAction) {
    currentAction.fadeOut(.18);
  }

  next.reset().fadeIn(.18).play();
  currentAction=next;
}

function resolvePlayerHeight() {
  if(!player)return;

  if(!player.userData.flying) {
    player.position.y=0;
  }
}

function updateCamera() {
  if(!camera || !player)return;

  const distance=state.insideHouse ? 9 : 26;

  const horizontal=Math.cos(pitch)*distance;
  const vertical=Math.sin(pitch)*distance;

  camera.position.x =
    player.position.x -
    Math.sin(yaw)*horizontal;

  camera.position.z =
    player.position.z -
    Math.cos(yaw)*horizontal;

  camera.position.y =
    player.position.y +
    vertical +
    4;

  const target=new THREE.Vector3(
    player.position.x,
    player.position.y+4,
    player.position.z
  );

  camera.lookAt(target);
}

/* =========================
   COMBATE
========================= */

function setupCombat() {
  const attackButtons=[
    $("attackButton"),
    $("attackBtn"),
    $("spellButton"),
    $("spellBtn")
  ].filter(Boolean);

  attackButtons.forEach(btn=>{
    btn.addEventListener("click",castSpell);
    btn.addEventListener("touchend",e=>{
      e.preventDefault();
      castSpell();
    },{passive:false});
  });
}

function castSpell() {
  if(mana<20) {
    showToast("🔵 No tienes suficiente maná.");
    return;
  }

  mana-=20;

  createSpellEffect();

  if(socket) {
    socket.emit("spell",{
      username:state.username,
      race:selectedRace
    });
  }

  showToast("✨ ¡Hechizo lanzado!");
}

function createSpellEffect() {
  if(!player || !scene)return;

  const group=new THREE.Group();

  const material=new THREE.MeshBasicMaterial({
    color:selectedRace==="hada"?0xc47cff:
          selectedRace==="elfo"?0x7bdff2:
          selectedRace==="orco"?0x72d66f:
          0xffd36b,
    transparent:true,
    opacity:.9
  });

  for(let i=0;i<18;i++) {
    const p=new THREE.Mesh(
      new THREE.SphereGeometry(.12,8,8),
      material.clone()
    );

    p.position.copy(player.position);
    p.position.y+=2.5;

    p.userData.vx=THREE.MathUtils.randFloatSpread(.3);
    p.userData.vy=THREE.MathUtils.randFloat(.2,.7);
    p.userData.vz=THREE.MathUtils.randFloatSpread(.3);
    p.userData.life=1;

    group.add(p);
  }

  scene.add(group);

  const tick=()=>{
    let alive=false;

    group.children.forEach(p=>{
      p.position.x+=p.userData.vx;
      p.position.y+=p.userData.vy;
      p.position.z+=p.userData.vz;
      p.userData.life-=.025;
      p.material.opacity=Math.max(0,p.userData.life);

      if(p.userData.life>0)alive=true;
    });

    if(alive)requestAnimationFrame(tick);
    else scene.remove(group);
  };

  tick();
}

/* =========================
   CHAT
========================= */

function setupChat() {
  const chat=$("chat");
  const toggle=$("chatToggle");
  const form=$("form");
  const input=$("input");
  const msgs=$("msgs");

  if(!chat)return;

  if(toggle) {
    toggle.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();

      chat.classList.toggle("collapsed");

      if(chat.classList.contains("collapsed")) {
        toggle.textContent="⌃";
        toggle.setAttribute("aria-label","Abrir chat");
      } else {
        toggle.textContent="⌄";
        toggle.setAttribute("aria-label","Minimizar chat");
      }
    };
  }

  form?.addEventListener("submit",e=>{
    e.preventDefault();

    const text=(input?.value||"").trim();
    if(!text)return;

    const message={
      username:state.username,
      text
    };

    addChatMessage(message);

    if(socket)socket.emit("chatMessage",message);

    if(input)input.value="";
  });

  if(socket) {
    socket.on("chatMessage",message=>{
      addChatMessage(message);
    });

    socket.on("message",message=>{
      if(typeof message==="string") {
        addChatMessage({
          username:"Reino",
          text:message
        });
      }
    });
  }

  function addChatMessage(message) {
    if(!msgs)return;

    let username="Reino";
    let text="";

    if(typeof message==="string") {
      text=message;
    } else {
      username=message?.username || message?.user || "Reino";
      text=message?.text || message?.message || "";
    }

    if(!text)return;

    const row=document.createElement("div");
    row.className="chat-message";

    const name=document.createElement("b");
    name.textContent=username+": ";

    const body=document.createElement("span");
    body.textContent=text;

    row.append(name,body);
    msgs.appendChild(row);

    msgs.scrollTop=msgs.scrollHeight;
  }

  // Si el HTML no tiene botón, creamos uno fuera del contenedor.
  if(!toggle) {
    const b=document.createElement("button");
    b.id="chatToggle";
    b.type="button";
    b.textContent="⌄";
    b.style.cssText="position:absolute;right:8px;top:8px;z-index:9999;";
    chat.appendChild(b);

    b.onclick=()=>{
      chat.classList.toggle("collapsed");
    };
  }
}

/* =========================
   MAPA
========================= */

function setupMap() {
  const mapPanel=$("map");
  const mapBtn=$("mapBtn") || $("mapButton");
  const closeMap=$("closeMap");
  const sideMap=$("sideMap");

  function openMap() {
    if(!mapPanel) {
      createDynamicMap();
      return;
    }

    mapPanel.hidden=false;
    mapPanel.classList.add("open");

    updatePlayerMarker();
  }

  function close() {
    if(!mapPanel)return;

    mapPanel.hidden=true;
    mapPanel.classList.remove("open");
  }

  mapBtn?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    openMap();
  });

  closeMap?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    close();
  });

  sideMap?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    openMap();
  });

  window.addEventListener("keydown",e=>{
    if(e.key==="m" || e.key==="M") {
      if(mapPanel?.hidden)openMap();
      else close();
    }
  });

  window.toggleMap=openMap;
  window.closeMap=close;
}

function createDynamicMap() {
  if($("dynamicMap")) {
    $("dynamicMap").hidden=false;
    updatePlayerMarker();
    return;
  }

  const panel=document.createElement("div");
  panel.id="dynamicMap";

  panel.style.cssText=`
    position:fixed;
    inset:6%;
    z-index:10000;
    background:rgba(18,25,40,.97);
    border:2px solid #e6c875;
    border-radius:24px;
    padding:20px;
    color:white;
    box-shadow:0 20px 80px rgba(0,0,0,.6);
  `;

  panel.innerHTML=`
    <button id="dynamicMapClose"
      style="position:absolute;right:12px;top:12px;
      padding:10px 14px;border-radius:12px;">
      ✕
    </button>

    <h2>🗺️ MAPA DEL UNIVERSO</h2>

    <div id="dynamicMapArea"
      style="height:70%;border-radius:18px;
      background:linear-gradient(#527da0,#385b3b);
      position:relative;overflow:hidden;">

      <div style="
        position:absolute;
        left:48%;
        top:48%;
        font-size:30px;">
        📍
      </div>

      <div style="
        position:absolute;
        right:10%;
        top:10%;
        font-size:48px;">
        🏰
      </div>

      <div style="
        position:absolute;
        left:15%;
        bottom:15%;
        font-size:42px;">
        🏘️
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  $("dynamicMapClose").onclick=()=>{
    panel.hidden=true;
  };

  updatePlayerMarker();
}

function updatePlayerMarker() {
  const marker=$("playerMarker");
  if(!marker || !player)return;

  const x=THREE.MathUtils.clamp(
    50 + player.position.x/7,
    5,
    95
  );

  const y=THREE.MathUtils.clamp(
    50 + player.position.z/7,
    5,
    95
  );

  marker.style.left=`${x}%`;
  marker.style.top=`${y}%`;
}
/* =========================
   CASAS / INTERIORES
========================= */

function setupHouse() {
  const enter=$("enterHouse");

  if(enter) {
    enter.addEventListener("click",()=>{
      if(currentHouse)enterHouse(currentHouse);
    });
  }

  houses.forEach(house=>{
    house.userData.enterable=true;
  });
}

function checkHouse() {
  if(!player || state.insideHouse)return;

  let nearest=null;
  let nearestDistance=Infinity;

  for(const house of houses) {
    const d=player.position.distanceTo(house.position);

    if(d<18 && d<nearestDistance) {
      nearest=house;
      nearestDistance=d;
    }
  }

  currentHouse=nearest;

  const button=$("enterHouse");

  if(button) {
    button.hidden=!nearest;
    if(nearest)button.textContent="🚪 ENTRAR";
  }
}

function enterHouse(house) {
  if(!house || !player || state.insideHouse)return;

  state.insideHouse=true;
  currentHouse=house;

  if($("enterHouse"))$("enterHouse").hidden=true;

  // Ocultamos completamente el exterior.
  houses.forEach(h=>h.visible=false);
  scene.traverse(obj=>{
    if(obj.userData?.exteriorObject) {
      obj.visible=false;
    }
  });

  // Interior nuevo.
  interior=new THREE.Group();
  interior.name="houseInterior";

  const floor=new THREE.Mesh(
    new THREE.BoxGeometry(20,1,16),
    new THREE.MeshStandardMaterial({
      color:0x6f513d,
      roughness:.9
    })
  );
  floor.position.y=-.5;
  floor.receiveShadow=true;
  interior.add(floor);

  const wallMat=new THREE.MeshStandardMaterial({
    color:0x9c7357,
    roughness:.9
  });

  const backWall=new THREE.Mesh(
    new THREE.BoxGeometry(20,9,.6),
    wallMat
  );
  backWall.position.set(0,4.5,-8);
  interior.add(backWall);

  const leftWall=new THREE.Mesh(
    new THREE.BoxGeometry(.6,9,16),
    wallMat
  );
  leftWall.position.set(-10,4.5,0);
  interior.add(leftWall);

  const rightWall=new THREE.Mesh(
    new THREE.BoxGeometry(.6,9,16),
    wallMat
  );
  rightWall.position.set(10,4.5,0);
  interior.add(rightWall);

  // Techo cerrado para no ver el exterior.
  const ceiling=new THREE.Mesh(
    new THREE.BoxGeometry(20,1,16),
    new THREE.MeshStandardMaterial({
      color:0x46352f,
      roughness:1
    })
  );
  ceiling.position.y=9;
  interior.add(ceiling);

  // Mesa.
  const tableTop=new THREE.Mesh(
    new THREE.BoxGeometry(5,0.35,2.5),
    new THREE.MeshStandardMaterial({
      color:0x68432b,
      roughness:.9
    })
  );
  tableTop.position.set(-2,2,0);
  tableTop.castShadow=true;
  interior.add(tableTop);

  for(const x of [-4,-.2]) {
    for(const z of [-.8,.8]) {
      const leg=new THREE.Mesh(
        new THREE.BoxGeometry(.35,2,.35),
        new THREE.MeshStandardMaterial({
          color:0x4d3020
        })
      );
      leg.position.set(x,1,z);
      interior.add(leg);
    }
  }

  // Cama.
  const bedBase=new THREE.Mesh(
    new THREE.BoxGeometry(5,1,2.7),
    new THREE.MeshStandardMaterial({
      color:0x4c3427
    })
  );
  bedBase.position.set(4,1,3.2);
  interior.add(bedBase);

  const mattress=new THREE.Mesh(
    new THREE.BoxGeometry(4.7,.65,2.4),
    new THREE.MeshStandardMaterial({
      color:0xc7b6a0,
      roughness:.95
    })
  );
  mattress.position.set(4,1.8,3.2);
  interior.add(mattress);

  const pillow=new THREE.Mesh(
    new THREE.BoxGeometry(1.1,.3,1.8),
    new THREE.MeshStandardMaterial({
      color:0xe2d5c4
    })
  );
  pillow.position.set(5.55,2.2,3.2);
  interior.add(pillow);

  // Chimenea.
  const fireplace=new THREE.Mesh(
    new THREE.BoxGeometry(4,4,1),
    new THREE.MeshStandardMaterial({
      color:0x534c4b,
      roughness:1
    })
  );
  fireplace.position.set(0,2,-7.5);
  interior.add(fireplace);

  const fire=new THREE.Mesh(
    new THREE.SphereGeometry(.8,16,12),
    new THREE.MeshBasicMaterial({
      color:0xff8a24
    })
  );
  fire.position.set(0,2,-6.8);
  interior.add(fire);

  const fireLight=new THREE.PointLight(
    0xff7b28,
    3,
    12
  );
  fireLight.position.set(0,3,-6);
  interior.add(fireLight);

  // Estantes.
  for(let i=0;i<5;i++) {
    const shelf=new THREE.Mesh(
      new THREE.BoxGeometry(5,.25,.7),
      new THREE.MeshStandardMaterial({
        color:0x543725
      })
    );
    shelf.position.set(-6,3+i*1.1,-7.5);
    interior.add(shelf);
  }

  // Candelabro.
  const lamp=new THREE.PointLight(
    0xffd98a,
    1.8,
    18
  );
  lamp.position.set(0,7,0);
  interior.add(lamp);

  // Alfombra.
  const rug=new THREE.Mesh(
    new THREE.BoxGeometry(7,.08,5),
    new THREE.MeshStandardMaterial({
      color:0x7b3545,
      roughness:1
    })
  );
  rug.position.set(0,.05,2);
  interior.add(rug);

  scene.add(interior);

  // El jugador aparece dentro, nunca pegado a una pared.
  player.position.set(
    house.position.x,
    0,
    house.position.z-1
  );

  // Puerta interior / salida.
  createExitButton();

  showToast("🏠 Has entrado en la casa.");
}

function createExitButton() {
  let button=$("exitHouse");

  if(!button) {
    button=document.createElement("button");
    button.id="exitHouse";
    button.type="button";

    button.style.cssText=`
      position:fixed;
      left:50%;
      bottom:24px;
      transform:translateX(-50%);
      z-index:10001;
      padding:14px 24px;
      border-radius:16px;
      border:2px solid #f0d28b;
      background:rgba(46,30,27,.95);
      color:white;
      font-weight:900;
      font-size:16px;
      box-shadow:0 8px 30px rgba(0,0,0,.5);
      touch-action:manipulation;
    `;

    button.textContent="🚪 SALIR DE LA CASA";
    document.body.appendChild(button);
  }

  button.hidden=false;

  button.onclick=()=>{
    exitHouse();
  };
}

function exitHouse() {
  if(!state.insideHouse || !player)return;

  state.insideHouse=false;

  if(interior) {
    scene.remove(interior);
    interior=null;
  }

  houses.forEach(h=>h.visible=true);

  if($("exitHouse"))$("exitHouse").hidden=true;

  if(currentHouse) {
    player.position.set(
      currentHouse.position.x,
      0,
      currentHouse.position.z+16
    );
  }

  currentHouse=null;

  showToast("🌿 Has salido de la casa.");
}

/* =========================
   CREADOR DE PERSONAJE
========================= */

function setupCharacterCreator() {
  document.querySelectorAll("[data-race]").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();

      selectedRace=normalizeRace(btn.dataset.race);

      updateRaceUI();
      applyAppearance();
    });
  });

  document.querySelectorAll("[data-appearance]").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();

      let category=btn.dataset.appearance || "";
      let value=btn.dataset.value || "";

      const text=(btn.textContent||"").trim();

      if(!category) {
        if(/Guerrero|Mago|Noble|Aventurero/i.test(text)) {
          category="ropa";
        } else if(/Capa|Corona|Amuleto|Collar|Ninguno/i.test(text)) {
          category="accesorios";
        } else {
          category="cabello";
        }
      }

      if(!value) {
        value=text
          .replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/g,"")
          .trim();
      }

      chooseAppearance(category,value,btn);
    });
  });

  // Delegación para botones creados dinámicamente.
  document.addEventListener("click",e=>{
    const btn=e.target.closest?.(
      "[data-appearance], .appearance-button, .appearance-choice"
    );

    if(!btn || btn.dataset.appearanceBound==="1")return;

    btn.dataset.appearanceBound="1";
    btn.click();
  },true);

  $("finishCharacter")?.addEventListener(
    "click",
    saveCharacter
  );
}

function chooseAppearance(category,value,button) {
  if(!category)return;

  if(category==="hair")category="cabello";
  if(category==="clothes")category="ropa";
  if(category==="accessory")category="accesorios";

  if(!["cabello","ropa","accesorios"].includes(category)) {
    return;
  }

  selectedAppearance[category]=value;

  document
    .querySelectorAll(
      `[data-appearance="${category}"]`
    )
    .forEach(btn=>{
      btn.classList.remove("selected");
    });

  button?.classList.add("selected");

  applyAppearance();
}

function openCharacterCreator(saved) {
  const creator=$("characterCreator");
  if(!creator)return;

  creator.hidden=false;

  if(saved) {
    selectedRace=normalizeRace(
      saved.race||selectedRace
    );

    selectedAppearance=
      saved.appearance||selectedAppearance;
  }

  updateRaceUI();
  applyAppearance();
  setupFlightButton();
}

function updateRaceUI() {
  if($("playerRace"))
    $("playerRace").textContent=selectedRace;

  if($("abilityRace"))
    $("abilityRace").textContent=selectedRace;

  document
    .querySelectorAll("[data-race]")
    .forEach(b=>{
      b.classList.toggle(
        "selected",
        normalizeRace(b.dataset.race)===selectedRace
      );
    });
}

function applyAppearance() {
  selectedRace=normalizeRace(selectedRace);

  if(!player)return;

  const scales={
    humano:1.8,
    elfo:1.72,
    enano:1.48,
    orco:1.95,
    hada:1.5,
    demonio:1.85,
    draconido:1.9
  };

  player.scale.setScalar(
    scales[selectedRace]||1.8
  );

  const oldDetails=
    player.getObjectByName("raceDetails");

  if(oldDetails) {
    player.remove(oldDetails);
  }

  if(selectedRace==="hada") {
    const details=new THREE.Group();
    details.name="raceDetails";

    const wingMaterial=
      new THREE.MeshPhysicalMaterial({
        color:0xd9a7ff,
        transparent:true,
        opacity:.52,
        roughness:.18,
        metalness:.05,
        emissive:0x7b3fb2,
        emissiveIntensity:.45,
        side:THREE.DoubleSide
      });

    for(const side of [-1,1]) {
      const wing=new THREE.Mesh(
        new THREE.SphereGeometry(.85,20,14),
        wingMaterial.clone()
      );

      wing.scale.set(
        1.8,
        .22,
        1.15
      );

      wing.position.set(
        side*.85,
        3.15,
        .05
      );

      wing.rotation.z=
        side>0 ? -.22 : .22;

      wing.castShadow=true;
      details.add(wing);

      const smallWing=new THREE.Mesh(
        new THREE.SphereGeometry(.58,16,12),
        wingMaterial.clone()
      );

      smallWing.scale.set(
        1.35,
        .18,
        .85
      );

      smallWing.position.set(
        side*.65,
        3.75,
        -.05
      );

      smallWing.rotation.z=
        side>0 ? -.45 : .45;

      details.add(smallWing);
    }

    const glow=new THREE.PointLight(
      0xc47cff,
      1.4,
      5
    );

    glow.position.set(
      0,
      3.5,
      0
    );

    details.add(glow);

    player.add(details);

    player.traverse(object=>{
      if(!object.isMesh || !object.material)return;

      const materialName=
        String(
          object.material.name||""
        ).toLowerCase();

      const objectName=
        String(
          object.name||""
        ).toLowerCase();

      const looksLikeSkin=
        /skin|body|face|head|hand|arm|leg|foot|superhero_male/.test(
          materialName+" "+objectName
        );

      if(
        looksLikeSkin &&
        object.material.color
      ) {
        object.material.color.set(
          0xd8a07f
        );
      }
    });
  }

  if(selectedRace==="elfo") {
    const details=new THREE.Group();
    details.name="raceDetails";

    const wingMaterial=
      new THREE.MeshPhysicalMaterial({
        color:0xb7e7ff,
        transparent:true,
        opacity:.42,
        roughness:.2,
        side:THREE.DoubleSide,
        emissive:0x4c8fb5,
        emissiveIntensity:.25
      });

    for(const side of [-1,1]) {
      const wing=new THREE.Mesh(
        new THREE.SphereGeometry(.7,18,12),
        wingMaterial.clone()
      );

      wing.scale.set(
        1.45,
        .16,
        1
      );

      wing.position.set(
        side*.78,
        3.05,
        .05
      );

      wing.rotation.z=
        side>0 ? -.25 : .25;

      details.add(wing);

      const ear=new THREE.Mesh(
        new THREE.ConeGeometry(.12,.65,8),
        new THREE.MeshStandardMaterial({
          color:0xd59b7d,
          roughness:.8
        })
      );

      ear.position.set(
        side*.38,
        4.25,
        0
      );

      ear.rotation.z=
        side>0 ? -.75 : .75;

      details.add(ear);
    }

    player.add(details);
  }

  addHairCustom();
  addClothesCustom();
  addAccessoryCustom();
  setupFlightButton();
}

function addHairCustom() {
  if(!player)return;

  player
    .getObjectByName("hairCustom")
    ?.remove();

  const kind=
    selectedAppearance.cabello||"Corto";

  if(kind==="Ninguno")return;

  const colors={
    Corto:0x2a211d,
    Largo:0x2a211d,
    Rapado:0x1a1716,
    Rubio:0xd2b46a,
    Rojo:0x7b3026
  };

  const g=new THREE.Group();
  g.name="hairCustom";

  const m=new THREE.MeshStandardMaterial({
    color:colors[kind]||0x2a211d,
    roughness:.75
  });

  const cap=new THREE.Mesh(
    new THREE.SphereGeometry(
      .73,
      18,
      12,
      0,
      Math.PI*2,
      0,
      Math.PI*.55
    ),
    m
  );

  cap.position.y=4.55;
  cap.castShadow=true;
  g.add(cap);

  if(kind==="Largo") {
    const back=new THREE.Mesh(
      new THREE.BoxGeometry(
        1.15,
        .9,
        .45
      ),
      m
    );

    back.position.set(
      0,
      4,
      -.2
    );

    back.castShadow=true;
    g.add(back);
  }

  player.add(g);
}

function addClothesCustom() {
  if(!player)return;

  player
    .getObjectByName("clothesCustom")
    ?.remove();

  const kind=
    selectedAppearance.ropa||"Guerrero";

  if(kind==="Ninguna")return;

  const colors={
    Guerrero:0x3b506f,
    Mago:0x5d3f86,
    Noble:0x7b2538,
    Aventurero:0x5c6b45
  };

  const g=new THREE.Group();
  g.name="clothesCustom";

  const m=new THREE.MeshStandardMaterial({
    color:colors[kind]||0x3b506f,
    roughness:.8
  });

  const torso=new THREE.Mesh(
    new THREE.CylinderGeometry(
      .7,
      .82,
      1.45,
      12
    ),
    m
  );

  torso.position.y=3.05;
  torso.castShadow=true;

  g.add(torso);
  player.add(g);
}

function addAccessoryCustom() {
  if(!player)return;

  player
    .getObjectByName("accessoryCustom")
    ?.remove();

  const kind=
    selectedAppearance.accesorios||
    "Ninguno";

  if(kind==="Ninguno")return;

  const g=new THREE.Group();
  g.name="accessoryCustom";

  const gold=
    new THREE.MeshStandardMaterial({
      color:0xd9ad58,
      metalness:.7,
      roughness:.25
    });

  if(/Corona/i.test(kind)) {
    const c=new THREE.Mesh(
      new THREE.TorusGeometry(
        .45,
        .09,
        8,
        16
      ),
      gold
    );

    c.position.y=4.55;
    g.add(c);
  }

  if(/Amuleto|Collar/i.test(kind)) {
    const c=new THREE.Mesh(
      new THREE.SphereGeometry(
        .18,
        12,
        12
      ),
      new THREE.MeshStandardMaterial({
        color:0x61d8d0,
        emissive:0x174f4c,
        emissiveIntensity:.7
      })
    );

    c.position.set(
      0,
      2.35,
      .72
    );

    g.add(c);
  }

  player.add(g);
}
async function saveCharacter() {
  const character={
    race:selectedRace,
    appearance:{
      ...selectedAppearance
    }
  };

  state.character=character;

  localStorage.setItem(
    "universo_magico_character",
    JSON.stringify(character)
  );

  try {
    const response=await fetch(
      "/api/character",
      {
        method:"POST",
        headers:{
          "Content-Type":
            "application/json"
        },
        body:JSON.stringify({
          username:state.username,
          character
        })
      }
    );

    if(!response.ok)
      throw new Error(
        "No se pudo guardar el personaje."
      );

    showToast(
      "✨ Personaje guardado."
    );
  } catch(e) {
    console.error(e);

    showToast(
      "⚠️ No se pudo guardar el personaje."
    );
  }

  if($("characterCreator"))
    $("characterCreator").hidden=true;

  updateRaceUI();
}

function canFly() {
  return (
    selectedRace==="hada" ||
    selectedRace==="elfo"
  );
}

function setupFlightButton() {
  let b=$("flyButton");

  if(!b) {
    b=document.createElement("button");
    b.id="flyButton";
    b.type="button";

    b.style.cssText=`
      position:fixed;
      right:18px;
      bottom:110px;
      z-index:9999;
      padding:12px 16px;
      border-radius:14px;
      border:2px solid #f2d68d;
      background:#5d3f86;
      color:#fff;
      font-weight:900;
      touch-action:manipulation;
    `;

    document.body.appendChild(b);

    b.onclick=()=>{
      if(!canFly()) {
        return showToast(
          "🪽 Solo las hadas y los elfos pueden volar."
        );
      }

      if(!player)return;

      player.userData.flying=
        !player.userData.flying;

      b.textContent=
        player.userData.flying
          ? "🪽 ATERRIZAR"
          : "🪽 VOLAR";
    };
  }

  b.hidden=!canFly();

  b.textContent=
    player?.userData.flying
      ? "🪽 ATERRIZAR"
      : "🪽 VOLAR";
}

/* =========================
   BARRAS / ANIMACIÓN
========================= */

function updateBars() {
  const hpBar=
    $("hpBar") || $("hpbar");

  const manaBar=
    $("manaBar") || $("manabar");

  if(hpBar)
    hpBar.style.width=`${hp}%`;

  if(manaBar)
    manaBar.style.width=`${mana}%`;

  if($("hp"))
    $("hp").textContent=Math.round(hp);

  if($("mana"))
    $("mana").textContent=Math.round(mana);
}

function showToast(message) {
  const el=
    $("gameToast") || $("toast");

  if(!el)return;

  el.textContent=message;
  el.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer=setTimeout(
    ()=>el.classList.remove("show"),
    2200
  );
}

function animate() {
  requestAnimationFrame(animate);

  const delta=
    Math.min(
      clock.getDelta(),
      .05
    );

  updateMovement(delta);
  resolvePlayerHeight();
  updateCamera();

  if(mixer)
    mixer.update(delta);

  const particles=
    scene.userData.magicParticles;

  if(particles) {
    particles.children.forEach(p=>{
      p.position.y +=
        Math.sin(
          clock.elapsedTime*
          p.userData.speed+
          p.userData.phase
        )*.002;

      p.position.y +=
        Math.sin(
          clock.elapsedTime*
          p.userData.speed+
          p.userData.phase
        )*.004;

      if(p.position.y>36)
        p.position.y=.5;
    });
  }

  for(const t of trees) {
    const p=t.userData.phase||0;

    t.rotation.z=
      Math.sin(
        clock.elapsedTime+p
      )*.018;
  }

  mana=Math.min(
    100,
    mana+delta*4
  );

  updateBars();
  checkHouse();

  renderer.render(
    scene,
    camera
  );
}

function resize() {
  if(!camera || !renderer)return;

  camera.aspect=
    innerWidth/innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    innerWidth,
    innerHeight
  );
}

updateBars();

/* =========================
   SEGURIDAD DE INTERFAZ
========================= */

// Evita que botones de interfaz provoquen
// movimientos o zoom accidentales en móvil.
document.addEventListener(
  "touchstart",
  e=>{
    const target=e.target;

    if(
      target.closest?.(
        "button,input,form,#joystick,#chat,#map"
      )
    ) {
      return;
    }
  },
  {passive:true}
);

// Impedimos el menú contextual dentro del juego.
document.addEventListener(
  "contextmenu",
  e=>{
    if(game && !game.hidden) {
      e.preventDefault();
    }
  }
);

/* =========================
   RECUPERACIÓN DEL PERSONAJE
========================= */

try {
  const saved=
    JSON.parse(
      localStorage.getItem(
        "universo_magico_character"
      )||"null"
    );

  if(saved) {
    state.character=saved;

    selectedRace=
      normalizeRace(
        saved.race||"humano"
      );

    selectedAppearance=
      saved.appearance||
      selectedAppearance;
  }
} catch(e) {
  console.warn(
    "No se pudo recuperar el personaje.",
    e
  );
}

/* =========================
   EVENTOS DE SALIDA
========================= */

window.addEventListener(
  "beforeunload",
  ()=>{
    try {
      localStorage.setItem(
        "universo_magico_character",
        JSON.stringify({
          race:selectedRace,
          appearance:{
            ...selectedAppearance
          }
        })
      );
    } catch(e) {}
  }
);

console.log(
  "🌌 Universo Mágico preparado."
);
