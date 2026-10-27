/**
 * Aldeanos – IA avanzada (corregido)
 * ======================
 */
export const VILLAGER_PAL = {
  skin: '#c8a080',
  hair: '#5a3a1a',
  shirt: '#7a5a3a',
  pants: '#4a3a2a',
};

export const VILLAGER_TYPE = {
  pal: VILLAGER_PAL,
  hp: 20,
  sp: 2.4,
  flySp: 5.5,
  kind: 'villager',
  h: true,
};

const STRUCTURE_BLOCKS = new Set([3, 4, 7, 8, 9]);

// ---------------------------------------------------------------------------
// Oficios y jerarquía
// ---------------------------------------------------------------------------
export const JOBS = {
  rey:         { rank: 3, label: 'Rey',         color: '#d4af37', canDirect: true,  canFly: true,  buildBias: 0.15 },
  alcalde:     { rank: 2, label: 'Alcalde',     color: '#c0c0c0', canDirect: true,  canFly: true,  buildBias: 0.25 },
  arquitecto:  { rank: 2, label: 'Arquitecto',  color: '#6a5acd', canDirect: true,  canFly: true,  buildBias: 0.85 },
  constructor: { rank: 1, label: 'Constructor', color: '#8b5a2b', canDirect: false, canFly: true,  buildBias: 0.95 },
  granjero:    { rank: 0, label: 'Granjero',    color: '#3d8b3d', canDirect: false, canFly: false, buildBias: 0.35 },
  guardia:     { rank: 1, label: 'Guardia',     color: '#2f4f6f', canDirect: false, canFly: false, buildBias: 0.10 },
  explorador:  { rank: 0, label: 'Explorador',  color: '#4a7c59', canDirect: false, canFly: true,  buildBias: 0.20 },
};

// ---------------------------------------------------------------------------
// Orden del jugador (v8, IA por reglas, sin API)
// ---------------------------------------------------------------------------
// null = sin orden (cada aldeano sigue su oficio). 'build' = todos a
// construir, 'rest' = todos a descansar, 'gather' = todos al centro.
// Es global, no por ciudad: la orden es del jugador, no de un alcalde.
let playerOrder = null;
export function setPlayerOrder(t) {
  playerOrder = (t === 'build' || t === 'rest' || t === 'gather') ? t : null;
}
export function getPlayerOrder() { return playerOrder; }

const JOB_WEIGHTS = [
  ['constructor', 40],
  ['granjero', 18],
  ['guardia', 12],
  ['explorador', 10],
  ['arquitecto', 10],
  ['alcalde', 7],
  ['rey', 3],
];

function pickJob(existingJobs) {
  const counts = {};
  for (const j of existingJobs) counts[j] = (counts[j] || 0) + 1;
  const pool = [];
  for (const [id, w] of JOB_WEIGHTS) {
    if (id === 'rey' && (counts.rey || 0) >= 1) continue;
    if (id === 'alcalde' && (counts.alcalde || 0) >= 2) continue;
    if (id === 'arquitecto' && (counts.arquitecto || 0) >= 3) continue;
    for (let i = 0; i < w; i++) pool.push(id);
  }
  return pool[Math.floor(Math.random() * pool.length)] || 'constructor';
}

// ---------------------------------------------------------------------------
// Planos de construcción
// ---------------------------------------------------------------------------
function rectFloor(blocks, w, d, y, id) {
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) blocks.push([x, y, z, id]);
}
function wallRing(blocks, w, d, y0, y1, id, doorX = -1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < w; x++) {
      if (!(y <= y0 + 1 && x === doorX)) {
        blocks.push([x, y, 0, id]);
        blocks.push([x, y, d - 1, id]);
      }
    }
    for (let z = 1; z < d - 1; z++) {
      blocks.push([0, y, z, id]);
      blocks.push([w - 1, y, z, id]);
    }
  }
}
function hollowBox(blocks, w, d, h, wallId, floorId, roofId, doorX) {
  rectFloor(blocks, w, d, 0, floorId);
  wallRing(blocks, w, d, 1, h, wallId, doorX);
  rectFloor(blocks, w, d, h + 1, roofId);
}

