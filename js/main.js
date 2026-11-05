'use strict';
/* =========================================================
   main.js — Arranque: escalado de pantalla, teclado,
   controles táctiles y bucle principal (requestAnimationFrame).
   ========================================================= */

(function () {
  const container = document.getElementById('game-container');
  let game = null;

  /* ---------- Escalado manteniendo 16:9 ---------- */
  function resize() {
    const s = Math.min(window.innerWidth / 960, window.innerHeight / 540);
    container.style.width = Math.floor(960 * s) + 'px';
    container.style.height = Math.floor(540 * s) + 'px';
    container.style.setProperty('--u', s.toFixed(4));
    if (game) game.setRenderScale(renderScale(s));
  }
  // resolución interna según el tamaño real en pantalla (máx. 2.5x)
  function renderScale(s) {
    const r = s * (window.devicePixelRatio || 1);
    return Math.max(1, Math.min(2.5, Math.round(r * 4) / 4));
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- Teclado ---------- */
  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run'
  };

  window.addEventListener('keydown', e => {
    if (!game) return;
    AudioFX.init();
    const code = e.code;
    if (code.startsWith('Arrow') || code === 'Space') e.preventDefault();

    if (game.state !== 'playing') {
      if (code === 'Escape' && game.ui.current === 'album') { game.ui.action('album-back'); return; }
      if (code === 'Escape' && game.ui.current === 'options') { game.ui.action('options-back'); return; }
      if (code === 'Escape' && game.ui.current === 'quiz') { game.ui.action('quiz-back'); return; }
      if (code === 'Escape' && (game.ui.current === 'credits' || game.ui.current === 'instructions')) { game.ui.action('back'); return; }
      if (code === 'Escape' && game.state === 'paused') { game.togglePause(); return; }
      if (!e.repeat) game.ui.handleMenuKey(code);
      return;
    }
    if (code === 'Escape') { game.togglePause(); return; }
    if ((code === 'KeyQ' || code === 'Tab') && !e.repeat) { e.preventDefault(); game.toggleMap(); return; }
    if (game.mapOpen) return;
    // minijuegos con teclas propias (el verseador usa flechas y 1-2-3)
    if (game.minigame && game.minigame.key && !e.repeat && game.minigame.key(code)) return;
    if (code === 'KeyM') { const m = AudioFX.toggleMute(); document.getElementById('btn-mute').textContent = 'SONIDO: ' + (m ? 'NO' : 'SÍ'); return; }
    if (KEYMAP[code]) game.input[KEYMAP[code]] = true;
    if (ACTION_KEYS.includes(code) && !e.repeat) { game.setHold(true); game.onAction(); }
  });

  const ACTION_KEYS = ['KeyE', 'Enter', 'Space'];
  window.addEventListener('keyup', e => {
    if (!game) return;
    if (KEYMAP[e.code]) game.input[KEYMAP[e.code]] = false;
    if (ACTION_KEYS.includes(e.code)) game.setHold(false);
  });
  window.addEventListener('blur', () => game && game.clearInput());

  /* ---------- Controles táctiles ---------- */
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const touch = document.getElementById('touch-controls');
  function setupTouch() {
    touch.querySelectorAll('[data-dir]').forEach(btn => {
      const dir = btn.dataset.dir;
      const on = e => {
        e.preventDefault(); AudioFX.init(); game.input[dir] = true; btn.classList.add('pressed');
        if (game.minigame && game.minigame.key) game.minigame.key({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir]);
      };
      const off = e => { e.preventDefault(); game.input[dir] = false; btn.classList.remove('pressed'); };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointerleave', off);
      btn.addEventListener('pointercancel', off);
    });
    // correr en táctil: botón que se activa y desactiva
    const run = document.getElementById('t-run');
    run.addEventListener('pointerdown', e => {
      e.preventDefault(); AudioFX.init();
      game.touchRun = !game.touchRun; game.input.run = game.touchRun;
      run.classList.toggle('pressed', game.touchRun);
    });
    const act = document.getElementById('t-action');
    act.addEventListener('pointerdown', e => { e.preventDefault(); AudioFX.init(); act.classList.add('pressed'); game.setHold(true); game.onAction(); });
    const release = () => { act.classList.remove('pressed'); game.setHold(false); };
    act.addEventListener('pointerup', release);
    act.addEventListener('pointerleave', release);
    act.addEventListener('pointercancel', release);
  }

  /* ---------- Clic sobre el canvas (opciones del verseador) ---------- */
  document.getElementById('game').addEventListener('pointerdown', e => {
    if (!game || !game.minigame || !game.minigame.click) return;
    const r = e.target.getBoundingClientRect();
    game.minigame.click((e.clientX - r.left) / r.width * 960, (e.clientY - r.top) / r.height * 540);
  });
  document.getElementById('btn-map-hud').addEventListener('click', () => { AudioFX.init(); game && game.toggleMap(); });

  /* ---------- Bucle principal ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // mantener E durante una cinemática o diálogo: el tiempo corre 4 veces más rápido
    const steps = game.fastForward ? 4 : 1;
    for (let i = 0; i < steps; i++) game.update(dt);
    game.draw();
    if (typeof FX !== 'undefined') FX.render(dt);
    Cancion.update(game, dt);
    if (isTouch) touch.classList.toggle('hidden', game.state !== 'playing');
    requestAnimationFrame(loop);
  }

  /* ---------- Inicio (espera breve a las fuentes pixel) ---------- */
  function start() {
    game = new Game();
    Settings.apply();
    window.game = game; // útil para depurar desde la consola
    if (typeof FX !== 'undefined') FX.init(game);
    resize();
    setupTouch();
    game.ui.showScreen('menu');
    requestAnimationFrame(t => { last = t; loop(t); });
  }

  const fontsReady = document.fonts
    ? Promise.all([document.fonts.load('10px "Fredoka"'), document.fonts.load('20px "Nunito"')]).catch(() => {})
    : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]).then(start);
})();
