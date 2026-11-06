'use strict';
/* =========================================================
   rhythm.js — Minijuego del tambor alegre (escena 7).
   Los parches avanzan hacia el tambor y Mateo golpea con E
   justo cuando llegan. El acompañamiento (la cumbia de la fiesta
   sin tambor alegre) lo dispara el propio minijuego con su reloj,
   así que la pausa del juego también detiene la música.
   ========================================================= */

const DRUM_BPM = 116;
const DRUM_COUNT_IN = 32;         // dos compases de preparación
const DRUM_BARS = [               // golpes por compás (en semicorcheas)
  [0, 4, 8, 12], [0, 4, 8, 12],
  [0, 4, 6, 8, 12, 14], [0, 4, 6, 8, 12, 14],
  [0, 3, 6, 8, 12], [0, 3, 6, 8, 12],
  [0, 3, 6, 8, 11, 14], [0, 3, 6, 8, 11, 13, 14],
  [0, 4, 8]
];

class DrumGame {
  constructor(game, onDone) {
    this.game = game;
    this.onDone = onDone;
    this.sd = 60 / DRUM_BPM / 4;
    this.time = -0.3;
    this.nextStep = 0;
    this.notes = [];
    DRUM_BARS.forEach((bar, b) => bar.forEach(s => this.notes.push({ step: DRUM_COUNT_IN + b * 16 + s, t: 0, res: null })));
    this.notes.forEach(n => { n.t = n.step * this.sd; });
    this.lastStep = DRUM_COUNT_IN + DRUM_BARS.length * 16;
    this.travel = 1.6;              // segundos que tarda un parche en llegar
    this.combo = 0; this.best = 0;
    this.perfect = 0; this.good = 0; this.miss = 0;
    this.judge = null;              // { text, color, life }
    this.pulse = 0;
    this.count = '';
    this.done = false;
  }

  get total() { return this.notes.length; }

  update(dt) {
    if (this.done) return;
    this.time += dt;
    this.pulse = Math.max(0, this.pulse - dt * 4);
    if (this.judge) { this.judge.life -= dt; if (this.judge.life <= 0) this.judge = null; }

    // acompañamiento
    while (this.nextStep * this.sd <= this.time && this.nextStep <= this.lastStep + 8) {
      this.playStep(this.nextStep);
      this.nextStep++;
    }
    // golpes no tocados
    for (const n of this.notes) {
      if (!n.res && this.time > n.t + 0.16 * Settings.diff.drumWin) { n.res = 'miss'; this.miss++; this.combo = 0; this.setJudge('FALLO', '#ff6b78'); }
    }
    if (this.time > this.lastStep * this.sd + 1.4) this.finish();
  }

  playStep(s) {
    const S = AudioFX.sfx;
    if (s < DRUM_COUNT_IN) {
      if (s % 4 === 0) S.click(s >= 16);
      if (s >= 16 && s % 4 === 0) this.count = ['4', '3', '2', '1'][(s - 16) / 4];
      else if (s < 16) this.count = '¡PREPÁRATE!';
      return;
    }
    if (s === DRUM_COUNT_IN) this.count = '';
    if (s >= this.lastStep) { if (s === this.lastStep) S.llamador(); return; }
    // la misma cumbia de la fiesta, sin tambor alegre: ese lo toca el jugador
    AudioFX.backing(s - DRUM_COUNT_IN);
  }

  /** Golpe del jugador (tecla E / botón táctil). */
  hit() {
    if (this.done) return;
    AudioFX.sfx.alegre();
    this.pulse = 1;
    let best = null, bd = Infinity;
    for (const n of this.notes) {
      if (n.res) continue;
      const d = Math.abs(n.t - this.time);
      if (d < bd) { bd = d; best = n; }
    }
    const W = Settings.diff.drumWin;
    if (!best || bd > 0.16 * W) { this.combo = 0; this.setJudge('¡A DESTIEMPO!', '#c9b89a'); return; }
    if (bd <= 0.065 * W) { best.res = 'perfect'; this.perfect++; this.setJudge('¡PERFECTO!', '#f6c945'); }
    else { best.res = 'good'; this.good++; this.setJudge('¡BIEN!', '#7fe0d8'); }
    this.combo++; this.best = Math.max(this.best, this.combo);
    const p = this.game.player, sc = this.game.scene;
    sc.particles.emit(p.x, p.y - 40, { count: 6, color: ['#e8313a', '#f6c945', '#1fb5b0', '#fdf6e3'], speed: 90, life: 0.7, size: 3, spin: true, gravity: 60 });
    if (this.combo > 0 && this.combo % 10 === 0) { this.game.ui.notify(`¡${this.combo} SEGUIDOS! ¡ESO ES!`, 'clue'); this.game.shake = 4; }
  }

