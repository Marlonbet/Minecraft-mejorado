// ===== Dimensiones del mundo =====
export const WORLD_X = 128;
export const WORLD_Z = 128;
export const WORLD_Y = 64;
export const CHUNK_SIZE = 16;

// ===== Física del jugador =====
export const PLAYER = {
  radius: 0.3,
  height: 1.8,
  eyeHeight: 1.62,
  walkSpeed: 5,
  runSpeed: 9,
  jumpVelocity: 8.6,
  gravity: 26,
  maxFallSpeed: -25,
  coyoteTime: 0.12,
  jumpBuffer: 0.12,
};

// ===== Atlas =====
export const ATLAS_TILES = 4;      // 4x4 celdas
export const TILE_PX = 16;         // px por celda

// ===== Definición de bloques =====
export const BLOCKS = {
  1: { name: 'Césped',  color: '#6ab04c', preview: 'side',
       textures: { top: [0,0], side: [1,0], bottom: [2,0] } },
  2: { name: 'Tierra',  color: '#8b5a2b', preview: 'all',
       textures: { all: [2,0] } },
  3: { name: 'Piedra',  color: '#8d8d8d', preview: 'all',
       textures: { all: [3,0] } },
  4: { name: 'Madera',  color: '#7a5230', preview: 'side',
       textures: { top: [1,1], side: [0,1], bottom: [1,1] } },
  5: { name: 'Hojas',   color: '#2f8f4e', preview: 'all',
       textures: { all: [2,1] } },
  6: { name: 'Arena',   color: '#e0d29a', preview: 'all',
       textures: { all: [3,1] } },
  7: { name: 'Ladrillo',color: '#b44a3f', preview: 'all',
       textures: { all: [0,2] } },
  8: { name: 'Tablones',color: '#b8945a', preview: 'all',
       textures: { all: [1,2] } },
  9: { name: 'Adoquín', color: '#7a7a7a', preview: 'all',
       textures: { all: [2,2] } },
};
BLOCKS[10] = { name: 'Carbón', color: '#222', noHotbar: true, textures: { all: [3,2] } };
BLOCKS[11] = { name: 'Hierro', color: '#d8b090', noHotbar: true, textures: { all: [0,3] } };
export const BLOCK_IDS = Object.keys(BLOCKS).map(Number).filter(id => !BLOCKS[id].noHotbar);

// ===== Caras del cubo (vértices en CCW visto desde fuera) =====
// brightness = factor de luz horneado por orientación
export const FACES = [
  { dir: [ 1, 0, 0], brightness: 0.82, corners: [   // +X
    { pos: [1,0,1], uv: [0,0] }, { pos: [1,0,0], uv: [1,0] },
    { pos: [1,1,0], uv: [1,1] }, { pos: [1,1,1], uv: [0,1] } ] },
  { dir: [-1, 0, 0], brightness: 0.72, corners: [   // -X
    { pos: [0,0,0], uv: [0,0] }, { pos: [0,0,1], uv: [1,0] },
    { pos: [0,1,1], uv: [1,1] }, { pos: [0,1,0], uv: [0,1] } ] },
  { dir: [ 0, 1, 0], brightness: 1.00, corners: [   // +Y
    { pos: [0,1,1], uv: [0,0] }, { pos: [1,1,1], uv: [1,0] },
    { pos: [1,1,0], uv: [1,1] }, { pos: [0,1,0], uv: [0,1] } ] },
  { dir: [ 0,-1, 0], brightness: 0.50, corners: [   // -Y
    { pos: [0,0,0], uv: [0,0] }, { pos: [1,0,0], uv: [1,0] },
    { pos: [1,0,1], uv: [1,1] }, { pos: [0,0,1], uv: [0,1] } ] },
  { dir: [ 0, 0, 1], brightness: 0.90, corners: [   // +Z  (CCW visto desde +Z)
    { pos: [0,0,1], uv: [0,0] }, { pos: [1,0,1], uv: [1,0] },
    { pos: [1,1,1], uv: [1,1] }, { pos: [0,1,1], uv: [0,1] } ] },
  { dir: [ 0, 0,-1], brightness: 0.70, corners: [   // -Z  (CCW visto desde -Z)
    { pos: [0,1,0], uv: [1,1] }, { pos: [1,1,0], uv: [0,1] },
    { pos: [1,0,0], uv: [0,0] }, { pos: [0,0,0], uv: [1,0] } ] },
];