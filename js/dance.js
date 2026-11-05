'use strict';
/* =========================================================
   dance.js — Minijuego de baile con la bailadora (escena 7).
   La bailadora muestra una secuencia de pasos de cumbia y Mateo
   la repite con las flechas. Cada ronda suma un paso más.
   ========================================================= */

const DANCE_STEPS = {
  up: { label: '¡ADELANTE!', key: '▲', col: '#e8313a', semi: 7 },
  left: { label: '¡IZQUIERDA!', key: '◀', col: '#f6c945', semi: 4 },
  right: { label: '¡DERECHA!', key: '▶', col: '#1fb5b0', semi: 9 },
  down: { label: '¡ATRÁS!', key: '▼', col: '#3fa34d', semi: 0 }
};
const DANCE_DIRS = ['up', 'left', 'right', 'down'];
const DANCE_ROUNDS = 5;

class DanceGame {
  constructor(game, onDone) {
    this.game = game; this.onDone = onDone;
    this.seq = [];
    for (let i = 0; i < 2; i++) this.seq.push(DANCE_DIRS[(Math.random() * 4) | 0]);
    this.round = 0; this.lives = this.maxLives = Settings.diff.danceLives; this.rounds = 0;
    this.done = false; this.t = 0;
    this.lit = null; this.litT = 0;
    this.msg = null;
    this.mateoDir = 'down'; this.bailaDir = 'down';
    this.nextRound();
  }

  nextRound() {
    this.round++;
    this.seq.push(DANCE_DIRS[(Math.random() * 4) | 0]);
    this.showSeq();
  }
  showSeq() {
    this.phase = 'show'; this.showI = -1; this.showT = 0.9; this.input = 0;
  }

  flash(dir, who) {
    this.lit = dir; this.litT = 0.32;
    AudioFX.sfx.gaita(DANCE_STEPS[dir].semi);
    if (who === 'baila') this.bailaDir = dir; else this.mateoDir = dir;
  }

  press(dir) {
    if (this.done || this.phase !== 'input') return;
    this.flash(dir, 'mateo');
    const p = this.game.player; p.dir = dir; p.animT += 0.3;
    if (dir === this.seq[this.input]) {
      this.input++;
      if (this.input >= this.seq.length) {
        this.rounds++;
        this.msg = { text: '¡ESO ES! ¡QUÉ SABROSO!', col: '#2f8a3a', t: 1.4 };
        AudioFX.sfx.right();
        this.game.scene.particles.emit(p.x, p.y - 40, { count: 14, color: ['#e8313a', '#f6c945', '#1fb5b0'], speed: 100, life: 0.8, size: 3, spin: true, gravity: 60 });
        this.phase = 'wait'; this.waitT = 1.5;
        this.after = () => (this.round >= DANCE_ROUNDS ? this.finish() : this.nextRound());
      }
    } else {
      this.lives--;
      AudioFX.sfx.wrong();
      this.msg = { text: this.lives > 0 ? '¡UY, TE PISASTE! OTRA VEZ…' : '¡SE ACABÓ EL BAILE!', col: '#c0392b', t: 1.4 };
      this.phase = 'wait'; this.waitT = 1.6;
      this.after = () => (this.lives <= 0 ? this.finish() : this.showSeq());
    }
  }

  key(code) {
    const map = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    if (!map[code]) return false;
    this.press(map[code]);
    return true;
  }
  hit() { if (this.phase === 'show') this.showT = Math.min(this.showT, 0.05); }
  click(x, y) {
    for (const [dir, r] of Object.entries(this.padRects())) {
      if (dist(x, y, r.x, r.y) < r.r) { this.press(dir); return; }
    }
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.onDone({ rounds: this.rounds, total: DANCE_ROUNDS });
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    this.litT = Math.max(0, this.litT - dt);
    if (this.litT <= 0) this.lit = null;
    if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
    if (this.phase === 'show') {
      this.showT -= dt;
      if (this.showT <= 0) {
        this.showI++;
        if (this.showI >= this.seq.length) { this.phase = 'input'; this.input = 0; this.bailaDir = 'down'; return; }
        this.flash(this.seq[this.showI], 'baila');
        this.showT = Math.max(0.42, 0.62 - this.round * 0.03);
      }
    } else if (this.phase === 'wait') {
      this.waitT -= dt;
      if (this.waitT <= 0) { this.phase = 'none'; this.after(); }
    }
  }

