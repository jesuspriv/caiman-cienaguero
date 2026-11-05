'use strict';
/* =========================================================
   objects.js — Objetos del mundo: pistas, figuritas,
   elementos interactivos, partículas y textos flotantes.
   ========================================================= */

/* ---------- Geometría ---------- */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, k) { return a + (b - a) * k; }

/* ---------- Coleccionables ---------- */
class Collectible {
  /**
   * kind: 'clue' (pista, +20) | 'figurine' (figurita de caimán, +15)
   */
  constructor(o) {
    Object.assign(this, { id: '', kind: 'figurine', clueType: null, x: 0, y: 0, name: '', text: '', r: 40, collected: false, isVisible: () => true }, o);
    this.t = Math.random() * 10;
  }
  get label() { return this.labelText || (this.kind === 'clue' ? 'Examinar' : 'Recoger'); }
  get available() { return !this.collected && this.isVisible(); }
  /** onInteract (opcional) puede devolver false para no recogerlo todavía. */
  interact(game) { if (this.onInteract && this.onInteract(game, this) === false) return; game.collect(this); }
  update(dt) { this.t += dt; }

  draw(ctx) {
    if (!this.available) return;
    const bob = Math.sin(this.t * 3) * 3;
    const x = this.x, y = this.y - 8 + bob;
    // brillo
    glow(ctx, x, y, this.kind === 'clue' ? 34 : 24, this.kind === 'clue' ? 'rgba(255,214,120,0.55)' : 'rgba(31,181,176,0.45)');
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + 2, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    if (this.kind === 'figurine') {
      drawCaiman(ctx, x, y, -0.3, 0, { wood: true, scale: 0.18, amp: 1 });
    } else if (this.clueType === 'flor') {
      drawCayena(ctx, x, y, 1.1);
    } else if (this.clueType === 'vela' && this.unlit) {
      // vela apagada
      ctx.fillStyle = '#efe3c2'; ctx.fillRect(x - 4, y - 8, 8, 16);
      ctx.fillStyle = '#d8cba6'; ctx.fillRect(x + 1, y - 8, 3, 16);
      ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 1, y - 12); ctx.stroke();
    } else if (this.clueType === 'vela') {
      drawCandle(ctx, x, y + 6, this.t, 1.2);
    } else if (this.qtype === 'coco') {
      ctx.fillStyle = '#6b4424'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#2a1a0c'; [[-2, -3], [2, -3], [0, 0]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.2, 0, Math.PI * 2); ctx.fill(); });
    } else if (this.qtype === 'red') {
      ctx.strokeStyle = '#cfc6a0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2); ctx.stroke();
      for (let k = -12; k <= 12; k += 6) { ctx.beginPath(); ctx.moveTo(x + k, y - 7); ctx.lineTo(x + k * 0.7, y + 7); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.stroke();
      ctx.fillStyle = '#8a8a8a'; for (let k = -12; k <= 12; k += 8) { ctx.beginPath(); ctx.arc(x + k, y + 8, 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else if (this.clueType === 'cinta') {
      drawRibbon(ctx, x, y, this.t);
    }
    // destellos
    const s = (this.t * 2) % 1;
    ctx.fillStyle = `rgba(255,255,255,${1 - s})`;
    ctx.fillRect(x + 10, y - 12 - s * 8, 2, 2);
    ctx.fillRect(x - 12, y - 4 - s * 6, 2, 2);
  }
}

/* ---------- Elemento interactivo genérico ---------- */
class Interactable {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, r: 46, label: 'Examinar', enabled: () => true, onInteract: () => {}, drawFn: null, hidden: false }, o);
    this.t = 0;
  }
  get available() { return !this.hidden && this.enabled(); }
  interact(game) { this.onInteract(game, this); }
  update(dt) { this.t += dt; }
  draw(ctx, game) { if (this.drawFn && !this.hidden) this.drawFn(ctx, this.t, this, game); }
}

/* ---------- Partículas ---------- */
class Particles {
  constructor() { this.list = []; }
  emit(x, y, o = {}) {
    const n = o.count || 10;
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread || Math.PI * 2) : Math.random() * Math.PI * 2;
      const sp = (o.speed || 60) * (0.4 + Math.random() * 0.8);
      this.list.push({
        x: x + (Math.random() - 0.5) * (o.jitter || 0), y: y + (Math.random() - 0.5) * (o.jitter || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: (o.life || 0.8) * (0.6 + Math.random() * 0.6), max: 0,
        size: o.size || 3, color: Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : (o.color || '#fff'),
        g: o.gravity || 0, drag: o.drag || 0.9, glow: !!o.glow, spin: o.spin ? Math.random() * 6 : 0
      });
      this.list[this.list.length - 1].max = this.list[this.list.length - 1].life;
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.vy += p.g * dt;
      const d = Math.pow(p.drag, dt * 10);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.list = this.list.filter(p => p.life > 0);
  }
  draw(ctx) {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.glow) glow(ctx, p.x, p.y, p.size * 4, p.color, a * 0.6);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.spin ? Math.max(1, p.size * Math.abs(Math.sin(p.life * 8 + p.spin))) : p.size;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - p.size / 2), s, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- Texto flotante (+20, -1 ♥ ...) ---------- */
class FloatText {
  constructor(x, y, text, color = '#f6c945') {
    this.x = x; this.y = y; this.text = text; this.color = color; this.life = 1.4;
  }
  update(dt) { this.life -= dt; this.y -= 28 * dt; }
  draw(ctx) {
    ctx.globalAlpha = Math.min(1, this.life * 1.5);
    ctx.font = '13px "Fredoka", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(this.text, this.x + 1, this.y + 1);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}
