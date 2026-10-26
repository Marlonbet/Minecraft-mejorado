import * as THREE from 'three';
import {
  WORLD_X, WORLD_Y, WORLD_Z, BLOCKS, BLOCK_IDS, PLAYER
} from './config.js';
import { buildAtlas, buildCrackAtlas } from './textures.js';
import { VoxelWorld } from './world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { voxelRaycast } from './raycast.js';
import { Settings } from './settings.js';
import { Entities, CHARACTERS, randomChar, humanoid } from './entities.js';
import { getCities } from './villagers.js';
import { Minimap } from './minimap.js';

const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
document.body.classList.add(isTouch ? 'touch' : 'desktop');

// ---------- Settings (primero, para poder inicializar la cámara con el valor real) ----------
const settings = new Settings();

// ---------- Escena ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 50, 110);

// La cámara nace con el FOV persistido y el aspecto real del viewport:
// elimina el "snap" de perspectiva en el primer frame.
const initialFov = settings.get('fov');
const camera = new THREE.PerspectiveCamera(
  initialFov,
  innerWidth / innerHeight,
  0.1,
  300
);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('game'),
  antialias: !isTouch,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));

// ---------- FOV: utilidades geométricas ----------
// FOV horizontal resultante para un FOV vertical y aspecto dados
function hFovFromV(vFovDeg, aspect) {
  const vRad = (vFovDeg * Math.PI) / 180;
  return (2 * Math.atan(Math.tan(vRad / 2) * aspect) * 180) / Math.PI;
}
// FOV vertical necesario para conseguir un FOV horizontal dado
function vFovFromH(hFovDeg, aspect) {
  const hRad = (hFovDeg * Math.PI) / 180;
  return (2 * Math.atan(Math.tan(hRad / 2) / aspect) * 180) / Math.PI;
}

const MAX_HFOV = 118;   // a partir de aquí se nota el efecto ojo de pez

// Devuelve el FOV vertical a aplicar respetando la preferencia del usuario
// salvo que su hFov resultante supere MAX_HFOV, en cuyo caso recorta
// geométricamente al límite (sin pisar su elección en el resto de casos).
function effectiveFov() {
  const aspect = camera.aspect || (innerWidth / innerHeight);
  const userFov = settings.get('fov');

  const hFov = hFovFromV(userFov, aspect);
  if (hFov <= MAX_HFOV) return userFov;

  return vFovFromH(MAX_HFOV, aspect);
}

function applyFov(v) {
  camera.fov = v;
  camera.updateProjectionMatrix();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = effectiveFov();
  camera.updateProjectionMatrix();

  if (typeof input !== 'undefined' && input.updateJoyCenter) {
    input.updateJoyCenter();
  }
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));

// Bloqueo de orientación landscape (best effort)
if (isTouch && screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}

const ambient = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambient);
const SKY_DAY = new THREE.Color(0x87ceeb), SKY_NIGHT = new THREE.Color(0x070a14);
let timeOfDay = 0.25;

// ---------- Atlas + material ----------
const { texture: atlas, canvas: atlasCanvas } = buildAtlas();
const chunkMaterial = new THREE.MeshLambertMaterial({
  map: atlas,
  vertexColors: true,
  side: THREE.FrontSide,
});

// ---------- Crack atlas ----------
const { texture: crackTex, stages: CRACK_STAGES } = buildCrackAtlas();

// ---------- Mundo ----------
const world = new VoxelWorld(isTouch ? 4 : 6);   // distancia de render menor en móvil
world.init(scene, chunkMaterial);
scene.fog.near = world.rd * 8;
scene.fog.far = world.rd * 16 - 6;

// ---------- Jugador ----------
// v7: el punto de aparición se fija al cargar un mundo (loadWorld, más
// abajo), no al arrancar: al abrir el juego no hay mundo en curso, solo
// la pantalla inicial con Menú / Elegir skins.
const player = new Player(world);

