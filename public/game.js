import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const $=id=>document.getElementById(id);
const socket=typeof io==="function"?io():null;
const home=$("home"), game=$("game"), sceneEl=$("scene");
let renderer,scene,camera,clock,player,mixer,actions={},activeAction;
let moveX=0,moveY=0,joyPointer=null,nearHouse=null,inside=false;
let hp=100,mana=100,lastTime=performance.now();
const keys={};
const MOVE_SPEED=7.5;

const state={username:"Aventurero",race:null};

const RACES={
  Humano:[
    ["Voluntad", "Recupera maná y resistencia.", ()=>{mana=Math.min(100,mana+28); toast("✦ Voluntad: maná restaurado");}],
    ["Segundo aire","Recupera vida.", ()=>{hp=Math.min(100,hp+24); toast("✦ Segundo aire: recuperaste vida");}],
    ["Adaptación","Aumenta velocidad brevemente.", ()=>buffSpeed(1.6,5,"✦ Adaptación: velocidad aumentada")]
  ],
  Elfo:[
    ["Paso de hoja","Impulso veloz hacia adelante.", ()=>dash(7,"✦ Paso de hoja")],
    ["Visión élfica","Revela cristales y objetos cercanos.", ()=>reveal("✦ Visión élfica: objetos revelados")],
    ["Raíz viva","Regenera vida durante unos segundos.", ()=>regen(7,4,"✦ Raíz viva")]
  ],
  Enano:[
    ["Piel de piedra","Reduce daño durante unos segundos.", ()=>buffDefense(0.45,6,"✦ Piel de piedra")],
    ["Golpe sísmico","Onda de choque alrededor del jugador.", ()=>shockwave("✦ Golpe sísmico")],
    ["Forja interior","Recupera resistencia y maná.", ()=>{mana=Math.min(100,mana+18);toast("✦ Forja interior");}]
  ],
  Orco:[
    ["Furia ancestral","Aumenta velocidad y fuerza.", ()=>buffSpeed(1.8,5,"✦ Furia ancestral")],
    ["Rugido","Sacude a enemigos cercanos.", ()=>shockwave("✦ Rugido orco")],
    ["Sed de batalla","Recupera vida al combatir.", ()=>{hp=Math.min(100,hp+18);toast("✦ Sed de batalla");}]
  ],
  Hada:[
    ["Alas mágicas","Flota y se desplaza rápidamente.", ()=>dash(10,"✦ Alas mágicas")],
    ["Polvo feérico","Crea una nube brillante.", ()=>sparkle("✦ Polvo feérico")],
    ["Bendición","Regenera vida y maná.", ()=>{hp=Math.min(100,hp+18);mana=Math.min(100,mana+22);toast("✦ Bendición feérica");}]
  ],
  Dracónido:[
    ["Aliento ancestral","Emite una ráfaga elemental.", ()=>breath("✦ Aliento ancestral")],
    ["Escamas dracónicas","Aumenta defensa temporalmente.", ()=>buffDefense(0.35,7,"✦ Escamas dracónicas")],
    ["Salto del dragón","Impulso largo hacia adelante.", ()=>dash(12,"✦ Salto del dragón")]
  ]
};

let speedMultiplier=1,defenseMultiplier=1;

$("tabLogin")?.addEventListener("click",()=>setAuth(false));
$("tabRegister")?.addEventListener("click",()=>setAuth(true));
let registerMode=false;
function setAuth(v){registerMode=v;$("tabLogin")?.classList.toggle("active",!v);$("tabRegister")?.classList.toggle("active",v);$("authSubmit").textContent=v?"CREAR CUENTA":"ENTRAR AL UNIVERSO";$("authTitle").textContent=v?"Creá tu aventurero":"Bienvenido al Reino";}
$("authForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const username=$("username").value.trim(),password=$("password").value;
 if(username.length<3||password.length<6){showAuth("Nombre mínimo 3 caracteres y contraseña mínima 6.");return}
 try{
   const r=await fetch(registerMode?"/api/register":"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok) throw Error(d.error||"No se pudo entrar.");
   localStorage.setItem("universo_magico_user",JSON.stringify(d));startGame(username);
 }catch(err){showAuth(err.message)}
});
function showAuth(m){$("authMsg").textContent=m;setTimeout(()=>{$("authMsg").textContent=""},3500)}

