const STORAGE_KEY = 'minimc.settings.v2';

const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const DEFAULTS = () => ({
  sensitivity: isTouch ? 1.2 : 1.0,
  fov: isTouch ? 80 : 75, // 80 en táctil: hFov ≈ 110-117° en 19.5:9 sin deformar
});

export class Settings {
  constructor() {
    this.values = DEFAULTS();
    this.listeners = new Set();
    this.load();
  }
  
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.sensitivity === 'number' && saved.sensitivity >= 0.2 && saved.sensitivity <= 3) {
        this.values.sensitivity = saved.sensitivity;
      }
      if (typeof saved.fov === 'number' && saved.fov >= 55 && saved.fov <= 110) {
        this.values.fov = saved.fov;
      }
    } catch (_) { /* ignorar */ }
  }
  
  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values)); } catch (_) {}
  }
  
  get(key) { return this.values[key]; }
  
  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.save();
    this.listeners.forEach(fn => fn(key, value));
  }
  
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}