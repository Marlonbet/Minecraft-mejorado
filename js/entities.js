import * as THREE from 'three';
import { VILLAGER_TYPE, createVillagerData, updateVillager, JOBS } from './villagers.js';

export const CHARACTERS = [
  { id: 'explorador', name: 'Explorador', skin: '#c68b6a', hair: '#3a2a1a', shirt: '#2aa7a7', pants: '#3a3a9a' },
  { id: 'aventurera', name: 'Aventurera', skin: '#e0b090', hair: '#b5532a', shirt: '#9a3ab0', pants: '#2a2a50' },
  { id: 'robot', name: 'Robot', skin: '#aab4bd', hair: '#6a7680', shirt: '#546270', pants: '#37424c', eyes: '#ff3030' },
  { id: 'ninja', name: 'Ninja', skin: '#d9b99b', hair: '#111111', shirt: '#1a1a1a', pants: '#222222' },
  { id: 'aleatorio', name: 'Aleatorio', random: true },
];
export function randomChar() {
  const pick = a => a[Math.floor(Math.random() * a.length)], hue = () => Math.floor(Math.random() * 360);
  return {
    skin: pick(['#f1c8a0', '#c68b6a', '#8d5a3b', '#6fbf73', '#aab4bd']),
    hair: `hsl(${hue()},50%,30%)`, shirt: `hsl(${hue()},60%,45%)`, pants: `hsl(${hue()},45%,30%)`,
    eyes: Math.random() < 0.3 ? '#ff3030' : '#222222',
  };
}

const mk = mats => (w, h, d, c, x, y, z) => {
  const m = new THREE.MeshLambertMaterial({ color: c });
  mats.push(m);
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
};

// Humanoide más detallado: torso, cabeza, cabello, ojos con blanco+pupila,
// cejas, boca, cuello, mangas, pantalones y zapatos.
export function humanoid(p, zombie = false) {
  const g = new THREE.Group(), mats = [], B = mk(mats);
  const skin = p.skin || '#c68b6a';
  const hair = p.hair || '#3a2a1a';
  const shirt = p.shirt || '#2aa7a7';
  const pants = p.pants || '#3a3a9a';
  const eyeC = p.eyes || '#222222';
  const shoe = zombie ? '#2a3a2a' : '#1a1a1a';

  // Torso + cuello
  g.add(B(0.52, 0.72, 0.28, shirt, 0, 1.14, 0));
  g.add(B(0.18, 0.12, 0.18, skin, 0, 1.56, 0)); // cuello
  // Cuello de la camisa
  g.add(B(0.54, 0.08, 0.30, shirt, 0, 1.48, 0));

  // Cabeza
  g.add(B(0.48, 0.48, 0.48, skin, 0, 1.82, 0));

  // Cabello (gorro + flequillo)
  g.add(B(0.50, 0.16, 0.50, hair, 0, 2.08, 0));
  g.add(B(0.50, 0.28, 0.12, hair, 0, 1.90, 0.20)); // flequillo
  if (!zombie) g.add(B(0.50, 0.22, 0.10, hair, 0, 1.86, -0.22)); // nuca

  // Ojos realistas: blanco + pupila + ceja
  g.add(B(0.11, 0.08, 0.04, '#f5f5f5', -0.12, 1.84, -0.24));
  g.add(B(0.11, 0.08, 0.04, '#f5f5f5',  0.12, 1.84, -0.24));
  g.add(B(0.055, 0.055, 0.045, eyeC, -0.12, 1.84, -0.255));
  g.add(B(0.055, 0.055, 0.045, eyeC,  0.12, 1.84, -0.255));
  // Cejas
  g.add(B(0.12, 0.03, 0.03, hair, -0.12, 1.92, -0.24));
  g.add(B(0.12, 0.03, 0.03, hair,  0.12, 1.92, -0.24));
  // Boca
  g.add(B(0.14, 0.035, 0.03, zombie ? '#3a1a1a' : '#8a4a4a', 0, 1.70, -0.24));

  // Brazos (hombro + antebrazo)
  const limb = (col, x, y, isArm) => {
    const pv = new THREE.Group();
    pv.position.set(x, y, 0);
    pv.add(B(0.22, 0.70, 0.22, col, 0, -0.35, 0));
    if (isArm) {
      // manga corta
      pv.add(B(0.24, 0.22, 0.24, shirt, 0, -0.08, 0));
      // mano
      pv.add(B(0.18, 0.12, 0.18, skin, 0, -0.72, 0));
    } else {
      // zapato
      pv.add(B(0.24, 0.12, 0.28, shoe, 0, -0.72, 0.02));
    }
    g.add(pv);
    return pv;
  };
  const arms = [limb(skin, -0.37, 1.48, true), limb(skin, 0.37, 1.48, true)];
  const legs = [limb(pants, -0.13, 0.78, false), limb(pants, 0.13, 0.78, false)];

  if (zombie) {
    arms[0].rotation.x = arms[1].rotation.x = -1.35;
    // Manchas de zombi
    g.add(B(0.12, 0.12, 0.06, '#3a5a3a', -0.15, 1.78, -0.22));
    g.add(B(0.10, 0.08, 0.06, '#2a4a2a', 0.18, 1.65, -0.22));
  }
  return { group: g, mats, arms, legs, quad: false };
}