// ---------- Indicadores ----------
const highlightGeo = new THREE.EdgesGeometry(
  new THREE.BoxGeometry(1.002, 1.002, 1.002)
);

// Wireframe de apuntado (solo desktop)
const breakHighlight = new THREE.LineSegments(
  highlightGeo,
  new THREE.LineBasicMaterial({ color: 0xffffff })
);
breakHighlight.visible = false;
scene.add(breakHighlight);

// Cubo de grietas (rotura) — textura progresiva
const crackMat = new THREE.MeshBasicMaterial({
  map: crackTex,
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});
const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), crackMat);
crackMesh.visible = false;
crackMesh.renderOrder = 3;
scene.add(crackMesh);

// Flash de colocación (feedback)
const placeFlash = new THREE.LineSegments(
  highlightGeo,
  new THREE.LineBasicMaterial({ color: 0x66ff99, transparent: true, opacity: 1 })
);
placeFlash.visible = false;
scene.add(placeFlash);
let placeFlashTime = 0;

// ---------- Input + HUD ----------
const input = new Input(isTouch);
input.bindKeyboard();
input.bindMouse(() => renderer.domElement);
input.bindTouch(() => renderer.domElement);
input.bindActionButtons();
input.bindDescend();
input.setSensitivity(settings.get('sensitivity'));

const hud = new HUD(atlasCanvas);

// ---------- Personaje, entidades, vida y minimapa ----------
let pal = null;
try { pal = JSON.parse(localStorage.getItem('minimc.char') || 'null'); } catch (_) {}
if (!pal) pal = CHARACTERS[0];
let model = null, thirdPerson = false;
function setCharacter(p) {
  pal = p;
  try { localStorage.setItem('minimc.char', JSON.stringify(p)); } catch (_) {}
  if (model) scene.remove(model.group);
  model = humanoid(p);
  model.group.visible = thirdPerson;
  scene.add(model.group);
  document.querySelectorAll('.char').forEach(el => el.classList.toggle('sel', el.dataset.id === p.id));
}
const sw = p => `<i style="background:${p.hair}"></i><i style="background:${p.skin}"></i><i style="background:${p.shirt}"></i><i style="background:${p.pants}"></i>`;
CHARACTERS.forEach(c => {
  const el = document.createElement('button');
  el.className = 'char'; el.dataset.id = c.id;
  el.innerHTML = c.random ? '🎲<small>Aleatorio</small>' : `<span>${sw(c)}</span><small>${c.name}</small>`;
  el.addEventListener('click', () => setCharacter(c.random ? { id: 'aleatorio', ...randomChar() } : c));
  document.getElementById('chars').appendChild(el);
});
setCharacter(pal);

