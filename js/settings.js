'use strict';
/* =========================================================
   settings.js — Opciones del jugador (volumen, velocidad del
   texto, efectos de pantalla, flecha de objetivo).
   Se guardan en localStorage para la próxima vez.
   ========================================================= */

const TEXT_SPEEDS = [
  { id: 'lento', label: 'LENTO', cps: 24 },
  { id: 'normal', label: 'NORMAL', cps: 42 },
  { id: 'rapido', label: 'RÁPIDO', cps: 75 },
  { id: 'instantaneo', label: 'INSTANTÁNEO', cps: Infinity }
];

/* Niveles de dificultad: el fácil está pensado para niños pequeños. */
const DIFFICULTIES = [
  { id: 'facil', label: 'FÁCIL (NIÑOS)', desc: 'El agua no quita vidas, el caimán es más lento y los retos dan más tiempo.',
    caiman: 0.75, detect: 0.8, warn: 1.8, water: false, verseTime: 22, drumWin: 1.45, danceLives: 5, canoe: 0.82, tag: 28 },
  { id: 'normal', label: 'NORMAL', desc: 'La aventura como fue pensada.',
    caiman: 1, detect: 1, warn: 1.2, water: true, verseTime: 14, drumWin: 1, danceLives: 3, canoe: 1, tag: 20 },
  { id: 'dificil', label: 'DIFÍCIL', desc: 'Caimán más rápido y atento, y menos tiempo en los retos.',
    caiman: 1.2, detect: 1.2, warn: 0.85, water: true, verseTime: 9, drumWin: 0.78, danceLives: 2, canoe: 1.18, tag: 15 }
];

const Settings = (() => {
  const KEY = 'caiman_opciones_v1';
  const defaults = { music: 8, sfx: 8, text: 'normal', effects: true, gfx: true, arrow: true, difficulty: 'normal' };
  let data = Object.assign({}, defaults);
  try { Object.assign(data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sin almacenamiento */ }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sin almacenamiento */ } }
  function apply() { AudioFX.setVolumes(data.music / 10, data.sfx / 10); }

  /** Cambia una opción: dir = +1 / -1 (las de sí/no simplemente se alternan). */
  function change(key, dir = 1) {
    if (key === 'music' || key === 'sfx') data[key] = clamp(data[key] + dir, 0, 10);
    else if (key === 'text') {
      const i = TEXT_SPEEDS.findIndex(s => s.id === data.text);
      data.text = TEXT_SPEEDS[(i + dir + TEXT_SPEEDS.length) % TEXT_SPEEDS.length].id;
    } else if (key === 'difficulty') {
      const i = DIFFICULTIES.findIndex(d => d.id === data.difficulty);
      data.difficulty = DIFFICULTIES[(i + dir + DIFFICULTIES.length) % DIFFICULTIES.length].id;
    } else data[key] = !data[key];
    save(); apply();
  }

  function label(key) {
    const v = data[key];
    if (key === 'music' || key === 'sfx') return '■'.repeat(v) + '□'.repeat(10 - v);
    if (key === 'difficulty') return (DIFFICULTIES.find(d => d.id === v) || DIFFICULTIES[1]).label;
    if (key === 'text') return (TEXT_SPEEDS.find(s => s.id === v) || TEXT_SPEEDS[1]).label;
    if (key === 'gfx') return v ? 'MEJORADOS' : 'CLÁSICOS';
    return v ? 'SÍ' : 'NO';
  }

  return {
    get data() { return data; },
    get diff() { return DIFFICULTIES.find(d => d.id === data.difficulty) || DIFFICULTIES[1]; },
    get textCps() { return (TEXT_SPEEDS.find(s => s.id === data.text) || TEXT_SPEEDS[1]).cps; },
    change, label, apply
  };
})();