function housePlan(w = 5, d = 5, h = 3) {
  const blocks = [];
  hollowBox(blocks, w, d, h, 4, 9, 8, Math.floor(w / 2));
  if (w >= 5) { blocks.push([1, 2, 0, 0]); blocks.push([w - 2, 2, 0, 0]); }
  blocks.push([w - 2, h + 2, d - 2, 7]);
  blocks.push([w - 2, h + 3, d - 2, 7]);
  return { blocks, w, d, h: h + 4, name: 'casa', category: 'vivienda', minWorkers: 1 };
}
function cottagePlan() { const p = housePlan(4, 4, 2); p.name = 'cabaña'; return p; }
function mansionPlan() {
  const w = 9, d = 8, h = 4, blocks = [];
  hollowBox(blocks, w, d, h, 7, 9, 8, 4);
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) {
    blocks.push([x, 0, d + z, 9]);
    if (x === 0 || x === 3 || z === 3) for (let y = 1; y <= 3; y++) blocks.push([x, y, d + z, 7]);
  }
  rectFloor(blocks, 4, 4, 4, 8);
  blocks.push([3, 1, -1, 9]); blocks.push([5, 1, -1, 9]);
  blocks.push([3, 2, -1, 9]); blocks.push([5, 2, -1, 9]);
  return { blocks, w, d: d + 4, h: h + 2, name: 'mansión', category: 'vivienda', minWorkers: 2 };
}
function towerPlan() {
  const s = 4, blocks = [];
  for (let y = 0; y <= 8; y++) for (let x = 0; x < s; x++) for (let z = 0; z < s; z++)
    if (y === 0 || x === 0 || x === s - 1 || z === 0 || z === s - 1)
      blocks.push([x, y, z, y === 0 ? 9 : 3]);
  for (let x = 0; x < s; x++) for (let z = 0; z < s; z++)
    if ((x + z) % 2 === 0) blocks.push([x, 9, z, 3]);
  blocks.push([Math.floor(s / 2), 1, 0, 0]);
  blocks.push([Math.floor(s / 2), 2, 0, 0]);
  return { blocks, w: s, d: s, h: 10, name: 'torre', category: 'militar', minWorkers: 1 };
}
function farmPlan() {
  const w = 7, d = 5, blocks = [];
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) {
    blocks.push([x, 0, z, 2]);
    if (x === 0 || x === w - 1 || z === 0 || z === d - 1) blocks.push([x, 1, z, 4]);
  }
  return { blocks, w, d, h: 2, name: 'granja', category: 'agro', minWorkers: 1 };
}
function barnPlan() {
  const w = 7, d = 6, h = 3, blocks = [];
  hollowBox(blocks, w, d, h, 4, 8, 8, 3);
  blocks.push([3, 1, 0, 0]); blocks.push([3, 2, 0, 0]);
  blocks.push([4, 1, 0, 0]); blocks.push([4, 2, 0, 0]);
  return { blocks, w, d, h: h + 2, name: 'granero', category: 'agro', minWorkers: 1 };
}
function marketPlan() {
  const w = 8, d = 6, blocks = [];
  rectFloor(blocks, w, d, 0, 9);
  for (const [cx, cz] of [[1, 1], [1, 4], [6, 1], [6, 4]]) {
    blocks.push([cx, 1, cz, 4]); blocks.push([cx, 2, cz, 4]);
  }
  for (let x = 1; x < w - 1; x++) for (let z = 1; z < d - 1; z++) blocks.push([x, 3, z, 8]);
  return { blocks, w, d, h: 4, name: 'mercado', category: 'civico', minWorkers: 2 };
}
function plazaPlan() {
  const w = 11, d = 11, blocks = [];
  rectFloor(blocks, w, d, 0, 9);
  for (let x = 4; x <= 6; x++) for (let z = 4; z <= 6; z++) blocks.push([x, 1, z, 3]);
  blocks.push([5, 2, 5, 3]);
  for (let i = 1; i <= 9; i += 2) { blocks.push([i, 1, 1, 8]); blocks.push([i, 1, 9, 8]); }
  return { blocks, w, d, h: 3, name: 'plaza', category: 'civico', minWorkers: 2 };
}
function barracksPlan() {
  const w = 8, d = 6, h = 3, blocks = [];
  hollowBox(blocks, w, d, h, 3, 9, 3, 3);
  for (let z = 1; z < d - 1; z++) { blocks.push([1, 1, z, 4]); blocks.push([w - 2, 1, z, 4]); }
  return { blocks, w, d, h: h + 2, name: 'cuartel', category: 'militar', minWorkers: 2 };
}
function wallSegmentPlan() {
  const w = 12, d = 3, blocks = [];
  for (let x = 0; x < w; x++) {
    blocks.push([x, 0, 1, 9]);
    for (let y = 1; y <= 4; y++) {
      blocks.push([x, y, 0, 3]); blocks.push([x, y, 2, 3]);
      if (y <= 3) blocks.push([x, y, 1, 3]);
    }
    if (x % 2 === 0) blocks.push([x, 5, 1, 3]);
  }
  return { blocks, w, d, h: 6, name: 'muralla', category: 'militar', minWorkers: 2 };
}
function gatePlan() {
  const w = 7, d = 5, blocks = [];
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) blocks.push([x, 0, z, 9]);
  for (let y = 1; y <= 5; y++) {
    for (const x of [0, 1, w - 2, w - 1]) for (let z = 0; z < d; z++) blocks.push([x, y, z, 3]);
    for (let x = 2; x <= w - 3; x++) {
      blocks.push([x, y, 0, y >= 4 ? 3 : 0]);
      blocks.push([x, y, d - 1, y >= 4 ? 3 : 0]);
    }
  }
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) blocks.push([x, 6, z, 3]);
  return { blocks, w, d, h: 7, name: 'puerta', category: 'militar', minWorkers: 2 };
}
function templePlan() {
  const w = 9, d = 9, h = 5, blocks = [];
  hollowBox(blocks, w, d, h, 7, 9, 7, 4);
  for (const x of [1, 3, 5, 7]) {
    for (let y = 1; y <= 4; y++) blocks.push([x, y, -1, 9]);
    blocks.push([x, 5, -1, 7]);
  }
  blocks.push([4, 1, 6, 8]); blocks.push([4, 2, 6, 8]);
  return { blocks, w, d: d + 1, h: h + 2, name: 'templo', category: 'civico', minWorkers: 3 };
}
function castleKeepPlan() {
  const w = 12, d = 12, h = 6, blocks = [];
  hollowBox(blocks, w, d, h, 3, 9, 3, 5);
  for (const [tx, tz] of [[0, 0], [w - 3, 0], [0, d - 3], [w - 3, d - 3]]) {
    for (let y = 0; y <= h + 3; y++)
      for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++)
        if (y === 0 || x === 0 || x === 2 || z === 0 || z === 2)
          blocks.push([tx + x, y, tz + z, 3]);
    for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++)
      if ((x + z) % 2 === 0) blocks.push([tx + x, h + 4, tz + z, 3]);
  }
  return { blocks, w, d, h: h + 5, name: 'castillo', category: 'militar', minWorkers: 4 };
}
function palacePlan() {
  const w = 14, d = 10, h = 5, blocks = [];
  hollowBox(blocks, w, d, h, 7, 9, 8, 6);
  for (let s = 0; s < 3; s++) for (let x = 5; x <= 8; x++) blocks.push([x, s, -1 - s, 9]);
  for (let x = 3; x < w - 3; x++) { blocks.push([x, 3, -1, 8]); blocks.push([x, 4, -1, 7]); }
  for (const tx of [0, w - 3]) {
    for (let y = 0; y <= h + 2; y++)
      for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++)
        if (y === 0 || x === 0 || x === 2 || z === 0 || z === 2)
          blocks.push([tx + x, y, z, 7]);
  }
  return { blocks, w, d: d + 3, h: h + 3, name: 'palacio', category: 'civico', minWorkers: 4 };
}
function wellPlan() {
  const blocks = [];
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) {
    if (x === 1 && z === 1) continue;
    blocks.push([x, 0, z, 9]); blocks.push([x, 1, z, 9]);
  }
  blocks.push([1, 2, 0, 4]); blocks.push([1, 2, 2, 4]); blocks.push([1, 3, 1, 4]);
  return { blocks, w: 3, d: 3, h: 4, name: 'pozo', category: 'util', minWorkers: 1 };
}
function bridgePlan() {
  const w = 3, d = 10, blocks = [];
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < w; x++) blocks.push([x, 0, z, 8]);
    blocks.push([0, 1, z, 4]); blocks.push([w - 1, 1, z, 4]);
  }
  return { blocks, w, d, h: 2, name: 'puente', category: 'util', minWorkers: 1 };
}
function libraryPlan() {
  const w = 7, d = 7, h = 4, blocks = [];
  hollowBox(blocks, w, d, h, 4, 8, 8, 3);
  for (let z = 1; z < d - 1; z++) {
    blocks.push([1, 1, z, 4]); blocks.push([1, 2, z, 4]);
    blocks.push([w - 2, 1, z, 4]); blocks.push([w - 2, 2, z, 4]);
  }
  return { blocks, w, d, h: h + 2, name: 'biblioteca', category: 'civico', minWorkers: 2 };
}
function watchtowerPlan() {
  const s = 3, blocks = [];
  for (let y = 0; y <= 10; y++) for (let x = 0; x < s; x++) for (let z = 0; z < s; z++)
    if (x === 0 || x === s - 1 || z === 0 || z === s - 1 || y === 0)
      blocks.push([x, y, z, y < 8 ? 3 : 4]);
  blocks.push([1, 1, 0, 0]); blocks.push([1, 2, 0, 0]);
  return { blocks, w: s, d: s, h: 11, name: 'atalaya', category: 'militar', minWorkers: 1 };
}

// FIX: cachear metadata de planos para evitar p.gen() en cada pickPlan
const ALL_PLANS = [
  { weight: 12, gen: () => housePlan(5 + (Math.random() < 0.4 ? 1 : 0), 5, 3) },
  { weight: 8,  gen: cottagePlan },
  { weight: 4,  gen: mansionPlan },
  { weight: 6,  gen: towerPlan },
  { weight: 7,  gen: farmPlan },
  { weight: 4,  gen: barnPlan },
  { weight: 5,  gen: marketPlan },
  { weight: 4,  gen: plazaPlan },
  { weight: 4,  gen: barracksPlan },
  { weight: 5,  gen: wallSegmentPlan },
  { weight: 3,  gen: gatePlan },
  { weight: 3,  gen: templePlan },
  { weight: 2,  gen: castleKeepPlan },
  { weight: 2,  gen: palacePlan },
  { weight: 5,  gen: wellPlan },
  { weight: 3,  gen: bridgePlan },
  { weight: 3,  gen: libraryPlan },
  { weight: 4,  gen: watchtowerPlan },
];
for (const p of ALL_PLANS) {
  const s = p.gen();
  p.minWorkers = s.minWorkers;
  p.category = s.category;
}

function pickPlan(preferCategory = null, maxWorkers = 99) {
  const pool = [];
  for (const p of ALL_PLANS) {
    if (p.minWorkers > maxWorkers) continue;
    if (preferCategory && p.category !== preferCategory && Math.random() < 0.7) continue;
    for (let i = 0; i < p.weight; i++) pool.push(p);
  }
  if (!pool.length) return housePlan();
  return pool[Math.floor(Math.random() * pool.length)].gen();
}

// ---------------------------------------------------------------------------
// Ciudades compartidas
// ---------------------------------------------------------------------------
const CITIES = new Map();

function cityKey(x, z) {
  return Math.floor(x / 64) + ',' + Math.floor(z / 64);
}

export function getOrCreateCity(x, z) {
  const id = cityKey(x, z);
  let c = CITIES.get(id);
  if (!c) {
    c = {
      id, cx: Math.floor(x), cz: Math.floor(z), radius: 28,
      sites: [], projects: [], rulerId: null, founded: 0,
      districts: { vivienda: 0, militar: 0, civico: 0, agro: 0, util: 0 },
      // v6: memoria de terreno 3D (ver "Encuesta de terreno" más abajo)
      survey: new Map(), surveyGrid: null, surveyIdx: 0, flatSpots: [],
      surveyStats: {}, lastSurveyAt: 0, lastSeen: Date.now(), seeded: false,
    };
    CITIES.set(id, c);
  }
  return c;
}

function expandCityRadius(city, site) {
  const dist = Math.hypot(site.x + site.w / 2 - city.cx, site.z + site.d / 2 - city.cz);
  if (dist + 8 > city.radius) city.radius = Math.min(72, Math.ceil(dist + 10));
}

// ---------------------------------------------------------------------------
// Escaneo de terreno
// ---------------------------------------------------------------------------
function areaHasStructure(world, ox, oy, oz, w, d, h) {
  for (let x = ox - 1; x < ox + w + 1; x++)
    for (let z = oz - 1; z < oz + d + 1; z++)
      for (let y = oy; y < oy + Math.min(h, 8); y++)
        if (STRUCTURE_BLOCKS.has(world.getBlock(x, y, z))) return true;
  return false;
}

