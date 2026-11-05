'use strict';
/* =========================================================
   canoe.js — Minijuego de la canoa (escena 6).
   Mateo acompaña a los pescadores que salen a buscar a Tomasita.
   La canoa avanza sola; con ◀ ▶ se esquivan troncos, raíces de
   mangle y las ondas del caimán, y se recogen las velas flotantes.
   ========================================================= */

const CANOE_TIME = 32;

class CanoeGame {
  constructor(game, onDone) {
    this.game = game; this.onDone = onDone;
    this.t = 0; this.x = 480; this.vx = 0;
    this.scroll = 0; this.speed = 130;
    this.objs = []; this.spawnT = 1.2;
    this.lights = 0; this.hits = 0; this.inv = 0; this.shake = 0;
    this.done = false; this.msg = null;
    this.foam = [];
  }
  key() { return false; }          // las flechas mueven la canoa (game.input)
  hit() {}

  /** Orillas del río a cierta altura de pantalla (se curvan al avanzar). */
  /** Para la capa de efectos: el agua está entre las dos orillas. */
  waterMask(c) {
    for (let y = 70; y < this.game.H + 10; y += 10) { const [l, r] = this.banks(y); c.fillRect(l, y, r - l, 10); }
    // los textos no se ondulan
    c.fillStyle = '#000';
    if (this.t < 3) c.fillRect(150, 232, 660, 40);
    if (this.msg) c.fillRect(this.x - 200, 320, 400, 44);
  }

  banks(y) {
    const k = (this.scroll - y) * 0.004;
    const c = 480 + Math.sin(k) * 110 + Math.sin(k * 2.3) * 40;
    const w = 300 + Math.sin(k * 0.7 + 1) * 50;
    return [c - w, c + w];
  }

  spawn() {
    const [l, r] = this.banks(-40);
    const x = l + 40 + Math.random() * (r - l - 80);
    const roll = Math.random(), late = this.t > 12;
    let o;
    if (roll < 0.34) o = { type: 'vela', x, y: -40, r: 16 };
    else if (roll < 0.62) o = { type: 'tronco', x, y: -40, r: 30, a: (Math.random() - 0.5) * 0.6 };
    else if (roll < 0.82) o = { type: 'raiz', x, y: -40, r: 24 };
    else o = { type: 'caiman', x, y: -40, r: 26, vx: (Math.random() < 0.5 ? -1 : 1) * (late ? 70 : 45) };
    this.objs.push(o);
  }

