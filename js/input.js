export class Input {
  constructor(isTouch) {
    this.isTouch = isTouch;

    // Cámara
    this.lookDX = 0;
    this.lookDY = 0;

    // Joystick
    this.joyForward = 0;
    this.joyStrafe = 0;

    // Acciones de teclado / ratón
    this.keys = {};
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.run = false;

    // Ratón (desktop)
    this.mouseBreakPressed = false;
    this.mouseBreakHeld = false;
    this.mousePlacePressed = false;
    this.mousePlaceHeld = false;

    // Táctil: máquina de estados
    this.touchState = 'idle';       // 'idle' | 'pending' | 'breaking' | 'look'
    this.pendingPointer = null;
    this.pendingPos = { x: 0, y: 0 };
    this.pendingNDC = { x: 0, y: 0 };
    this.pendingStartMs = 0;
    this.lookPointer = null;
    this.lookLastX = 0;
    this.lookLastY = 0;
    this.tapNDC = null;             // consumido por main.js
    this.breakHeld = false;
    this.breakNDC = { x: 0, y: 0 };

    // Joystick
    this.joyPointer = null;
    this.joyCenter = { x: 0, y: 0 };
    this.joyMax = 45;
    this.joyZone = 130;

    this.sensitivity = 1.0;

    this.el = {
      joystick: document.getElementById('joystick'),
      knob: document.getElementById('knob'),
      btnJump: document.getElementById('btnJump'),
    };
    this.canvas = null;

    this.updateJoyCenter();
  }

  setSensitivity(n) { this.sensitivity = n; }
  setCanvas(c) { this.canvas = c; }

  updateJoyCenter() {
    const r = this.el.joystick.getBoundingClientRect();
    this.joyCenter.x = r.left + r.width / 2;
    this.joyCenter.y = r.top + r.height / 2;
    // Ajustar zona al tamaño real del joystick
    this.joyZone = r.width * 0.9;
    this.joyMax = r.width * 0.32;
  }

  inJoyZone(x, y) {
    const dx = x - this.joyCenter.x;
    const dy = y - this.joyCenter.y;
    return dx * dx + dy * dy < this.joyZone * this.joyZone;
  }

  clientToNDC(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
    };
  }

  /* ============================================================
     TECLADO
     ============================================================ */
  bindKeyboard() {
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) this.jumpPressed = true; this.jumpHeld = true; }
    });
    addEventListener('blur', () => {
      this.keys = {}; this.jumpHeld = false;
      this.mouseBreakHeld = false; this.mousePlaceHeld = false;
    });
    addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.jumpHeld = false;
    });
  }

  /* ============================================================
     RATÓN (desktop)
     ============================================================ */
  bindMouse(getCanvas) {
    const canvas = getCanvas();
    canvas.addEventListener('pointerdown', e => {
      if (this.isTouch) return;
      if (!document.pointerLockElement) return;
      if (e.button === 0) { this.mouseBreakPressed = true; this.mouseBreakHeld = true; }
      if (e.button === 2) { this.mousePlacePressed = true; this.mousePlaceHeld = true; }
    });
    canvas.addEventListener('pointerup', e => {
      if (this.isTouch) return;
      if (e.button === 0) this.mouseBreakHeld = false;
      if (e.button === 2) this.mousePlaceHeld = false;
    });
    document.addEventListener('mousemove', e => {
      if (this.isTouch) return;
      if (document.pointerLockElement !== canvas) return;
      const mx = Math.max(-150, Math.min(150, e.movementX));
      const my = Math.max(-150, Math.min(150, e.movementY));
      this.lookDX += mx * 0.0022 * this.sensitivity;
      this.lookDY += my * 0.0022 * this.sensitivity;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ============================================================
     TÁCTIL: máquina de estados
     idle → pending  (pointerdown en zona de juego)
     pending → look  (arrastre > 10px)
     pending → breaking (hold > 180ms sin arrastre)
     pending → idle+tap (release rápido)
     breaking → idle (release, cancela)
     breaking → look (arrastre, cancela)
     look → idle (release)
     ============================================================ */
  bindTouch(getCanvas) {
    this.canvas = getCanvas();
    const canvas = this.canvas;

    canvas.addEventListener('pointerdown', e => {
      if (!this.isTouch) return;
      e.preventDefault();

      // 1) ¿Joystick?
      if (this.joyPointer === null && this.inJoyZone(e.clientX, e.clientY)) {
        this.joyPointer = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        this.el.joystick.classList.add('active');
        this.updateJoystick(e.clientX, e.clientY);
        return;
      }

      // 2) ¿Ya hay un puntero de juego activo?
      if (this.pendingPointer !== null || this.lookPointer !== null) return;

      // 3) Iniciar pending
      this.pendingPointer = e.pointerId;
      this.pendingPos.x = e.clientX;
      this.pendingPos.y = e.clientY;
      this.pendingNDC = this.clientToNDC(e.clientX, e.clientY);
      this.pendingStartMs = performance.now();
      this.touchState = 'pending';
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });

    canvas.addEventListener('pointermove', e => {
      // Joystick
      if (e.pointerId === this.joyPointer) {
        this.updateJoystick(e.clientX, e.clientY);
        return;
      }

      // Pending / Breaking → detectar arrastre
      if (e.pointerId === this.pendingPointer) {
        const dx = e.clientX - this.pendingPos.x;
        const dy = e.clientY - this.pendingPos.y;
        if (dx * dx + dy * dy > 100) {   // 10px
          // Pasa a look
          if (this.touchState === 'breaking') this.cancelBreak();
          this.touchState = 'look';
          this.lookPointer = e.pointerId;
          this.pendingPointer = null;
          this.lookLastX = e.clientX;
          this.lookLastY = e.clientY;
        }
        return;
      }

      // Look
      if (e.pointerId === this.lookPointer) {
        const dx = e.clientX - this.lookLastX;
        const dy = e.clientY - this.lookLastY;
        this.lookLastX = e.clientX;
        this.lookLastY = e.clientY;
        this.lookDX += dx * 0.005 * this.sensitivity;
        this.lookDY += dy * 0.005 * this.sensitivity;
      }
    });

    const release = e => {
      // Joystick
      if (e.pointerId === this.joyPointer) {
        this.joyPointer = null;
        this.el.joystick.classList.remove('active');
        this.el.knob.style.transform = 'translate(0,0)';
        this.joyForward = 0;
        this.joyStrafe = 0;
        return;
      }

      // Pending / Breaking
      if (e.pointerId === this.pendingPointer) {
        if (this.touchState === 'pending') {
          // Tap rápido → colocar
          this.tapNDC = { ...this.pendingNDC };
        } else if (this.touchState === 'breaking') {
          // Cancelar rotura
          this.cancelBreak();
        }
        this.pendingPointer = null;
        this.touchState = 'idle';
        return;
      }

      // Look
      if (e.pointerId === this.lookPointer) {
        this.lookPointer = null;
        this.touchState = 'idle';
      }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  updateJoystick(x, y) {
    let dx = x - this.joyCenter.x;
    let dy = y - this.joyCenter.y;
    const d = Math.hypot(dx, dy);
    if (d > this.joyMax) { dx = dx / d * this.joyMax; dy = dy / d * this.joyMax; }
    this.el.knob.style.transform = `translate(${dx}px,${dy}px)`;
    let nx = dx / this.joyMax;
    let ny = dy / this.joyMax;
    if (Math.hypot(nx, ny) < 0.15) { nx = 0; ny = 0; }
    this.joyStrafe = nx;
    this.joyForward = -ny;
  }

  cancelBreak() {
    this.breakHeld = false;
  }

  /* ============================================================
     BOTÓN DE SALTO (mantener)
     ============================================================ */
  bindActionButtons() {
    const el = this.el.btnJump;
    let activeId = null;
    el.addEventListener('pointerdown', e => {
      if (activeId !== null) return;
      activeId = e.pointerId;
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.classList.add('pressed');
      this.jumpPressed = true;
      this.jumpHeld = true;
    });
    const release = e => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      el.classList.remove('pressed');
      this.jumpHeld = false;
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ============================================================
     LLAMADO CADA FRAME
     ============================================================ */
  bindDescend() {
    const el = document.getElementById('btnDown');
    let id = null;
    el.addEventListener('pointerdown', e => {
      if (id !== null) return;
      id = e.pointerId; e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.classList.add('pressed'); this.descendHeld = true;
    });
    const rel = e => { if (e.pointerId !== id) return; id = null; el.classList.remove('pressed'); this.descendHeld = false; };
    el.addEventListener('pointerup', rel);
    el.addEventListener('pointercancel', rel);
  }

  update(dt) {
    if (!this.isTouch) return;

    // Pending → breaking tras 180ms sin arrastre
    if (this.touchState === 'pending') {
      if (performance.now() - this.pendingStartMs > 180) {
        this.touchState = 'breaking';
        this.breakHeld = true;
        this.breakNDC = { ...this.pendingNDC };
      }
    }
  }

  takeTap() {
    const t = this.tapNDC;
    this.tapNDC = null;
    return t;
  }

  consumeLook() {
    const d = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return d;
  }

  readMovement() {
    this.moveForward  = !!(this.keys['KeyW'] || this.keys['ArrowUp']);
    this.moveBackward = !!(this.keys['KeyS'] || this.keys['ArrowDown']);
    this.moveRight    = !!(this.keys['KeyD'] || this.keys['ArrowRight']);
    this.moveLeft     = !!(this.keys['KeyA'] || this.keys['ArrowLeft']);
    this.run = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.descend = this.run || !!this.descendHeld;
  }
}