function isFlat(world, ox, oz, w, d, maxDelta = 1) {
  const h0 = world.heightAt(ox, oz);
  for (let dx = 0; dx < w; dx++)
    for (let dz = 0; dz < d; dz++)
      if (Math.abs(world.heightAt(ox + dx, oz + dz) - h0) > maxDelta) return false;
  return true;
}

function overlapsSites(sites, ox, oz, w, d, margin = 4) {
  for (const s of sites) {
    if (ox < s.x + s.w + margin && ox + w + margin > s.x &&
        oz < s.z + s.d + margin && oz + d + margin > s.z) return true;
  }
  return false;
}

export function findBuildSite(world, home, city, sizeW, sizeD, preferEdge = false) {
  const baseX = city.cx, baseZ = city.cz, sites = city.sites;
  // v6: primero los sitios planos ya aprendidos en la encuesta, que se
  // vuelven a verificar en detalle (la encuesta es aproximada, paso 4).
  if (city.flatSpots) {
    for (const s of city.flatSpots) {
      const ox = s.x - Math.floor(sizeW / 2), oz = s.z - Math.floor(sizeD / 2);
      if (overlapsSites(sites, ox, oz, sizeW, sizeD)) continue;
      if (!isFlat(world, ox, oz, sizeW, sizeD, 1)) continue;
      const h0 = world.heightAt(ox, oz);
      if (areaHasStructure(world, ox, h0, oz, sizeW, sizeD, 8)) continue;
      const ground = world.getBlock(ox, h0, oz);
      if (ground !== 1 && ground !== 2 && ground !== 6) continue;
      return { x: ox, z: oz, y: h0, w: sizeW, d: sizeD };
    }
  }
  const maxR = Math.max(city.radius + 16, 40);
  const minR = preferEdge ? Math.max(10, city.radius * 0.55) : 5;

  for (let attempt = 0; attempt < 48; attempt++) {
    const ring = minR + Math.random() * (maxR - minR);
    const ang = Math.random() * Math.PI * 2;
    const ox = baseX + Math.round(Math.cos(ang) * ring) - Math.floor(sizeW / 2);
    const oz = baseZ + Math.round(Math.sin(ang) * ring) - Math.floor(sizeD / 2);

    if (overlapsSites(sites, ox, oz, sizeW, sizeD)) continue;
    if (!isFlat(world, ox, oz, sizeW, sizeD, 1)) continue;

    const h0 = world.heightAt(ox, oz);
    if (areaHasStructure(world, ox, h0, oz, sizeW, sizeD, 8)) continue;

    const ground = world.getBlock(ox, h0, oz);
    if (ground !== 1 && ground !== 2 && ground !== 6) continue;

    const distC = Math.hypot(ox - baseX, oz - baseZ);
    if (!preferEdge && city.districts.vivienda > 4 && distC < 10 && Math.random() < 0.6) continue;

    return { x: ox, z: oz, y: h0, w: sizeW, d: sizeD };
  }
  return null;
}

function scanSurroundings(world, x, z, r = 24) {
  let structures = 0, flat = 0, samples = 0, maxH = 0, minH = 999;
  const step = Math.max(2, Math.floor(r / 8));
  for (let dx = -r; dx <= r; dx += step) {
    for (let dz = -r; dz <= r; dz += step) {
      if (dx * dx + dz * dz > r * r) continue;
      samples++;
      const hx = Math.floor(x) + dx, hz = Math.floor(z) + dz;
      const h = world.heightAt(hx, hz);
      maxH = Math.max(maxH, h); minH = Math.min(minH, h);
      if (STRUCTURE_BLOCKS.has(world.getBlock(hx, h + 1, hz))) structures++;
      else flat++;
    }
  }
  return { structures, flat, samples, maxH, minH, relief: maxH - minH };
}

// ---------------------------------------------------------------------------
// Encuesta de terreno 3D (v6) — "concepción del entorno" y aprendizaje
// ---------------------------------------------------------------------------
// Antes la IA solo miraba heightAt() en el momento de buscar sitio: no
// recordaba nada, no distinguía un bosque de una casa ni una loma de un
// llano, y volvía a tropezar con lo mismo. Ahora cada ciudad guarda un
// mapa 3D aprendido:
//  - radio 128 bloques alrededor del centro (mucho más que el radio de la
//    ciudad, 28-72), muestreado cada 4 bloques para no generar el mundo
//    entero de golpe;
//  - por columna, perfil 3D: altura del suelo, bloque superior, altura de
//    árboles y altura de estructuras (no solo "alto/bajo");
//  - se aprende de dos formas: explorando por sectores (256 columnas por
//    tanda, como mucho una tanda cada 5 s por ciudad) y caminando (cada
//    aldeano registra la columna por la que pasa);
//  - de ese mapa salen los "sitios planos recordados" (flatSpots), que
//    findBuildSite prueba ANTES de buscar a ciegas.
// El mapa es aproximado por diseño (paso 4): antes de construir en un
// sitio recordado se vuelve a verificar en detalle con isFlat().
const SURVEY_RADIUS = 128, SURVEY_STEP = 4, SURVEY_BATCH = 256;

function classifyColumn(world, x, z, h) {
  const top = world.getBlock(x, h, z);
  let treeH = 0, structH = 0;
  for (let y = h + 1; y <= h + 8; y++) {
    const b = world.getBlock(x, y, z);
    if (b === 4 || b === 5) treeH = Math.max(treeH, y - h);
    if (STRUCTURE_BLOCKS.has(b)) structH = Math.max(structH, y - h);
  }
  let kind = 'tierra';
  if (structH > 0) kind = 'estructura';
  else if (treeH > 0) kind = 'bosque';
  else if (top === 6) kind = 'arena';
  else if (top === 3) kind = 'roca';
  else if (top === 1) kind = 'hierba';
  else if (top === 2) kind = 'tierra';
  return { h, top, treeH, structH, kind };
}

function surveyColumn(world, city, x, z) {
  const h = world.heightAt(x, z);
  const rec = classifyColumn(world, x, z, h);
  const key = x + ',' + z;
  const old = city.survey.get(key);
  if (old) city.surveyStats[old.kind] = Math.max(0, (city.surveyStats[old.kind] || 0) - 1);
  city.survey.set(key, rec);
  city.surveyStats[rec.kind] = (city.surveyStats[rec.kind] || 0) + 1;
  // Sitio plano recordado: sus 4 vecinos muestreados están a ±1 de altura.
  // v6-fix: se reevalúa la columna nueva Y sus vecinas, porque si no
  // solo se detectarían en una segunda pasada completa (los vecinos
  // +x/+z se muestrean después, así que en el momento de muestrear una
  // columna sus vecinos futuros aún no existían y nunca se marcaba).
  const tryFlat = (cx, cz) => {
    const r = city.survey.get(cx + ',' + cz);
    if (!r || r.kind === 'estructura' || r.kind === 'bosque') return;
    const nb = [[SURVEY_STEP, 0], [-SURVEY_STEP, 0], [0, SURVEY_STEP], [0, -SURVEY_STEP]]
      .map(([dx, dz]) => city.survey.get((cx + dx) + ',' + (cz + dz)));
    if (nb.every(n => n && Math.abs(n.h - r.h) <= 1)) {
      if (!city.flatSpots.some(s => s.x === cx && s.z === cz))
        city.flatSpots.push({ x: cx, z: cz, y: r.h });
      if (city.flatSpots.length > 200) city.flatSpots.shift();
    }
  };
  tryFlat(x, z);
  for (const [dx, dz] of [[SURVEY_STEP, 0], [-SURVEY_STEP, 0], [0, SURVEY_STEP], [0, -SURVEY_STEP]])
    tryFlat(x + dx, z + dz);
  return rec;
}

function surveyBatch(world, city) {
  if (!city.surveyGrid) {
    city.surveyGrid = [];
    for (let dx = -SURVEY_RADIUS; dx <= SURVEY_RADIUS; dx += SURVEY_STEP)
      for (let dz = -SURVEY_RADIUS; dz <= SURVEY_RADIUS; dz += SURVEY_STEP)
        if (dx * dx + dz * dz <= SURVEY_RADIUS * SURVEY_RADIUS)
          city.surveyGrid.push([dx, dz]);
  }
  const grid = city.surveyGrid;
  for (let i = 0; i < SURVEY_BATCH; i++) {
    const [dx, dz] = grid[city.surveyIdx % grid.length];
    city.surveyIdx++;
    surveyColumn(world, city, city.cx + dx, city.cz + dz);
  }
  city.lastSurveyAt = Date.now();
}