function startGame(username){
 state.username=username||"Aventurero";$("hudName").textContent=state.username;$("avatar").textContent=state.username[0].toUpperCase();
 home.hidden=true;game.hidden=false;if(!renderer)initWorld();
}

function initWorld(){
 clock=new THREE.Clock();scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc4d0);
 scene.fog=new THREE.FogExp2(0x789ca3,.0022);
 camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,1800);
 camera.position.set(0,5.8,10);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 sceneEl.appendChild(renderer.domElement);
 const hemi=new THREE.HemisphereLight(0xd9f1ff,0x34442f,2.2);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffe9c6,3.5);sun.position.set(-100,180,80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
 buildWorld();loadPlayer();setupJoystick();setupKeyboard();setupCameraTouch();setupHouses();setupMap();setupChat();setupRaces();
 addWindowResize();animate();
}

function buildWorld(){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.MeshStandardMaterial({color:0x668f5c,roughness:.98}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 makePath(0,0,700,12);makePath(-120,20,180,9);makePath(130,-70,200,10);
 createVillage();createForest();createRiver();createMountains();createCastle();createCrystals();
}

function makePath(x,z,len,w){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,len),new THREE.MeshStandardMaterial({color:0xa58f68,roughness:1}));m.rotation.x=-Math.PI/2;m.position.set(x,.015,z);scene.add(m)}

function createVillage(){
 const spots=[[-42,-24],[-16,-30],[18,-30],[45,-22],[-46,12],[40,16]];
 spots.forEach((p,i)=>makeHouse(p[0],p[1],i));
 makeWell(0,-2);
 for(let i=0;i<12;i++)makeFence(-70+i*12,30,12);
}