function quad(q) {
  const g = new THREE.Group(), mats = [], B = mk(mats);
  const bodyY = q.leg + q.h / 2;
  // Cuerpo
  g.add(B(q.w, q.h, q.l, q.c, 0, bodyY, 0));
  // Cabeza
  g.add(B(q.hs, q.hs, q.hs, q.c, 0, q.leg + q.h + q.hs * 0.35, -(q.l / 2 + q.hs / 2 - 0.04)));
  // Ojos del animal
  const eyeY = q.leg + q.h + q.hs * 0.4;
  const eyeZ = -(q.l / 2 + q.hs / 2 - 0.02);
  g.add(B(0.08, 0.07, 0.04, '#111', -q.hs * 0.22, eyeY, eyeZ - 0.02));
  g.add(B(0.08, 0.07, 0.04, '#111',  q.hs * 0.22, eyeY, eyeZ - 0.02));
  // Orejas / hocico simples según tamaño
  if (q.hs > 0.3) {
    g.add(B(0.08, 0.12, 0.06, q.c, -q.hs * 0.28, eyeY + 0.12, eyeZ + 0.05));
    g.add(B(0.08, 0.12, 0.06, q.c,  q.hs * 0.28, eyeY + 0.12, eyeZ + 0.05));
  }
  // Patas
  const legs = [[-1, -1], [1, 1], [1, -1], [-1, 1]].map(([sx, sz]) => {
    const pv = new THREE.Group();
    pv.position.set(sx * (q.w / 2 - 0.08), q.leg, sz * (q.l / 2 - 0.1));
    pv.add(B(0.14, q.leg, 0.14, q.c, 0, -q.leg / 2, 0));
    g.add(pv);
    return pv;
  });
  return { group: g, mats, arms: [], legs, quad: true };
}

const ZOMBIE = { skin: '#5a8a4a', hair: '#2a4a2a', shirt: '#2a6a8a', pants: '#2a2a6a', eyes: '#ff2020' };
// Cada especie tiene su propio comportamiento (ver update)
const TYPES = {
  pig:     { q: { c: '#f0a0a8', w: .6, h: .55, l: .9, leg: .3, hs: .4 }, hp: 10, sp: 1.4, kind: 'animal' },
  sheep:   { q: { c: '#eeeeee', w: .6, h: .6, l: .9, leg: .4, hs: .4 }, hp: 8, sp: 1.3, kind: 'animal', follow: 1 },
  chicken: { q: { c: '#ffffff', w: .3, h: .35, l: .4, leg: .3, hs: .2 }, hp: 4, sp: 2, kind: 'animal', flee: 1 },
  wolf:    { q: { c: '#9a9a9a', w: .5, h: .5, l: .9, leg: .5, hs: .4 }, hp: 16, sp: 2.8, kind: 'wolf' },
  zombie:  { hp: 20, sp: 2.2, kind: 'zombie', h: true },
  villager: VILLAGER_TYPE,
};

export class Entities {
  constructor(scene, world) {
    this.scene = scene; this.world = world; this.list = [];
    this.villages = new Set(); this.t = 0; this.spawnT = 0;
    this.buildSites = []; // sitios reservados por la IA de aldeanos
  }

