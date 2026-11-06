'use strict';
/* =========================================================
   logros.js — Medallas (logros) y disfraces de Mateo.
   Las medallas premian explorar, aprender y jugar bien; varias
   desbloquean un disfraz típico de la fiesta. Todo se guarda en
   el navegador (localStorage) y se conserva entre partidas.
   ========================================================= */

/* ---------- Disfraces ---------- */
const MATEO_BASE = Object.assign({}, LOOKS.mateo);
const BODY = { skin: MATEO_BASE.skin, hair: MATEO_BASE.hair, hairStyle: 'short' };
const DISFRACES = [
  { id: 'clasico', name: 'Mateo de siempre', desc: 'Camiseta, mochila y sombrero vueltiao.',
    look: MATEO_BASE },
  { id: 'cumbiambero', name: 'Cumbiambero', logro: 'tambor', desc: 'Camisa y pantalón blancos, pañoleta roja y vueltiao, como los bailadores de cumbia.',
    look: Object.assign({}, BODY, { shirt: '#fdf6e3', shirtShade: '#d8d0bc', pants: '#fdf6e3', shoes: '#2a1a0e', hat: 'vueltiao', scarf: '#e8313a' }) },
  { id: 'pescador', name: 'Pescador de la Ciénaga', logro: 'pescador', desc: 'Sombrero de paja, camisa azul y la atarraya al hombro.',
    look: Object.assign({}, BODY, { shirt: '#2f8fb0', pants: '#e8dcc0', shoes: '#5a3a1a', hat: 'straw', net: true }) },
  { id: 'raspadero', name: 'Raspadero', logro: 'sabores', desc: 'Camisa blanca, pañoleta turquesa y sombrero de paja, listo para vender raspao en la plaza.',
    look: Object.assign({}, BODY, { shirt: '#fdf6e3', shirtShade: '#d8d0bc', pants: '#2b3448', shoes: '#3a2414', hat: 'straw', scarf: '#1fb5b0' }) },
  { id: 'guia', name: 'Guía de Ciénaga', logro: 'lugares', desc: 'Guayabera y vueltiao, como el abuelo, para mostrar el centro histórico.',
    look: Object.assign({}, BODY, { shirt: '#f4efe0', guayabera: true, pants: '#6b5a40', shoes: '#4a2e18', hat: 'vueltiao' }) },
  { id: 'colores', name: 'Vueltiao de colores', logro: 'palabras', desc: 'Sombrero vueltiao con franjas de colores, camisa amarilla y pañoleta turquesa.',
    look: Object.assign({}, BODY, { shirt: '#f6c945', shirtShade: '#c99a1f', pants: '#1f6f9a', shoes: '#ffffff', sole: '#9aa3ad', hat: 'vueltiao', hatColors: ['#e8313a', '#1fb5b0', '#3f9b3a'], scarf: '#1fb5b0' }) },
  { id: 'caiman', name: 'Máscara de caimán', logro: 'desfile', desc: 'La máscara verde del caimán, con dientes y todo, para salir en la Gran Parada.',
    look: Object.assign({}, BODY, { shirt: '#3f9b3a', shirtShade: '#2c6e2a', pants: '#f6c945', shoes: '#2a1a0e', caimanHat: true, scarf: '#f6c945' }) }
];

