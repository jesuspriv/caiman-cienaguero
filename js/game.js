'use strict';
/* =========================================================
   game.js — Núcleo del juego: estados, escena activa, cámara,
   puntuación, vidas, interacción, cinemáticas y transiciones.
   ========================================================= */

const SAVE_KEY = 'caiman_partida_v1';

/* Títulos de capítulo: se muestran al entrar a cada escena. */
const CHAPTERS = {
  house: { num: 'CAPÍTULO 1', title: 'Una tarde con el abuelo', sub: 'Ciénaga, Magdalena — hoy',
    fact: 'Ciénaga queda en el Caribe colombiano, entre el mar y la Ciénaga Grande de Santa Marta.' },
  pueblo: { num: 'CAPÍTULO 2', title: 'Ciénaga de antaño', sub: 'Un 20 de enero, hace muchísimos años',
    fact: 'La historia de Tomasita no está en los libros: llegó hasta hoy contada de abuelos a nietos.' },
  puerto: { num: 'CAPÍTULO 3', title: 'El Puerto Cachimbero', sub: 'La noche de San Sebastián',
    fact: 'En la Ciénaga Grande hay pueblos palafitos: casas construidas sobre pilotes, en medio del agua.' },
  fiesta: { num: 'CAPÍTULO 4', title: 'La memoria se vuelve fiesta', sub: 'El Festival del Caimán Cienaguero',
    fact: 'En la danza del caimán, los «pescadores» persiguen al caimán con arpones de mentira, como en la búsqueda de aquella noche.' },
  'house:end': { num: 'CAPÍTULO 5', title: 'De regreso a casa', sub: 'Ciénaga, Magdalena — hoy',
    fact: 'Cada 20 de enero, día de San Sebastián, Ciénaga conmemora la Leyenda de Tomasita.' },
  'fiesta:hoy': { num: 'EPÍLOGO', title: 'El Festival de hoy', sub: 'Ciénaga, Magdalena — 20 de enero',
    fact: 'El Festival del Caimán Cienaguero fue declarado Patrimonio Cultural Inmaterial de la Nación.' }
};