const entities = new Entities(scene, world);
const minimap = new Minimap(document.getElementById('minimap'));
const heartsEl = document.getElementById('hearts'), dmgEl = document.getElementById('dmg');
const atkO = new THREE.Vector3();
let hp = 20, regen = 0, fallY = player.pos.y, mmT = 0;
function drawHearts() {
  heartsEl.style.display = creative ? 'none' : 'flex';
  let s = '';
  for (let i = 0; i < 10; i++) s += `<b class="${hp >= 2 * i + 2 ? 'f' : hp === 2 * i + 1 ? 'h' : ''}">❤</b>`;
  heartsEl.innerHTML = s;
}
function hurt(n) {
  if (creative || hp <= 0) return;
  hp = Math.max(0, hp - n);
  dmgEl.classList.add('on'); setTimeout(() => dmgEl.classList.remove('on'), 150);
  if (navigator.vibrate) navigator.vibrate(60);
  if (hp <= 0) { hp = 20; player.pos.copy(player.spawn); player.vel.set(0, 0, 0); fallY = player.pos.y; }
  drawHearts();
}
function doAttack() {
  camera.getWorldDirection(dirVec);
  atkO.set(player.pos.x, player.pos.y + 1.6, player.pos.z);
  return entities.attack(atkO, dirVec, 3);
}
function toggleView() { thirdPerson = !thirdPerson; model.group.visible = thirdPerson; }
document.getElementById('btnAtk').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (playing) doAttack(); });
document.getElementById('viewBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); toggleView(); });

// ---------- Estado de cámara ----------
let yaw = 0, pitch = 0;   // vista recta al abrir (antes: 0.35 / -0.08 = inclinada)
const MAX_PITCH = Math.PI / 2 - 0.02;
let playing = false;

camera.position.set(player.pos.x, player.pos.y + PLAYER.eyeHeight, player.pos.z);
camera.rotation.y = yaw;
camera.rotation.x = pitch;

// ---------- UI: pantallas ----------
// v7: el menú viejo (un solo panel larguísimo) se destruyó. Ahora hay 4
// pantallas dentro del mismo overlay: inicial (2 botones centrados),
// skins, menú (mundos + crear + ajustes) y menú dentro del mundo.
const overlay = document.getElementById('overlay');
const gameMenuBtn = document.getElementById('gameMenuBtn');
const sensSlider = document.getElementById('sensSlider');
const fovSlider = document.getElementById('fovSlider');
const sensVal = document.getElementById('sensVal');
const fovVal = document.getElementById('fovVal');
const btnDown = document.getElementById('btnDown');

let creative = true;   // lo fija el mundo que se carga, no un botón global
const inv = {};
let lastJumpTap = 0;
let currentWorld = null;     // objeto del mundo en curso (de la lista)
let pausedFromGame = false;  // el menú se abrió desde una partida en curso

function showScreen(id) {
  for (const s of ['startScreen', 'skinsScreen', 'menuScreen', 'gameMenuScreen'])
    document.getElementById(s).classList.toggle('hidden', s !== id);
  overlay.classList.remove('hidden');
}

function syncMode() {
  if (!creative) player.flying = false;
  drawHearts();
}
function toggleFly() {
  if (!creative) return;
  player.flying = !player.flying;
  player.vel.y = 0;
}

// ---------- Mundos guardados (local, en este dispositivo) ----------
const WORLDS_KEY = 'minimc.worlds.v1';
let worlds = [];
function loadWorldsFromStorage() {
  try { const v = JSON.parse(localStorage.getItem(WORLDS_KEY) || 'null'); return Array.isArray(v) ? v : []; }
  catch (_) { return []; }
}
function persistWorlds() {
  localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds));
}
// Migración una sola vez del mundo único antiguo: si no hay lista y
// existe el guardado viejo, pasa a ser un mundo más, sin perder nada.
function migrateOldWorld() {
  if (worlds.length) return;
  let s = null;
  try { s = JSON.parse(localStorage.getItem('minimc.world.v3') || 'null'); } catch (_) {}
  if (!s) return;
  worlds.push({
    id: 'mundo-' + Date.now().toString(36),
    name: 'Mi mundo',
    mode: localStorage.getItem('minimc.mode') !== 'survival' ? 'creative' : 'survival',
    seed: Number.isInteger(s.seed) ? s.seed : Math.floor(Math.random() * 2 ** 31),
    edits: s.edits || {},
    createdAt: Date.now(), updatedAt: Date.now(),
  });
  try { persistWorlds(); } catch (_) {}
}
worlds = loadWorldsFromStorage();
migrateOldWorld();

