import * as THREE from 'three';
import { CHUNK_SIZE, WORLD_Y, ATLAS_TILES, BLOCKS, FACES } from './config.js';

const GLASS = 12, LAMP = 14, LAMP_BOOST = 1.7;

// AO por vértice — la misma fórmula de siempre, pero leyendo del
// array acolchado local en vez de world.getBlock. Los ejes tangentes
// son los dos distintos del de la normal; fuera del rango vertical
// (y < 0 o y >= WORLD_Y) se devuelve 0, igual que hacía getBlock.
function vertexAO(B, lx, ly, lz, N, C) {
  const tan = [];
  if (N[0] === 0) tan.push(0);
  if (N[1] === 0) tan.push(1);
  if (N[2] === 0) tan.push(2);

  const d1 = [0, 0, 0], d2 = [0, 0, 0];
  d1[tan[0]] = C[tan[0]] === 0 ? -1 : 1;
  d2[tan[1]] = C[tan[1]] === 0 ? -1 : 1;

  const bx = lx + N[0], by = ly + N[1], bz = lz + N[2];

  const s1 = B(bx + d1[0], by + d1[1], bz + d1[2]) ? 1 : 0;
  const s2 = B(bx + d2[0], by + d2[1], bz + d2[2]) ? 1 : 0;
  const c  = B(bx + d1[0] + d2[0],
               by + d1[1] + d2[1],
               bz + d1[2] + d2[2]) ? 1 : 0;

  if (s1 && s2) return 0;
  return 3 - (s1 + s2 + c);
}

function tileFor(blockDef, N) {
  if (N[1] === 1)  return blockDef.textures.top    || blockDef.textures.all;
  if (N[1] === -1) return blockDef.textures.bottom || blockDef.textures.all;
  return blockDef.textures.side || blockDef.textures.all;
}

export function buildChunkMesh(world, cx, cz) {
  const positions = [], normals = [], uvs = [], colors = [], indices = [];
  let vCount = 0;

  const worldX0 = cx * CHUNK_SIZE;
  const worldZ0 = cz * CHUNK_SIZE;

  // v9: array acolchado (CHUNK_SIZE+2) x WORLD_Y x (CHUNK_SIZE+2) con
  // una celda de borde por cada lado. Antes, cada cara y cada cálculo
  // de AO hacía sus propias búsquedas en el Map de chunks y getBlock;
  // ahora el chunk se lee una sola vez y todo lo demás es acceso a
  // este array. La salida es idéntica: mismo orden de recorrido,
  // mismas caras, mismo AO y mismos colores.
  const PW = CHUNK_SIZE + 2;
  const pad = new Uint8Array(PW * WORLD_Y * PW);
  for (let lz = -1; lz <= CHUNK_SIZE; lz++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
      for (let wy = 0; wy < WORLD_Y; wy++) {
        pad[(wy * PW + (lz + 1)) * PW + (lx + 1)] =
          world.getBlock(worldX0 + lx, wy, worldZ0 + lz);
      }
    }
  }
  // B(lx, wy, lz): lx/lz en -1..CHUNK_SIZE (dentro del acolchado);
  // fuera del rango vertical devuelve 0, como getBlock.
  const B = (lx, wy, lz) =>
    (wy < 0 || wy >= WORLD_Y) ? 0 : pad[(wy * PW + (lz + 1)) * PW + (lx + 1)];

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    const wx = worldX0 + lx;
    if (wx >= world.sizeX) continue;
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wz = worldZ0 + lz;
      if (wz >= world.sizeZ) continue;

      for (let wy = 0; wy < WORLD_Y; wy++) {
        const type = B(lx, wy, lz);
        if (!type) continue;
        const def = BLOCKS[type];
        if (!def) continue;

        for (const face of FACES) {
          const N = face.dir;
          const nb = B(lx + N[0], wy + N[1], lz + N[2]);
          // Reglas de ocultación (v9, cristal):
          //  - vecino aire: se dibuja (como siempre);
          //  - bloque opaco hacia cristal: SÍ se dibuja (se ve a través);
          //  - cristal hacia aire: SÍ; cristal contra cristal u opaco:
          //    NO (evita duplicados y z-fighting en el plano compartido).
          if (nb && !(type !== GLASS && nb === GLASS)) continue;

          const tile = tileFor(def, N);
          const tx = tile[0], ty = tile[1];
          const base = vCount;

          for (const corner of face.corners) {
            positions.push(wx + corner.pos[0], wy + corner.pos[1], wz + corner.pos[2]);
            normals.push(N[0], N[1], N[2]);

            const eps = 0.001;
            const u = (tx + corner.uv[0]) / ATLAS_TILES;
            const v = 1 - (ty + 1 - corner.uv[1]) / ATLAS_TILES;
            uvs.push(
              corner.uv[0] === 0 ? u + eps : u - eps,
              corner.uv[1] === 0 ? v + eps : v - eps
            );

            const ao = vertexAO(B, lx, wy, lz, N, corner.pos);
            const aoFactor = 0.55 + ao * (0.45 / 3);
            let b = face.brightness * aoFactor;
            // v9: la lámpara brilla de noche con colores de vértice
            // elevados (sin material nuevo por chunk): cuando la luz
            // ambiental baja, sus caras siguen viéndose brillantes.
            if (type === LAMP) b *= LAMP_BOOST;
            colors.push(b, b, b);
          }

          indices.push(base, base + 1, base + 2);
          indices.push(base, base + 2, base + 3);
          vCount += 4;
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}
