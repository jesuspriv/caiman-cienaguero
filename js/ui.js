'use strict';
/* =========================================================
   ui.js — Interfaz en HTML sobre el canvas: HUD, menús,
   notificaciones, banners de misión y navegación con teclado.
   ========================================================= */

class UI {
  constructor(game) {
    this.game = game;
    this.$ = id => document.getElementById(id);
    this.hud = this.$('hud');
    this.heartsEl = this.$('lives-hearts');
    this.scoreEl = this.$('score-value');
    this.missionEl = this.$('mission-text');
    this.missionNumEl = this.$('mission-number');
    this.hintEl = this.$('mission-hint');
    this.cluesEl = this.$('clues-value');
    this.figsEl = this.$('figs-value');
    this.notifEl = this.$('notifications');
    this.bannerEl = this.$('mission-banner');
    this.bigEl = this.$('big-text');
    this.screens = ['menu', 'instructions', 'pause', 'gameover', 'victory', 'exit-screen', 'album', 'options', 'quiz', 'credits', 'logros'].map(id => this.$(id));
    this.focusIndex = 0;
    this.current = null;
    this.albumReturn = 'menu';
    this.buildAlbum();
    this.quiz = new Quiz(this);
    this.buildCredits();

    document.querySelectorAll('[data-action]').forEach(b => {
      b.addEventListener('click', () => { AudioFX.init(); AudioFX.sfx.select(); this.action(b.dataset.action); });
      b.addEventListener('mouseenter', () => { const list = this.visibleButtons(); this.setFocus(list.indexOf(b)); });
    });
    document.querySelectorAll('[data-opt]').forEach(b => {
      b.addEventListener('click', () => { AudioFX.init(); this.changeOption(b.dataset.opt, 1); });
      b.addEventListener('mouseenter', () => { const list = this.visibleButtons(); this.setFocus(list.indexOf(b)); });
    });
    this.$('btn-pause-hud').addEventListener('click', () => this.game.togglePause());
  }

  action(a) {
    const g = this.game;
    switch (a) {
      case 'play': g.newGame(); break;
      case 'continue': g.continueGame(); break;
      case 'quiz': this.quizReturn = this.current || 'menu'; this.showScreen('quiz'); this.quiz.start(); break;
      case 'quiz-next': this.quiz.next(); break;
      case 'quiz-back': this.showScreen(this.quizReturn || 'menu'); break;
      case 'credits': this.showScreen('credits'); break;
      case 'instructions': this.showScreen('instructions'); break;
      case 'exit':
        this.showScreen('exit-screen');
        try { window.close(); } catch (e) { /* el navegador puede bloquearlo */ }
        break;
      case 'back': this.showScreen('menu'); break;
      case 'resume': g.togglePause(); break;
      case 'mute': {
        const m = AudioFX.toggleMute();
        this.$('btn-mute').textContent = 'SONIDO: ' + (m ? 'NO' : 'SÍ');
        break;
      }
      case 'restart-scene': g.retry(); break;
      case 'retry': g.retry(); break;
      case 'menu': g.toMenu(); break;
      case 'album': this.openAlbum(); break;
      case 'album-back': this.showScreen(this.albumReturn); break;
      case 'logros': this.openLogros(); break;
      case 'logros-back': this.showScreen(this.logrosReturn || 'menu'); break;
      case 'options': this.optionsReturn = this.current || 'menu'; this.renderOptions(); this.showScreen('options'); break;
      case 'options-back': this.showScreen(this.optionsReturn || 'menu'); break;
    }
  }