  add(type, x, z) {
    const T = TYPES[type], w = this.world, ix = Math.floor(x), iz = Math.floor(z);
    const y = w.heightAt(ix, iz) + 1;
    if (w.getBlock(ix, y, iz) || w.getBlock(ix, y + 1, iz)) return;
    const m = T.q ? quad(T.q) : humanoid(T.pal || ZOMBIE, type === 'zombie');
    m.group.position.set(x, y, z);
    this.scene.add(m.group);
    const e = {
      type, T, m, g: m.group, pos: m.group.position, vy: 0, hp: T.hp,
      timer: 0, wa: null, cd: 0, flash: 0, kx: 0, kz: 0,
      home: { x, z }, ph: Math.random() * 6,
    };
    if (type === 'villager') {
      const existingJobs = this.list.filter(v => v.type === 'villager').map(v => v.jobId).filter(Boolean);
      Object.assign(e, createVillagerData(x, z, existingJobs));
      // Color de camisa según oficio (jerarquía visible)
      const job = JOBS[e.jobId];
      if (job && e.m.mats && e.m.mats[0]) e.m.mats[0].color.set(job.color);
    }
    this.list.push(e);
  }

  trySpawn(px, pz, dayF) {
    const w = this.world, a = Math.random() * 6.283, r = 18 + Math.random() * 22;
    const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r, ix = Math.floor(x), iz = Math.floor(z), h = w.heightAt(ix, iz);
    if (dayF > 0.4 && this.list.filter(e => !e.T.h).length < 18 && w.getBlock(ix, h, iz) === 1) {
      const t = Math.random();
      this.add(t < 0.3 ? 'pig' : t < 0.6 ? 'sheep' : t < 0.9 ? 'chicken' : 'wolf', x, z);
    }
    if (dayF < 0.3 && h > 9 && this.list.filter(e => e.type === 'zombie').length < 8) this.add('zombie', x, z);
    const rx0 = Math.floor(px / 64), rz0 = Math.floor(pz / 64);
    for (let rx = rx0 - 1; rx <= rx0 + 1; rx++) for (let rz = rz0 - 1; rz <= rz0 + 1; rz++) {
      const v = w.villageAt(rx, rz), key = rx + ',' + rz;
      if (v && !this.villages.has(key) && Math.hypot(v.x - px, v.z - pz) < 60) {
        this.villages.add(key);
        // Registrar las 4 casas pregeneradas para que la IA no construya encima
        for (const [ox, oz] of [[-10, -10], [4, -10], [-10, 4], [4, 4]]) {
          this.buildSites.push({ x: v.x + ox, z: v.z + oz, w: 6, d: 6 });
        }
        for (let i = 0; i < 8; i++) {
          this.add('villager', v.x + Math.floor(Math.random() * 9) - 4 + .5, v.z + Math.floor(Math.random() * 9) - 4 + .5);
        }
      }
    }
  }

  attack(o, dir, dmg) {
    let best = null, bd = 3.8;
    for (const e of this.list) {
      const vx = e.pos.x - o.x, vy = e.pos.y + .9 - o.y, vz = e.pos.z - o.z, d = Math.hypot(vx, vy, vz);
      if (d < bd && (vx * dir.x + vy * dir.y + vz * dir.z) / d > 0.85) { best = e; bd = d; }
    }
    if (!best) return false;
    best.hp -= dmg; best.flash = .2; best.wa = null;
    best.m.mats.forEach(x => x.emissive.setHex(0x661111));
    const dx = best.pos.x - o.x, dz = best.pos.z - o.z, l = Math.hypot(dx, dz) || 1;
    best.kx = dx / l * 6; best.kz = dz / l * 6;
    return true;
  }