function seedFromText(text) {
  const t = (text || '').trim();
  if (!t) return Math.floor(Math.random() * 2 ** 31);
  if (/^-?\d+$/.test(t)) return Math.abs(parseInt(t, 10)) % (2 ** 31);
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (Math.imul(31, h) + t.charCodeAt(i)) | 0;
  return Math.abs(h) % (2 ** 31);
}
function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' ' +
    new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
  catch (_) { return ''; }
}
function renderWorldsList() {
  const list = document.getElementById('worldsList');
  document.getElementById('worldsEmpty').classList.toggle('hidden', worlds.length > 0);
  list.innerHTML = '';
  for (const w of worlds) {
    const edited = w.edits ? Object.values(w.edits).reduce((a, c) => a + Object.keys(c).length, 0) : 0;
    const el = document.createElement('div');
    el.className = 'world-item';
    el.innerHTML = `<b>${w.name || 'Mundo sin nombre'}</b>
      <div class="world-meta">${w.mode === 'survival' ? 'Supervivencia ⛏️' : 'Creativo ✨'} · Semilla ${w.seed} · ${edited} bloques editados<br>Guardado: ${fmtDate(w.updatedAt)}</div>
      <div class="world-actions"><button data-act="play">▶ Jugar</button><button data-act="del" class="danger">🗑️ Borrar</button></div>`;
    el.querySelector('[data-act="play"]').addEventListener('click', () => { loadWorld(w); startGame(); });
    el.querySelector('[data-act="del"]').addEventListener('click', () => {
      if (!confirm(`¿Borrar el mundo "${w.name}" para siempre?`)) return;
      worlds = worlds.filter(x => x.id !== w.id);
      try { persistWorlds(); } catch (_) {}
      if (currentWorld && currentWorld.id === w.id) { currentWorld = null; pausedFromGame = false; }
      renderWorldsList();
    });
    list.appendChild(el);
  }
  document.getElementById('menuResumeBtn').classList.toggle('hidden', !(pausedFromGame && currentWorld));
}

// Guarda el mundo en curso en la lista (sin salir de la partida).
// Devuelve false si el almacenamiento local está lleno.
function saveCurrentWorld() {
  if (!currentWorld) return false;
  currentWorld.seed = world.seed;
  currentWorld.edits = world.edits;
  currentWorld.mode = creative ? 'creative' : 'survival';
  currentWorld.updatedAt = Date.now();
  currentWorld.timeOfDay = timeOfDay;
  currentWorld.player = { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw, pitch };
  currentWorld.hp = hp;
  currentWorld.inv = { ...inv };
  if (!worlds.some(w => w.id === currentWorld.id)) worlds.push(currentWorld);
  try { persistWorlds(); return true; }
  catch (_) { return false; }
}
// El guardado automático tras editar bloques usa lo mismo, en silencio.
world.saveHandler = () => { saveCurrentWorld(); };

function loadWorld(w) {
  // Limpiar el mundo anterior: mallas, aldeas, ciudades y entidades.
  for (const [, c] of world.chunks) {
    if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); }
  }
  world.chunks.clear();
  world.vcache.clear();
  getCities().clear();
  for (const e of entities.list) scene.remove(e.g);
  entities.list = [];
  entities.villages.clear();
  entities.buildSites = [];

  world.seed = w.seed;
  world.edits = w.edits || {};
  creative = w.mode !== 'survival';
  timeOfDay = typeof w.timeOfDay === 'number' ? w.timeOfDay : 0.25;
  currentWorld = w;
  syncMode();

  // Aparición: (0,0) en este mundo, salvo posición guardada.
  let sy = WORLD_Y - 1;
  while (sy > 0 && !world.getBlock(0, sy, 0)) sy--;
  player.setSpawn(0.5, sy + 1.05, 0.5);
  player.flying = false;
  player.vel.set(0, 0, 0);
  hp = typeof w.hp === 'number' ? w.hp : 20;
  for (const k of Object.keys(inv)) delete inv[k];
  if (w.inv) Object.assign(inv, w.inv);
  if (w.player && Number.isFinite(w.player.x)) {
    player.pos.set(w.player.x, w.player.y, w.player.z);
    yaw = w.player.yaw || 0; pitch = w.player.pitch || 0;
  } else {
    yaw = 0; pitch = 0;
  }
  fallY = player.pos.y;
  camera.position.set(player.pos.x, player.pos.y + PLAYER.eyeHeight, player.pos.z);
  camera.rotation.y = yaw; camera.rotation.x = pitch;
  drawHearts();
  world.update(player.pos.x, player.pos.z, 999);   // carga inicial del mundo
}