function makeHouse(x,z,id){
 const g=new THREE.Group();g.userData.houseId=id;g.userData.door=new THREE.Vector3(x,z+4.8);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(12,6,10),new THREE.MeshStandardMaterial({color:id%2?0x73503b:0x6c4936,roughness:.86}));wall.position.y=3;wall.castShadow=true;wall.receiveShadow=true;g.add(wall);
 const roofMat=new THREE.MeshStandardMaterial({color:0x493b3b,roughness:.78});
 const roof=new THREE.Mesh(new THREE.ConeGeometry(8.4,5.2,4),roofMat);roof.rotation.y=Math.PI/4;roof.position.y=8;roof.castShadow=true;g.add(roof);
 const door=new THREE.Mesh(new THREE.BoxGeometry(2.1,3.5,.3),new THREE.MeshStandardMaterial({color:0x21171a,roughness:.6}));door.position.set(0,1.75,5.1);g.add(door);
 [-3.6,3.6].forEach(wx=>{const win=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.8,.25),new THREE.MeshStandardMaterial({color:0x8fd1df,metalness:.05,roughness:.3,emissive:0x173c48,emissiveIntensity:.15}));win.position.set(wx,3.5,5.05);g.add(win)});
 const chimney=new THREE.Mesh(new THREE.BoxGeometry(1.3,3,1.3),new THREE.MeshStandardMaterial({color:0x403b3b}));chimney.position.set(2.8,8.8,-2);g.add(chimney);
 g.position.set(x,0,z);scene.add(g);g.userData.inside=createInterior(id);
 houses.push(g);
}
const houses=[];
function createInterior(id){
 const group=new THREE.Group();group.visible=false;
 const floor=new THREE.Mesh(new THREE.BoxGeometry(11,.25,9),new THREE.MeshStandardMaterial({color:0x72563d}));floor.position.y=.1;group.add(floor);
 const rug=new THREE.Mesh(new THREE.CircleGeometry(2.1,32),new THREE.MeshStandardMaterial({color:id%2?0x493a70:0x6e3e3e}));rug.rotation.x=-Math.PI/2;rug.position.y=.25;group.add(rug);
 const table=new THREE.Mesh(new THREE.BoxGeometry(2.8,.35,1.5),new THREE.MeshStandardMaterial({color:0x4a2f20}));table.position.set(0,1.5,0);group.add(table);
 for(const x of [-1.1,1.1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.2,1.5,.2),new THREE.MeshStandardMaterial({color:0x3c261b}));leg.position.set(x,.75,0);group.add(leg)}
 return group;
}
function makeWell(x,z){const base=new THREE.Mesh(new THREE.CylinderGeometry(3,3.2,1.2,16),new THREE.MeshStandardMaterial({color:0x777c82,roughness:1}));base.position.set(x,.6,z);base.castShadow=true;scene.add(base);const water=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,.15,32),new THREE.MeshStandardMaterial({color:0x67bfd2,roughness:.2,metalness:.1}));water.position.set(x,1.25,z);scene.add(water)}
function makeFence(x,z,len){const m=new THREE.Mesh(new THREE.BoxGeometry(len,.8,.18),new THREE.MeshStandardMaterial({color:0x5a4632}));m.position.set(x,.45,z);scene.add(m)}
function createForest(){for(let i=0;i<90;i++){const x=(Math.random()-.5)*520,z=(Math.random()-.5)*520;if(Math.abs(x)<90&&Math.abs(z)<70)continue;makeTree(x,z,1+Math.random()*.5)}}
function makeTree(x,z,s){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35,.55,5,8),new THREE.MeshStandardMaterial({color:0x4c3424,roughness:1}));trunk.position.y=2.5;trunk.castShadow=true;g.add(trunk);for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.SphereGeometry(2.4-i*.25,12,10),new THREE.MeshStandardMaterial({color:0x2e6842,roughness:1}));crown.position.set((Math.random()-.5)*1.8,5+i*1.4,(Math.random()-.5)*1.8);crown.castShadow=true;g.add(crown)}g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g)}
function createRiver(){const water=new THREE.Mesh(new THREE.PlaneGeometry(36,500),new THREE.MeshStandardMaterial({color:0x4f9bb1,transparent:true,opacity:.82,roughness:.2,metalness:.1}));water.rotation.x=-Math.PI/2;water.position.set(100,.03,0);scene.add(water)}
function createMountains(){for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(30+Math.random()*20,55+Math.random()*35,7),new THREE.MeshStandardMaterial({color:0x59646b,roughness:1}));m.position.set(-260+i*48,20,-250-Math.random()*80);m.castShadow=true;scene.add(m)}}
function createCastle(){const g=new THREE.Group();for(let i=0;i<7;i++){const h=30+Math.random()*30,t=new THREE.Mesh(new THREE.CylinderGeometry(4,5,h,8),new THREE.MeshStandardMaterial({color:0x4d4e58,roughness:.9}));t.position.set((i-3)*18,h/2,-280+(i%2)*8);t.castShadow=true;g.add(t)}const wall=new THREE.Mesh(new THREE.BoxGeometry(100,28,20),new THREE.MeshStandardMaterial({color:0x565762,roughness:.9}));wall.position.set(0,14,-280);g.add(wall);scene.add(g)}
function createCrystals(){for(let i=0;i<25;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.7+Math.random(),3+Math.random()*3,6),new THREE.MeshStandardMaterial({color:0x9a62d7,emissive:0x542080,emissiveIntensity:.7,roughness:.25}));c.position.set((Math.random()-.5)*500,.8,(Math.random()-.5)*500);c.rotation.z=(Math.random()-.5)*.5;scene.add(c)}}

function loadPlayer(){
 const loader=new GLTFLoader();
 loader.load("/assets/characters/Superhero_Male_FullBody.gltf",gltf=>{
   player=gltf.scene;player.scale.setScalar(1.8);player.position.set(0,0,28);player.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(player);
   mixer=new THREE.AnimationMixer(player);
   loader.load("/assets/characters/UAL1_Standard.glb",a=>{a.animations.forEach(clip=>actions[clip.name]=mixer.clipAction(clip));playAnimation(["Idle","Idle_01","Breathing_Idle","Idle_2"])});
 },()=>{player=createFallbackHero();scene.add(player);toast("Modelo 3D no encontrado: se creó un personaje temporal.");});
}
function createFallbackHero(){const g=new THREE.Group();const skin=new THREE.MeshStandardMaterial({color:0xd4a27b,roughness:.65}),cloth=new THREE.MeshStandardMaterial({color:0x31204f,roughness:.75}),metal=new THREE.MeshStandardMaterial({color:0xb48a42,metalness:.65,roughness:.3});const body=new THREE.Mesh(new THREE.CapsuleGeometry(.75,2.1,8,16),cloth);body.position.y=2.1;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.7,20,16),skin);head.position.y=4.25;g.add(head);for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.25,1.5,6,10),cloth);leg.position.set(s*.35,.8,0);g.add(leg);const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.23,1.5,6,10),cloth);arm.position.set(s*1,2.5,0);arm.rotation.z=s*.2;g.add(arm)}const belt=new THREE.Mesh(new THREE.TorusGeometry(.77,.08,8,32),metal);belt.rotation.x=Math.PI/2;belt.position.y=1.7;g.add(belt);g.userData.fallback=true;return g}