  update(dt, pl, dayF, hurt) {
    this.t += dt;
    const w = this.world, px = pl.pos.x, pz = pl.pos.z;
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 1.5; this.trySpawn(px, pz, dayF); }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i], T = e.T, k = T.kind;
      const dx = px - e.pos.x, dz = pz - e.pos.z, d = Math.hypot(dx, dz) || 1e-3;
      if (k === 'zombie' && dayF > 0.5) e.hp -= dt;          // se quema con el sol
      if (d > 90 || e.hp <= 0 || e.pos.y < -10) { this.scene.remove(e.g); this.list.splice(i, 1); continue; }
      e.cd -= dt; e.timer -= dt;
      if (e.thinkT !== undefined) e.thinkT -= dt;
      let mx = 0, mz = 0, sp = 0;

      // --- IA de aldeanos (módulo dedicado: villagers.js) ---
      if (k === 'villager') {
        const buildingCount = this.list.filter(x => x.job === 'build').length;
        const move = updateVillager(e, dt, {
          world: w,
          buildSites: this.buildSites,
          buildingCount,
          dayF,
        });
        mx = move.mx; mz = move.mz; sp = move.sp;
      } else if (k === 'zombie' || (k === 'wolf' && dayF < 0.3)) {   // cazadores
        if (d < 24) {
          // Mantener distancia de ataque ~1.4–1.8 para no quedarse "pegados"/frizados
          const ideal = 1.55;
          if (d > ideal + 0.35) {
            mx = dx / d; mz = dz / d; sp = T.sp;
          } else if (d < ideal - 0.25) {
            mx = -dx / d; mz = -dz / d; sp = T.sp * 0.55;
          } else {
            mx = 0; mz = 0; sp = 0;
            if (Math.random() < 0.02) e.wa = Math.atan2(dz, dx) + (Math.random() - 0.5) * 1.2;
          }
          if (d < 1.9 && e.cd <= 0) {
            hurt(k === 'zombie' ? 3 : 2); // en creativo no hace daño
            e.cd = 1.05;
          }
        }
      } else if (T.flee && d < 7) { mx = -dx / d; mz = -dz / d; sp = T.sp; }
      else if (T.follow && d < 9 && d > 2.5) { mx = dx / d; mz = dz / d; sp = T.sp * .6; }
      else if (!sp) { // vagar (animales)
        if (e.timer <= 0) {
          e.timer = 2 + Math.random() * 4;
          e.wa = Math.random() < .35 ? null : Math.random() * 6.28;
        }
        if (e.wa !== null) { mx = Math.cos(e.wa); mz = Math.sin(e.wa); sp = T.sp * .5; }
      }
      const nx = e.pos.x + (mx * sp + e.kx) * dt, nz = e.pos.z + (mz * sp + e.kz) * dt;
      e.kx *= .85; e.kz *= .85;
      const fy = Math.floor(e.pos.y + .01);

      // Movimiento con deslizamiento en ejes (evita quedar atrapado contra paredes)
      const tryMove = (px, pz) => {
        const fx = Math.floor(px), fz = Math.floor(pz);
        if (!w.getBlock(fx, fy, fz) && !w.getBlock(fx, fy + 1, fz)) {
          e.pos.x = px; e.pos.z = pz;
          return true;
        }
        // Subir un escalón
        if (!w.getBlock(fx, fy + 1, fz) && !w.getBlock(fx, fy + 2, fz) && w.getBlock(fx, fy, fz)) {
          e.pos.x = px; e.pos.z = pz; e.pos.y = fy + 1;
          return true;
        }
        return false;
      };

      if (!tryMove(nx, nz)) {
        // Intentar solo X o solo Z (deslizar)
        if (!tryMove(nx, e.pos.z) && !tryMove(e.pos.x, nz)) {
          e.wa = null;
          e.timer = 0.25;
          // Pequeño impulso aleatorio para no quedarse frizado
          if (k === 'villager') {
            e.wa = Math.random() * Math.PI * 2;
            e.timer = 0.6;
          }
        }
      }
      if (e.flying) {
        // La altura la gestiona villagers.js (applyFlight); sin gravedad
        e.vy = 0;
      } else {
        const gy = Math.floor(e.pos.y - .05);
        if (w.getBlock(Math.floor(e.pos.x), gy, Math.floor(e.pos.z))) { e.pos.y = gy + 1; e.vy = 0; }
        else { e.vy -= 20 * dt; e.pos.y += e.vy * dt; }
      }
      if (sp > .01) {
        const a = Math.atan2(-mx, -mz), r = e.g.rotation.y;
        e.g.rotation.y = r + Math.atan2(Math.sin(a - r), Math.cos(a - r)) * Math.min(1, dt * 8);
      }
      const s = sp > .01 ? Math.sin(this.t * sp * 4 + e.ph) * .6 : 0, L = e.m.legs, A = e.m.arms;
      if (e.m.quad) { L[0].rotation.x = L[1].rotation.x = s; L[2].rotation.x = L[3].rotation.x = -s; }
      else {
        L[0].rotation.x = s; L[1].rotation.x = -s;
        if (k === 'zombie') { /* brazos ya fijos */ }
        else if (e.job === 'build' && e.build && e.build.placeCd > 0.15) {
          // Animación de construir: brazos arriba
          A[0].rotation.x += (-0.95 - A[0].rotation.x) * Math.min(1, dt * 10);
          A[1].rotation.x += (-0.7 - A[1].rotation.x) * Math.min(1, dt * 10);
        } else {
          A[0].rotation.x = -s; A[1].rotation.x = s;
        }
      }
      if (e.flash > 0 && (e.flash -= dt) <= 0) e.m.mats.forEach(x => x.emissive.setHex(0));
    }
  }
}