function startGame() {
  pausedFromGame = false;
  if (!isTouch) {
    renderer.domElement.requestPointerLock();
  } else {
    playing = true;
    overlay.classList.add('hidden');
    gameMenuBtn.classList.remove('hidden');
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }
}

function openGameMenu() {
  if (!currentWorld) { showScreen('startScreen'); return; }
  pausedFromGame = true;
  playing = false;
  const gm = document.getElementById('gameMenuWorld');
  gm.textContent = `${currentWorld.name || 'Mundo'} · ${creative ? 'Creativo ✨' : 'Supervivencia ⛏️'} · Semilla ${world.seed}`;
  document.getElementById('saveMsg').textContent = '';
  showScreen('gameMenuScreen');
  gameMenuBtn.classList.add('hidden');
  syncSliderUI();
}

function pauseGame() {
  if (document.pointerLockElement) {
    document.exitPointerLock();   // el handler de pointerlockchange abre el menú
  } else {
    openGameMenu();
  }
}

function syncSliderUI() {
  const fov = settings.get('fov');
  const sens = settings.get('sensitivity');
  sensSlider.value = sens;
  fovSlider.value = fov;
  sensVal.textContent = `${sens.toFixed(1)}×`;
  fovVal.textContent = `${fov}°`;
}

// Sincronización inmediata + red de seguridad por si el DOM aún no estuviera listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncSliderUI, { once: true });
} else {
  syncSliderUI();
}

sensSlider.addEventListener('input', () => {
  const v = parseFloat(sensSlider.value);
  sensVal.textContent = `${v.toFixed(1)}×`;
  settings.set('sensitivity', v);
});
fovSlider.addEventListener('input', () => {
  const v = parseInt(fovSlider.value, 10);
  fovVal.textContent = `${v}°`;
  settings.set('fov', v);   // persiste el valor elegido por el usuario
});

settings.onChange((key, value) => {
  if (key === 'fov') {
    // Aplicar effectiveFov() (clamp geométrico) en vez del valor crudo
    camera.fov = effectiveFov();
    camera.updateProjectionMatrix();
  }
  if (key === 'sensitivity') input.setSensitivity(value);
});