// ---------------------------------------------------------------------------
// Aplanado (v6) — si no hay sitio plano, se crea uno
// ---------------------------------------------------------------------------
// findFlattenSite: mismo muestreo aleatorio que findBuildSite, pero sin
// exigir llano; se queda con el candidato de menor relieve que no se
// solape con nada ni tenga estructuras encima (aplanar una casa ajena
// no: eso sería destruirla, no preparar terreno).
function findFlattenSite(world, city, sizeW, sizeD, preferEdge = false) {
  const baseX = city.cx, baseZ = city.cz, sites = city.sites;
  const maxR = Math.max(city.radius + 16, 40);
  const minR = preferEdge ? Math.max(10, city.radius * 0.55) : 5;
  let best = null;
  for (let attempt = 0; attempt < 48; attempt++) {
    const ring = minR + Math.random() * (maxR - minR);
    const ang = Math.random() * Math.PI * 2;
    const ox = baseX + Math.round(Math.cos(ang) * ring) - Math.floor(sizeW / 2);
    const oz = baseZ + Math.round(Math.sin(ang) * ring) - Math.floor(sizeD / 2);
    if (overlapsSites(sites, ox, oz, sizeW, sizeD)) continue;
    let minH = 999, maxH = -999;
    for (let dx = 0; dx < sizeW; dx++) for (let dz = 0; dz < sizeD; dz++) {
      const h = world.heightAt(ox + dx, oz + dz);
      minH = Math.min(minH, h); maxH = Math.max(maxH, h);
    }
    const h0 = world.heightAt(ox, oz);
    if (areaHasStructure(world, ox, h0, oz, sizeW, sizeD, 8)) continue;
    const ground = world.getBlock(ox, h0, oz);
    if (ground !== 1 && ground !== 2 && ground !== 6) continue;
    const relief = maxH - minH;
    const distC = Math.hypot(ox - baseX, oz - baseZ);
    if (!best || relief < best.relief || (relief === best.relief && distC < best.distC))
      best = { x: ox, z: oz, y: h0, w: sizeW, d: sizeD, relief, distC };
  }
  return best;
}

// Bloques para aplanar un rectángulo a la altura más frecuente del mismo:
// por encima: quitar (id 0) de arriba abajo; por debajo: rellenar con
// tierra (id 2) hasta la altura objetivo. Se calcula con el mundo REAL
// (columna sólida más alta, no solo heightAt), así que también corta
// árboles y lomas, no solo tierra.
function computeFlattenBlocks(world, site) {
  const counts = {};
  for (let dx = 0; dx < site.w; dx++) for (let dz = 0; dz < site.d; dz++)
    counts[world.heightAt(site.x + dx, site.z + dz)] = (counts[world.heightAt(site.x + dx, site.z + dz)] || 0) + 1;
  let targetY = site.y, bestN = -1;
  for (const k in counts) if (counts[k] > bestN) { bestN = counts[k]; targetY = Number(k); }
  const blocks = [];
  for (let dx = 0; dx < site.w; dx++) for (let dz = 0; dz < site.d; dz++) {
    const x = site.x + dx, z = site.z + dz;
    let top = -1;
    for (let y = 63; y >= 0; y--) if (world.getBlock(x, y, z)) { top = y; break; }
    if (top < 0) continue;
    if (top > targetY) {
      for (let y = top; y > targetY; y--) blocks.push([dx, y - targetY, dz, 0]);
    } else if (top < targetY) {
      for (let y = top + 1; y <= targetY; y++) blocks.push([dx, y - targetY, dz, 2]);
    }
  }
  // Quitar primero (de arriba abajo), rellenar después.
  blocks.sort((a, b) => b[1] - a[1]);
  return { blocks, targetY };
}

// v9: aviso de colocación para las partículas de main.js. Solo se
// dispara al colocar de verdad (no al quitar) y solo en obra en vivo:
// la siembra y el avance simulado pasan quiet=true para no soltar
// decenas de ráfagas de golpe. La IA no cambia.
let placeListener = null;
export function setPlaceListener(fn) { placeListener = fn; }

function placeBlockLikeBuild(world, tx, ty, tz, id, quiet = false) {
  if (id === 0) { if (world.getBlock(tx, ty, tz)) world.setBlock(tx, ty, tz, 0); }
  else {
    const cur = world.getBlock(tx, ty, tz);
    if (!cur || cur === 1 || cur === 2) {
      world.setBlock(tx, ty, tz, id);
      if (!quiet && placeListener) placeListener(tx, ty, tz, id);
    }
  }
}

// Siembra y avance (v6) — ver "Construir antes de llegar" más abajo.
export function seedVillageProgress(world, city) {
  if (city.seeded) return 0;
  city.seeded = true;
  const plan = pickPlan(null, 3);
  const site = findBuildSite(world, null, city, plan.w, plan.d, false);
  if (!site) return 0;
  const proj = createProject(city, plan, site, null);
  const n = Math.min(40, Math.floor(plan.blocks.length * 0.4));
  for (let i = 0; i < n; i++) {
    const [dx, dy, dz, id] = proj.plan[i];
    placeBlockLikeBuild(world, proj.ox + dx, proj.oy + dy, proj.oz + dz, id, true);
  }
  proj.idx = n; proj.attempted = n;
  return n;
}

export function applyCatchUp(world, city, nowMs = Date.now()) {
  if (!city.lastSeen) { city.lastSeen = nowMs; return 0; }
  const elapsed = (nowMs - city.lastSeen) / 1000;
  city.lastSeen = nowMs;
  if (elapsed < 10) return 0;
  // ~6 bloques/s de obra en total, con tope: simula el tiempo fuera sin
  // que al volver aparezca una ciudad entera de golpe.
  let budget = Math.min(240, Math.floor(elapsed * 6));
  let placed = 0;
  for (const proj of city.projects) {
    while (budget > 0 && proj.idx < proj.plan.length) {
      const [dx, dy, dz, id] = proj.plan[proj.idx];
      placeBlockLikeBuild(world, proj.ox + dx, proj.oy + dy, proj.oz + dz, id, true);
      proj.idx++; proj.attempted = (proj.attempted || 0) + 1; budget--; placed++;
    }
    if (proj.idx >= proj.plan.length) proj.done = true;
    if (budget <= 0) break;
  }
  return placed;
}

// ---------------------------------------------------------------------------
// Proyectos cooperativos
// ---------------------------------------------------------------------------
function sortBlocks(blocks) {
  blocks.sort((a, b) => a[1] - b[1] || (a[0] * a[0] + a[2] * a[2]) - (b[0] * b[0] + b[2] * b[2]));
}

function createProject(city, plan, site, leaderId) {
  sortBlocks(plan.blocks);
  const project = {
    id: 'p' + city.projects.length + '_' + Date.now().toString(36),
    name: plan.name, category: plan.category,
    plan: plan.blocks,
    ox: site.x, oy: site.y, oz: site.z,
    w: plan.w, d: plan.d, h: plan.h,
    idx: 0, workers: new Set(),
    minWorkers: plan.minWorkers || 1,
    leaderId, done: false,
  };
  city.projects.push(project);
  city.sites.push({ x: site.x, z: site.z, w: plan.w, d: plan.d, category: plan.category });
  city.districts[plan.category] = (city.districts[plan.category] || 0) + 1;
  expandCityRadius(city, site);
  return project;
}

function claimWorkSlice(project, workerId, maxClaim = 24) {
  if (project.done || project.idx >= project.plan.length) {
    project.done = true;
    return null;
  }
  project.workers.add(workerId);
  const start = project.idx;
  const end = Math.min(project.plan.length, start + maxClaim);
  project.idx = end;
  if (project.idx >= project.plan.length) project.done = true;
  return { start, end, blocks: project.plan.slice(start, end) };
}

// ---------------------------------------------------------------------------
// Datos de entidad
// ---------------------------------------------------------------------------
let _uid = 1;

export function createVillagerData(x, z, existingJobs = []) {
  const jobId = pickJob(existingJobs);
  const job = JOBS[jobId];
  const city = getOrCreateCity(x, z);
  const id = 'v' + (_uid++);

  // FIX: rey siempre soberano; alcalde solo si no hay rey
  if (jobId === 'rey') city.rulerId = id;
  else if (jobId === 'alcalde' && !city.rulerId) city.rulerId = id;

  return {
    id, job: null, jobId, rank: job.rank,
    build: null,
    // FIX: inicialización completa (timer, wa, vy, etc.)
    thinkT: 1 + Math.random() * 3,
    timer: 0,
    wa: null,
    vy: 0,
    home: { x, z }, cityId: city.id,
    avoidT: 0, stuckT: 0, lastPos: { x, z },
    // FIX pared (v5): estado persistente de desvío. Sin esto la evasión
    // se recalculaba cada frame y tickBuild la sobrescribía al siguiente.
    detour: null, detourT: 0, avoidAng: null, avoidSide: 0,
    flyOver: false, stuckFails: 0,
    pendingBuild: null, pendingT: 0, savedWa: null,
    flying: false, flyTarget: null,
    // v8: necesidades por reglas. Energía 100 -> baja solo construyendo;
    // al llegar a 25 el aldeano descansa (va al centro, recupera) hasta
    // 85 y retoma su obra SIN cancelarla (ver updateVillager).
    energy: 100, resting: false, aiState: 'work',
    power: job.rank * 10 + Math.floor(Math.random() * 5),
    title: job.label,
  };
}

