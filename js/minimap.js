import { BLOCKS } from './config.js';

const RGB = {};
for (const id in BLOCKS) {
  const h = BLOCKS[id].color;
  RGB[id] = [1, 3, 5].map(i => parseInt(h.length === 4 ? h[(i + 1) / 2].repeat(2) : h.substr(i, 2), 16));
}

export class Minimap {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.img = this.ctx.createImageData(48, 48);
  }
  update(world, player, yaw, ents) {
    const N = 48, ox = Math.floor(player.pos.x) - 24, oz = Math.floor(player.pos.z) - 24, d = this.img.data, ctx = this.ctx;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = ox + i, z = oz + j, h = world.heightAt(x, z);
      const c = RGB[world.getBlock(x, h, z) || 3] || [120, 120, 120];
      const sh = 0.8 + Math.max(-0.25, Math.min(0.25, (h - player.pos.y) * 0.03)), k = (j * N + i) * 4;
      d[k] = c[0] * sh; d[k + 1] = c[1] * sh; d[k + 2] = c[2] * sh; d[k + 3] = 255;
    }
    ctx.putImageData(this.img, 0, 0);
    for (let rx = Math.floor(ox / 64); rx <= Math.floor((ox + N) / 64); rx++)
      for (let rz = Math.floor(oz / 64); rz <= Math.floor((oz + N) / 64); rz++) {
        const v = world.villageAt(rx, rz);
        if (v) { ctx.fillStyle = '#ff9020'; ctx.fillRect(v.x - ox - 1, v.z - oz - 1, 3, 3); }
      }
    for (const e of ents.list) {
      const x = Math.floor(e.pos.x - ox), y = Math.floor(e.pos.z - oz);
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const k = e.T.kind;
      ctx.fillStyle = k === 'zombie' ? '#f00' : k === 'villager' ? '#ff0' : k === 'wolf' ? '#bbb' : '#fff';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.save(); ctx.translate(24, 24); ctx.rotate(-yaw);
    ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(2.5, 2.5); ctx.lineTo(-2.5, 2.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
