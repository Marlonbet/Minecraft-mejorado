import * as THREE from 'three';
import { ATLAS_TILES, TILE_PX } from './config.js';

const S = TILE_PX;

function px(ctx, x, y, color, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function noise(ctx, ox, oy, colors, density = 0.4) {
  for (let i = 0; i < S * S * density; i++) {
    const x = Math.floor(Math.random() * S);
    const y = Math.floor(Math.random() * S);
    px(ctx, ox + x, oy + y, colors[Math.floor(Math.random() * colors.length)]);
  }
}

function grassTop(ctx, ox, oy) {
  px(ctx, ox, oy, '#6ab04c', S);
  noise(ctx, ox, oy, ['#5fa042', '#7fc45e', '#4a9038', '#6bb84e'], 0.55);
}

function grassSide(ctx, ox, oy) {
  px(ctx, ox, oy, '#8b5a2b', S);
  noise(ctx, ox, oy, ['#7a4a1b', '#9a6a3b', '#6b3a1b'], 0.5);
  for (let x = 0; x < S; x++) {
    const h = 3 + (Math.random() < 0.4 ? 1 : 0);
    px(ctx, ox + x, oy, '#6ab04c', h);
    for (let y = 1; y < h; y++) {
      if (Math.random() < 0.5) px(ctx, ox + x, oy + y, '#5fa042');
    }
  }
}

function dirt(ctx, ox, oy) {
  px(ctx, ox, oy, '#8b5a2b', S);
  noise(ctx, ox, oy, ['#7a4a1b', '#9a6a3b', '#5a3a1b', '#a07040'], 0.6);
}

function stone(ctx, ox, oy) {
  px(ctx, ox, oy, '#8d8d8d', S);
  noise(ctx, ox, oy, ['#7d7d7d', '#9d9d9d', '#6d6d6d', '#a8a8a8'], 0.55);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(Math.random() * (S - 3));
    const y = Math.floor(Math.random() * (S - 3));
    px(ctx, ox + x, oy + y, '#6d6d6d', 2);
  }
}

function logSide(ctx, ox, oy) {
  px(ctx, ox, oy, '#7a5230', S);
  noise(ctx, ox, oy, ['#6a4220', '#8a6240'], 0.35);
  for (let x = 0; x < S; x += 2) {
    if (Math.random() < 0.7) {
      const c = Math.random() < 0.5 ? '#5a3a1a' : '#9a7240';
      for (let y = 0; y < S; y++) {
        if (Math.random() < 0.85) px(ctx, ox + x, oy + y, c);
      }
    }
  }
}

function logTop(ctx, ox, oy) {
  px(ctx, ox, oy, '#7a5230', S);
  const cx = S / 2, cy = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cy + 0.5);
      const ring = Math.floor(d) % 3;
      const c = ring === 0 ? '#5a3a1a' : (ring === 1 ? '#8a6240' : '#7a5230');
      if (d < S / 2) px(ctx, ox + x, oy + y, c);
    }
  }
}

function leaves(ctx, ox, oy) {
  px(ctx, ox, oy, '#2f8f4e', S);
  noise(ctx, ox, oy, ['#1f6f3e', '#4fa05e', '#3a7f4a', '#5fb06e'], 0.75);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(Math.random() * (S - 2));
    const y = Math.floor(Math.random() * (S - 2));
    px(ctx, ox + x, oy + y, '#145a2e', 2);
  }
}

function sand(ctx, ox, oy) {
  px(ctx, ox, oy, '#e0d29a', S);
  noise(ctx, ox, oy, ['#d0c28a', '#f0e2aa', '#c8ba80'], 0.5);
}

function brick(ctx, ox, oy) {
  px(ctx, ox, oy, '#a03a2f', S);
  const mortar = '#d0c8b8';
  for (let y = 0; y < S; y += 4) {
    for (let x = 0; x < S; x++) px(ctx, ox + x, oy + y, mortar);
    const offset = (y / 4) % 2 === 0 ? 0 : 4;
    for (let x = offset; x < S; x += 8) px(ctx, ox + x, oy + y, mortar);
  }
  for (let y = 1; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (ctx.getImageData(ox + x, oy + y, 1, 1).data[0] > 200) continue;
      if (Math.random() < 0.15) px(ctx, ox + x, oy + y, '#b44a3f');
      else if (Math.random() < 0.15) px(ctx, ox + x, oy + y, '#944032');
    }
  }
}

function planks(ctx, ox, oy) {
  px(ctx, ox, oy, '#b8945a', S);
  noise(ctx, ox, oy, ['#a98450', '#c8a468', '#9c7a48'], 0.35);
  for (let y = 3; y < S; y += 4) for (let x = 0; x < S; x++) px(ctx, ox + x, oy + y, '#7a5a30');
}

function cobble(ctx, ox, oy) {
  px(ctx, ox, oy, '#858585', S);
  noise(ctx, ox, oy, ['#6e6e6e', '#9a9a9a', '#5e5e5e'], 0.7);
  for (let i = 0; i < 14; i++) {
    px(ctx, ox + Math.floor(Math.random() * (S - 1)), oy + Math.floor(Math.random() * (S - 1)), '#4a4a4a', 2);
  }
}