// ---------------------------------------------------------------------------
// Decisión de obras
// ---------------------------------------------------------------------------
function preferredCategory(city, jobId) {
  if (jobId === 'granjero') return 'agro';
  if (jobId === 'guardia') return 'militar';
  if (jobId === 'rey' || jobId === 'alcalde') {
    if (city.districts.civico < 1) return 'civico';
    if (city.districts.militar < 2) return 'militar';
    return null;
  }
  if (jobId === 'arquitecto') {
    if (city.districts.militar < 2) return 'militar';
    if (city.districts.civico < 2) return 'civico';
    return null;
  }
  return null;
}

function tryStartOrJoinBuild(e, world, city) {
  const jobDef = JOBS[e.jobId] || JOBS.constructor;

  for (const proj of city.projects) {
    if (proj.done) continue;
    // FIX: eliminar el gate por proj.workers.size (nunca se limpia → bloquea obras grandes)
    // v8: con orden de construir, el sesgo no salta ninguna obra: todos
    // intentan unirse a la obra abierta, aunque su oficio construya poco.
    if (jobDef.buildBias < 0.4 && playerOrder !== 'build' && Math.random() > jobDef.buildBias) continue;

    const slice = claimWorkSlice(proj, e.id, e.rank >= 2 ? 36 : 20);
    if (!slice || !slice.blocks.length) continue;

    e.job = 'build';
    e.build = {
      projectId: proj.id, name: proj.name,
      slice: slice.blocks, localIdx: 0, placeCd: 0,
      ox: proj.ox, oy: proj.oy, oz: proj.oz,
      cooperative: proj.minWorkers > 1,
    };
    return true;
  }

  // v6: retomar un aplanado abandonado (su aldeano desapareció, por
  // ejemplo al alejarse el jugador). Se recalcula con el mundo actual,
  // así que lo ya aplanado no se repite; si ya está plano, se construye
  // directamente. Solo se retoma si nadie lo tocó en 15 s.
  for (const s of city.sites) {
    if (!s.flatten || !s.flattenPlan) continue;
    if (Date.now() - (s.flattenAt || 0) < 15000) continue;
    const fb = computeFlattenBlocks(world, { x: s.x, z: s.z, y: s.flattenY, w: s.w, d: s.d });
    s.flattenAt = Date.now();
    if (!fb.blocks.length) {
      const proj = createProject(city, s.flattenPlan, { x: s.x, y: fb.targetY, z: s.z }, e.id);
      city.sites = city.sites.filter(o => o !== s);
      const slice = claimWorkSlice(proj, e.id, e.rank >= 2 ? 40 : 24);
      if (!slice) return false;
      e.job = 'build';
      e.build = { projectId: proj.id, name: proj.name, slice: slice.blocks, localIdx: 0, placeCd: 0, ox: proj.ox, oy: proj.oy, oz: proj.oz, cooperative: proj.minWorkers > 1 };
      return true;
    }
    e.job = 'build';
    e.build = {
      projectId: null, name: 'aplanar', flatten: true, afterPlan: s.flattenPlan,
      slice: fb.blocks, localIdx: 0, placeCd: 0,
      ox: s.x, oy: fb.targetY, oz: s.z, siteEntry: s, cooperative: false,
    };
    return true;
  }

  // v8: NO abrir una obra nueva si hay otra sin terminar. Antes, un
  // aldeano con poco sesgo de construir podía saltarse la obra abierta
  // (por el gate aleatorio) y abrir otra: dos frentes a medias y
  // ninguna terminada. Ahora, si hay obra abierta, o se une a ella o
  // vaga/descansa, pero no abre otra.
  if (city.projects.some(p => !p.done)) return false;

  if (playerOrder !== 'build' && Math.random() > jobDef.buildBias) return false;

  const prefer = preferredCategory(city, e.jobId);
  const maxW = e.rank >= 2 ? 6 : 3;
  const plan = pickPlan(prefer, maxW);
  const edge = plan.category === 'militar' && plan.name !== 'torre';
  const site = findBuildSite(world, e.home, city, plan.w, plan.d, edge);
  if (!site) {
    // v6: sin sitio plano, NO se rinde: se aplana uno. El aldeano
    // destruye lo alto y rellena lo bajo, y al terminar construye ahí
    // mismo (ver tickBuild, caso flatten). Sin esto, en terreno
    // quebrado la aldea simplemente nunca crecía.
    const fs = findFlattenSite(world, city, plan.w, plan.d, edge);
    if (!fs) return false;
    const fb = computeFlattenBlocks(world, fs);
    if (!fb.blocks.length) return false;
    const entry = { x: fs.x, z: fs.z, w: plan.w, d: plan.d, category: plan.category, flatten: true, flattenPlan: plan, flattenY: fb.targetY, flattenAt: Date.now() };
    city.sites.push(entry);
    expandCityRadius(city, entry);
    e.job = 'build';
    e.build = {
      projectId: null, name: 'aplanar', flatten: true, afterPlan: plan,
      slice: fb.blocks, localIdx: 0, placeCd: 0,
      ox: fs.x, oy: fb.targetY, oz: fs.z, siteEntry: entry, cooperative: false,
    };
    return true;
  }

  const proj = createProject(city, plan, site, e.id);
  const slice = claimWorkSlice(proj, e.id, e.rank >= 2 ? 40 : 24);
  if (!slice) return false;

  e.job = 'build';
  e.build = {
    projectId: proj.id, name: proj.name,
    slice: slice.blocks, localIdx: 0, placeCd: 0,
    ox: proj.ox, oy: proj.oy, oz: proj.oz,
    cooperative: plan.minWorkers > 1,
  };
  return true;
}