function playAnimation(names){if(!mixer)return;const name=names.find(n=>actions[n]);if(!name)return;const next=actions[name];if(activeAction===next)return;activeAction?.fadeOut(.2);next.reset().fadeIn(.2).play();activeAction=next}
function updatePlayer(dt){if(!player||inside)return;let x=moveX,y=moveY;if(keys.w||keys.ArrowUp)y-=1;if(keys.s||keys.ArrowDown)y+=1;if(keys.a||keys.ArrowLeft)x-=1;if(keys.d||keys.ArrowRight)x+=1;const l=Math.hypot(x,y);if(l>.05){x/=l;y/=l;const speed=MOVE_SPEED*speedMultiplier;player.position.x+=x*speed*dt;player.position.z+=y*speed*dt;player.rotation.y=Math.atan2(x,y);moving=true;playAnimation(["Walk","Run","Walking"])}else{moving=false;playAnimation(["Idle","Idle_01","Breathing_Idle"])}player.position.x=THREE.MathUtils.clamp(player.position.x,-330,330);player.position.z=THREE.MathUtils.clamp(player.position.z,-330,330);nearHouse=findHouse()}
function updateCamera(dt){if(!player)return;const target=new THREE.Vector3(player.position.x,2.7,player.position.z);const desired=new THREE.Vector3(player.position.x,6.2,player.position.z+10);camera.position.lerp(desired,1-Math.pow(.0005,dt));camera.lookAt(target)}
function findHouse(){let best=null,d=999;for(const h of houses){const p=h.userData.door.clone().add(h.position);const dd=player.position.distanceTo(new THREE.Vector3(p.x,0,p.z));if(dd<d){d=dd;best=h}}$("enterHouse").hidden=!(best&&d<7&&!inside);return best&&d<7?best:null}

function setupHouses(){$("enterHouse").onclick=()=>enterHouse();$("exitHouse").onclick=()=>exitHouse()}
function enterHouse(){if(!nearHouse)return;inside=true;nearHouse.visible=false;nearHouse.userData.inside.visible=true;nearHouse.userData.inside.position.copy(nearHouse.position);player.position.set(nearHouse.position.x,0,nearHouse.position.z);player.position.z+=0;$("enterHouse").hidden=true;$("exitHouse").hidden=false;toast("Entraste a la casa");}
function exitHouse(){if(!nearHouse){nearHouse=houses[0]}nearHouse.userData.inside.visible=false;nearHouse.visible=true;player.position.set(nearHouse.position.x,0,nearHouse.position.z+8);inside=false;$("exitHouse").hidden=true;toast("Saliste de la casa")}

function setupRaces(){$("#racePanel");document.querySelectorAll("[data-race]").forEach(b=>b.onclick=()=>chooseRace(b.dataset.race))}
function chooseRace(r){state.race=r;$("racePanel").hidden=true;$("abilityPanel").hidden=false;$("raceName").textContent=r.toUpperCase();$("hudRace").textContent=r;const wrap=$("abilities");wrap.innerHTML="";RACES[r].forEach((a,i)=>{const d=document.createElement("div");d.className="ability";d.innerHTML=`<button data-ability="${i}">✦ ${a[0]}<small>${a[1]}</small></button>`;d.querySelector("button").onclick=()=>a[2]();wrap.appendChild(d)});fetch("/api/character",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:state.username,character:{race:r}})}).catch(()=>{});toast(`Raza elegida: ${r}`)}

