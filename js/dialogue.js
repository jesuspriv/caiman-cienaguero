'use strict';
/* =========================================================
   dialogue.js — Sistema reutilizable de diálogos.
   Caja inferior con retrato, nombre, texto progresivo
   (efecto máquina de escribir) e indicador [E] CONTINUAR.
   ========================================================= */

const SPEAKERS = {
  abuelo: { name: 'ABUELO', color: '#f6c945' },
  mateo: { name: 'MATEO', color: '#7fe0d8' },
  narrador: { name: 'NARRADOR', color: '#f0a35c', narrator: true },
  pescador: { name: 'PESCADOR', color: '#8fd3f0' },
  vendedora: { name: 'VENDEDORA', color: '#ffb08a' },
  anciano: { name: 'ANCIANO', color: '#b5e39a' },
  tomasita: { name: 'TOMASITA', color: '#ffd0d6' },
  juanita: { name: 'JUANITA', color: '#8ff2ea' },
  mujer: { name: 'SEÑORA DEL PUEBLO', color: '#cbb6ff' },
  nino: { name: 'NIÑO', color: '#ffe08a' },
  tamborero: { name: 'TAMBORERO', color: '#ffb08a' },
  bailadora: { name: 'BAILADORA', color: '#ff9aa4' },
  portador: { name: 'PORTADOR DEL CAIMÁN', color: '#b5e39a' },
  verseador: { name: 'VERSEADOR', color: '#ffd36b' },
  carmen: { name: 'DOÑA CARMEN', color: '#d8c4ff' },
  raspao: { name: 'EL RASPADERO', color: '#8ff2ea' }
};

/* Gente de la fiesta: cuando exclaman, es de alegría. */
const FESTIVE = ['tamborero', 'bailadora', 'portador', 'verseador', 'vendedora', 'nino', 'raspao'];

/**
 * Emoción del retrato para una línea: la indicada con `mood`
 * o, si no hay, una deducida del texto (¿pregunta? → sorpresa, ¡exclamación! → alegría o sorpresa).
 */
function moodFor(line) {
  if (line.mood !== undefined) return line.mood;
  const t = line.text.trim();
  if (t.startsWith('¿')) return 'surprised';
  if (t.startsWith('¡')) return FESTIVE.includes(line.who) ? 'happy' : 'surprised';
  return null;
}

class DialogueSystem {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('dialogue');
    this.nameEl = document.getElementById('dialogue-name');
    this.textEl = document.getElementById('dialogue-text');
    this.contEl = document.getElementById('dialogue-continue');
    this.portrait = document.getElementById('portrait');
    this.active = false;
    this.queue = [];
    this.current = null;
    this.shown = 0;
    this.timer = 0;
    this.cooldown = 0;
    this.onDone = null;
    this.el.addEventListener('pointerdown', e => { e.preventDefault(); this.advance(); });
  }

  /** lines: [{who:'abuelo', text:'...'}] */
  start(lines, onDone) {
    this.queue = lines.slice();
    this.onDone = onDone || null;
    this.active = true;
    this.el.classList.remove('hidden');
    this.next();
  }

  next() {
    if (!this.queue.length) { this.close(); return; }
    this.current = this.queue.shift();
    this.shown = 0;
    this.timer = 0;
    this.cooldown = 0.12;
    const sp = SPEAKERS[this.current.who] || { name: this.current.who.toUpperCase(), color: '#fff' };
    this.nameEl.textContent = sp.name;
    this.nameEl.style.color = sp.color;
    this.textEl.classList.toggle('narrator', !!sp.narrator);
    this.isNarrator = !!sp.narrator;
    const mood = moodFor(this.current);
    drawPortrait(this.portrait, this.current.who, mood);
    const frame = this.portrait.parentElement;
    frame.className = 'portrait-frame';
    if (mood) { void frame.offsetWidth; frame.classList.add('mood-' + mood); }
    this.contEl.style.visibility = 'hidden';
    this.render();
  }

  advance() {
    if (!this.active || this.cooldown > 0) return;
    if (this.shown < this.current.text.length) {
      this.shown = this.current.text.length;
      this.render();
    } else {
      AudioFX.sfx.select();
      this.next();
    }
  }

  update(dt) {
    if (!this.active) return;
    if (this.cooldown > 0) this.cooldown -= dt;
    const len = this.current.text.length;
    const ff = this.game.fastForward;
    if (this.shown < len) {
      this.timer += dt;
      const cps = Settings.textCps;
      if (cps === Infinity) { this.shown = len; this.render(); return; }
      const step = 1 / (ff ? cps * 3 : cps);
      while (this.timer >= step && this.shown < len) {
        this.timer -= step;
        this.shown++;
        if (!ff && this.shown % 3 === 0 && this.current.text[this.shown - 1] !== ' ') AudioFX.sfx.blip();
      }
      this.render();
      this.autoT = 0;
    } else if (ff) {
      // adelantando: pasa sola a la siguiente línea tras un instante
      this.autoT = (this.autoT || 0) + dt;
      if (this.autoT > 0.55) { this.autoT = 0; this.next(); }
    }
  }

  render() {
    const txt = this.current.text.slice(0, this.shown);
    this.textEl.textContent = this.isNarrator ? txt : '“' + txt + (this.shown >= this.current.text.length ? '”' : '');
    this.contEl.style.visibility = this.shown >= this.current.text.length ? 'visible' : 'hidden';
  }

  close() {
    this.active = false;
    this.current = null;
    this.el.classList.add('hidden');
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  }

  /** Cierra sin ejecutar el callback (al cambiar de escena o reiniciar). */
  cancel() {
    this.queue = [];
    this.onDone = null;
    this.active = false;
    this.current = null;
    this.el.classList.add('hidden');
  }
}