// ---------------------------------------------------------------------------
// Desvío alrededor de paredes (v5) — la causa del bug reportado
// ---------------------------------------------------------------------------
// Antes: tickBuild apuntaba SIEMPRE en línea recta al bloque objetivo y
// avoidStructures desviaba con un ángulo aleatorio NUEVO cada frame, que
// tickBuild sobrescribía al frame siguiente. Resultado: el aldeano no
// rodeaba la pared, solo se deslizaba pegado a ella, y como al deslizarse
// la celda de delante parecía libre, stuckT se reseteaba a 0 y el escape
// de 2,2 s nunca llegaba. Ahora el desvío PERSISTE en e.detour hasta
// llegar a un punto desde el que la línea al objetivo está libre.
// Una celda es intransitable solo si no se puede pasar ni subiendo un
// escalón (igual que tryMove en entities.js): bloque a la altura de la
// cabeza, o bloque a los pies con otro encima.
function feetY(e) { return Math.floor(e.pos.y + 0.05); }
function cellImpassable(world, fx, fz, y) {
  const b0 = world.getBlock(fx, y, fz);
  const b1 = world.getBlock(fx, y + 1, fz);
  const b2 = world.getBlock(fx, y + 2, fz);
  return !!b1 || (!!b0 && !!b2);
}
function lineClear(world, x0, z0, x1, z1, y) {
  const dist = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(1, Math.ceil(dist * 2));
  for (let i = 1; i <= steps; i++) {
    const x = x0 + (x1 - x0) * (i / steps);
    const z = z0 + (z1 - z0) * (i / steps);
    if (cellImpassable(world, Math.floor(x), Math.floor(z), y)) return false;
  }
  return true;
}
// Busca un punto bordeando la pared: camina perpendicular a la dirección
// al objetivo (es decir, A LO LARGO de la pared) hasta pasar su extremo,
// punto desde el que ya se ve el objetivo sin obstáculos. Devuelve null
// si ningún lado lo consigue en 20 bloques (pared muy larga o cerrada).
function findDetour(world, e, tx, tz) {
  const y = feetY(e);
  const dx = (tx + 0.5) - e.pos.x, dz = (tz + 0.5) - e.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len, pz = dx / len; // perpendicular
  let best = null;
  for (const side of [1, -1]) {
    for (let k = 1; k <= 20; k++) {
      const wx = e.pos.x + px * side * k;
      const wz = e.pos.z + pz * side * k;
      const cx = Math.floor(wx) + 0.5, cz = Math.floor(wz) + 0.5;
      if (cellImpassable(world, Math.floor(wx), Math.floor(wz), y)) continue;
      if (!lineClear(world, e.pos.x, e.pos.z, cx, cz, y)) continue;
      if (!lineClear(world, cx, cz, tx + 0.5, tz + 0.5, y)) continue;
      if (!best || k < best.k) best = { x: cx, z: cz, k };
      break; // el primer punto válido de este lado es el extremo de la pared
    }
  }
  return best ? { x: best.x, z: best.z } : null;
}
// Altura mínima para volar POR ENCIMA de lo que hay entre el aldeano y
// el objetivo (techo de la pared más alta del camino + 1 bloque).
function flyOverAltitude(world, e, tx, tz) {
  const y0 = feetY(e);
  const dist = Math.hypot(tx + 0.5 - e.pos.x, tz + 0.5 - e.pos.z);
  const steps = Math.max(1, Math.ceil(dist * 2));
  let top = y0;
  for (let i = 1; i <= steps; i++) {
    const x = e.pos.x + (tx + 0.5 - e.pos.x) * (i / steps);
    const z = e.pos.z + (tz + 0.5 - e.pos.z) * (i / steps);
    for (let y = y0; y <= y0 + 10; y++)
      if (world.getBlock(Math.floor(x), y, Math.floor(z))) top = Math.max(top, y);
  }
  return top + 1;
}

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------
function tickBuild(e, dt, world, city) {
  const b = e.build;
  if (!b || b.localIdx >= b.slice.length) {
    // v6: al terminar de aplanar, construir ahí mismo (no volver a
    // buscar sitio a ciegas: el sitio ya está reservado y plano).
    if (b && b.flatten && b.afterPlan && city) {
      const site = { x: b.ox, y: b.oy, z: b.oz };
      if (b.siteEntry) city.sites = city.sites.filter(o => o !== b.siteEntry);
      const proj = createProject(city, b.afterPlan, site, e.id);
      const slice = claimWorkSlice(proj, e.id, e.rank >= 2 ? 40 : 24);
      if (slice) {
        e.job = 'build';
        e.build = { projectId: proj.id, name: proj.name, slice: slice.blocks, localIdx: 0, placeCd: 0, ox: proj.ox, oy: proj.oy, oz: proj.oz, cooperative: proj.minWorkers > 1 };
        e.flying = false; e.flyTarget = null; e.detour = null; e.flyOver = false;
        return { mx: 0, mz: 0, sp: 0 };
      }
    }
    e.job = null; e.build = null;
    e.thinkT = 4 + Math.random() * 8;
    e.flying = false; e.flyTarget = null; e.detour = null; e.flyOver = false;
    return null;
  }
  if (b.flatten && b.siteEntry) b.siteEntry.flattenAt = Date.now();

  const [dx, dy, dz, id] = b.slice[b.localIdx];
  const tx = b.ox + dx, ty = b.oy + dy, tz = b.oz + dz;
  const distH = Math.hypot(e.pos.x - (tx + 0.5), e.pos.z - (tz + 0.5));
  const distY = (ty + 1) - e.pos.y;

  const canFly = (JOBS[e.jobId] || {}).canFly !== false;

  // FIX: no-flyers nunca alcanzan bloques altos → saltar el bloque.
  // v6: en aplanado NO se salta: quitar una loma o un árbol desde abajo
  // es justo el trabajo (alcance vertical 6,5 en vez de 3,5).
  if (!canFly && Math.abs(distY) > 3.5 && !b.flatten) {
    b.localIdx++;
    return { mx: 0, mz: 0, sp: 0 };
  }

  // Desvío activo: ir al punto de rodeo, NO al objetivo, hasta llegar.
  // Sin esta rama, cualquier desvío se perdía al frame siguiente.
  if (e.detour) {
    const dd = Math.hypot(e.pos.x - e.detour.x, e.pos.z - e.detour.z);
    if (dd < 1.0 || e.detourT <= 0) {
      e.detour = null; e.detourT = 0;
    } else {
      const ang = Math.atan2(e.detour.z - e.pos.z, e.detour.x - e.pos.x);
      e.wa = ang;
      return { mx: Math.cos(ang), mz: Math.sin(ang), sp: VILLAGER_TYPE.sp * 0.95 };
    }
  }

  // Vuelo por encima de la pared: antes solo se volaba si el objetivo
  // estaba a >6 bloques, así que una pared a 3-5 bloques se intentaba
  // cruzar andando. Ahora una línea bloqueada también dispara el vuelo,
  // y a la altura del techo de la pared (antes se volaba a ty+1,2 y se
  // seguía chocando con la pared a esa altura).
  const pathBlocked = distH > 2.4 && !lineClear(world, e.pos.x, e.pos.z, tx + 0.5, tz + 0.5, feetY(e));
  if (canFly && pathBlocked && !e.flyOver) {
    e.flyOver = true;
    e.flying = true;
    e.flyTarget = { x: tx + 0.5, y: flyOverAltitude(world, e, tx, tz), z: tz + 0.5 };
  }
  if (e.flyOver) {
    if (distH <= 2.6) { e.flyOver = false; } // ya encima del objetivo: bajar a colocar
    else {
      const ang = Math.atan2((tz + 0.5) - e.pos.z, (tx + 0.5) - e.pos.x);
      e.wa = ang;
      return { mx: Math.cos(ang), mz: Math.sin(ang), sp: VILLAGER_TYPE.flySp };
    }
  }

  const needFly = canFly && (distH > 6 || Math.abs(distY) > 2.5);
  if (needFly) {
    e.flying = true;
    e.flyTarget = { x: tx + 0.5, y: ty + 1.2, z: tz + 0.5 };
  } else if (distH <= 2.4) {
    e.flying = false; e.flyTarget = null;
  }

  if (distH > 2.4 || Math.abs(distY) > (b.flatten ? 6.5 : 3.5)) {
    // Pared en medio y no puede volar: rodearla antes de seguir recto.
    if (pathBlocked && !e.detour) {
      const d = findDetour(world, e, tx, tz);
      if (d) {
        e.detour = d; e.detourT = 12;
        const ang = Math.atan2(d.z - e.pos.z, d.x - e.pos.x);
        e.wa = ang;
        return { mx: Math.cos(ang), mz: Math.sin(ang), sp: VILLAGER_TYPE.sp * 0.95 };
      }
    }
    const ang = Math.atan2((tz + 0.5) - e.pos.z, (tx + 0.5) - e.pos.x);
    e.wa = ang;
    const sp = e.flying ? VILLAGER_TYPE.flySp : VILLAGER_TYPE.sp * 0.95;
    return { mx: Math.cos(ang), mz: Math.sin(ang), sp };
  }

  b.placeCd -= dt;
  if (b.placeCd > 0) return { mx: 0, mz: 0, sp: 0 };

  placeBlockLikeBuild(world, tx, ty, tz, id);

  b.localIdx++;
  if (city && b.projectId) {
    const proj = city.projects.find(p => p.id === b.projectId);
    if (proj) proj.attempted = (proj.attempted || 0) + 1;
  }
  const rankBonus = (e.rank || 0) * 0.04;
  b.placeCd = Math.max(0.08, 0.16 + Math.random() * 0.12 - rankBonus);
  return { mx: 0, mz: 0, sp: 0 };
}

