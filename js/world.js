import * as THREE from 'three';
import { CHUNK_SIZE as CS, WORLD_Y as H } from './config.js';
import { buildChunkMesh } from './chunks.js';

const KEY = 'minimc.world.v3', R = 64, BEACH = 9, PEAK = 24;
const ck = (x, z) => x * 2000003 + z;
const HOUSES = [[-10, -10], [4, -10], [-10, 4], [4, 4]];

export class VoxelWorld {
  constructor(renderDist = 5) {
    this.sizeX = this.sizeZ = Infinity;
    this.height = H;
    this.chunks = new Map();
    this.vcache = new Map();
    this.rd = renderDist;
    this.edits = {};
    this.timer = 0;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
    this.seed = (s && Number.isInteger(s.seed)) ? s.seed : Math.floor(Math.random() * 2 ** 31);
    if (s && s.edits) this.edits = s.edits;
  }
  init(scene, material) { this.scene = scene; this.material = material; }
  inBounds(x, y, z) { return y >= 0 && y < H; }

  hash(x, y, z) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(this.seed, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  n2(x, z, l) {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = this.hash(xi, l, zi), b = this.hash(xi + 1, l, zi), c = this.hash(xi, l, zi + 1), d = this.hash(xi + 1, l, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  n3(x, y, z) {
    const yi = Math.floor(y), f = y - yi, t = f * f * (3 - 2 * f);
    const a = this.n2(x, z, yi);
    return a + (this.n2(x, z, yi + 1) - a) * t;
  }
  baseHeight(x, z) {
    const n = this.n2(x / 48, z / 48, 0) * 0.6 + this.n2(x / 20, z / 20, 1) * 0.3 + this.n2(x / 8, z / 8, 2) * 0.1;
    return Math.floor(Math.max(2, Math.min(H - 10, 13 + (n - 0.5) * 36)));
  }
  // Aldeas: como mucho una por región de 64×64, siempre en tierra firme
  villageAt(rx, rz) {
    const k = ck(rx, rz);
    if (this.vcache.has(k)) return this.vcache.get(k);
    let v = null;
    if (this.hash(rx * 7 + 1, 5, rz * 13 + 2) < 0.5) {
      const x = rx * R + 16 + Math.floor(this.hash(rx, 6, rz) * 32);
      const z = rz * R + 16 + Math.floor(this.hash(rx, 7, rz) * 32);
      const b = this.baseHeight(x, z);
      if (b > BEACH + 2 && b < PEAK - 2) v = { x, z, h: b };
    }
    this.vcache.set(k, v);
    return v;
  }
  villageNear(x, z) { return this.villageAt(Math.floor(x / R), Math.floor(z / R)); }
  getHeight(x, z) {
    const v = this.villageNear(x, z);
    if (v && Math.abs(x - v.x) <= 14 && Math.abs(z - v.z) <= 14) return v.h;
    return this.baseHeight(x, z);
  }

  put(c, x, y, z, t, onlyAir) {
    const lx = x - c.cx * CS, lz = z - c.cz * CS;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS || y < 0 || y >= H) return;
    const i = (y * CS + lz) * CS + lx;
    if (onlyAir && c.data[i]) return;
    c.data[i] = t;
  }

  gen(cx, cz) {
    const data = new Uint8Array(CS * H * CS), hm = new Uint8Array(CS * CS);
    const c = { data, hm, cx, cz, mesh: null, dirty: true };
    const x0 = cx * CS, z0 = cz * CS;
    for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
      const x = x0 + lx, z = z0 + lz, h = this.getHeight(x, z);
      hm[lz * CS + lx] = h;
      for (let y = 0; y <= h; y++) {
        let t;
        if (y === h) t = h <= BEACH ? 6 : (h >= PEAK ? 3 : 1);
        else if (y >= h - 3) t = h <= BEACH ? 6 : 2;
        else {
          t = 3;
          const r = this.hash(x + 977, y, z + 313);
          if (r < 0.012) t = 10; else if (y < 14 && r > 0.994) t = 11;
        }
        if (y > 2 && y < h - 1 && this.n3(x * 0.09, y * 0.12, z * 0.09) > 0.68) continue;
        data[(y * CS + lz) * CS + lx] = t;
      }
    }
    // Árboles (deterministas; se estampan solo los bloques de este chunk)
    for (let x = x0 - 2; x < x0 + CS + 2; x++) for (let z = z0 - 2; z < z0 + CS + 2; z++) {
      if (this.hash(x, 77, z) >= 0.012) continue;
      const h = this.getHeight(x, z), v = this.villageNear(x, z);
      if (h <= BEACH || h >= PEAK || (v && Math.abs(x - v.x) <= 16 && Math.abs(z - v.z) <= 16)) continue;
      const th = 4 + Math.floor(this.hash(x, 78, z) * 2);
      for (let i = 1; i <= th; i++) this.put(c, x, h + i, z, 4);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = -1; dy <= 1; dy++)
        if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) <= 3) this.put(c, x + dx, h + th + dy, z + dz, 5, true);
      this.put(c, x, h + th + 1, z, 5, true);
    }
    // Aldea de esta región: 4 casas de tablones/adoquín con puerta y ventanas
    const v = this.villageAt(Math.floor(x0 / R), Math.floor(z0 / R));
    if (v) for (const [ox, oz] of HOUSES) {
      const hx = v.x + ox, hz = v.z + oz;
      for (let dx = 0; dx < 6; dx++) for (let dz = 0; dz < 6; dz++) {
        const x = hx + dx, z = hz + dz, edge = dx === 0 || dx === 5 || dz === 0 || dz === 5;
        const corner = (dx === 0 || dx === 5) && (dz === 0 || dz === 5);
        this.put(c, x, v.h, z, 8);
        for (let y = 1; y <= 3; y++) {
          let t = edge ? (corner ? 4 : 9) : 0;
          if (dz === 0 && (dx === 2 || dx === 3) && y <= 2) t = 0;
          if (y === 2 && edge && !corner && (((dx === 0 || dx === 5) && dz === 2) || (dz === 5 && dx === 2))) t = 0;
          this.put(c, x, v.h + y, z, t);
        }
        this.put(c, x, v.h + 4, z, 8);
      }
    }
    const e = this.edits[cx + ',' + cz];
    if (e) for (const i in e) data[i] = e[i];
    return c;
  }

  getChunk(cx, cz) {
    const k = ck(cx, cz);
    let c = this.chunks.get(k);
    if (!c) { c = this.gen(cx, cz); this.chunks.set(k, c); }
    return c;
  }
  getBlock(x, y, z) {
    if (y < 0 || y >= H) return 0;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    return this.getChunk(cx, cz).data[(y * CS + (z - cz * CS)) * CS + (x - cx * CS)];
  }
  heightAt(x, z) {
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    return this.getChunk(cx, cz).hm[(z - cz * CS) * CS + (x - cx * CS)];
  }
  setBlock(x, y, z, type) {
    if (y < 0 || y >= H) return;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS), c = this.getChunk(cx, cz);
    const lx = x - cx * CS, lz = z - cz * CS, i = (y * CS + lz) * CS + lx;
    if (c.data[i] === type) return;
    c.data[i] = type;
    (this.edits[cx + ',' + cz] ||= {})[i] = type;
    this.scheduleSave();
    c.dirty = true;
    const nb = (a, b) => { const n = this.chunks.get(ck(a, b)); if (n) n.dirty = true; };
    if (lx === 0) nb(cx - 1, cz);
    if (lx === CS - 1) nb(cx + 1, cz);
    if (lz === 0) nb(cx, cz - 1);
    if (lz === CS - 1) nb(cx, cz + 1);
  }
  // v7: el guardado automático va al sistema de mundos (main.js pone
  // aquí su función). Sin handler, se mantiene el guardado antiguo de
  // un solo mundo, para no romper nada si se usa el mundo sin main.
  saveHandler = null;
  scheduleSave() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.saveHandler) { try { this.saveHandler(); } catch (_) {} return; }
      try { localStorage.setItem(KEY, JSON.stringify({ seed: this.seed, edits: this.edits })); } catch (_) {}
    }, 800);
  }
  resetSave() {
    clearTimeout(this.timer);
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  // Streaming de chunks alrededor del jugador
  update(px, pz, budget = 2) {
    const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS), r = this.rd, need = [];
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++)
      if (dx * dx + dz * dz <= r * r + 1) need.push([dx * dx + dz * dz, pcx + dx, pcz + dz]);
    need.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cz] of need) {
      const c = this.getChunk(cx, cz);
      if (c.mesh && !c.dirty) continue;
      if (budget-- <= 0) break;
      const geo = buildChunkMesh(this, cx, cz);
      if (!c.mesh) { c.mesh = new THREE.Mesh(geo, this.material); this.scene.add(c.mesh); }
      else { c.mesh.geometry.dispose(); c.mesh.geometry = geo; }
      c.dirty = false;
    }
    for (const [k, c] of this.chunks) {
      if (Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz)) <= r + 3) continue;
      if (c.mesh) { this.scene.remove(c.mesh); c.mesh.geometry.dispose(); }
      this.chunks.delete(k);
    }
  }
}
