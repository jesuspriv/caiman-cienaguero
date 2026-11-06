'use strict';
/* =========================================================
   main.js — Arranque: escalado de pantalla, teclado,
   controles táctiles y bucle principal (requestAnimationFrame).
   ========================================================= */

(function () {
  const container = document.getElementById('game-container');
  let game = null;

  const IS_TOUCH_UI = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  /* ---------- Escalado manteniendo 16:9 ---------- */
  function resize() {
    const s = Math.min(window.innerWidth / 960, window.innerHeight / 540);
    container.style.width = Math.floor(960 * s) + 'px';
    container.style.height = Math.floor(540 * s) + 'px';
    container.style.setProperty('--u', s.toFixed(4));
    container.classList.toggle('compact', s < 0.85);
    container.classList.toggle('touch', IS_TOUCH_UI);
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
      if (code === 'Escape' && game.ui.current === 'logros') { game.ui.action('logros-back'); return; }
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
    if (isTouch) {
      const mg = game.minigame;
      touch.classList.toggle('hidden', game.state !== 'playing' || game.dialogue.active || game.transitioning || !!game.chapter || game.mapOpen || !!(mg && mg.touchHide === 'all'));
      touch.classList.toggle('only-action', !!(mg && mg.touchHide === 'pad'));
    }
    requestAnimationFrame(loop);
  }

  /* ---------- Inicio (espera breve a las fuentes pixel) ---------- */
  function start() {
    game = new Game();
    Settings.apply();
    window.game = game; // útil para depurar desde la consola
    const fxReady = typeof FX !== 'undefined' ? FX.init(game) : Promise.resolve();
    Logros.init(game);
    resize();
    setupTouch();
    game.ui.showScreen('menu');
    requestAnimationFrame(t => { last = t; loop(t); });
    return fxReady;
  }

  /* ---------- Carga: letras, efectos y la canción de la fiesta ---------- */
  const timeout = ms => new Promise(r => setTimeout(r, ms));
  function preloadSong() {
    return new Promise(resolve => {
      const a = new Audio();
      a.preload = 'auto';
      a.addEventListener('canplaythrough', resolve, { once: true });
      a.addEventListener('error', resolve, { once: true });
      a.src = 'audio/danza-caiman.mp3';
      a.load();
    });
  }

  const fontsReady = document.fonts
    ? Promise.all([document.fonts.load('10px "Fredoka"'), document.fonts.load('20px "Nunito"')]).catch(() => {})
    : Promise.resolve();
  Carga.step(0.12, 'Preparando las letras…');
  Promise.race([fontsReady, timeout(1500)])
    .then(() => { Carga.step(0.4, 'Pintando las calles de Ciénaga…'); return { fx: start() }; })
    .then(o => Promise.race([o.fx, timeout(3000)]))
    .catch(() => {})
    .then(() => { Carga.step(0.7, 'Afinando los tambores…'); return Promise.race([preloadSong(), timeout(5000)]); })
    .then(() => Carga.done(() => { if (game && game.ui.current === 'menu') game.ui.animateIn(document.getElementById('menu')); }));
})();