// ---------------------------------------------------------------------------
// Evitar estructuras
// ---------------------------------------------------------------------------
function avoidStructures(e, mx, mz, sp, world, dt) {
  if (sp < 0.01 || e.flying) return { mx, mz, sp };

  // v6: mirar 0,9 bloques por delante, no 0,08. Con el avance anterior
  // (sp*dt*4) la celda de delante era casi siempre la propia, así que
  // la pared solo se "detectaba" cuando entities.js ya había chocado
  // contra ella y el aldeano se deslizaba pegado a ella.
  const nx = e.pos.x + mx * 0.9;
  const nz = e.pos.z + mz * 0.9;
  const fy = feetY(e);
  const fx = Math.floor(nx), fz = Math.floor(nz);

  // Celda libre o subible un escalón: no hay obstáculo. El contador de
  // atascado solo DECAE (antes se reseteaba a 0 al instante, y al
  // deslizarse pegado a la pared nunca acumulaba los 2,2 s del escape).
  if (!cellImpassable(world, fx, fz, fy)) {
    e.stuckT = Math.max(0, (e.stuckT || 0) - dt);
    return { mx, mz, sp };
  }

  e.stuckT = (e.stuckT || 0) + dt;

  // Evasión en curso: mantener EL MISMO ángulo hasta que expire
  // (antes se sorteaba uno nuevo cada frame y no se avanzaba a ningún lado).
  if (e.avoidT > 0 && e.avoidAng !== null) {
    e.wa = e.avoidAng;
    return { mx: Math.cos(e.avoidAng), mz: Math.sin(e.avoidAng), sp: sp * 0.65 };
  }

  // Construyendo: intentar un rodeo persistente antes que un desvío corto.
  if (e.job === 'build' && e.build) {
    const b = e.build, cur = b.slice[b.localIdx];
    if (cur) {
      const d = findDetour(world, e, b.ox + cur[0], b.oz + cur[2]);
      if (d) {
        e.detour = d; e.detourT = 12; e.stuckT = 0;
        const ang = Math.atan2(d.z - e.pos.z, d.x - e.pos.x);
        e.wa = ang;
        return { mx: Math.cos(ang), mz: Math.sin(ang), sp: sp * 0.95 };
      }
    }
  }

  // v6: desplazándose (sin construir) también se rodea: el destino
  // aproximado es 14 bloques en la dirección actual, y el rodeo
  // persistente lo gestiona updateVillager (antes el rodeo solo
  // existía en tickBuild, así que al caminar no había rodeo que valga).
  if (e.job !== 'build') {
    const len = Math.hypot(mx, mz) || 1;
    const px = Math.floor(e.pos.x + (mx / len) * 14);
    const pz = Math.floor(e.pos.z + (mz / len) * 14);
    const d = findDetour(world, e, px, pz);
    if (d) {
      // Guardar la dirección original: sin esto, al terminar el rodeo
      // el aldeano seguía en dirección del rodeo para siempre (eso era
      // parte del "se va para otro lado / no evade" al caminar).
      if (e.savedWa === null || e.savedWa === undefined) e.savedWa = e.wa;
      e.detour = d; e.detourT = 12; e.stuckT = 0;
      const ang = Math.atan2(d.z - e.pos.z, d.x - e.pos.x);
      e.wa = ang;
      return { mx: Math.cos(ang), mz: Math.sin(ang), sp: sp * 0.95 };
    }
  }

  // Último recurso tras ~5 s bloqueado (antes 2,2 s y cancelaba TODA la
  // obra: el trozo ya reclamado quedaba sin colocar para siempre y la
  // construcción quedaba con huecos). Ahora: 1) si puede volar, vuela
  // por encima; 2) si no, se salta SOLO el bloque inalcanzable y la
  // obra sigue con el resto del trozo.
  if (e.stuckT > 5) {
    e.stuckT = 0; e.avoidAng = null;
    if (e.job === 'build' && e.build && (JOBS[e.jobId] || {}).canFly) {
      const b = e.build, cur = b.slice[b.localIdx];
      if (cur) {
        e.flyOver = true; e.flying = true;
        e.flyTarget = { x: b.ox + cur[0] + 0.5, y: flyOverAltitude(world, e, b.ox + cur[0], b.oz + cur[2]), z: b.oz + cur[2] + 0.5 };
        e.stuckFails = 0;
        return { mx, mz, sp };
      }
    }
    if (e.job === 'build' && e.build) {
      e.build.localIdx++;
      e.stuckFails = 0; e.detour = null;
      return { mx: 0, mz: 0, sp: 0 };
    }
    e.wa = null; e.thinkT = 0; e.timer = 0; // timer: los guardias usan timer, no thinkT
    return { mx: 0, mz: 0, sp: 0 };
  }

  // Desvío corto persistente: se elige el lado UNA vez por episodio y
  // se mantiene 0,9 s (tiempo de recorrer varios bloques, no un frame).
  if (!e.avoidSide) e.avoidSide = Math.random() < 0.5 ? 1 : -1;
  const ang = Math.atan2(mz, mx) + e.avoidSide * 1.0;
  e.avoidAng = ang; e.avoidT = 0.9;
  e.wa = ang;
  return { mx: Math.cos(ang), mz: Math.sin(ang), sp: sp * 0.65 };
}

// ---------------------------------------------------------------------------
// Tareas por oficio
// ---------------------------------------------------------------------------
function tickJobBehavior(e, dt, world, city, ctx) {
  let mx = 0, mz = 0, sp = 0;
  const jobId = e.jobId;

  // v8: con orden de construir, hasta guardia y explorador (que nunca
  // construían) intentan unirse a la obra, con su propio temporizador
  // para no intentar construir cada frame. Si no hay obra ni sitio,
  // siguen con su oficio normal.
  if (playerOrder === 'build' && (jobId === 'guardia' || jobId === 'explorador')) {
    if (e.timer <= 0) {
      e.timer = 4 + Math.random() * 3;
      if (tryStartOrJoinBuild(e, world, city)) return null;
    }
  }

  if (jobId === 'guardia') {
    if (e.timer <= 0) {
      e.timer = 3 + Math.random() * 4;
      const ang = Math.random() * Math.PI * 2;
      const r = city.radius * (0.7 + Math.random() * 0.35);
      e.wa = Math.atan2(city.cz + Math.sin(ang) * r - e.pos.z, city.cx + Math.cos(ang) * r - e.pos.x);
      e.job = 'patrol';
    }
    if (e.wa !== null) { mx = Math.cos(e.wa); mz = Math.sin(e.wa); sp = VILLAGER_TYPE.sp * 0.75; }
    return { mx, mz, sp };
  }

  if (jobId === 'explorador') {
    if (e.timer <= 0) {
      e.timer = 6 + Math.random() * 8;
      const ang = Math.random() * Math.PI * 2;
      const r = city.radius + 15 + Math.random() * 25;
      e.flying = true;
      e.flyTarget = {
        x: city.cx + Math.cos(ang) * r,
        y: e.pos.y + 4 + Math.random() * 5,
        z: city.cz + Math.sin(ang) * r,
      };
      e.job = 'explore';
    }
    if (e.flyTarget) {
      const dx = e.flyTarget.x - e.pos.x, dz = e.flyTarget.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2) { e.flying = false; e.flyTarget = null; e.job = null; }
      else { mx = dx / dist; mz = dz / dist; sp = VILLAGER_TYPE.flySp; }
    }
    return { mx, mz, sp };
  }

  if (jobId === 'rey' || jobId === 'alcalde') {
    if (e.thinkT <= 0) {
      e.thinkT = 6 + Math.random() * 6;
      scanSurroundings(world, city.cx, city.cz, city.radius);
      // FIX: si intenta construir, NO sobreescribir e.job='build'
      if (Math.random() < 0.35 && tryStartOrJoinBuild(e, world, city)) {
        // building started
      } else {
        e.wa = Math.atan2(city.cz - e.pos.z, city.cx - e.pos.x) + (Math.random() - 0.5);
        e.job = 'direct';
      }
    }
    if (e.job === 'build') return null;
    if (e.wa !== null) { mx = Math.cos(e.wa); mz = Math.sin(e.wa); sp = VILLAGER_TYPE.sp * 0.55; }
    const distC = Math.hypot(e.pos.x - city.cx, e.pos.z - city.cz);
    if (distC > city.radius * 0.9) {
      e.wa = Math.atan2(city.cz - e.pos.z, city.cx - e.pos.x);
      mx = Math.cos(e.wa); mz = Math.sin(e.wa); sp = VILLAGER_TYPE.sp * 0.55;
    }
    return { mx, mz, sp };
  }

  if (jobId === 'granjero') {
    if (e.thinkT <= 0) {
      e.thinkT = 5 + Math.random() * 5;
      if (Math.random() < 0.55) tryStartOrJoinBuild(e, world, city);
      else { e.wa = Math.random() * Math.PI * 2; e.job = 'farm'; }
    }
    if (e.job === 'build') return null;
    if (e.wa !== null) { mx = Math.cos(e.wa); mz = Math.sin(e.wa); sp = VILLAGER_TYPE.sp * 0.5; }
    return { mx, mz, sp };
  }

  // constructor / arquitecto
  if (e.thinkT <= 0) {
    e.thinkT = 3 + Math.random() * 5;
    if (!tryStartOrJoinBuild(e, world, city)) e.wa = Math.random() * Math.PI * 2;
  }
  if (e.job === 'build') return null;

  if (e.timer <= 0) {
    e.timer = 2 + Math.random() * 3;
    e.wa = Math.random() < 0.25 ? null : Math.random() * Math.PI * 2;
    const distHome = Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z);
    if (distHome > 16) e.wa = Math.atan2(e.home.z - e.pos.z, e.home.x - e.pos.x);
  }
  // v6: quitar el gate "avoidT <= 0". Ese gate era la segunda causa de
  // que al caminar no se evadieran paredes: durante la evasión el
  // aldeano devolvía sp=0, así que avoidStructures nunca se llamaba
  // (sp < 0,01) y la evasión expiraba sin moverse; luego volvía recto
  // a la pared. Ahora devuelve su dirección y avoidStructures la
  // transforma si hay pared delante.
  if (e.wa !== null) {
    mx = Math.cos(e.wa); mz = Math.sin(e.wa); sp = VILLAGER_TYPE.sp * 0.55;
  }
  return { mx, mz, sp };
}

