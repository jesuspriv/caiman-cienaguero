'use strict';
/* =========================================================
   verses.js — Minijuego del verseador (escena 7).
   El verseador canta tres versos y Mateo completa el cuarto
   eligiendo la palabra que RIMA. Versos originales escritos
   para el juego, al estilo de la décima y el verso cantado
   de las fiestas del Caribe.
   ========================================================= */

const VERSES = [
  { lines: ['Veinte de enero en la tarde,', 'San Sebastián en el cielo,', 'Tomasita fue a la orilla', 'con su cinta y su ___'], answer: 'pañuelo', options: ['pañuelo', 'sombrero', 'vestido'] },
  { lines: ['Suena el tambor alegre,', 'suena la caña de millo,', 'y el caimán baila en la plaza', 'con su traje ___'], answer: 'amarillo', options: ['amarillo', 'de colores', 'verde'] },
  { lines: ['Los pescadores salieron', 'con antorchas a buscar,', 'recorrieron la ciénaga', 'de la orilla hasta el ___'], answer: 'mar', options: ['río', 'mar', 'puerto'] },
  { lines: ['Por eso cada enero', 'Ciénaga sale a bailar:', 'la historia de Tomasita', 'no se puede ___'], answer: 'olvidar', options: ['perder', 'esconder', 'olvidar'] },
  { lines: ['Ay, caimán cienaguero,', '¿pa\' dónde te la llevaste?', 'Te buscamos en el agua', 'y en el agua te ___'], answer: 'quedaste', options: ['escondiste', 'quedaste', 'perdiste'] },
  { lines: ['Que suene la tambora,', 'que no pare el llamador,', 'que en Ciénaga se canta', 'con alegría y ___'], answer: 'amor', options: ['cariño', 'amor', 'tristeza'] }
];
const VERSE_ROUNDS = 5;
const VERSE_TIME = 14;

class VerseGame {
  constructor(game, onDone) {
    this.game = game; this.onDone = onDone;
    this.rounds = VERSES.slice().sort(() => Math.random() - 0.5).slice(0, VERSE_ROUNDS)
      .map(v => Object.assign({}, v, { options: v.options.slice().sort(() => Math.random() - 0.5) }));
    this.i = 0; this.correct = 0; this.done = false;
    this.portrait = document.createElement('canvas'); this.portrait.width = this.portrait.height = 192;
    this.startRound();
  }

  startRound() {
    this.t = 0; this.sel = 1; this.result = null; this.resT = 0; this.timeLeft = Settings.diff.verseTime;
    drawPortrait(this.portrait, 'verseador', 'happy');
    AudioFX.sfx.talk();
  }
  get round() { return this.rounds[this.i]; }
  get ready() { return this.t > 2.4 && !this.result; }   // las opciones salen tras el canto