/* ---------- Medallas ---------- */
const LOGROS = [
  { id: 'llegada', icon: '⏳', title: 'Viajero del tiempo', desc: 'Llega a la Ciénaga de antaño.', check: g => !!g.flags.arrivedPueblo },
  { id: 'pistas', icon: '🔎', title: 'Detective de la memoria', desc: 'Encuentra la flor, la vela y la cinta.', check: g => g.clues >= 3 },
  { id: 'figuritas', icon: '🐊', title: 'Coleccionista de caimanes', desc: 'Encuentra las 6 figuritas de caimán.', check: g => g.figs >= 6 },
  { id: 'pescador', icon: '🎣', title: 'Amigo de los pescadores', desc: 'Devuélvele la atarraya al pescador.', check: g => g.flags.qRed === 'done' },
  { id: 'lugares', icon: '🏛️', title: 'Guía de Ciénaga', desc: 'Mira los 6 lugares reales del pueblo.', check: g => g.album.countIn('lugares') >= g.album.totalIn('lugares') },
  { id: 'sabores', icon: '🍽️', title: 'Paladar costeño', desc: 'Prueba las 7 comidas típicas.', check: g => g.album.countIn('sabores') >= g.album.totalIn('sabores') },
  { id: 'palabras', icon: '💬', title: 'Habla como cienaguero', desc: 'Aprende las 12 palabras costeñas.', check: g => g.album.countIn('palabras') >= g.album.totalIn('palabras') },
  { id: 'puerto', icon: '🌙', title: 'Silencioso como garza', desc: 'Cruza el Puerto Cachimbero sin perder una vida.', check: g => g.sceneName === 'fiesta' && !!g.flags.visitedPuerto && !g.flags.hurtPuerto },
  { id: 'tambor', icon: '🥁', title: 'Tamborero', desc: 'Toca el tambor alegre en la fiesta.', check: g => !!g.flags.drumDone },
  { id: 'ritmo', icon: '🎯', title: 'Ritmo perfecto', desc: 'Consigue 90 % o más en el tambor.', check: g => (g.flags.drumBest || 0) >= 90 },
  { id: 'verso', icon: '📜', title: 'Verseador mayor', desc: 'Rima todos los versos con el verseador.', check: g => (g.flags.versesBest || 0) >= VERSE_ROUNDS },
  { id: 'baile', icon: '💃', title: 'Rey de la cumbia', desc: 'Llega a la última ronda del baile.', check: g => (g.flags.danceBest || 0) >= DANCE_ROUNDS },
  { id: 'desfile', icon: '🎉', title: 'Rey del desfile', desc: 'Lleva el caimán hasta el final del desfile.', check: g => !!g.flags.paradeDone },
  { id: 'memoria', icon: '🧠', title: 'Guardián de la memoria', desc: 'Responde bien las 8 preguntas del quiz.', check: () => false },
  { id: 'final', icon: '🕯️', title: 'La historia no se olvida', desc: 'Termina la historia de Tomasita.', check: g => g.album.has('festival') },
  { id: 'secreto', icon: '🎁', title: 'El regalo del abuelo', desc: 'Consigue el final secreto.', check: g => g.album.has('secreto') },
  { id: 'album', icon: '📖', title: 'Álbum completo', desc: 'Desbloquea las 38 tarjetas del álbum.', check: g => g.album.count >= g.album.total }
];

const Logros = (() => {
  const KEY = 'caiman_logros_v1', KEY_D = 'caiman_disfraz_v1';
  let got = new Set(), disfraz = 'clasico', game = null, checkT = 0;
  try { JSON.parse(localStorage.getItem(KEY) || '[]').forEach(id => got.add(id)); } catch (e) { /* sin almacenamiento */ }
  try { disfraz = localStorage.getItem(KEY_D) || 'clasico'; } catch (e) { /* sin almacenamiento */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...got])); } catch (e) { /* ignorar */ } };

  const disfrazDe = id => DISFRACES.find(d => d.id === id) || DISFRACES[0];
  const disponible = d => !d.logro || got.has(d.logro);

  /** Aplica el disfraz elegido a Mateo (en el mundo, los retratos y los minijuegos). */
  function aplicar() {
    const d = disfrazDe(disfraz);
    LOOKS.mateo = disponible(d) ? d.look : MATEO_BASE;
    if (game && game.player) game.player.look = LOOKS.mateo;
  }

  function unlock(id) {
    if (got.has(id)) return false;
    const l = LOGROS.find(x => x.id === id); if (!l) return false;
    got.add(id); save();
    if (game) {
      AudioFX.sfx.mission();
      game.ui.notify('🏅 MEDALLA: ' + l.title.toUpperCase(), 'clue');
      const d = DISFRACES.find(x => x.logro === id);
      if (d) game.after(1.2, () => game.ui.notify('👕 NUEVO DISFRAZ: ' + d.name.toUpperCase() + ' (en MEDALLAS Y DISFRACES)', 'album'));
    }
    return true;
  }

  /** Revisa las medallas (se llama seguido mientras se juega). */
  function check(dt = 1) {
    if (!game || game.state !== 'playing' || !game.scene) return;
    checkT -= dt; if (checkT > 0) return;
    checkT = 0.5;
    for (const l of LOGROS) if (!got.has(l.id)) { try { if (l.check(game)) unlock(l.id); } catch (e) { /* condición aún no disponible */ } }
  }

  return {
    init(g) { game = g; aplicar(); },
    check, unlock, aplicar,
    has: id => got.has(id),
    get count() { return LOGROS.filter(l => got.has(l.id)).length; },
    get disfraz() { return disfraz; },
    disponible,
    elegir(id) {
      const d = disfrazDe(id); if (!disponible(d)) return false;
      disfraz = id; try { localStorage.setItem(KEY_D, id); } catch (e) { /* ignorar */ }
      aplicar(); return true;
    }
  };
})();