  /* ---------- Pantallas ---------- */
  showScreen(id) {
    if (id === 'menu') this.refreshMenu();
    this.current = id;
    this.screens.forEach(s => s.classList.toggle('hidden', s.id !== id));
    this.setFocus(0);
    this.animateIn(document.getElementById(id));
  }
  /** Entrada animada de cada pantalla (GSAP): el panel rebota y los botones aparecen en cascada. */
  animateIn(el) {
    if (!el || !window.gsap) return;
    const panel = el.querySelector('.panel, .title-block');
    const btns = Array.from(el.querySelectorAll('.btn')).filter(b => !b.classList.contains('hidden'));
    gsap.killTweensOf([panel, ...btns]);
    if (panel) gsap.fromTo(panel, { y: 26, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.7)', clearProps: 'transform,opacity' });
    if (btns.length) gsap.fromTo(btns, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, delay: 0.12, ease: 'power2.out', clearProps: 'transform,opacity' });
  }
  /** Muestra CONTINUAR solo si hay una partida guardada. */
  refreshMenu() {
    const save = this.game.loadSave(), c = this.$('btn-continue'), p = this.$('btn-play');
    c.classList.toggle('hidden', !save);
    if (save) {
      const ch = CHAPTERS[save.scene + ':' + (save.opts && save.opts.mode)] || CHAPTERS[save.scene];
      c.innerHTML = 'CONTINUAR' + (ch ? `<small>${ch.num} · ${ch.title}</small>` : '');
    }
    p.textContent = save ? 'NUEVA PARTIDA' : 'JUGAR';
  }
  buildCredits() {
    const ul = this.$('credits-photos');
    // agrupadas por autor y licencia, para que quepan todas
    const groups = new Map();
    ALBUM_CARDS.filter(c => c.photo).forEach(c => {
      const k = `${c.photo.author} (${c.photo.license})`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c.title);
    });
    groups.forEach((titles, k) => {
      const li = document.createElement('li');
      const b = document.createElement('b'); b.textContent = k + ': ';
      li.append(b, titles.join(', ') + '.');
      ul.appendChild(li);
    });
  }
  hideScreens() { this.current = null; this.screens.forEach(s => s.classList.add('hidden')); }
  showHUD(v) { this.hud.classList.toggle('hidden', !v); }

  visibleButtons() {
    const s = this.screens.find(el => !el.classList.contains('hidden'));
    return s ? Array.from(s.querySelectorAll('.btn')).filter(b => !b.classList.contains('hidden')) : [];
  }
  setFocus(i) {
    const list = this.visibleButtons();
    list.forEach(b => b.classList.remove('focused'));
    if (!list.length) return;
    this.focusIndex = (i + list.length) % list.length;
    list[this.focusIndex].classList.add('focused');
    if (list[this.focusIndex].dataset.card) this.showCard(list[this.focusIndex].dataset.card);
    if (list[this.focusIndex].dataset.disfraz) this.showDisfraz(list[this.focusIndex].dataset.disfraz);
  }
  /** Navegación de menús con teclado. Devuelve true si consumió la tecla. */
  handleMenuKey(code) {
    const list = this.visibleButtons();
    if (!list.length) return false;
    if (this.current === 'options' && list[this.focusIndex] && list[this.focusIndex].dataset.opt &&
        ['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(code)) {
      this.changeOption(list[this.focusIndex].dataset.opt, code === 'ArrowLeft' || code === 'KeyA' ? -1 : 1); return true;
    }
    if (this.current === 'menu' && (code === 'ArrowLeft' || code === 'KeyA')) { this.setFocus(this.focusIndex - 1); AudioFX.sfx.blip(); return true; }
    if (this.current === 'menu' && (code === 'ArrowRight' || code === 'KeyD')) { this.setFocus(this.focusIndex + 1); AudioFX.sfx.blip(); return true; }
    if ((this.current === 'album' || this.current === 'logros') && (code === 'ArrowLeft' || code === 'KeyA')) { this.setFocus(this.focusIndex - 1); AudioFX.sfx.blip(); return true; }
    if ((this.current === 'album' || this.current === 'logros') && (code === 'ArrowRight' || code === 'KeyD')) { this.setFocus(this.focusIndex + 1); AudioFX.sfx.blip(); return true; }
    if (code === 'ArrowUp' || code === 'KeyW') { this.setFocus(this.focusIndex - 1); AudioFX.sfx.blip(); return true; }
    if (code === 'ArrowDown' || code === 'KeyS') { this.setFocus(this.focusIndex + 1); AudioFX.sfx.blip(); return true; }
    if (code === 'Enter' || code === 'Space' || code === 'KeyE') { list[this.focusIndex].click(); return true; }
    return false;
  }

  /* ---------- Opciones ---------- */
  renderOptions() {
    document.querySelectorAll('[data-opt]').forEach(b => { b.querySelector('b').textContent = Settings.label(b.dataset.opt); });
    this.$('diff-hint').textContent = Settings.diff.desc;
  }
  changeOption(key, dir) {
    Settings.change(key, dir);
    this.renderOptions();
    AudioFX.sfx.blip();
  }

  /* ---------- Álbum de Ciénaga ---------- */
  buildAlbum() {
    const grid = this.$('album-grid'), tabs = this.$('album-tabs');
    grid.innerHTML = ''; tabs.innerHTML = '';
    this.albumTab = 'historia';
    ALBUM_TABS.forEach(tb => {
      const b = document.createElement('button');
      b.className = 'btn tab';
      b.dataset.tab = tb.id;
      b.addEventListener('click', () => { AudioFX.init(); AudioFX.sfx.blip(); this.setAlbumTab(tb.id, true); });
      b.addEventListener('mouseenter', () => { const list = this.visibleButtons(); this.setFocus(list.indexOf(b)); });
      tabs.appendChild(b);
    });
    const num = {};
    ALBUM_CARDS.forEach(c => {
      num[c.cat] = (num[c.cat] || 0) + 1;
      const b = document.createElement('button');
      b.className = 'btn card';
      b.dataset.card = c.id;
      b.dataset.cat = c.cat;
      b.innerHTML = `<span class="card-num">${num[c.cat]}</span><span class="card-name"></span>`;
      b.addEventListener('click', () => { AudioFX.init(); AudioFX.sfx.blip(); const list = this.visibleButtons(); this.setFocus(list.indexOf(b)); });
      b.addEventListener('mouseenter', () => { const list = this.visibleButtons(); this.setFocus(list.indexOf(b)); });
      grid.appendChild(b);
    });
  }
  openAlbum() {
    const album = this.game.album;
    this.albumReturn = this.current || 'menu';
    this.$('album-count').textContent = `${album.count}/${album.total}`;
    this.$('album-grid').querySelectorAll('.card').forEach(b => {
      const c = album.card(b.dataset.card), open = album.has(c.id);
      b.classList.toggle('locked', !open);
      b.querySelector('.card-name').textContent = open ? c.title : '???';
    });
    this.$('album-tabs').querySelectorAll('.tab').forEach(b => {
      const tb = ALBUM_TABS.find(x => x.id === b.dataset.tab);
      b.innerHTML = `${tb.label}<small>${album.countIn(tb.id)}/${album.totalIn(tb.id)}</small>`;
    });
    this.setAlbumTab(this.albumTab || 'historia', false);
    this.showScreen('album');
    this.focusFirstCard();
  }
  /** Muestra solo las tarjetas de una pestaña del álbum. */
  setAlbumTab(id, focus) {
    this.albumTab = id;
    this.$('album-tabs').querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    this.$('album-grid').querySelectorAll('.card').forEach(b => b.classList.toggle('hidden', b.dataset.cat !== id));
    if (focus) this.focusFirstCard();
  }
  focusFirstCard() {
    const list = this.visibleButtons(), i = list.findIndex(b => b.dataset.card);
    if (i >= 0) this.setFocus(i);
  }
  /* ---------- Medallas y disfraces ---------- */
  openLogros() {
    this.logrosReturn = this.current || 'menu';
    this.$('logros-count').textContent = `${Logros.count}/${LOGROS.length}`;
    const med = this.$('medallas'), info = this.$('medalla-info');
    med.innerHTML = '';
    LOGROS.forEach(l => {
      const d = document.createElement('div'), ok = Logros.has(l.id);
      d.className = 'medalla' + (ok ? ' ganada' : '');
      d.innerHTML = `<span class="m-icon"></span><span class="m-name"></span>`;
      d.querySelector('.m-icon').textContent = ok ? l.icon : '🔒';
      d.querySelector('.m-name').textContent = l.title;
      const show = () => {
        const dz = DISFRACES.find(x => x.logro === l.id);
        info.textContent = `${ok ? '🏅 ¡Ganada! ' : '🔒 '}${l.title}: ${l.desc}${dz ? ' Premio: disfraz «' + dz.name + '».' : ''}`;
      };
      d.addEventListener('mouseenter', show); d.addEventListener('click', show);
      med.appendChild(d);
    });
    info.textContent = 'Pasa el ratón (o toca) una medalla para ver cómo se gana.';
    const dis = this.$('disfraces');
    dis.innerHTML = '';
    DISFRACES.forEach(dz => {
      const b = document.createElement('button'), ok = Logros.disponible(dz);
      b.className = 'btn disfraz' + (ok ? '' : ' locked') + (Logros.disfraz === dz.id ? ' elegido' : '');
      b.dataset.disfraz = dz.id;
      const cv = document.createElement('canvas'); cv.width = 72; cv.height = 92;
      const cx = cv.getContext('2d');
      if (!ok) cx.filter = 'grayscale(1) brightness(0.45)';
      drawHumanoid(cx, 36, 86, dz.look, 'down', 0, false, 3.2, ok ? 'happy' : null);
      const n = document.createElement('span'); n.textContent = ok ? dz.name : '???';
      b.append(cv, n);
      b.addEventListener('click', () => {
        AudioFX.init();
        if (!Logros.elegir(dz.id)) { AudioFX.sfx.wrong(); return; }
        AudioFX.sfx.select();
        dis.querySelectorAll('.disfraz').forEach(x => x.classList.toggle('elegido', x === b));
        this.showDisfraz(dz.id);
      });
      b.addEventListener('mouseenter', () => { const list = this.visibleButtons(); this.setFocus(list.indexOf(b)); });
      dis.appendChild(b);
    });
    this.showScreen('logros');
    const list = this.visibleButtons(), i = list.findIndex(b => b.dataset.disfraz === Logros.disfraz);
    if (i >= 0) this.setFocus(i);
  }
  showDisfraz(id) {
    const dz = DISFRACES.find(x => x.id === id), ok = Logros.disponible(dz);
    const l = dz.logro && LOGROS.find(x => x.id === dz.logro);
    this.$('disfraz-info').textContent = ok
      ? `${dz.name}${Logros.disfraz === id ? ' (puesto)' : ' · Presiona E o haz clic para ponértelo'}: ${dz.desc}`
      : `🔒 Gana la medalla «${l.title}» para desbloquearlo: ${l.desc}`;
  }

  showCard(id) {
    const album = this.game.album, c = album.card(id), open = album.has(id);
    const cv = this.$('album-icon'), ctx = cv.getContext('2d');
    ctx.setTransform(cv.width / 160, 0, 0, cv.width / 160, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const g = ctx.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, open ? '#2a5a7a' : '#2a2a3a'); g.addColorStop(1, open ? '#0b2a40' : '#111118');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 120);
    if (open) {
      try { c.icon(ctx, 0); } catch (e) { /* ícono decorativo */ }
    } else {
      ctx.fillStyle = 'rgba(253,246,227,0.5)'; ctx.font = '54px "Fredoka", monospace'; ctx.textAlign = 'center';
      ctx.fillText('?', 80, 80);
    }
    // foto real (si la tarjeta tiene y hay internet); si no, queda la ilustración
    const img = this.$('album-photo'), credit = this.$('album-credit');
    img.classList.add('hidden'); credit.classList.add('hidden');
    cv.classList.remove('hidden');
    if (open && c.photo) {
      const ph = c.photo, token = (this._photoToken = (this._photoToken || 0) + 1);
      img.onload = () => {
        if (token !== this._photoToken) return;
        // panorámicas completas; las verticales, centradas un poco arriba
        img.style.objectFit = img.naturalWidth / img.naturalHeight > 2 ? 'contain' : 'cover';
        img.style.objectPosition = img.naturalHeight > img.naturalWidth ? '50% 30%' : '50% 50%';
        img.classList.remove('hidden'); cv.classList.add('hidden');
      };
      // primero la copia local; si falta, la de Wikimedia; si tampoco, la ilustración
      const local = 'assets/images/album/' + c.id + '.jpg';
      img.onerror = () => {
        if (token !== this._photoToken) return;
        if (img.src.endsWith(local)) { img.src = commonsPhotoUrl(ph.file); return; }
        img.classList.add('hidden'); cv.classList.remove('hidden');
      };
      img.alt = ph.caption;
      img.src = local;
      credit.innerHTML = '';
      const cap = document.createElement('span'); cap.textContent = ph.caption + ' ';
      const a = document.createElement('a');
      a.href = commonsPageUrl(ph.file); a.target = '_blank'; a.rel = 'noopener';
      a.textContent = `Foto: ${ph.author} · ${ph.license} · Wikimedia Commons`;
      credit.append(cap, a);
      credit.classList.remove('hidden');
    }
    this.$('album-title').textContent = open ? c.title : 'Tarjeta bloqueada';
    this.$('album-text').textContent = open ? c.text : 'Para desbloquearla: ' + c.how.toLowerCase() + '.';
  }

  /* ---------- HUD ---------- */
  updateLives(pop = false) {
    const g = this.game;
    let html = '';
    for (let i = 0; i < 3; i++) html += `<span class="heart${i >= g.lives ? ' lost' : ''}${pop && i === g.lives ? ' pop' : ''}">${i < g.lives ? '♥' : '♡'}</span>`;
    this.heartsEl.innerHTML = html;
  }
  updateScore() { this.scoreEl.textContent = this.game.score; }
  updateMission(flash = false) {
    const m = this.game.missions;
    this.missionEl.textContent = m.text();
    this.missionNumEl.textContent = `${Math.min(m.index + 1, m.total)}/${m.total}`;
    this.hintEl.textContent = m.hint || '';
    if (flash) { this.missionEl.classList.remove('flash'); void this.missionEl.offsetWidth; this.missionEl.classList.add('flash'); }
  }
  updateCounters() {
    this.cluesEl.textContent = `${this.game.clues}/3`;
    this.figsEl.textContent = `${this.game.figs}/6`;
  }
  updateAll() { this.updateLives(); this.updateScore(); this.updateMission(); this.updateCounters(); }

  /* ---------- Avisos ---------- */
  notify(text, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = text;
    this.notifEl.appendChild(el);
    while (this.notifEl.children.length > 3) this.notifEl.firstChild.remove();
    setTimeout(() => el.remove(), 2800);
  }
  banner(title, sub) {
    this.bannerEl.innerHTML = `<small>${sub}</small>${title}`;
    this.bannerEl.classList.remove('hidden');
    this.bannerEl.style.animation = 'none'; void this.bannerEl.offsetWidth; this.bannerEl.style.animation = '';
    clearTimeout(this._bt);
    this._bt = setTimeout(() => this.bannerEl.classList.add('hidden'), 3000);
  }
  bigText(text, soft = false) {
    this.bigEl.textContent = text;
    this.bigEl.classList.toggle('soft', soft);
    this.bigEl.classList.remove('hidden');
    this.bigEl.style.animation = 'none'; void this.bigEl.offsetWidth; this.bigEl.style.animation = '';
    clearTimeout(this._bg);
    this._bg = setTimeout(() => this.bigEl.classList.add('hidden'), 2600);
  }
  clearTransient() {
    this.notifEl.innerHTML = '';
    this.bannerEl.classList.add('hidden');
    this.bigEl.classList.add('hidden');
  }

  showGameOver() {
    this.$('go-score').textContent = this.game.score;
    this.showScreen('gameover');
  }
  showVictory() {
    const g = this.game;
    this.$('v-score').textContent = g.score;
    this.$('v-clues').textContent = `${g.clues}/3`;
    this.$('v-figs').textContent = `${g.figs}/6`;
    this.$('v-lives').textContent = g.lives;
    this.$('v-album').textContent = `${g.album.count}/${g.album.total}`;
    const sec = this.$('v-secret');
    sec.classList.toggle('found', !!g.flags.secretEnding);
    sec.textContent = g.flags.secretEnding
      ? '★ ¡Desbloqueaste el final secreto: el regalo del abuelo! ★'
      : 'Hay un final secreto para quien lo complete todo: las 6 figuritas, las misiones secundarias del pueblo y los retos del verseador y la bailadora.';
    this.showScreen('victory');
  }
}