  key(code) {
    if (this.done) return false;
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') { if (this.ready) { this.sel = (this.sel + 2) % 3; AudioFX.sfx.blip(); } return true; }
    if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') { if (this.ready) { this.sel = (this.sel + 1) % 3; AudioFX.sfx.blip(); } return true; }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
    if (n !== undefined) { if (this.ready) { this.sel = n; this.choose(); } return true; }
    return false;
  }
  hit() { if (this.ready) this.choose(); else if (!this.result) this.t = Math.max(this.t, 2.4); }
  click(x, y) {
    if (!this.ready) return;
    this.optionRects().forEach((r, i) => { if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) { this.sel = i; this.choose(); } });
  }

  choose(timeout = false) {
    const r = this.round, word = timeout ? null : r.options[this.sel];
    const ok = word === r.answer;
    this.result = { ok, word, timeout };
    if (ok) {
      this.correct++;
      AudioFX.sfx.right();
      drawPortrait(this.portrait, 'verseador', 'happy');
      const p = this.game.player;
      this.game.scene.particles.emit(p.x, p.y - 50, { count: 18, color: ['#e8313a', '#f6c945', '#1fb5b0', '#fdf6e3'], speed: 110, life: 0.9, size: 3, spin: true, gravity: 60 });
      setEmote(p, '♪', 1.4);
    } else {
      AudioFX.sfx.wrong();
      drawPortrait(this.portrait, 'verseador', 'surprised');
    }
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    if (this.ready) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) this.choose(true);
    }
    if (this.result) {
      this.resT += dt;
      if (this.resT > 2.4) {
        this.i++;
        if (this.i >= this.rounds.length) { this.done = true; this.onDone({ correct: this.correct, total: this.rounds.length }); }
        else this.startRound();
      }
    }
  }

  optionRects() {
    const W = this.game.W, w = 190, h = 44, gap = 22, total = w * 3 + gap * 2, x0 = (W - total) / 2, y = 386;
    return [0, 1, 2].map(i => ({ x: x0 + i * (w + gap), y, w, h }));
  }

  /** Se dibuja en coordenadas de pantalla (960x540). */
  draw(ctx) {
    const W = this.game.W, r = this.round, t = this.t;
    const px = 120, py = 84, pw = W - 240, ph = 380;
    ctx.save();
    ctx.fillStyle = 'rgba(9,14,34,0.55)'; ctx.fillRect(0, 0, W, this.game.H);
    // panel tipo pergamino
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, '#fbf1d8'); g.addColorStop(1, '#ecd9b0');
    ctx.fillStyle = g; ctx.beginPath(); rrect(ctx, px, py, pw, ph, 16); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(138,90,43,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); rrect(ctx, px + 8, py + 8, pw - 16, ph - 16, 12); ctx.stroke();
    // cabecera
    ctx.fillStyle = '#e8313a'; ctx.beginPath(); rrect(ctx, px + 20, py - 18, 300, 36, 18); ctx.fill();
    ctx.fillStyle = '#fdf6e3'; ctx.font = '600 17px "Fredoka", sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`VERSOS DEL CAIMÁN · ${this.i + 1}/${this.rounds.length}`, px + 38, py + 6);
    ctx.textAlign = 'right'; ctx.fillStyle = '#5e3b1a'; ctx.font = '600 15px "Fredoka", sans-serif';
    ctx.fillText(`RIMAS ${this.correct}`, px + pw - 24, py + 34);
    // retrato del verseador
    ctx.drawImage(this.portrait, px + 26, py + 40, 110, 110);
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.strokeRect(px + 26, py + 40, 110, 110);
    ctx.fillStyle = '#5e3b1a'; ctx.font = '600 12px "Fredoka", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('EL VERSEADOR', px + 81, py + 168);
    // versos: aparecen uno a uno mientras canta
    ctx.textAlign = 'left';
    const lx = px + 170;
    r.lines.forEach((line, i) => {
      const a = Math.max(0, Math.min(1, (t - i * 0.6) * 3));
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const y = py + 70 + i * 40;
      ctx.font = 'italic 700 22px "Nunito", sans-serif';
      if (i < 3) { ctx.fillStyle = '#3a2410'; ctx.fillText(line, lx + (1 - a) * 12, y); }
      else {
        const [pre] = line.split('___');
        ctx.fillStyle = '#3a2410'; ctx.fillText(pre, lx + (1 - a) * 12, y);
        const bx = lx + ctx.measureText(pre).width + 4;
        let word = '_______', col = '#b08a5a';
        if (this.result) {
          word = this.result.ok ? r.answer : r.answer;
          col = this.result.ok ? '#2f8a3a' : '#c0392b';
        } else if (this.ready) { word = r.options[this.sel]; col = '#1f7ab5'; }
        ctx.fillStyle = col; ctx.fillText(word, bx, y);
        ctx.fillRect(bx, y + 5, ctx.measureText(word).width, 2.5);
      }
      ctx.globalAlpha = 1;
    });
    // nota musical que flota mientras canta
    if (t < 2.4) { ctx.fillStyle = '#e8313a'; ctx.font = '700 22px "Fredoka", sans-serif'; ctx.fillText('♪', px + 140, py + 60 - (t * 20) % 30); }

    // resultado
    if (this.result) {
      const R = this.result;
      ctx.textAlign = 'center'; ctx.font = '700 22px "Fredoka", sans-serif';
      ctx.fillStyle = R.ok ? '#2f8a3a' : '#c0392b';
      const msg = R.ok ? '¡Eso es! ¡Rimó bonito!' : R.timeout ? '¡Se acabó el tiempo!' : `"${R.word}" no rima... era "${r.answer}"`;
      ctx.fillText(msg, W / 2, py + 262);
      if (R.ok) { ctx.font = '600 15px "Fredoka", sans-serif'; ctx.fillStyle = '#8a5a2b'; ctx.fillText('El coro responde: ¡Eeeeeso!', W / 2, py + 286); }
    }

    // opciones y tiempo
    if (this.ready || this.result) {
      const rects = this.optionRects();
      rects.forEach((b, i) => {
        const opt = r.options[i];
        let bg = '#8a5a2b', fg = '#fdf6e3';
        if (this.result) {
          if (opt === r.answer) bg = '#2f8a3a';
          else if (opt === this.result.word) bg = '#c0392b';
          else { bg = '#a89070'; }
        } else if (i === this.sel) bg = '#f6c945', fg = '#3a2410';
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); rrect(ctx, b.x + 3, b.y + 4, b.w, b.h, 12); ctx.fill();
        ctx.fillStyle = bg; ctx.beginPath(); rrect(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
        if (i === this.sel && !this.result) { ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2.5; ctx.stroke(); }
        ctx.fillStyle = fg; ctx.font = '600 19px "Fredoka", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}. ${opt}`, b.x + b.w / 2, b.y + 29);
      });
      if (!this.result) {
        const k = Math.max(0, this.timeLeft / Settings.diff.verseTime);
        ctx.fillStyle = 'rgba(94,59,26,0.25)'; ctx.beginPath(); rrect(ctx, px + 40, py + ph - 18, pw - 80, 8, 4); ctx.fill();
        ctx.fillStyle = k > 0.3 ? '#1fb5b0' : '#e8313a'; ctx.beginPath(); rrect(ctx, px + 40, py + ph - 18, (pw - 80) * k, 8, 4); ctx.fill();
        ctx.fillStyle = '#5e3b1a'; ctx.font = '600 13px "Fredoka", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Elige la palabra que RIMA:  ◀ ▶ y E,  teclas 1-2-3  o clic', W / 2, py + 245);
      }
    } else {
      ctx.textAlign = 'center'; ctx.fillStyle = '#8a5a2b'; ctx.font = '600 14px "Fredoka", sans-serif';
      ctx.fillText('El verseador está cantando... (E para seguir)', W / 2, py + 270);
    }
    ctx.restore();
  }
}

// en celular: las opciones se tocan en la pantalla
VerseGame.prototype.touchHide = 'all';