function buffSpeed(v,t,msg){speedMultiplier=v;toast(msg);setTimeout(()=>speedMultiplier=1,t*1000)}
function buffDefense(v,t,msg){defenseMultiplier=v;toast(msg);setTimeout(()=>defenseMultiplier=1,t*1000)}
function regen(amount,t,msg){const timer=setInterval(()=>hp=Math.min(100,hp+amount),1000);setTimeout(()=>clearInterval(timer),t*1000);toast(msg)}
function dash(dist,msg){if(!player)return;player.position.x+=Math.sin(player.rotation.y)*dist;player.position.z+=Math.cos(player.rotation.y)*dist;sparkle(msg)}
function shockwave(msg){sparkle(msg)}
function sparkle(msg){const g=new THREE.Group();for(let i=0;i<22;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.06,6,6),new THREE.MeshBasicMaterial({color:0xd6a5ff}));p.position.set((Math.random()-.5)*5,1+Math.random()*3,(Math.random()-.5)*5);g.add(p)}g.position.copy(player.position);scene.add(g);setTimeout(()=>scene.remove(g),1000);toast(msg)}
function breath(msg){sparkle(msg)}
function reveal(msg){for(const o of scene.children)if(o.isMesh&&o.material?.emissive)o.material.emissiveIntensity=Math.min(2,(o.material.emissiveIntensity||0)+.4);toast(msg)}
function toast(msg){let t=$("toast");if(!t){t=document.createElement("div");t.id="toast";Object.assign(t.style,{position:"absolute",top:"88px",left:"50%",transform:"translateX(-50%)",padding:"10px 16px",background:"rgba(12,9,20,.82)",border:"1px solid #c9a65c",borderRadius:"12px",zIndex:50,color:"#ffe9ac",fontFamily:"system-ui"});document.body.appendChild(t)}t.textContent=msg;clearTimeout(t._timer);t._timer=setTimeout(()=>t.remove(),2200)}

function setupJoystick(){const j=$("joystick"),s=$("stick");const move=e=>{const r=j.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=55,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max}s.style.transform=`translate(${dx}px,${dy}px)`;moveX=dx/max;moveY=dy/max};j.addEventListener("pointerdown",e=>{joyPointer=e.pointerId;j.setPointerCapture(e.pointerId);move(e)});j.addEventListener("pointermove",e=>{if(e.pointerId===joyPointer)move(e)});j.addEventListener("pointerup",()=>{joyPointer=null;s.style.transform="translate(0,0)";moveX=moveY=0})}
function setupKeyboard(){addEventListener("keydown",e=>keys[e.key]=true);addEventListener("keyup",e=>keys[e.key]=false)}
let lookPointer=null,lastLookX=0;
function setupCameraTouch(){sceneEl.addEventListener("pointerdown",e=>{if(e.target.closest("button,.chat,#joystick"))return;lookPointer=e.pointerId;lastLookX=e.clientX;sceneEl.setPointerCapture(e.pointerId)});sceneEl.addEventListener("pointermove",e=>{if(e.pointerId!==lookPointer||!player)return;const dx=e.clientX-lastLookX;lastLookX=e.clientX;player.rotation.y-=dx*.006});sceneEl.addEventListener("pointerup",()=>lookPointer=null)}
function setupMap(){$("mapBtn").onclick=()=>$("map").hidden=false;$("sideMap").onclick=()=>$("map").hidden=false;$("closeMap").onclick=()=>$("map").hidden=true}
function setupChat(){if(!socket)return;$("form").onsubmit=e=>{e.preventDefault();const m=$("input").value.trim();if(!m)return;socket.emit("chat",{username:state.username,message:m});$("input").value=""};socket.on("chat",d=>{const p=document.createElement("div");p.textContent=`[${d.username}] ${d.message}`;$("msgs").appendChild(p);$("msgs").scrollTop=$("msgs").scrollHeight})}
function addWindowResize(){addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)})}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);updatePlayer(dt);updateCamera(dt);if(mixer)mixer.update(dt);$("hpFill").style.width=hp+"%";$("manaFill").style.width=mana+"%";renderer.render(scene,camera)}