  padRects() {
    const cx = 640, cy = 290, d = 78, r = 40;
    return { up: { x: cx, y: cy - d, r }, down: { x: cx, y: cy + d, r }, left: { x: cx - d, y: cy, r }, right: { x: cx + d, y: cy, r } };
  }

  draw(ctx) {
    const W = this.game.W, H = this.game.H, t = this.t;
    const px = 110, py = 70, pw = W - 220, ph = 400;
    ctx.save();
    ctx.fillStyle = 'rgba(9,14,34,0.6)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, '#3a1440'); g.addColorStop(1, '#14082a');
    ctx.fillStyle = g; ctx.beginPath(); rrect(ctx, px, py, pw, ph, 18); ctx.fill();
    ctx.strokeStyle = '#f6c945'; ctx.lineWidth = 3; ctx.stroke();
    // banderines
    const cols = ['#e8313a', '#f6c945', '#1fb5b0', '#3fa34d'];
    for (let i = 0; i < 26; i++) { ctx.fillStyle = cols[i % 4]; const x = px + 14 + i * 27; ctx.beginPath(); ctx.moveTo(x, py + 6); ctx.lineTo(x + 20, py + 6); ctx.lineTo(x + 10, py + 22 + Math.sin(t * 3 + i) * 2); ctx.fill(); }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6c945'; ctx.font = '600 22px "Fredoka", sans-serif';
    ctx.fillText(`BAILA LA CUMBIA · RONDA ${Math.min(this.round, DANCE_ROUNDS)}/${DANCE_ROUNDS}`, W / 2, py + 52);
    ctx.font = '600 16px "Fredoka", sans-serif'; ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6b78'; ctx.fillText('♥'.repeat(Math.max(0, this.lives)) + '♡'.repeat(this.maxLives - Math.max(0, this.lives)), px + pw - 24, py + 52);

    // bailadora y Mateo bailando
    const hop = k => Math.abs(Math.sin(t * 6 + k)) * -6;
    ctx.fillStyle = 'rgba(255,214,120,0.12)'; ctx.beginPath(); ctx.ellipse(310, 400, 150, 26, 0, 0, Math.PI * 2); ctx.fill();
    drawHumanoid(ctx, 250, 392 + (this.phase === 'show' ? hop(0) : 0), LOOKS.bailadora1, this.bailaDir, t, this.phase === 'show', 6.2, 'happy');
    drawHumanoid(ctx, 380, 392 + (this.phase === 'input' && this.lit ? hop(1) : 0), LOOKS.mateo, this.mateoDir, t, !!this.lit && this.phase !== 'show', 6, this.msg && this.msg.col === '#c0392b' ? 'surprised' : 'happy');
    ctx.textAlign = 'center'; ctx.font = '600 13px "Fredoka", sans-serif'; ctx.fillStyle = '#fdf6e3';
    ctx.fillText('BAILADORA', 250, 424); ctx.fillText('MATEO', 380, 424);

    // almohadillas de pasos
    for (const [dir, r] of Object.entries(this.padRects())) {
      const S = DANCE_STEPS[dir], on = this.lit === dir;
      if (on) glow(ctx, r.x, r.y, r.r * 1.8, S.col, 0.7);
      ctx.fillStyle = on ? S.col : shade(S.col, -0.45);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (on ? 1.08 : 1), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = on ? '#fff' : S.col; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = on ? '#fff' : S.col; ctx.font = '700 30px "Fredoka", "Segoe UI Symbol", sans-serif';
      ctx.fillText(S.key, r.x, r.y + 11);
    }
    // estado
    ctx.font = '600 17px "Fredoka", sans-serif';
    if (this.msg) { ctx.fillStyle = this.msg.col === '#2f8a3a' ? '#7fe08a' : '#ff8a8a'; ctx.fillText(this.msg.text, 640, py + ph - 26); }
    else if (this.phase === 'show') { ctx.fillStyle = '#ffd9b0'; ctx.fillText(this.lit ? DANCE_STEPS[this.lit].label : 'Mira los pasos de la bailadora…', 640, py + ph - 26); }
    else if (this.phase === 'input') {
      ctx.fillStyle = '#7fe0d8'; ctx.fillText(`¡Tu turno! Repite los pasos con las flechas (${this.input}/${this.seq.length})`, 640, py + ph - 26);
    }
    ctx.restore();
  }
}
