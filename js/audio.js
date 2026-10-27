// ============================================================
// Sonido sintetizado con WebAudio — SIN archivos de audio (v9)
// ============================================================
// Cada material suena distinto: madera golpe grave, piedra ruido
// áspero, tierra/hierba suave, arena suave, cristal ping agudo,
// hojas susurro, nieve suave, lámpara clic. El AudioContext se crea
// y reanuda con el primer gesto del usuario (imprescindible en
// Safari de iPhone, que bloquea el audio hasta entonces).

const AC = (typeof window !== 'undefined')
  ? (window.AudioContext || window.webkitAudioContext || null)
  : null;

// Perfil por bloque: [tipo, frecuencia, duración, volumen]
function profileFor(id) {
  switch (id) {
    case 4: case 8: return ['wood', 150, 0.14, 0.5];   // madera, tablones
    case 3: case 9: case 10: case 11: return ['stone', 900, 0.12, 0.45]; // piedra, adoquín, menas
    case 7: return ['stone', 700, 0.12, 0.45];         // ladrillo
    case 1: case 2: return ['soft', 380, 0.14, 0.4];   // césped, tierra
    case 6: return ['sand', 1200, 0.1, 0.35];          // arena
    case 5: return ['leaves', 4000, 0.16, 0.3];        // hojas
    case 12: return ['glass', 2100, 0.35, 0.4];        // cristal
    case 13: return ['snow', 500, 0.14, 0.35];         // nieve
    case 14: return ['lamp', 1600, 0.2, 0.35];         // lámpara
    default: return ['soft', 500, 0.12, 0.4];
  }
}

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.volume = 0.8;
  }

  // Crear/reanudar el contexto. Llamar desde un gesto del usuario.
  resume() {
    if (!AC) return;
    try {
      if (!this.ctx) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (_) { /* sin audio, el juego sigue igual */ }
  }

  setVolume(v01) {
    this.volume = Math.max(0, Math.min(1, v01));
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  _ready() {
    return !!(this.ctx && this.ctx.state === 'running' && this.volume > 0);
  }

  _noiseBuffer() {
    if (this.noiseBuf) return this.noiseBuf;
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  _osc(type, freq, dur, vol, slideTo = 0) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo > 0) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _noise(dur, vol, filterType, freq, q = 1) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  _play(id, volMul, durMul = 1) {
    if (!this._ready()) return;
    const [kind, freq, dur, vol] = profileFor(id);
    const v = vol * volMul, d = dur * durMul;
    try {
      if (kind === 'wood') this._osc('triangle', freq, d, v, freq * 0.5);
      else if (kind === 'stone') this._noise(d, v, 'bandpass', freq, 1.2);
      else if (kind === 'soft') this._noise(d, v, 'lowpass', freq);
      else if (kind === 'sand') this._noise(d, v, 'highpass', freq);
      else if (kind === 'leaves') this._noise(d, v, 'highpass', freq, 0.7);
      else if (kind === 'snow') this._noise(d, v, 'lowpass', freq);
      else if (kind === 'glass') { this._osc('sine', freq, d, v); this._osc('sine', freq * 1.5, d * 0.7, v * 0.4); }
      else if (kind === 'lamp') this._osc('sine', freq, d, v, freq * 0.8);
    } catch (_) { /* un fallo de audio nunca debe romper el juego */ }
  }

  breakBlock(id) { this._play(id, 1.0); }
  placeBlock(id) { this._play(id, 0.7, 0.7); }
  step(id) { this._play(id, 0.35, 0.8); }
  hurt() {
    if (!this._ready()) return;
    try {
      this._osc('sine', 110, 0.25, 0.6, 55);
      this._noise(0.15, 0.3, 'lowpass', 300);
    } catch (_) {}
  }
}
