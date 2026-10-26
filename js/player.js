import * as THREE from 'three';
import { PLAYER } from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(0.5, 20, 0.5);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.spawn = new THREE.Vector3();
    this.flying = false;
  }

  setSpawn(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.spawn.set(x, y, z);
  }

  collides(px, py, pz) {
    const r = PLAYER.radius;
    const h = PLAYER.height;
    const x0 = Math.floor(px - r), x1 = Math.floor(px + r - 1e-6);
    const y0 = Math.floor(py + 1e-6), y1 = Math.floor(py + h - 1e-6);
    const z0 = Math.floor(pz - r), z1 = Math.floor(pz + r - 1e-6);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++)
          if (this.world.getBlock(x, y, z)) return true;
    return false;
  }

  moveAxis(axis, delta) {
    if (delta === 0) return;
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.2));
    const inc = delta / steps;
    for (let i = 0; i < steps; i++) {
      this.pos[axis] += inc;
      if (this.collides(this.pos.x, this.pos.y, this.pos.z)) {
        this.pos[axis] -= inc;
        if (axis === 'y') {
          if (inc < 0) { this.onGround = true; this.coyoteTimer = PLAYER.coyoteTime; }
          this.vel.y = 0;
        } else {
          this.vel[axis] = 0;
        }
        return;
      }
    }
  }

  update(dt, input, yaw) {
    let fw = 0, sd = 0;
    if (input.moveForward)  fw += 1;
    if (input.moveBackward) fw -= 1;
    if (input.moveRight)    sd += 1;
    if (input.moveLeft)     sd -= 1;

    fw += input.joyForward;
    sd += input.joyStrafe;

    const mag = Math.hypot(fw, sd);
    if (mag > 1) { fw /= mag; sd /= mag; }

    const sinY = Math.sin(yaw), cosY = Math.cos(yaw);
    let dx = -sinY * fw + cosY * sd;
    let dz = -cosY * fw - sinY * sd;
    const len = Math.hypot(dx, dz);
    if (len > 0) { dx /= len; dz /= len; }

    let speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (this.flying) speed = 12;
    this.vel.x = dx * speed;
    this.vel.z = dz * speed;

    this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if (input.jumpPressed || input.jumpHeld) this.jumpBufferTimer = PLAYER.jumpBuffer;
    if (!this.flying && this.jumpBufferTimer > 0 && (this.onGround || this.coyoteTimer > 0)) {
      this.vel.y = PLAYER.jumpVelocity;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    if (this.flying) {
      this.vel.y = ((input.jumpHeld ? 1 : 0) - (input.descend ? 1 : 0)) * 9;
    } else {
      this.vel.y -= PLAYER.gravity * dt;
      if (this.vel.y < PLAYER.maxFallSpeed) this.vel.y = PLAYER.maxFallSpeed;
    }

    this.onGround = false;
    this.moveAxis('x', this.vel.x * dt);
    this.moveAxis('z', this.vel.z * dt);
    this.moveAxis('y', this.vel.y * dt);

    if (this.flying && this.onGround) this.flying = false;
    if (this.pos.y < -20) {
      this.pos.copy(this.spawn);
      this.vel.set(0, 0, 0);
    }
  }
}