// ============================================================
// Cielo (v9): sol, luna, estrellas, nubes que se mueven y
// atardeceres naranjas. Se engancha al ciclo día/noche que ya
// existe en main.js (timeOfDay, 5 min por día): no lo sustituye,
// solo dibuja el cielo y devuelve el color de fondo/niebla.
// ============================================================
import * as THREE from 'three';

// Hora del juego HH:MM. t=0.25 es mediodía (dayF máximo),
// t=0 es amanecer (06:00), t=0.5 atardecer (18:00), t=0.75 medianoche.
export function formatGameTime(t) {
  const h24 = (t * 24 + 6) % 24;
  const h = Math.floor(h24);
  const m = Math.floor((h24 - h) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Pico naranja en amanecer (t≈0/1) y atardecer (t≈0.5).
function sunsetFactor(t) {
  const d = Math.min(Math.abs(t - 0.5), Math.abs(t), Math.abs(t - 1));
  return Math.max(0, 1 - d / 0.12);
}

const SKY_DAY = new THREE.Color(0x87ceeb);
const SKY_NIGHT = new THREE.Color(0x070a14);
const SKY_SUNSET = new THREE.Color(0xff7a2a);
const DAY_LEN = 0.54; // fracción del ciclo con sol visible

export class Sky {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;

    this.sun = new THREE.Mesh(
      new THREE.CircleGeometry(14, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdf6b, fog: false })
    );
    this.moon = new THREE.Mesh(
      new THREE.CircleGeometry(9, 24),
      new THREE.MeshBasicMaterial({ color: 0xdfe8f2, fog: false })
    );

    const n = 400, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI * 0.45 + 0.05;
      const r = 220;
      sp[i * 3] = Math.cos(a) * Math.cos(e) * r;
      sp[i * 3 + 1] = Math.sin(e) * r;
      sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, sizeAttenuation: false,
      transparent: true, opacity: 0, fog: false,
    }));

    this.clouds = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(30 + Math.random() * 30, 8 + Math.random() * 6),
        new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.55,
          fog: false, side: THREE.DoubleSide,
        })
      );
      m.position.set((Math.random() - 0.5) * 400, 55 + Math.random() * 25, (Math.random() - 0.5) * 400);
      m.rotation.x = -Math.PI / 2;
      this.clouds.push(m);
      this.group.add(m);
    }

    this.group.add(this.sun);
    this.group.add(this.moon);
    this.group.add(this.stars);
    this.bg = new THREE.Color();
    scene.add(this.group);
  }

  // Devuelve { bg, sunset }: color de fondo/niebla y factor de
  // atardecer (0-1) para teñir la luz ambiental en main.js.
  update(dt, timeOfDay, dayF, camPos) {
    this.group.position.set(camPos.x, 0, camPos.z);

    const sunUp = timeOfDay < DAY_LEN;
    this.sun.visible = sunUp;
    this.moon.visible = !sunUp;
    if (sunUp) {
      const f = timeOfDay / DAY_LEN;
      this.sun.position.set((1 - 2 * f) * 180, Math.sin(f * Math.PI) * 150 + 5, -40);
      this.sun.lookAt(camPos.x, camPos.y + 20, camPos.z);
    } else {
      const f = (timeOfDay - DAY_LEN) / (1 - DAY_LEN);
      this.moon.position.set((1 - 2 * f) * 170, Math.sin(f * Math.PI) * 130 + 5, -40);
      this.moon.lookAt(camPos.x, camPos.y + 20, camPos.z);
    }

    this.stars.material.opacity = Math.max(0, Math.min(1, 1 - dayF)) * 0.9;

    for (const c of this.clouds) {
      c.position.x += dt * 2;
      if (c.position.x > 220) c.position.x -= 440;
      c.material.opacity = 0.25 + 0.3 * dayF;
    }

    const sf = sunsetFactor(timeOfDay) * (dayF > 0.05 ? 1 : 0);
    this.bg.copy(SKY_NIGHT).lerp(SKY_DAY, dayF);
    if (sf > 0) this.bg.lerp(SKY_SUNSET, sf * 0.6);
    return { bg: this.bg, sunset: sf };
  }
}
