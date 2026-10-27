// ============================================================
// Partículas (v9): pool de THREE.Points con el color del bloque.
// Se usa al romper y colocar bloques (jugador y aldeanos).
// ============================================================
import * as THREE from 'three';

const MAX = 600;

export class Particles {
  constructor(scene) {
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    for (let i = 0; i < MAX; i++) this.positions[i * 3 + 1] = -100;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({
      size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.cursor = 0;
    scene.add(this.points);
  }

  spawn(x, y, z, hex, count = 12) {
    const c = new THREE.Color(hex);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      this.positions[i * 3] = x + (Math.random() - 0.5) * 0.7;
      this.positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.7;
      this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.7;
      this.vel[i * 3] = (Math.random() - 0.5) * 3.5;
      this.vel[i * 3 + 1] = Math.random() * 3.5 + 1;
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
      this.life[i] = 0.5 + Math.random() * 0.4;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.positions[i * 3 + 1] = -100; continue; }
      this.vel[i * 3 + 1] -= 12 * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    if (any) this.geo.attributes.position.needsUpdate = true;
  }
}