  setJudge(text, color) { this.judge = { text, color, life: 0.5 }; }

  finish() {
    this.done = true;
    const acc = (this.perfect * 2 + this.good) / (this.total * 2);
    const rank = acc >= 0.85 ? '¡TAMBORERO MAYOR!' : acc >= 0.6 ? '¡BUEN RITMO!' : acc >= 0.3 ? '¡VAS APRENDIENDO!' : '¡SIGUE PRACTICANDO!';
    this.onDone({ acc, rank, perfect: this.perfect, good: this.good, miss: this.miss, best: this.best, bonus: Math.round(acc * 50) });
  }

  /** Se dibuja en coordenadas de pantalla (960x540), sobre la escena. */
  draw(ctx) {
    const W = this.game.W;
    const top = 360, h = 132, hitX = 200, laneY = top + 76, endX = W - 70;
    const speed = (endX - hitX) / this.travel;

    ctx.fillStyle = 'rgba(9,14,34,0.86)'; ctx.fillRect(40, top, W - 80, h);
    ctx.fillStyle = '#f6c945'; ctx.fillRect(40, top, W - 80, 3); ctx.fillRect(40, top + h - 3, W - 80, 3);
    // barra de progreso
    const prog = clamp(this.time / (this.lastStep * this.sd), 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(60, top + 14, W - 120, 6);
    ctx.fillStyle = '#1fb5b0'; ctx.fillRect(60, top + 14, (W - 120) * prog, 6);
    ctx.font = '13px "Fredoka", monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#fdf6e3'; ctx.fillText('TAMBOR ALEGRE — presiona [E] cuando el parche llegue al tambor', 60, top + 40);
    ctx.textAlign = 'right'; ctx.fillStyle = '#f6c945';
    ctx.fillText(`COMBO ${this.combo}   ACIERTOS ${this.perfect + this.good}/${this.total}`, W - 60, top + 40);

    // carril
    ctx.fillStyle = 'rgba(138,90,43,0.45)'; ctx.fillRect(hitX, laneY - 16, endX - hitX + 30, 32);
    ctx.fillStyle = 'rgba(253,246,227,0.18)';
    for (let s = Math.ceil(this.time / this.sd / 4) * 4; s * this.sd < this.time + this.travel; s += 4) {
      const x = hitX + (s * this.sd - this.time) * speed;
      ctx.fillRect(x - 1, laneY - 16, 2, 32);
    }
    // parches que se acercan
    for (const n of this.notes) {
      if (n.res === 'perfect' || n.res === 'good') continue;
      const dt = n.t - this.time;
      if (dt > this.travel + 0.1 || dt < -0.3) continue;
      const x = hitX + dt * speed;
      ctx.globalAlpha = n.res === 'miss' ? 0.35 : 1;
      ctx.fillStyle = '#5e3b1a'; ctx.beginPath(); ctx.ellipse(x, laneY + 2, 15, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.ellipse(x, laneY, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9b48a'; ctx.fillRect(x - 6, laneY - 1, 12, 2);
      ctx.globalAlpha = 1;
    }
    // tambor (zona de golpe)
    const r = 24 + this.pulse * 6;
    glow(ctx, hitX, laneY, 50 + this.pulse * 20, 'rgba(246,201,69,0.8)', 0.3 + this.pulse * 0.5);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(hitX - r, laneY, r * 2, 26);
    ctx.fillStyle = '#e8313a'; ctx.fillRect(hitX - r, laneY + 10, r * 2, 4);
    ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.ellipse(hitX, laneY, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f6c945'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hitX, laneY, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#101a3a'; ctx.font = '16px "Fredoka", monospace'; ctx.textAlign = 'center'; ctx.fillText('E', hitX, laneY + 6);

    // textos
    if (this.judge) {
      ctx.globalAlpha = Math.min(1, this.judge.life * 3);
      ctx.font = '20px "Fredoka", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(this.judge.text, hitX + 2, top - 6 + 2);
      ctx.fillStyle = this.judge.color; ctx.fillText(this.judge.text, hitX, top - 6);
      ctx.globalAlpha = 1;
    }
    if (this.count) {
      ctx.font = '40px "Fredoka", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(this.count, W / 2 + 3, laneY + 15);
      ctx.fillStyle = '#ffe08a'; ctx.fillText(this.count, W / 2, laneY + 12);
    }
  }
}

// en celular: solo hace falta el botón E para golpear el tambor
DrumGame.prototype.touchHide = 'pad';