// ---------- Botones de las pantallas ----------
document.getElementById('menuBtn').addEventListener('click', () => { renderWorldsList(); showScreen('menuScreen'); });
document.getElementById('skinsBtn').addEventListener('click', () => { showScreen('skinsScreen'); });
document.getElementById('skinsBackBtn').addEventListener('click', () => { showScreen('startScreen'); });
document.getElementById('menuBackBtn').addEventListener('click', () => {
  if (pausedFromGame && currentWorld) openGameMenu(); else showScreen('startScreen');
});
document.getElementById('menuResumeBtn').addEventListener('click', () => { startGame(); });
document.getElementById('createWorldBtn').addEventListener('click', () => {
  document.getElementById('createWorldForm').classList.remove('hidden');
  document.getElementById('createWorldBtn').classList.add('hidden');
});
document.getElementById('cancelCreateBtn').addEventListener('click', () => {
  document.getElementById('createWorldForm').classList.add('hidden');
  document.getElementById('createWorldBtn').classList.remove('hidden');
});
document.getElementById('confirmCreateBtn').addEventListener('click', () => {
  if (worlds.length >= 10) { alert('Ya tienes 10 mundos guardados. Borra uno para crear otro.'); return; }
  const name = document.getElementById('worldNameInput').value.trim() || `Mundo ${worlds.length + 1}`;
  const mode = document.getElementById('worldModeSelect').value;
  const seed = seedFromText(document.getElementById('worldSeedInput').value);
  const w = {
    id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    name, mode, seed, edits: {},
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  worlds.push(w);
  try { persistWorlds(); } catch (_) { alert('No se pudo guardar el mundo: el almacenamiento local está lleno.'); worlds = worlds.filter(x => x.id !== w.id); return; }
  document.getElementById('createWorldForm').classList.add('hidden');
  document.getElementById('createWorldBtn').classList.remove('hidden');
  loadWorld(w);
  startGame();
});
document.getElementById('saveWorldBtn').addEventListener('click', () => {
  const ok = saveCurrentWorld();
  renderWorldsList();
  document.getElementById('saveMsg').textContent = ok
    ? `Guardado ✓ ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    : 'No se pudo guardar: el almacenamiento local está lleno. Borra un mundo y vuelve a intentarlo.';
});
document.getElementById('resumeBtn').addEventListener('click', () => { startGame(); });
document.getElementById('openMenuBtn').addEventListener('click', () => { renderWorldsList(); showScreen('menuScreen'); });
document.getElementById('toStartBtn').addEventListener('click', () => { pausedFromGame = false; showScreen('startScreen'); });
gameMenuBtn.addEventListener('pointerdown', e => { e.preventDefault(); pauseGame(); });

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked) {
    playing = true;
    overlay.classList.add('hidden');
    gameMenuBtn.classList.remove('hidden');
  } else if (!isTouch) {
    // Salir con Esc (o perder el bloqueo) abre el menú del juego, no
    // la pantalla inicial: así Guardar queda a un toque.
    if (currentWorld) openGameMenu();
    else { playing = false; overlay.classList.remove('hidden'); gameMenuBtn.classList.add('hidden'); showScreen('startScreen'); }
  }
});

addEventListener('keydown', e => {
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= BLOCK_IDS.length) hud.setSelected(n - 1);
  if (e.code === 'Escape' && !isTouch && playing) pauseGame();
  if (e.code === 'KeyF' && playing && !e.repeat) toggleFly();
  if (e.code === 'KeyV' && playing && !e.repeat) toggleView();
});

addEventListener('wheel', e => {
  if (!document.pointerLockElement) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  const next = (hud.selected + dir + BLOCK_IDS.length) % BLOCK_IDS.length;
  hud.setSelected(next);
}, { passive: true });

// ---------- Utilidades de raycast ----------
const raycaster = new THREE.Raycaster();
const ndcVec = new THREE.Vector2();
const dirVec = new THREE.Vector3();

function getEyeOrigin(out) {
  out.set(player.pos.x, player.pos.y + PLAYER.eyeHeight, player.pos.z);
  return out;
}

function raycastFromNDC(ndcX, ndcY) {
  // Siempre lanzar desde los ojos del jugador (no desde la cámara en 3ª persona).
  // Así la distancia de alcance y la colocación funcionan igual en 1ª y 3ª persona.
  getEyeOrigin(atkO);
  if (thirdPerson) {
    // En 3ª persona la cámara está detrás: proyectamos el punto de pantalla
    // desde la cámara y usamos esa dirección, pero el origen sigue siendo el ojo.
    ndcVec.set(ndcX, ndcY);
    raycaster.setFromCamera(ndcVec, camera);
    dirVec.copy(raycaster.ray.direction).normalize();
  } else {
    ndcVec.set(ndcX, ndcY);
    raycaster.setFromCamera(ndcVec, camera);
    dirVec.copy(raycaster.ray.direction).normalize();
  }
  return voxelRaycast(world, atkO, dirVec, 7);
}

function overlapsPlayer(px, py, pz) {
  const r = PLAYER.radius, h = PLAYER.height;
  return (
    player.pos.x + r > px && player.pos.x - r < px + 1 &&
    player.pos.y + h > py && player.pos.y < py + 1 &&
    player.pos.z + r > pz && player.pos.z - r < pz + 1
  );
}

// ---------- Acciones ----------
function placeBlockAt(target) {
  if (!target) return;
  const px = target.x + target.nx;
  const py = target.y + target.ny;
  const pz = target.z + target.nz;
  if (!world.inBounds(px, py, pz)) return;
  if (world.getBlock(px, py, pz)) return;
  if (overlapsPlayer(px, py, pz)) return;

  const id = BLOCK_IDS[hud.selected];
  if (!creative && !(inv[id] > 0)) return;
  world.setBlock(px, py, pz, id);
  if (!creative) inv[id]--;

  // Feedback: flash verde
  placeFlash.position.set(px + 0.5, py + 0.5, pz + 0.5);
  placeFlash.material.opacity = 1;
  placeFlash.visible = true;
  placeFlashTime = 0.18;

  if (navigator.vibrate) navigator.vibrate(8);
}

// Tiempos de rotura por bloque (segundos)
const BREAK_TIMES = {
  1: 0.35,  // césped
  2: 0.40,  // tierra
  3: 0.80,  // piedra
  4: 0.60,  // madera
  5: 0.25,  // hojas
  6: 0.35,  // arena
  7: 0.90,  // ladrillo
  10: 1.0, 11: 1.2,  // menas
  8: 0.60,  // tablones
  9: 0.90,  // adoquín
};

// Estado de rotura en curso (touch)
let breaking = null; // { tx, ty, tz, type, progress }
let placeCooldown = 0;
let fovBoost = 0, fps = 60;

function startBreakingFromNDC(ndcX, ndcY) {
  const target = raycastFromNDC(ndcX, ndcY);
  if (!target) return;
  const type = world.getBlock(target.x, target.y, target.z);
  if (!type) return;
  breaking = {
    tx: target.x, ty: target.y, tz: target.z,
    type, progress: 0,
  };
}

function cancelBreaking() {
  breaking = null;
  crackMesh.visible = false;
}

function tickBreaking(dt) {
  if (!breaking) return;

  // Si el bloque desapareció por otra razón
  if (!world.getBlock(breaking.tx, breaking.ty, breaking.tz)) {
    cancelBreaking();
    return;
  }

  const breakTime = creative ? 0.08 : (BREAK_TIMES[breaking.type] || 0.5);
  breaking.progress += dt / breakTime;

  if (breaking.progress >= 1) {
    if (!creative) inv[breaking.type] = (inv[breaking.type] || 0) + 1;
    world.setBlock(breaking.tx, breaking.ty, breaking.tz, 0);
    if (navigator.vibrate) navigator.vibrate(15);
    cancelBreaking();
    return;
  }

  const stage = Math.min(CRACK_STAGES - 1, Math.floor(breaking.progress * CRACK_STAGES));
  crackMat.map.offset.x = stage / CRACK_STAGES;
  crackMesh.position.set(breaking.tx + 0.5, breaking.ty + 0.5, breaking.tz + 0.5);
  crackMesh.visible = true;
}

// Rotura instantánea (desktop con clic)
function breakBlockAt(target) {
  if (!target) return;
  const type = world.getBlock(target.x, target.y, target.z);
  if (!type) return;
  world.setBlock(target.x, target.y, target.z, 0);
  if (navigator.vibrate) navigator.vibrate(10);
}

// ---------- Loop ----------
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (playing) {
    // --- Cámara ---
    const look = input.consumeLook();
    yaw   -= look.dx;
    pitch -= look.dy;
    pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));

    // --- Física ---
    if (input.jumpPressed) {
      const n = performance.now();
      if (n - lastJumpTap < 300) toggleFly();
      lastJumpTap = n;
    }
    input.readMovement();
    player.update(dt, input, yaw);

    // Ciclo día/noche (5 min)
    timeOfDay = (timeOfDay + dt / 300) % 1;
    const dayF = Math.min(1, Math.max(0, Math.sin(timeOfDay * Math.PI * 2) * 1.5 + 0.35));
    scene.background.copy(SKY_NIGHT).lerp(SKY_DAY, dayF);
    scene.fog.color.copy(scene.background);
    ambient.intensity = 0.28 + 0.72 * dayF;
    btnDown.classList.toggle('hidden', !player.flying);
    hud.setCounts(inv, creative);

    // Personaje visible, caída, regeneración, seres vivos y minimapa
    model.group.position.copy(player.pos);
    model.group.rotation.y = yaw;
    const ms = Math.min(1, Math.hypot(player.vel.x, player.vel.z) / 4), sw2 = Math.sin(performance.now() / 120) * 0.7 * ms;
    model.legs[0].rotation.x = sw2; model.legs[1].rotation.x = -sw2;
    model.arms[0].rotation.x = -sw2; model.arms[1].rotation.x = sw2;
    if (player.onGround || player.flying) {
      const f = fallY - player.pos.y;
      if (f > 3.5) hurt(Math.floor(f - 3));
      fallY = player.pos.y;
    } else fallY = Math.max(fallY, player.pos.y);
    if (!creative && hp < 20 && (regen += dt) >= 4) { regen = 0; hp++; drawHearts(); }
    entities.update(dt, player, dayF, hurt);
    if ((mmT += dt) > 0.2) { mmT = 0; minimap.update(world, player, yaw, entities); }

    camera.position.set(player.pos.x, player.pos.y + PLAYER.eyeHeight, player.pos.z);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    if (thirdPerson) { camera.getWorldDirection(dirVec); camera.position.addScaledVector(dirVec, -4); }

    // FOV dinámico al correr
    const sprinting = input.run && Math.hypot(player.vel.x, player.vel.z) > 0.5;
    fovBoost += ((sprinting ? 6 : 0) - fovBoost) * Math.min(1, dt * 8);
    camera.fov = effectiveFov() + fovBoost;
    camera.updateProjectionMatrix();
    fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;

    // --- Actualizar máquina de estados táctil ---
    input.update(dt);

    // --- Interacción TÁCTIL ---
    if (isTouch) {
      // Tap → colocar en el punto tocado
      const tap = input.takeTap();
      if (tap) {
        const target = raycastFromNDC(tap.x, tap.y);
        if (target) placeBlockAt(target);
      }

      // Breaking
      if (input.breakHeld) {
        if (!breaking) {
          startBreakingFromNDC(input.breakNDC.x, input.breakNDC.y);
        }
        tickBreaking(dt);
      } else {
        if (breaking) cancelBreaking();
      }
    }

    // --- Interacción DESKTOP ---
    if (!isTouch) {
      // Crosshair target — origen = ojos del jugador (funciona en 1ª y 3ª persona)
      camera.getWorldDirection(dirVec);
      getEyeOrigin(atkO);
      const target = voxelRaycast(world, atkO, dirVec, 7);

      if (target) {
        breakHighlight.visible = true;
        breakHighlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
      } else {
        breakHighlight.visible = false;
      }

      // Romper manteniendo clic (con grietas, igual que en táctil)
      if (input.mouseBreakPressed) {
        input.mouseBreakPressed = false;
        if (doAttack()) input.mouseBreakHeld = false;   // golpear a un ser vivo en vez de romper
      }
      if (input.mouseBreakHeld && target) {
        if (!breaking || breaking.tx !== target.x || breaking.ty !== target.y || breaking.tz !== target.z) {
          cancelBreaking();
          startBreakingFromNDC(0, 0);
        }
        tickBreaking(dt);
      } else if (breaking) {
        cancelBreaking();
      }

      // Colocar: clic o mantener con repetición
      placeCooldown = Math.max(0, placeCooldown - dt);
      if (input.mousePlacePressed || (input.mousePlaceHeld && placeCooldown === 0)) {
        input.mousePlacePressed = false;
        placeCooldown = 0.22;
        if (target) placeBlockAt(target);
      }
    }

    // --- Flash de colocación ---
    if (placeFlashTime > 0) {
      placeFlashTime -= dt;
      placeFlash.material.opacity = Math.max(0, placeFlashTime / 0.18);
      if (placeFlashTime <= 0) placeFlash.visible = false;
    }

    // --- HUD ---
    const curBlock = BLOCKS[BLOCK_IDS[hud.selected]];
    hud.update(player, curBlock.name, fps);

    // --- Chunks sucios ---
    world.update(player.pos.x, player.pos.z);

    input.jumpPressed = false;
  }

  renderer.render(scene, camera);
}

resize();                 // aplica tamaño + FOV efectivo (con clamp geométrico si toca)
requestAnimationFrame(frame);