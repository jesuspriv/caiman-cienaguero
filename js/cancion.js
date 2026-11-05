'use strict';
/* =========================================================
   cancion.js — La música de la danza del Caimán Cienaguero
   suena de fondo en el capítulo de la fiesta.

   1) Primero intenta el archivo del proyecto: audio/danza-caiman.mp3
      (funciona sin internet y abriendo el juego con doble clic).
   2) Si ese archivo no está, usa el reproductor oficial de YouTube,
      pequeño en una esquina con el crédito del canal.
   3) Si tampoco hay YouTube, o el jugador cierra el recuadro, suena
      la cumbia original del juego como antes.
   ========================================================= */

const Cancion = (() => {
  const VIDEO = 'rtkarkCPNEE';
  const CANAL = 'DANZAS FOLCLÓRICAS DE COLOMBIA';
  let api = 'idle';           // idle | loading | ready | failed
  let player = null, card = null;
  let sonando = false;        // YouTube ya produjo sonido al menos una vez
  let quitada = false;        // el jugador cerró el recuadro en esta visita a la fiesta
  let pedida = null;          // la música que pidió el juego
  let origMusic = null, quiere = false, loadT = 0, enFiesta = false;
  let lastVol = -1;
  const ARCHIVO = 'audio/danza-caiman.mp3';
  let local = null, localOk = null, localSonando = false, localQuiere = false, retryT = 0;   // localOk: null = cargando

  function loadLocal() {
    local = new Audio(ARCHIVO);
    local.loop = true; local.preload = 'auto';
    local.addEventListener('canplay', () => { localOk = true; });
    local.addEventListener('error', () => { localOk = false; localSonando = false; console.info('No está ' + ARCHIVO + ': se usa YouTube.'); route(); });
    local.addEventListener('playing', () => { if (!localSonando) { localSonando = true; route(); } });
  }
  function updateLocal(fiesta, debe) {
    const vol = AudioFX.muted ? 0 : Settings.data.music / 10 * 0.8;
    if (Math.abs(local.volume - vol) > 0.001) local.volume = vol;
    retryT -= 1 / 60;
    if (debe && (!localQuiere || (local.paused && retryT <= 0))) {
      localQuiere = true; retryT = 1;
      local.play().catch(() => { /* el navegador aún no deja sonar: se reintenta */ });
    } else if (!debe && localQuiere) { localQuiere = false; local.pause(); }
  }

  /** El juego pide música con AudioFX.music(); aquí se decide si la
      cumbia sintetizada calla para dejar sonar la canción. */
  function hook() {
    if (origMusic) return;
    origMusic = AudioFX.music;
    AudioFX.music = name => { pedida = name || null; route(); };
  }
  const activa = () => localSonando || (sonando && !quitada && api === 'ready');
  function route() { origMusic(pedida === 'fiesta' && activa() ? null : pedida); }

  function buildCard() {
    card = document.createElement('div');
    card.id = 'yt-card';
    card.className = 'hidden';
    card.innerHTML =
      '<div class="yt-title">♪ Música de la danza del Caimán</div>' +
      '<div class="yt-frame"><div id="yt-player"></div></div>' +
      '<div class="yt-foot"><span>Video: ' + CANAL + ' · YouTube</span>' +
      '<button type="button" class="yt-close" title="Quitar la canción y volver a la música del juego">✕</button></div>';
    document.getElementById('game-container').appendChild(card);
    card.querySelector('.yt-close').addEventListener('click', e => {
      e.stopPropagation();
      quitada = true;
      if (player && player.pauseVideo) player.pauseVideo();
      card.classList.add('hidden');
      route();
    });
  }

  function load() {
    api = 'loading'; loadT = 0;
    if (!navigator.onLine) { fail('sin internet'); return; }
    buildCard();
    const create = () => {
      try {
        player = new YT.Player('yt-player', {
          width: '100%', height: '100%', videoId: VIDEO,
          playerVars: { autoplay: 0, controls: 1, loop: 1, playlist: VIDEO, rel: 0, modestbranding: 1, playsinline: 1, fs: 0 },
          events: {
            onReady: () => { api = 'ready'; lastVol = -1; },
            onError: e => fail('error ' + e.data),
            onStateChange: e => {
              if (e.data === YT.PlayerState.PLAYING && !sonando) { sonando = true; route(); }
            }
          }
        });
      } catch (e) { fail(e.message); }
    };
    if (window.YT && YT.Player) { create(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); create(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => fail('no cargó la API');
    document.head.appendChild(s);
  }

  function fail(why) {
    if (api === 'failed') return;
    console.info('Canción de la fiesta no disponible (' + why + '): suena la música del juego.');
    api = 'failed'; sonando = false;
    if (card) card.classList.add('hidden');
    route();
  }

  /** Se llama cada cuadro desde el bucle principal. */
  function update(game, dt) {
    hook();
    const fiesta = !!game.scene && game.scene.constructor.name === 'FiestaScene' &&
      (game.state === 'playing' || game.state === 'paused');
    if (fiesta && !enFiesta) quitada = false;          // nueva visita: vuelve a ofrecerse
    enFiesta = fiesta;
    if (fiesta && !local) loadLocal();
    if (local && localOk !== false) {                 // el archivo del proyecto manda
      updateLocal(fiesta, fiesta && game.state === 'playing' && pedida === 'fiesta');
      return;
    }
    if (fiesta && api === 'idle') load();
    if (api === 'loading') { loadT += dt; if (loadT > 12) fail('tardó demasiado'); }
    if (card) card.classList.toggle('hidden', !(fiesta && api === 'ready' && !quitada));
    if (api !== 'ready' || !player || !player.getPlayerState) return;

    // suena solo en la fiesta, sin pausa y sin minijuego con su propio ritmo
    const debe = fiesta && !quitada && game.state === 'playing' && pedida === 'fiesta';
    if (debe !== quiere) {
      quiere = debe;
      if (debe) player.playVideo(); else player.pauseVideo();
    }
    const vol = AudioFX.muted ? 0 : Math.round(Settings.data.music * 7);   // 0..70
    if (vol !== lastVol) { lastVol = vol; player.setVolume(vol); if (vol) player.unMute(); else player.mute(); }
  }

  return { update, hook, get activa() { return activa(); } };
})();
Cancion.hook();