/** Escribe texto centrado en varias líneas. */
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.W = 960; this.H = 540;
    this.setRenderScale(1);
    this.vignette = makeLayer(this.W, this.H, c => {
      const g = c.createRadialGradient(480, 270, 220, 480, 270, 620);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = g; c.fillRect(0, 0, 960, 540);
    });
    this.redVignette = makeLayer(this.W, this.H, c => {
      const g = c.createRadialGradient(480, 270, 200, 480, 270, 560);
      g.addColorStop(0, 'rgba(180,0,20,0)'); g.addColorStop(1, 'rgba(200,10,30,0.9)');
      c.fillStyle = g; c.fillRect(0, 0, 960, 540);
    });

    this.input = { up: false, down: false, left: false, right: false, run: false };
    this.ui = new UI(this);
    this.dialogue = new DialogueSystem(this);
    this.missions = new MissionSystem(this);
    this.album = new Album();
    this.minigame = null;
    this.hitStop = 0; this.hitFlash = 0; this.danger = 0;
    this.holdAction = false; this.holdStart = 0;   // mantener E = adelantar
    this.mapOpen = false;

    this.state = 'menu';            // menu | playing | paused | gameover | victory
    this.t = 0;
    this.scene = null;
    this.player = null;
    this.cam = { x: 0, y: 0 };
    this.fade = 0; this.white = 0; this.wave = 0; this.shake = 0;
    this.timers = []; this.tweens = []; this.floats = [];
    this.locked = false; this.transitioning = false;
    this.scriptToken = 0; this.transToken = 0;
    this.pendingBanner = null;
    this.target = null;
    this.resetProgress();
    AudioFX.music('calm');
  }

  /** Resolución interna: el canvas se dibuja al tamaño real de la pantalla. */
  setRenderScale(rs) {
    if (rs === this.rs) return;
    this.rs = rs;
    this.canvas.width = Math.round(this.W * rs);
    this.canvas.height = Math.round(this.H * rs);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.lightCanvas = makeLayer(this.W, this.H, null, rs);
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.buffer = document.createElement('canvas');
    this.buffer.width = this.canvas.width; this.buffer.height = this.canvas.height;
  }

  resetProgress() {
    this.score = 0; this.lives = 3; this.clues = 0; this.figs = 0; this.flags = {};
    this.missions.reset();
  }

  resetFx() {
    this.timers = []; this.tweens = []; this.floats = [];
    this.fade = 0; this.white = 0; this.wave = 0; this.shake = 0;
    this.chapter = null; this.chapterA = 0;
    this.minigame = null; this.hitStop = 0; this.hitFlash = 0; this.danger = 0;
    this.mapOpen = false;
    this.transitioning = false; this.locked = false; this.pendingBanner = null;
    this.scriptToken++; this.transToken++;
    this.dialogue.cancel();
    this.ui.clearTransient();
  }

  /* ================= Partida guardada ================= */
  saveGame() {
    if (this.state !== 'playing' || !this.scene) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, scene: this.sceneName, opts: this.sceneOpts, score: this.score, lives: this.lives,
        clues: this.clues, figs: this.figs, flags: this.flags, missions: this.missions.serialize(), date: Date.now()
      }));
    } catch (e) { /* sin almacenamiento */ }
  }
  loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.v === 1 ? s : null; } catch (e) { return null; }
  }
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorar */ } }

  /** Retoma la partida guardada al inicio de la escena donde iba, con lo ya logrado. */
  continueGame() {
    const s = this.loadSave();
    if (!s) { this.newGame(); return; }
    AudioFX.start();
    this.resetFx();
    this.resetProgress();
    this.score = s.score; this.clues = s.clues; this.figs = s.figs;
    this.lives = Math.max(1, s.lives);
    this.flags = s.flags || {};
    this.missions.restore(s.missions);
    this.ui.hideScreens();
    this.ui.showHUD(true);
    this.state = 'playing';
    this.loadScene(s.scene, s.opts || {});
    this.fade = 1; this.tween('fade', 1, 0, 1);
    this.ui.notify('PARTIDA CARGADA', 'info');
  }

  /* ================= Flujo general ================= */
  newGame() {
    AudioFX.start();
    this.resetFx();
    this.resetProgress();
    this.ui.hideScreens();
    this.ui.showHUD(true);
    this.state = 'playing';
    this.loadScene('house', { mode: 'start' }, true);
    this.fade = 1;
    this.transitioning = true;
    const token = ++this.transToken;
    (async () => {
      await this.showChapter();
      if (token !== this.transToken) return;
      await this.tween('fade', 1, 0, 1.2);
      if (token !== this.transToken) return;
      this.transitioning = false;
      this.scene.enter();
    })();
  }

  /** Tarjeta de capítulo sobre la pantalla en negro/blanco, entre escenas. */
  async showChapter() {
    const mode = this.sceneOpts && this.sceneOpts.mode;
    const ch = (mode && CHAPTERS[this.sceneName + ':' + mode]) || CHAPTERS[this.sceneName];
    if (!ch) return;
    const token = this.transToken;
    this.chapter = ch;
    this.ui.showHUD(false);
    AudioFX.sfx.chapter();
    await this.tween('chapterA', 0, 1, 0.6);
    if (token !== this.transToken) return;
    await this.wait(ch.fact ? 3.6 : 2);
    if (token !== this.transToken) return;
    this.ui.showHUD(true);
    this.tween('chapterA', 1, 0, 0.7).then(() => { if (this.chapterA <= 0.01) this.chapter = null; });
  }

  drawChapter(ctx) {
    const ch = this.chapter, a = this.chapterA || 0;
    if (!ch || a <= 0.01) return;
    const W = this.W, H = this.H, cx = W / 2;
    ctx.save();
    ctx.globalAlpha = a;
    const bg = ctx.createRadialGradient(cx, H / 2, 40, cx, H / 2, 620);
    bg.addColorStop(0, '#1d2a5a'); bg.addColorStop(1, '#070b1c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // brillo y figura de caimán tallada
    glow(ctx, cx, 168, 120, 'rgba(246,201,69,0.5)', 0.5);
    drawCaiman(ctx, cx + 6, 172, -0.08, this.t, { wood: true, scale: 0.9, amp: 3 });
    const rise = (1 - a) * 14;
    ctx.textAlign = 'center';
    ctx.font = '600 20px "Fredoka", sans-serif'; ctx.fillStyle = '#f6c945';
    ctx.fillText(ch.num, cx, 268 + rise);
    // líneas con rombos
    ctx.fillStyle = 'rgba(246,201,69,0.7)';
    ctx.fillRect(cx - 200, 262 + rise, 110, 2); ctx.fillRect(cx + 90, 262 + rise, 110, 2);
    [cx - 205, cx + 205].forEach(dx => { ctx.save(); ctx.translate(dx, 263 + rise); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); });
    ctx.font = '600 50px "Fredoka", sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(ch.title, cx + 3, 330 + rise + 3);
    ctx.fillStyle = '#fdf6e3'; ctx.fillText(ch.title, cx, 330 + rise);
    ctx.font = 'italic 600 19px "Nunito", sans-serif'; ctx.fillStyle = '#ffd9b0';
    ctx.fillText(ch.sub, cx, 372 + rise);
    // tira de colores del festival
    const cols = ['#e8313a', '#f6c945', '#1fb5b0', '#ff8aa8', '#3fa34d'];
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = cols[i % cols.length];
      const x = cx - 240 + i * 20;
      ctx.beginPath(); ctx.moveTo(x, 398); ctx.lineTo(x + 16, 398); ctx.lineTo(x + 8, 412 + Math.sin(this.t * 3 + i) * 2); ctx.fill();
    }
    // ¿Sabías que...? (dato real)
    if (ch.fact) {
      ctx.fillStyle = 'rgba(31,181,176,0.16)'; ctx.beginPath(); rrect(ctx, cx - 330, 432, 660, 64, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(127,224,216,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '600 13px "Fredoka", sans-serif'; ctx.fillStyle = '#7fe0d8';
      ctx.fillText('¿SABÍAS QUE...?', cx, 454);
      ctx.font = '600 15px "Nunito", sans-serif'; ctx.fillStyle = '#fdf6e3';
      wrapText(ctx, ch.fact, cx, 476, 620, 19);
    }
    ctx.restore();
  }

  loadScene(name, opts = {}, deferEnter = false) {
    this.scriptToken++;
    this.timers = [];
    this.dialogue.cancel();
    this.locked = false;
    this.target = null;
    this.floats = [];
    this.minigame = null; this.danger = 0;
    this.sceneName = name;
    this.sceneOpts = opts;
    this.snapshot = JSON.parse(JSON.stringify({
      score: this.score, clues: this.clues, figs: this.figs, flags: this.flags, missions: this.missions.serialize()
    }));
    this.scene = createScene(this, name, opts);
    this.scene.init();
    const sp = this.scene.spawn;
    this.player = new Player(sp.x, sp.y);
    this.player.dir = sp.dir || 'down';
    this.lastSafe = { x: sp.x, y: sp.y };
    this.updateCamera(0, true);
    AudioFX.music(this.scene.music);
    AudioFX.ambient(name);
    AudioFX.ambientNight = name === 'house' && opts.mode === 'end' ? 1 : 0;
    this.ui.updateAll();
    if (!deferEnter) this.scene.enter();
    this.saveGame();
  }

  /** Reintentar: vuelve al inicio de la escena actual con 3 vidas. */
  retry() {
    const s = this.snapshot;
    this.resetFx();
    this.score = s.score; this.clues = s.clues; this.figs = s.figs;
    this.flags = JSON.parse(JSON.stringify(s.flags));
    this.missions.restore(s.missions);
    this.lives = 3;
    this.ui.hideScreens();
    this.ui.showHUD(true);
    this.state = 'playing';
    this.loadScene(this.sceneName, this.sceneOpts);
    this.fade = 1; this.tween('fade', 1, 0, 0.8);
  }

  toMenu() {
    this.resetFx();
    AudioFX.ambient(null);
    this.state = 'menu';
    this.scene = null;
    this.ui.showHUD(false);
    this.ui.showScreen('menu');
    AudioFX.music('calm');
  }

  togglePause() {
    if (this.state === 'playing' && this.mapOpen) { this.mapOpen = false; return; }
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.showScreen('pause');
      this.clearInput();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.ui.hideScreens();
    }
  }

  gameOver() {
    this.state = 'gameover';
    AudioFX.music(null);
    AudioFX.ambient(null);
    AudioFX.sfx.gameover();
    this.ui.showGameOver();
  }

  finishGame() {
    this.clearSave();
    this.addScore(100, this.player.x, this.player.y - 60);
    this.ui.notify('¡HISTORIA COMPLETADA! +100', 'mission');
    this.unlockCard('festival');
    AudioFX.sfx.victory();
    this.locked = true;
    this.after(2.4, () => {
      this.state = 'victory';
      this.ui.showVictory();
    });
  }

  clearInput() {
    this.input.up = this.input.down = this.input.left = this.input.right = false;
    this.input.run = !!this.touchRun;
    this.setHold(false);
  }

  /** Mantener E (o el botón táctil) adelanta diálogos y cinemáticas. */
  setHold(v) { this.holdAction = v; this.holdStart = v ? performance.now() : 0; }
  get fastForward() {
    return this.state === 'playing' && this.holdAction && performance.now() - this.holdStart > 350 && !this.minigame &&
      (this.dialogue.active || this.locked || this.transitioning);
  }

  /* ================= Utilidades de cinemática ================= */
  wait(s) { return new Promise(r => this.timers.push({ t: s, fn: r })); }
  after(s, fn) { this.timers.push({ t: s, fn }); }
  say(lines) { return new Promise(r => this.dialogue.start(lines, r)); }

  tween(prop, from, to, dur) {
    this.tweens = this.tweens.filter(tw => tw.prop !== prop);
    this[prop] = from;
    return new Promise(resolve => this.tweens.push({ prop, from, to, dur, t: 0, resolve }));
  }

  /** Ejecuta una secuencia async bloqueando el control del jugador. */
  script(fn) {
    const token = ++this.scriptToken;
    this.locked = true;
    const alive = () => token === this.scriptToken;
    Promise.resolve()
      .then(() => fn(alive))
      .catch(e => console.error(e))
      .then(() => { if (alive()) this.locked = false; });
  }

  async transition(name, opts = {}, style = 'fade') {
    if (this.transitioning) return;
    this.transitioning = true;
    const token = ++this.transToken;
    if (style === 'magic') {
      AudioFX.sfx.magic();
      this.tween('wave', 0, 1, 1.6);
      await this.wait(0.7);
      if (token !== this.transToken) return;
      await this.tween('white', 0, 1, 0.9);
    } else {
      await this.tween('fade', this.fade, 1, 0.7);
    }
    if (token !== this.transToken) return;
    this.loadScene(name, opts, true);
    this.transitioning = true;
    await this.showChapter();
    if (token !== this.transToken) return;
    if (style === 'magic') {
      this.tween('wave', 0.7, 0, 1.1);
      await this.tween('white', 1, 0, 1.3);
    } else {
      await this.tween('fade', 1, 0, 0.8);
    }
    if (token !== this.transToken) return;
    this.transitioning = false;
    this.scene.enter();
  }

  /** Abre o cierra el mapa (solo en escenas grandes y con control libre). */
  toggleMap() {
    if (this.state !== 'playing' || !this.scene) return;
    if (this.mapOpen) { this.mapOpen = false; AudioFX.sfx.blip(); return; }
    if (!this.scene.mapLabels) { this.ui.notify('AQUÍ NO HACE FALTA MAPA', 'info'); return; }
    if (this.locked || this.transitioning || this.dialogue.active || this.minigame) return;
    this.mapOpen = true; this.clearInput(); AudioFX.sfx.select();
  }

  /** Cualquier minijuego (clase con update/draw/hit y opcionalmente key/click). */
  startMinigame(Cls) {
    return new Promise(resolve => {
      this.minigame = new Cls(this, res => { this.minigame = null; resolve(res); });
    });
  }

  /** ¿Lo completó todo? (final secreto) */
  secretReady() {
    const f = this.flags;
    return this.figs >= 6 && f.qCocos === 'done' && f.qRed === 'done' && !!f.versesDone && !!f.danceDone;
  }

  /** Minijuego del verseador: devuelve una promesa con el resultado. */
  startVerseGame() {
    return new Promise(resolve => {
      this.minigame = new VerseGame(this, res => { this.minigame = null; resolve(res); });
    });
  }

  /** Minijuego del tambor: devuelve una promesa con el resultado. */
  startDrumGame() {
    return new Promise(resolve => {
      this.minigame = new DrumGame(this, res => { this.minigame = null; resolve(res); });
    });
  }

  /* ================= Reglas del juego ================= */
  unlockCard(id, delay = 0.9) {
    const card = this.album.unlock(id);
    if (!card) return;
    const msg = { lugares: 'NUEVO LUGAR EN EL ÁLBUM: ', sabores: 'NUEVO SABOR EN EL ÁLBUM: ', palabras: 'PALABRA COSTEÑA NUEVA: ' }[card.cat] || 'NUEVA TARJETA DEL ÁLBUM: ';
    this.after(delay, () => {
      AudioFX.sfx.album();
      this.ui.notify(msg + card.title.toUpperCase(), 'album');
    });
  }

  /** Una palabra costeña aparece en un diálogo: se guarda en el álbum. */
  unlockWord(p) {
    if (this.album.has('p_' + p.id)) return;
    this.unlockCard('p_' + p.id, 0.2);
    this.addScore(5);
  }

  /** Probar una comida típica: diálogo, animación y, la primera vez, puntos y tarjeta. */
  taste(kind, lines = []) {
    return this.say(lines).then(() => {
      const p = this.player, sc = this.scene;
      if (!p || !sc) return;
      const t0 = sc.t, prop = { get y() { return p.y + 1; }, draw: ctx => {
        const k = Math.min(1, (sc.t - t0) / 0.35), bob = Math.sin((sc.t - t0) * 9) * 2;
        drawFood(ctx, kind, p.x, p.y - 74 - k * 10 + bob, 0.9 + k * 0.3);
      } };
      sc.props.push(prop);
      this.after(1.6, () => { sc.props = sc.props.filter(q => q !== prop); });
      AudioFX.sfx.pickup();
      setEmote(p, '♥', 1.8);
      sc.particles.emit(p.x, p.y - 70, { count: 16, color: ['#f6c945', '#ffe9a8', '#ff9aa4'], speed: 70, life: 0.9, glow: true });
      if (this.flags['sabor_' + kind]) return;
      this.flags['sabor_' + kind] = true;
      this.addScore(10, p.x, p.y - 90);
      this.ui.notify('¡QUÉ RICO! PROBASTE: ' + (SABORES[kind] || kind).toUpperCase() + ' +10', 'info');
      this.unlockCard('s_' + kind, 1.2);
    });
  }

  addScore(n, x, y) {
    this.score += n;
    this.ui.updateScore();
    if (x !== undefined) this.floats.push(new FloatText(x, y, '+' + n));
  }

  onMissionComplete(done, next) {
    this.after(0.1, () => this.saveGame());
    this.addScore(50);
    AudioFX.sfx.mission();
    this.ui.notify(`MISIÓN COMPLETADA +50`, 'mission');
    this.ui.updateMission(true);
    if (next) this.pendingBanner = next;
    if (done.id === 'tomasita') this.unlockCard('danza');
    if (this.scene) this.scene.onMission(done.id);
  }

  talkTo(npc) {
    AudioFX.sfx.talk();
    const p = this.player;
    npc.faceTowards(p.x, p.y);
    p.dir = dirTowards(npc.x - p.x, npc.y - p.y);
    const first = !this.flags['talk_' + npc.id];
    const lines = first ? npc.lines : (npc.repeatLines || [npc.lines[npc.lines.length - 1]]);
    this.dialogue.start(lines, () => {
      if (!first) return;
      this.flags['talk_' + npc.id] = true;
      this.addScore(10, npc.x, npc.y - 64);
      this.ui.notify(`HABLASTE CON ${npc.title.toUpperCase()} +10`, 'info');
      if (npc.mission) this.missions.addProgress(npc.mission);
    });
  }

  collect(item) {
    if (item.collected) return;
    item.collected = true;
    this.flags['item_' + item.id] = true;
    this.unlockCard(item.id);
    this.scene.particles.emit(item.x, item.y - 10, { count: 24, color: item.kind === 'clue' ? ['#f6c945', '#ffe9a8', '#e8613a'] : ['#1fb5b0', '#bff5ef', '#f6c945'], speed: 110, life: 0.9, glow: true });
    if (item.kind === 'clue') {
      this.clues++;
      this.ui.updateCounters();
      this.addScore(20, item.x, item.y - 30);
      this.ui.notify('PISTA ENCONTRADA +20', 'clue');
      setEmote(this.player, '!', 1.4);
      AudioFX.sfx.clue();
      this.dialogue.start([{ who: 'mateo', text: item.text }], () => this.missions.addProgress('pistas'));
    } else {
      this.figs++;
      this.ui.updateCounters();
      this.addScore(15, item.x, item.y - 30);
      this.ui.notify('FIGURITA DE CAIMÁN +15', 'info');
      setEmote(this.player, '♪', 1.4);
      AudioFX.sfx.pickup();
    }
  }

  damage(fromX, fromY, cause) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'playing' || this.lives <= 0) return;
    this.lives--;
    this.ui.updateLives(true);
    p.invuln = 2;
    if (cause === 'caiman') p.knockback(fromX, fromY, 420);
    this.shake = cause === 'caiman' ? 16 : 10;
    this.hitStop = cause === 'caiman' ? 0.12 : 0.06;
    this.hitFlash = 1;
    AudioFX.sfx.hurt();
    this.scene.particles.emit(p.x, p.y - 20, { count: 16, color: ['#ff4d5e', '#ffd0d6'], speed: 90, life: 0.7 });
    this.floats.push(new FloatText(p.x, p.y - 56, '-1 ♥', '#ff6b78'));
    this.ui.notify(cause === 'water' ? '¡CUIDADO CON EL AGUA! -1 ♥' : '¡EL CAIMÁN TE ALCANZÓ! -1 ♥', 'danger');
    if (this.lives <= 0) {
      this.locked = true;
      this.after(1, () => this.gameOver());
    }
  }

  fallInWater() {
    const p = this.player;
    AudioFX.sfx.smallSplash();
    this.scene.particles.emit(p.x, p.y - 4, { count: 22, color: ['#bfe9ff', '#ffffff', '#8fd3f0'], speed: 100, life: 0.8, gravity: 120 });
    this.scene.ripples.push({ x: p.x, y: p.y, r: 6, life: 1.2 });
    const wasInvuln = p.invuln > 0;
    if (!Settings.diff.water) { if (!wasInvuln) { p.invuln = 1; this.ui.notify('¡CUIDADO CON EL AGUA!', 'danger'); } }
    else if (!wasInvuln) this.damage(p.x, p.y, 'water');
    p.x = this.lastSafe.x; p.y = this.lastSafe.y;
    p.knockX = p.knockY = 0;
    if (wasInvuln) p.invuln = Math.max(p.invuln, 0.6);
  }

  /* ================= Bucle ================= */
  onAction() {
    if (this.state !== 'playing') return;
    if (this.minigame) { this.minigame.hit(); return; }
    if (this.dialogue.active) { this.dialogue.advance(); return; }
    if (this.locked || this.transitioning) return;
    if (this.target) this.target.interact(this);
  }

  update(dt) {
    this.t += dt;
    if (this.state !== 'playing' || !this.scene) return;
    if (this.mapOpen) return;   // el mundo se detiene mientras miras el mapa
    this.autoSaveT = (this.autoSaveT || 0) + dt;
    if (this.autoSaveT > 15 && !this.locked && !this.transitioning && !this.dialogue.active && !this.minigame) { this.autoSaveT = 0; this.saveGame(); }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    if (this.hitStop > 0) { this.hitStop -= dt; this.shake = Math.max(0, this.shake - dt * 25); return; }

    // temporizadores y tweens
    const due = [];
    for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); }
    if (due.length) { this.timers = this.timers.filter(tm => tm.t > 0); due.forEach(tm => tm.fn()); }
    for (const tw of this.tweens.slice()) {
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this[tw.prop] = lerp(tw.from, tw.to, e);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.resolve(); }
    }
    if (this.state !== 'playing' || !this.scene) return;

    this.dialogue.update(dt);
    if (this.minigame) this.minigame.update(dt);
    const free = !this.dialogue.active && !this.locked && !this.transitioning;
    this.player.update(dt, free ? this.input : null, this.scene);
    this.scene.update(dt);

    // agua: zona peligrosa
    const s = this.scene, p = this.player;
    if (s.water.length && !this.transitioning) {
      if (s.isWaterPoint(p.x, p.y - 3)) {
        this.fallInWater();
      } else {
        const r = 20;
        const safe = !s.isWaterPoint(p.x - r, p.y - 3) && !s.isWaterPoint(p.x + r, p.y - 3) &&
          !s.isWaterPoint(p.x, p.y - 3 - r) && !s.isWaterPoint(p.x, p.y - 3 + r);
        if (safe) { this.lastSafe.x = p.x; this.lastSafe.y = p.y; }
      }
    }

    this.target = free ? s.findInteractable(p) : null;
    const dWant = s.caiman ? s.caiman.danger(p) : 0;
    this.danger = lerp(this.danger, dWant, Math.min(1, dt * 4));
    this.floats.forEach(f => f.update(dt));
    this.floats = this.floats.filter(f => f.life > 0);
    this.updateCamera(dt);
    this.shake = Math.max(0, this.shake - dt * 25);

    if (this.pendingBanner && free) {
      this.ui.banner(this.pendingBanner.title, 'NUEVA MISIÓN');
      this.pendingBanner = null;
    }
  }

  get zoom() { return this.scene ? this.scene.zoom : 1; }
  get VW() { return this.W / this.zoom; }
  get VH() { return this.H / this.zoom; }

  updateCamera(dt, snap = false) {
    const s = this.scene, p = this.player;
    let tx = p.x - this.VW / 2, ty = p.y - 24 - this.VH / 2 + (s.camOffsetY || 0);
    tx = s.width <= this.VW ? (s.width - this.VW) / 2 : clamp(tx, 0, s.width - this.VW);
    ty = s.height <= this.VH ? (s.height - this.VH) / 2 : clamp(ty, 0, s.height - this.VH);
    if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
    const k = 1 - Math.pow(0.002, dt);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
  }

  draw() {
    const ctx = this.ctx, W = this.W, H = this.H;
    const rs = this.rs;
    ctx.setTransform(rs, 0, 0, rs, 0, 0);
    if (this.state === 'menu' || !this.scene) {
      drawMenuBackdrop(ctx, this.t);
      ctx.drawImage(this.vignette, 0, 0, W, H);
      return;
    }
    const fx = Settings.data.effects;     // Opciones: temblor y destellos
    const shk = fx ? this.shake : 0;
    const sx = shk ? (Math.random() - 0.5) * shk : 0;
    const sy = shk ? (Math.random() - 0.5) * shk : 0;
    const cam = { x: this.cam.x, y: this.cam.y };

    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-(cam.x + sx), -(cam.y + sy));
    this.scene.drawWorld(ctx, cam);
    if (this.target) this.drawPrompt(ctx, this.target);
    this.floats.forEach(f => f.draw(ctx));
    ctx.restore();

    this.scene.drawLighting(ctx, cam);
    this.drawGrade(ctx);
    ctx.drawImage(this.vignette, 0, 0, W, H);
    if (this.danger > 0.02) {
      ctx.globalAlpha = this.danger * (fx ? 0.45 + Math.sin(this.t * (this.danger > 0.5 ? 9 : 5)) * 0.15 : 0.35);
      ctx.drawImage(this.redVignette, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (fx && this.hitFlash > 0.01) { ctx.fillStyle = `rgba(255,40,60,${this.hitFlash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    this.drawObjective(ctx, cam);
    if (!this.minigame && !this.dialogue.active) this.scene.drawHUD(ctx);
    if (this.minigame) this.minigame.draw(ctx);

    if (this.wave > 0.01) {
      const b = this.buffer.getContext('2d');
      b.clearRect(0, 0, this.buffer.width, this.buffer.height);
      b.drawImage(this.canvas, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 3) {
        const off = Math.sin(y * 0.045 + this.t * 9) * this.wave * 26;
        ctx.drawImage(this.buffer, 0, y * rs, this.buffer.width, 3 * rs, off, y, W, 3);
      }
      ctx.fillStyle = `rgba(255,214,120,${this.wave * 0.25})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.white > 0.01) { ctx.fillStyle = `rgba(255,248,225,${this.white})`; ctx.fillRect(0, 0, W, H); }
    if (this.fade > 0.01) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, W, H); }
    if (this.mapOpen) drawSceneMap(ctx, this);
    this.drawChapter(ctx);
    if (this.fastForward) {
      ctx.save();
      ctx.font = '15px "Fredoka", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(7,13,34,0.8)'; ctx.beginPath(); rrect(ctx, W / 2 - 85, 352, 170, 30, 15); ctx.fill();
      ctx.fillStyle = '#f6c945';
      ctx.globalAlpha = 0.7 + Math.sin(this.t * 10) * 0.3;
      ctx.fillText('▶▶ ADELANTANDO', W / 2, 373);
      ctx.restore();
    }
  }

  /** Tono de color por escena (soft-light) y rayos de luz. */
  drawGrade(ctx) {
    const s = this.scene, W = this.W, H = this.H;
    const rk = s.rays === true ? 1 : (s.rays || 0);
    if (rk > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {
        const x0 = ((i * 260 + this.t * 6 - this.cam.x * 0.25) % 1300 + 1300) % 1300 - 260;
        const a = (0.06 + Math.sin(this.t * 0.6 + i * 1.7) * 0.03) * rk;
        const g = ctx.createLinearGradient(x0, 0, x0 + 260, H);
        g.addColorStop(0, `rgba(255,226,160,${a})`); g.addColorStop(1, 'rgba(255,226,160,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 70 + i * 8, 0); ctx.lineTo(x0 + 330, H); ctx.lineTo(x0 + 200, H); ctx.fill();
      }
      ctx.restore();
    }
    const gr = s.grade;
    if (!gr) return;
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = gr.a;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, gr.top); g.addColorStop(1, gr.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /**
   * Flecha de objetivo: si la meta está fuera de la pantalla, una flecha
   * en el borde apunta hacia ella; si está a la vista, un marcador rebota encima.
   */
  drawObjective(ctx, cam) {
    if (!Settings.data.arrow || this.dialogue.active || this.locked || this.transitioning || this.minigame || !this.scene.objective) return;
    const o = this.scene.objective();
    if (!o) return;
    const p = this.player, z = this.zoom, W = this.W, H = this.H;
    const sx = (o.x - cam.x) * z, sy = (o.y - (o.h || 40) - cam.y) * z;
    const L = 50, T = 128, R = W - 50, B = H - 50;
    const pulse = 0.5 + Math.sin(this.t * 5) * 0.5;
    if (sx > L && sx < R && sy > T && sy < B) {
      if (dist(p.x, p.y, o.x, o.y) < 80) return;
      const y = sy - 6 - pulse * 6;
      ctx.fillStyle = '#2a1a0c';
      ctx.beginPath(); ctx.moveTo(sx - 12, y - 14); ctx.lineTo(sx + 12, y - 14); ctx.lineTo(sx, y + 2); ctx.fill();
      ctx.fillStyle = '#f6c945';
      ctx.beginPath(); ctx.moveTo(sx - 8, y - 12); ctx.lineTo(sx + 8, y - 12); ctx.lineTo(sx, y - 2); ctx.fill();
      return;
    }
    // fuera de pantalla: flecha en el borde
    const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
    const k = Math.min(dx ? (dx > 0 ? R - cx : L - cx) / dx : Infinity, dy ? (dy > 0 ? B - cy : T - cy) / dy : Infinity);
    const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(ax, ay); ctx.rotate(a);
    glow(ctx, 0, 0, 30, 'rgba(246,201,69,0.9)', 0.25 + pulse * 0.25);
    ctx.fillStyle = '#2a1a0c';
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-12, -17); ctx.lineTo(-5, 0); ctx.lineTo(-12, 17); ctx.fill();
    ctx.fillStyle = '#f6c945';
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-8, -12); ctx.lineTo(-2, 0); ctx.lineTo(-8, 12); ctx.fill();
    ctx.restore();
  }

  /** Indicador "[E] Hablar" sobre el objetivo de interacción. */
  drawPrompt(ctx, o) {
    const top = o instanceof NPC ? o.y - 29 * o.scale - 36 : o.y - 46;
    const label = o.label;
    ctx.font = '11px "Fredoka", monospace';
    const tw = ctx.measureText(label).width;
    const w = tw + 34, h = 20;
    const x = Math.round(o.x - w / 2), y = Math.round(top - h + Math.sin(this.t * 5) * 2);
    ctx.fillStyle = 'rgba(9,14,34,0.9)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f6c945'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
    ctx.fillStyle = '#fdf6e3'; ctx.fillRect(x + 5, y + 4, 14, 12);
    ctx.fillStyle = '#101a3a'; ctx.textAlign = 'center'; ctx.fillText('E', x + 12, y + 14);
    ctx.fillStyle = '#fdf6e3'; ctx.textAlign = 'left'; ctx.fillText(label, x + 25, y + 14);
    ctx.fillStyle = 'rgba(9,14,34,0.9)';
    ctx.beginPath(); ctx.moveTo(o.x - 5, y + h); ctx.lineTo(o.x + 5, y + h); ctx.lineTo(o.x, y + h + 6); ctx.fill();
  }
}