function applyFlight(e, dt) {
  if (!e.flying || !e.flyTarget) return;
  const ty = e.flyTarget.y;
  const dy = ty - e.pos.y;
  const maxStep = VILLAGER_TYPE.flySp * dt;
  if (Math.abs(dy) <= maxStep) e.pos.y = ty;
  else e.pos.y += Math.sign(dy) * maxStep;
  e.vy = 0;
}

// ---------------------------------------------------------------------------
// Prioridades v8 (IA por reglas): descanso, huida, reunión
// ---------------------------------------------------------------------------
function moveTo(e, tx, tz, sp) {
  const dx = tx - e.pos.x, dz = tz - e.pos.z, d = Math.hypot(dx, dz) || 1;
  e.wa = Math.atan2(dz, dx);
  return { mx: dx / d, mz: dz / d, sp };
}
function nearestZombie(e, zombies) {
  if (!zombies || !zombies.length) return null;
  let best = null, bd = 1e9;
  for (const z of zombies) {
    const d = Math.hypot(z.x - e.pos.x, z.z - e.pos.z);
    if (d < bd) { bd = d; best = z; }
  }
  return bd < 14 ? best : null;
}
// Descansar: ir al centro, quedarse quieto y recuperar energía.
// No toca e.build: la obra queda en pausa, no cancelada.
function restMove(e, dt, city) {
  e.flying = false; e.flyTarget = null;
  e.energy = Math.min(100, (e.energy ?? 100) + dt * 6);
  if (e.energy >= 85) e.resting = false;
  const d = Math.hypot(city.cx - e.pos.x, city.cz - e.pos.z);
  if (d > 3) return moveTo(e, city.cx, city.cz, VILLAGER_TYPE.sp * 0.95);
  return { mx: 0, mz: 0, sp: 0 };
}

// ---------------------------------------------------------------------------
// Update principal
// ---------------------------------------------------------------------------
export function updateVillager(e, dt, ctx) {
  const { world, buildSites } = ctx;
  const city = getOrCreateCity(e.home.x, e.home.z);

  if (buildSites && buildSites.length && city.sites.length < buildSites.length) {
    for (const s of buildSites) {
      if (!city.sites.some(c => c.x === s.x && c.z === s.z))
        city.sites.push({ x: s.x, z: s.z, w: s.w || 6, d: s.d || 6, category: 'vivienda' });
    }
  }

  let mx = 0, mz = 0, sp = 0;

  // FIX (v5): thinkT y timer YA se restan en entities.js antes de llamar
  // aquí; restarlos también aquí los hacía correr al doble de velocidad.
  if (e.avoidT > 0) { e.avoidT -= dt; if (e.avoidT <= 0) { e.avoidAng = null; e.avoidSide = 0; } }
  if (e.detourT > 0) e.detourT -= dt;

  // v6: aprendizaje al caminar + encuesta por sectores + marca de
  // actividad (esta marca es la que permite el avance simulado al volver).
  if (Date.now() - (city.lastSeen || 0) > 1000) city.lastSeen = Date.now();
  if (Math.floor(e.pos.x) !== e.lastPos.x || Math.floor(e.pos.z) !== e.lastPos.z) {
    e.lastPos = { x: Math.floor(e.pos.x), z: Math.floor(e.pos.z) };
    surveyColumn(world, city, e.lastPos.x, e.lastPos.z);
  }
  if ((e.jobId === 'explorador' || e.jobId === 'arquitecto' || e.jobId === 'rey' || e.jobId === 'alcalde') &&
      Date.now() - (city.lastSurveyAt || 0) > 5000) {
    surveyBatch(world, city);
  }

  // v8: prioridades, en orden, ANTES del oficio. 1) Orden descansar.
  // 2) Peligro: zombi a menos de 14 bloques -> al centro, todos
  // (incluido el guardia: no hay sistema de combate de aldeanos, así
  // que fingir que ataca sería mentira; se refugian juntos).
  // 3) Cansancio: descansando hasta recuperar energía. 4) Orden
  // reunirse. En todos los casos la obra queda en pausa, no se
  // cancela: cancelarla perdería el trozo ya reclamado, porque el
  // índice del proyecto ya avanzó al reclamarlo.
  let overrideMove = null;
  const order = playerOrder;
  const zb = nearestZombie(e, ctx.zombies);
  if (order === 'rest') {
    e.aiState = 'rest'; e.detour = null;
    overrideMove = restMove(e, dt, city);
  } else if (zb) {
    e.aiState = 'flee'; e.detour = null; e.flying = false; e.flyTarget = null;
    const dc = Math.hypot(city.cx - e.pos.x, city.cz - e.pos.z);
    overrideMove = dc > 3 ? moveTo(e, city.cx, city.cz, VILLAGER_TYPE.sp) : { mx: 0, mz: 0, sp: 0 };
  } else if (e.resting) {
    e.aiState = 'rest';
    overrideMove = restMove(e, dt, city);
    if (!e.resting) e.aiState = 'work';
  } else if (order === 'gather') {
    e.aiState = 'gather'; e.detour = null; e.flying = false; e.flyTarget = null;
    const dc = Math.hypot(city.cx - e.pos.x, city.cz - e.pos.z);
    overrideMove = dc > 4 ? moveTo(e, city.cx, city.cz, VILLAGER_TYPE.sp * 0.95) : { mx: 0, mz: 0, sp: 0 };
  } else {
    e.aiState = 'work';
  }

  if (overrideMove) {
    mx = overrideMove.mx; mz = overrideMove.mz; sp = overrideMove.sp;
  } else if (e.job === 'build' && e.build) {
    const move = tickBuild(e, dt, world, city);
    if (move) { mx = move.mx; mz = move.mz; sp = move.sp; }
  } else {
    const move = tickJobBehavior(e, dt, world, city, ctx);
    if (move) { mx = move.mx; mz = move.mz; sp = move.sp; }
    if (e.job === 'build' && e.build) {
      const m2 = tickBuild(e, dt, world, city);
      if (m2) { mx = m2.mx; mz = m2.mz; sp = m2.sp; }
    }
  }

  // v8: construir cansa. Solo baja trabajando (no vagando, no huyendo,
  // no descansando). A 25 o menos, el aldeano pasa a descansar.
  if (!overrideMove && e.job === 'build' && e.build) {
    e.energy = Math.max(0, (e.energy ?? 100) - dt * 0.7);
    if (e.energy <= 25) e.resting = true;
  }

  // v6: el rodeo vale para TODOS los desplazamientos, no solo para
  // construir. Sin esto, el rodeo que avoidStructures calculaba al
  // caminar se perdía porque tickJobBehavior volvía a su dirección.
  if (e.detour && !e.flying) {
    const dd = Math.hypot(e.pos.x - e.detour.x, e.pos.z - e.detour.z);
    if (dd < 1.0 || e.detourT <= 0) {
      e.detour = null; e.detourT = 0;
      if (e.savedWa !== null && e.savedWa !== undefined) { e.wa = e.savedWa; e.savedWa = null; }
    }
    else {
      const ang = Math.atan2(e.detour.z - e.pos.z, e.detour.x - e.pos.x);
      e.wa = ang; mx = Math.cos(ang); mz = Math.sin(ang); sp = VILLAGER_TYPE.sp * 0.95;
    }
  }

  if (e.jobId !== 'explorador' && !e.flying && !e.detour) {
    const distC = Math.hypot(e.pos.x - city.cx, e.pos.z - city.cz);
    if (distC > city.radius + 8) {
      const ang = Math.atan2(city.cz - e.pos.z, city.cx - e.pos.x);
      mx = Math.cos(ang); mz = Math.sin(ang); sp = VILLAGER_TYPE.sp;
      e.wa = ang;
    }
  }

  if (sp > 0.01 && !e.flying) {
    const adj = avoidStructures(e, mx, mz, sp, world, dt);
    mx = adj.mx; mz = adj.mz; sp = adj.sp;
  }

  applyFlight(e, dt);
  return { mx, mz, sp };
}

export function getCities() { return CITIES; }