  update(dt) {
    if (this.done) return;
    const inp = this.game.input;
    this.t += dt;
    this.speed = (130 + Math.min(70, this.t * 2.5)) * Settings.diff.canoe;
    this.scroll += this.speed * dt;
    this.inv = Math.max(0, this.inv - dt); this.shake = Math.max(0, this.shake - dt * 20);
    if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
    const want = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
    this.vx = lerp(this.vx, want * 280, Math.min(1, dt * 6));
    this.x += this.vx * dt;
    const [l, r] = this.banks(430);
    if (this.x < l + 30) { this.x = l + 30; this.vx = 0; }
    if (this.x > r - 30) { this.x = r - 30; this.vx = 0; }

    if (this.t < CANOE_TIME - 2.5) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawn(); this.spawnT = Math.max(0.45, 0.95 - this.t * 0.012) * (0.7 + Math.random() * 0.6); } }
    for (const o of this.objs) {
      o.y += this.speed * dt;
      if (o.vx) {
        o.x += o.vx * dt;
        const [bl, br] = this.banks(o.y);
        if (o.x < bl + 30 || o.x > br - 30) o.vx *= -1;
      }
      if (o.gone) continue;
      if (Math.abs(o.y - 430) < o.r + 14 && Math.abs(o.x - this.x) < o.r + 18) {
        if (o.type === 'vela') {
          o.gone = true; this.lights++;
          AudioFX.sfx.pickup();
          this.msg = { text: '+5 VELA', col: '#f6c945', t: 0.8 };
        } else if (this.inv <= 0) {
          o.gone = true; this.hits++; this.inv = 1.2; this.shake = 10;
          AudioFX.sfx[o.type === 'caiman' ? 'alert' : 'smallSplash']();
          this.msg = { text: o.type === 'caiman' ? '¡EL CAIMÁN! ¡REMA!' : '¡CUIDADO!', col: '#ff6b78', t: 1 };
        }
      }
    }
    this.objs = this.objs.filter(o => o.y < 600);
    if (Math.random() < 0.5) this.foam.push({ x: this.x + (Math.random() - 0.5) * 16, y: 470, life: 0.8 });
    this.foam.forEach(f => { f.y += this.speed * dt; f.life -= dt; });
    this.foam = this.foam.filter(f => f.life > 0);
    if (this.t >= CANOE_TIME) { this.done = true; this.onDone({ lights: this.lights, hits: this.hits }); }
  }

  draw(ctx) {
    const W = this.game.W, H = this.game.H, t = this.t;
    ctx.save();
    if (this.shake) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    // agua
    const wg = ctx.createLinearGradient(0, 0, 0, H);
    wg.addColorStop(0, '#07182e'); wg.addColorStop(1, '#0f3a56');
    ctx.fillStyle = wg; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = 'rgba(160,220,255,0.18)';
    for (let i = 0; i < 40; i++) {
      const y = ((i * 53 + this.scroll * 0.9) % (H + 40)) - 20, x = (i * 197) % W;
      ctx.fillRect(x + Math.sin(t + i) * 10, y, 18 + (i % 3) * 8, 2);
    }
    // orillas con manglar
    for (let y = -20; y < H + 20; y += 10) {
      const [l, r] = this.banks(y);
      ctx.fillStyle = '#10261a'; ctx.fillRect(-20, y, l + 20, 11); ctx.fillRect(r, y, W - r + 20, 11);
      ctx.fillStyle = 'rgba(200,235,255,0.25)'; ctx.fillRect(l - 3, y, 3, 10); ctx.fillRect(r, y, 3, 10);
    }
    for (let i = 0; i < 14; i++) {
      const y = ((i * 97 + this.scroll) % (H + 120)) - 60;
      const [l, r] = this.banks(y);
      [[l - 26, i], [r + 26, i + 7]].forEach(([x, s]) => {
        ctx.fillStyle = s % 2 ? '#1f4a2a' : '#173a20';
        ctx.beginPath(); ctx.arc(x, y, 30 + (s % 3) * 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 10, y + 16); ctx.quadraticCurveTo(x + k * 16, y + 34, x + k * 22 + (x < W / 2 ? 14 : -14), y + 40); ctx.stroke(); }
      });
    }
    // objetos
    for (const o of this.objs) {
      if (o.gone && o.type === 'vela') continue;
      ctx.globalAlpha = o.gone ? 0.35 : 1;
      if (o.type === 'vela') {
        glow(ctx, o.x, o.y - 6, 30, 'rgba(255,200,100,0.7)');
        ctx.fillStyle = '#7a4a22'; ctx.fillRect(o.x - 11, o.y + Math.sin(t * 3 + o.x) * 1.5, 22, 5);
        drawCandle(ctx, o.x, o.y + Math.sin(t * 3 + o.x) * 1.5, t, 1.1);
      } else if (o.type === 'tronco') {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
        ctx.fillStyle = '#5e3b1a'; ctx.beginPath(); rrect(ctx, -36, -8, 72, 16, 8); ctx.fill();
        ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.ellipse(36, 0, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(200,235,255,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 4, 42, 12, 0, 0, Math.PI); ctx.stroke();
        ctx.restore();
      } else if (o.type === 'raiz') {
        ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 4;
        for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3; ctx.beginPath(); ctx.moveTo(o.x, o.y - 10); ctx.quadraticCurveTo(o.x + Math.cos(a) * 14, o.y - 18, o.x + Math.cos(a) * 24, o.y + Math.sin(a) * 10); ctx.stroke(); }
        ctx.fillStyle = '#1f4a2a'; ctx.beginPath(); ctx.arc(o.x, o.y - 16, 14, 0, Math.PI * 2); ctx.fill();
      } else {
        // caimán: solo ojos y lomo, con ondas
        ctx.strokeStyle = 'rgba(200,235,255,0.5)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(o.x, o.y, 30 + k * 12 + (t * 20) % 12, 10 + k * 4, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = '#2a3f18'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f6c945'; [-6, 6].forEach(d => { ctx.beginPath(); ctx.arc(o.x + (o.vx > 0 ? 16 : -16), o.y + d * 0.6 - 2, 2.6, 0, Math.PI * 2); ctx.fill(); });
      }
      ctx.globalAlpha = 1;
    }
    // estela y canoa
    this.foam.forEach(f => { ctx.fillStyle = `rgba(220,240,255,${f.life * 0.5})`; ctx.fillRect(f.x, f.y, 3, 3); });
    const cx = this.x, cy = 430, tilt = this.vx / 900;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    if (this.inv > 0 && Math.floor(this.inv * 10) % 2) ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#4a2a10'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 52, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 46, 0, 0, Math.PI * 2); ctx.fill();
    // remos que se mueven
    const row = Math.sin(t * 6);
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-8, 18); ctx.lineTo(-30, 18 + row * 14); ctx.moveTo(8, -14); ctx.lineTo(30, -14 - row * 14); ctx.stroke();
    // pescador (adelante, con antorcha) y Mateo (atrás), vistos desde arriba
    [[0, -18, '#2f8fb0', '#e8dcc0'], [0, 20, '#eef3f5', '#1b1410']].forEach(([x, y, shirt, hat]) => {
      ctx.fillStyle = shirt; ctx.beginPath(); ctx.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hat; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#5e3b1a'; ctx.fillRect(9, -44, 3, 22);
    ctx.restore();
    // luz de la antorcha y oscuridad alrededor
    const fx = cx + 10, fy = cy - 46;
    glow(ctx, fx, fy, 26 + Math.sin(t * 20) * 3, 'rgba(255,170,60,1)', 0.9);
    const dark = ctx.createRadialGradient(fx, fy - 40, 90, fx, fy - 40, 520);
    dark.addColorStop(0, 'rgba(2,6,20,0)'); dark.addColorStop(1, 'rgba(2,6,20,0.82)');
    ctx.fillStyle = dark; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.restore();

    // interfaz
    ctx.save();
    ctx.fillStyle = 'rgba(7,13,34,0.78)'; ctx.beginPath(); rrect(ctx, W / 2 - 230, 14, 460, 58, 14); ctx.fill();
    ctx.strokeStyle = '#f6c945'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#f6c945'; ctx.font = '600 17px "Fredoka", sans-serif';
    ctx.fillText('LA BÚSQUEDA EN CANOA', W / 2, 36);
    ctx.font = '600 13px "Fredoka", sans-serif'; ctx.fillStyle = '#fdf6e3';
    ctx.fillText(`◀ ▶ para esquivar · Velas ${this.lights} · Golpes ${this.hits}`, W / 2, 56);
    const k = Math.min(1, this.t / CANOE_TIME);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(W / 2 - 210, 64, 420, 4);
    ctx.fillStyle = '#1fb5b0'; ctx.fillRect(W / 2 - 210, 64, 420 * k, 4);
    if (this.msg) { ctx.font = '700 22px "Fredoka", sans-serif'; ctx.fillStyle = this.msg.col; ctx.fillText(this.msg.text, this.x, 350); }
    if (this.t < 3) { ctx.globalAlpha = Math.min(1, 3 - this.t); ctx.font = '600 18px "Nunito", sans-serif'; ctx.fillStyle = '#ffd9b0'; ctx.fillText('Esquiva los troncos, las raíces y al caimán. Recoge las velas.', W / 2, 260); }
    ctx.restore();
  }
}
