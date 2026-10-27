import { BLOCKS, BLOCK_IDS } from './config.js';
import { tileToDataURL } from './textures.js';

export class HUD {
  constructor(atlasCanvas) {
    this.atlasCanvas = atlasCanvas;
    this.hotbarEl = document.getElementById('hotbar');
    this.hudEl = document.getElementById('hud');
    this.selected = 0;
    this.slots = [];
    this.onSelect = null;
    this.buildHotbar();
  }
  
  buildHotbar() {
    BLOCK_IDS.forEach((id, i) => {
      const def = BLOCKS[id];
      const tile = def.textures[def.preview] || def.textures.all;
      const dataURL = tileToDataURL(this.atlasCanvas, tile[0], tile[1], 64);
      
      const el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML = `<b>${i + 1}</b><span class="swatch" style="background-image:url('${dataURL}')"></span><i class="count"></i>`;
      
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        this.select(i);
        if (navigator.vibrate) navigator.vibrate(8);
      });
      
      this.hotbarEl.appendChild(el);
      this.slots.push(el);
    });
    this.select(0);
  }
  
  select(i) {
    this.selected = i;
    this.slots.forEach((el, j) => el.classList.toggle('active', j === i));
    if (this.onSelect) this.onSelect(i);
  }
  
  setSelected(i) { this.select(i); }

  setCounts(inv, creative) {
    this.slots.forEach((el, i) => {
      const c = el.querySelector('.count');
      const t = creative ? '' : String(inv[BLOCK_IDS[i]] || '');
      if (c.textContent !== t) c.textContent = t;
    });
  }
  
  update(player, blockName, fps = 0, extra = '', clock = '') {
    this.hudEl.textContent =
      `X ${player.pos.x.toFixed(1)}  Y ${player.pos.y.toFixed(1)}  Z ${player.pos.z.toFixed(1)}\n` +
      `${blockName}  ·  ${Math.round(fps)} FPS${player.flying ? '  ·  Volando' : ''}${clock ? '  ·  🕐 ' + clock : ''}` +
      (extra ? `\n${extra}` : '');
  }
}