function ore(c) {
  return (ctx, ox, oy) => {
    stone(ctx, ox, oy);
    for (let i = 0; i < 7; i++) px(ctx, ox + Math.floor(Math.random() * (S - 2)), oy + Math.floor(Math.random() * (S - 2)), c, 2);
  };
}

function snow(ctx, ox, oy) {
  px(ctx, ox, oy, '#f2f7fa', S);
  noise(ctx, ox, oy, ['#e2ecf2', '#ffffff', '#d5e2ea'], 0.5);
}

function lamp(ctx, ox, oy) {
  px(ctx, ox, oy, '#ffcf3d', S);
  noise(ctx, ox, oy, ['#ffdf6b', '#ffb800', '#ffe89a'], 0.5);
  for (let i = 0; i < S; i++) {
    px(ctx, ox + i, oy, '#7a5a10');
    px(ctx, ox + i, oy + S - 1, '#7a5a10');
    px(ctx, ox, oy + i, '#7a5a10');
    px(ctx, ox + S - 1, oy + i, '#7a5a10');
  }
}

// Cristal: la mayor parte de la celda queda transparente (alfa 0) y
// solo se dibujan marco y brillo. Con alphaTest en el material del
// chunk, esos píxeles se descartan y se ve a través del bloque.
function glass(ctx, ox, oy) {
  ctx.clearRect(ox, oy, S, S);
  const edge = 'rgba(190,225,245,0.95)';
  for (let i = 0; i < S; i++) {
    px(ctx, ox + i, oy, edge);
    px(ctx, ox + i, oy + S - 1, edge);
    px(ctx, ox, oy + i, edge);
    px(ctx, ox + S - 1, oy + i, edge);
  }
  const shine = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < S - 4; i++) px(ctx, ox + 3 + i, oy + S - 5 - i, shine);
}

const TILES = {
  '3,2': ore('#222222'),
  '0,3': ore('#d8b090'),
  '1,2': planks,
  '2,2': cobble,
  '0,0': grassTop,
  '1,0': grassSide,
  '2,0': dirt,
  '3,0': stone,
  '0,1': logSide,
  '1,1': logTop,
  '2,1': leaves,
  '3,1': sand,
  '0,2': brick,
  '1,3': glass,
  '2,3': snow,
  '3,3': lamp,
};

export function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS_TILES * S;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (const [k, fn] of Object.entries(TILES)) {
    const [tx, ty] = k.split(',').map(Number);
    fn(ctx, tx * S, ty * S);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;

  return { texture: tex, canvas };
}

export function tileToDataURL(atlasCanvas, tx, ty, outSize = 48) {
  const c = document.createElement('canvas');
  c.width = c.height = outSize;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlasCanvas, tx * S, ty * S, S, S, 0, 0, outSize, outSize);
  return c.toDataURL();
}

/* ============================================================
   Atlas de grietas: 10 etapas progresivas tipo Minecraft
   ============================================================ */
function drawLinePixels(ctx, x0, y0, x1, y1, color) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function buildCrackAtlas() {
  const STAGE_PX = 16;
  const STAGES = 10;
  const W = STAGE_PX * STAGES;
  const H = STAGE_PX;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Pre-generar segmentos de grieta (salen del centro hacia fuera)
  const NUM_CRACKS = 16;
  const cracks = [];
  for (let i = 0; i < NUM_CRACKS; i++) {
    const startX = STAGE_PX / 2 + (Math.random() - 0.5) * STAGE_PX * 0.5;
    const startY = STAGE_PX / 2 + (Math.random() - 0.5) * STAGE_PX * 0.5;
    const angle = (i / NUM_CRACKS) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const segs = [];
    let x = startX;
    let y = startY;
    let a = angle;
    const numSegs = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numSegs; j++) {
      const stepLen = 1 + Math.random() * 1.5;
      const nx = x + Math.cos(a) * stepLen;
      const ny = y + Math.sin(a) * stepLen;
      segs.push([x, y, nx, ny]);
      x = nx;
      y = ny;
      a += (Math.random() - 0.5) * 0.9;
    }
    cracks.push({
      segs,
      appearsAt: Math.floor((i / NUM_CRACKS) * STAGES),
    });
  }

  // Dibujar cada etapa con clipping para no invadir la siguiente
  for (let s = 0; s < STAGES; s++) {
    ctx.save();
    ctx.translate(s * STAGE_PX, 0);
    ctx.beginPath();
    ctx.rect(0, 0, STAGE_PX, STAGE_PX);
    ctx.clip();

    const t = s / (STAGES - 1);
    const alpha = 0.30 + t * 0.65;

    for (const crack of cracks) {
      if (crack.appearsAt > s) continue;
      for (const seg of crack.segs) {
        drawLinePixels(
          ctx,
          seg[0], seg[1], seg[2], seg[3],
          `rgba(20,20,20,${alpha})`
        );
      }
    }

    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1 / STAGES, 1);
  tex.offset.set(0, 0);
  tex.needsUpdate = true;

  return { texture: tex, stages: STAGES };
}