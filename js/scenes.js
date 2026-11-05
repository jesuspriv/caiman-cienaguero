'use strict';
/* =========================================================
   scenes.js — Escenarios del juego.
   BaseScene: colisiones, agua, iluminación, orden por profundidad.
   HouseScene (escenas 1 y 8), PuebloScene (2 y 3),
   PuertoScene (4, 5 y 6), FiestaScene (7) y fondo del menú (0).
   ========================================================= */

const MAP_CELL = 80;
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

/** Consejo del tutorial, abajo al centro de la pantalla. */
function drawTip(ctx, game, text, a = 1, y = 440) {
  const W = game.W;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = '600 15px "Nunito", sans-serif'; ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 40;
  ctx.fillStyle = 'rgba(7,13,34,0.82)'; ctx.beginPath(); rrect(ctx, W / 2 - w / 2, y, w, 34, 17); ctx.fill();
  ctx.strokeStyle = '#f6c945'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fdf6e3'; ctx.fillText(text, W / 2, y + 22);
  ctx.restore();
}

/** Zona de un juncal donde Mateo queda escondido. */
function reedRect(x, y) { return { x: x - 44, y: y - 20, w: 88, h: 40 }; }
function drawReedClump(ctx, x, y, t, seed, rustle) {
  const rnd = mulberry32(seed * 7 + 3);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 18, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 26; i++) {
    const bx = x - 40 + rnd() * 80, by = y + 10 + rnd() * 10, h = 40 + rnd() * 26;
    const sway = Math.sin(t * 1.6 + bx * 0.05) * 3 + (rustle ? Math.sin(t * 14 + i) * 3 : 0);
    ctx.strokeStyle = i % 3 ? '#2f5a30' : '#467a3c'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sway * 0.5, by - h * 0.6, bx + sway, by - h); ctx.stroke();
    if (i % 4 === 0) { ctx.fillStyle = '#6b4a22'; ctx.beginPath(); ctx.ellipse(bx + sway, by - h, 2.2, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}   // tamaño de las zonas visitadas del mapa

/** Mezcla tres colores hex según k (0 → a, 0.5 → b, 1 → c). */
function mixHex3(a, b, c, k) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [A, B] = k < 0.5 ? [p(a), p(b)] : [p(b), p(c)];
  const t = k < 0.5 ? k * 2 : (k - 0.5) * 2;
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
}

class BaseScene {
  constructor(game, opts = {}) {
    this.game = game;
    this.opts = opts;
    this.width = 960; this.height = 540;
    this.static = []; this.water = []; this.docks = [];
    this.npcs = []; this.items = []; this.interactables = []; this.props = [];
    this.triggers = []; this.lights = []; this.ripples = [];
    this.caiman = null;
    this.critters = [];       // gallinas y aves (fauna.js)
    this.swayPalms = null;    // copas de palmera que se mecen
    this.mapLabels = null;    // lugares que se nombran en el mapa
    this.particles = new Particles();
    this.darkness = 0; this.darkColor = '8,14,40'; this.tint = null;
    this.grade = null;    // tono de color de la escena { top, bottom, a }
    this.rays = false;    // rayos de luz diagonales
    this.playerLight = 0;
    this.music = 'calm';
    this.dusty = false;
    this.t = 0;
    this.spawn = { x: 480, y: 420, dir: 'up' };
    this.waterTop = 0; this.shoreY = 0;
    this.colliders = [];
    this.zoom = 1.5;
  }

  init() {
    this.build();
    const ls = worldLayerScale(this.width, this.height);
    this.bg = makeLayer(this.width, this.height, c => this.drawBackground(c), ls);
    this.top = makeLayer(this.width, this.height, c => this.drawTop(c), ls);
    this.refreshColliders();
  }

  // --- a sobrescribir ---
  build() {}
  drawBackground() {}
  drawTop() {}
  drawAnimated() {}
  enter() {}
  onMission() {}
  updateScene() {}
  /** Tipo de suelo bajo los pies (para el sonido de los pasos). */
  surfaceAt() { return 'dirt'; }
  /** Dibujo extra en pantalla (coordenadas 960x540), encima de la escena. */
  drawHUD() {}
  /** Meta actual para la flecha de objetivo: { x, y, h } o null. */
  objective() { return null; }
  nearestTo(list) {
    const p = this.game.player;
    let best = null, bd = Infinity;
    for (const o of list) { const d = dist(p.x, p.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  refreshColliders() {
    this.colliders = this.static.concat(this.npcs.filter(n => n.solid && !n.hidden).map(n => n.box()));
  }
  isDockPoint(x, y) { return this.docks.some(d => pointInRect(x, y, d)); }
  isWaterPoint(x, y) {
    if (this.isDockPoint(x, y)) return false;
    return this.water.some(w => pointInRect(x, y, w));
  }
  nearWater(x, y, r) {
    return this.water.some(w => {
      const dx = Math.max(w.x - x, 0, x - (w.x + w.w));
      const dy = Math.max(w.y - y, 0, y - (w.y + w.h));
      return dx * dx + dy * dy < r * r;
    });
  }

  findInteractable(p) {
    let best = null, bd = Infinity;
    const all = this.npcs.concat(this.items, this.interactables);
    for (const o of all) {
      if (!o.available) continue;
      const d = dist(p.x, p.y - 8, o.x, o.y - 8);
      if (d < (o.r || 46) && d < bd) { bd = d; best = o; }
    }
    return best;
  }

  addTrigger(rect, fn, cond = () => true, once = true) {
    this.triggers.push({ rect, fn, cond, once, fired: false });
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    this.npcs.forEach(n => n.update(dt, g));
    this.items.forEach(i => i.update(dt));
    this.interactables.forEach(i => i.update(dt));
    if (this.caiman) this.caiman.update(dt, g);
    this.critters.forEach(c => c.update(dt));
    this.particles.update(dt);
    // zonas visitadas (para el mapa)
    if (g.player && this.mapLabels) {
      const key = 'map_' + g.sceneName, seen = g.flags[key] || (g.flags[key] = {});
      const cx = Math.floor(g.player.x / MAP_CELL), cy = Math.floor(g.player.y / MAP_CELL);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) seen[(cx + dx) + ',' + (cy + dy)] = 1;
      if (this.mapSeeUp) for (let yy = 0; yy < cy; yy++) for (let dx = -2; dx <= 2; dx++) seen[(cx + dx) + ',' + yy] = 1;
    }
    this.ripples.forEach(r => { r.life -= dt; r.r += 22 * dt; });
    this.ripples = this.ripples.filter(r => r.life > 0);
    if (!g.locked && !g.transitioning && !g.dialogue.active) {
      for (const tr of this.triggers) {
        if (tr.fired && tr.once) continue;
        if (pointInRect(g.player.x, g.player.y, tr.rect) && tr.cond()) { tr.fired = true; tr.fn(); }
      }
    }
    this.updateScene(dt);
    this.refreshColliders();
  }

  drawWorld(ctx, cam) {
    const W = this.game.VW, H = this.game.VH;
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y);
    const sw = Math.min(W, this.width - sx), sh = Math.min(H, this.height - sy);
    blitLayer(ctx, this.bg, sx, sy, sw, sh);
    this.drawAnimated(ctx, cam);
    for (const r of this.ripples) {
      ctx.strokeStyle = `rgba(190,230,255,${r.life * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const ents = [this.game.player];
    for (const n of this.npcs) ents.push(n);
    for (const i of this.items) if (i.available) ents.push(i);
    for (const i of this.interactables) ents.push(i);
    for (const p of this.props) ents.push(p);
    for (const c of this.critters) if (!c.air) ents.push(c);
    if (this.caiman) ents.push(this.caiman);
    ents.sort((a, b) => (a.sortY !== undefined ? a.sortY : a.y) - (b.sortY !== undefined ? b.sortY : b.y));
    for (const e of ents) e.draw(ctx, this.game, this.t);
    if (this.swayPalms) for (const sp of this.swayPalms) sp.draw(ctx, this.t, cam, this.game);
    blitLayer(ctx, this.top, sx, sy, sw, sh);
    for (const c of this.critters) if (c.air) c.draw(ctx, this.game, this.t);
    this.particles.draw(ctx);
    this.drawAbove(ctx, cam);
  }
  drawAbove() {}

  dynamicLights() { return []; }

  /** Oscuridad con huecos de luz (destination-out) y brillo cálido aditivo. */
  drawLighting(ctx, cam) {
    const g = this.game, W = g.W, H = g.H;
    if (this.tint) { ctx.fillStyle = this.tint; ctx.fillRect(0, 0, W, H); }
    if (this.darkness <= 0) return;
    const lc = g.lightCtx;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = `rgba(${this.darkColor},${this.darkness})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const lights = this.lights.concat(this.dynamicLights());
    if (this.playerLight) lights.push({ x: g.player.x, y: g.player.y - 18, r: this.playerLight, i: 0.75 });
    const z = g.zoom;
    for (const L of lights) {
      const x = (L.x - cam.x) * z, y = (L.y - cam.y) * z;
      const r = z * L.r * (L.flicker ? 1 + Math.sin(this.t * 9 + L.x) * 0.04 + Math.sin(this.t * 23 + L.y) * 0.02 : 1);
      if (x < -r || y < -r || x > W + r || y > H + r) continue;
      const gr = lc.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${L.i || 1})`);
      gr.addColorStop(0.55, `rgba(0,0,0,${(L.i || 1) * 0.55})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = gr;
      lc.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.drawImage(g.lightCanvas, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.color) continue;
      const x = (L.x - cam.x) * z, y = (L.y - cam.y) * z, r = L.r * z;
      if (x < -r || y < -r || x > W + r || y > H + r) continue;
      glow(ctx, x, y, r * 0.6, L.color, 0.3);
      glow(ctx, x, y, r * 0.18, 'rgba(255,250,230,1)', 0.18);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Brillo animado sobre las zonas de agua visibles. */
  drawWaterShimmer(ctx, cam, color = 'rgba(160,220,255,0.35)') {
    const W = this.game.VW, H = this.game.VH;
    ctx.fillStyle = color;
    const y0 = Math.floor(cam.y / 16) * 16, x0 = Math.floor(cam.x / 48) * 48;
    for (let y = y0; y < cam.y + H; y += 16) {
      for (let x = x0; x < cam.x + W; x += 48) {
        const k = Math.sin(this.t * 1.6 + x * 0.05 + y * 0.31);
        if (k < 0.55) continue;
        const px = x + Math.sin(this.t * 0.8 + y) * 10 + ((y / 16) % 2) * 24;
        if (!this.isWaterPoint(px, y) || !this.isWaterPoint(px + 14, y)) continue;
        ctx.globalAlpha = (k - 0.55) * 2.2;
        ctx.fillRect(px | 0, y, 14, 2);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- utilidades de escenario ---------- */
function drawStreet(c, x, y, w, h, rnd) {
  c.fillStyle = '#d9bf8a'; c.fillRect(x, y, w, h);
  softPatches(c, x, y, w, h, ['rgba(255,236,190,0.5)', 'rgba(170,130,80,0.35)'], Math.max(2, (w * h) / 12000), rnd, 30, 80);
  speckle(c, x, y, w, h, ['#cbb07a', '#e6cfa0', '#bfa06a', '#d2b47c'], (w * h) / 110, rnd, 2);
  c.fillStyle = '#b8975e';
  if (w > h) { c.fillRect(x, y, w, 3); c.fillRect(x, y + h - 3, w, 3); c.fillStyle = 'rgba(150,115,70,0.35)'; c.fillRect(x, y + h * 0.35, w, 3); c.fillRect(x, y + h * 0.65, w, 3); }
  else { c.fillRect(x, y, 3, h); c.fillRect(x + w - 3, y, 3, h); c.fillStyle = 'rgba(150,115,70,0.35)'; c.fillRect(x + w * 0.35, y, 3, h); c.fillRect(x + w * 0.65, y, 3, h); }
}

function drawGrass(c, x, y, w, h, rnd, base = '#5f9e3f', specks = ['#6fb04a', '#518f36', '#7cc055', '#4a8030'], tuft = '#3f7a2a') {
  c.fillStyle = base; c.fillRect(x, y, w, h);
  softPatches(c, x, y, w, h, [shade(base, 0.14) + '55', shade(base, -0.08) + '40'], Math.max(3, (w * h) / 14000), rnd, 30, 80);
  speckle(c, x, y, w, h, specks, (w * h) / 420, rnd, 3);
  c.fillStyle = tuft;
  for (let i = 0; i < (w * h) / 5000; i++) {
    const tx = (x + rnd() * w) | 0, ty = (y + rnd() * h) | 0;
    c.fillRect(tx, ty, 1, 4); c.fillRect(tx + 2, ty - 1, 1, 5); c.fillRect(tx + 4, ty, 1, 4);
  }
}

/* El templete, la iglesia y el palacio están en plaza.js */

function drawSign(c, x, y, text) {
  c.fillStyle = '#4a2e16'; c.fillRect(x - 2, y, 4, 30);
  c.font = '10px "Fredoka", monospace'; c.textAlign = 'center';
  const hw = Math.max(58, c.measureText(text).width / 2 + 10);
  c.fillStyle = '#8a5a2b'; c.fillRect(x - hw, y - 18, hw * 2, 22);
  c.fillStyle = '#b07a43'; c.fillRect(x - hw, y - 18, hw * 2, 3);
  c.fillStyle = '#2a1a0c';
  c.fillText(text, x, y - 4);
}

/* =========================================================
   ESCENA 1 y 8 — CASA DEL ABUELO
   ========================================================= */
class HouseScene extends BaseScene {
  constructor(game, opts) {
    super(game, opts);
    this.end = opts.mode === 'end';
    this.music = 'calm';
    this.spawn = this.end ? { x: 480, y: 410, dir: 'down' } : { x: 480, y: 486, dir: 'up' };
    this.darkness = this.end ? 0.5 : 0.14;
    this.grade = this.end ? { top: '#6a86ff', bottom: '#241048', a: 0.4 } : { top: '#ffd08a', bottom: '#8a4a6a', a: 0.4 };
    this.rays = !this.end;
    this.darkColor = this.end ? '10,14,44' : '70,30,10';
    this.tint = this.end ? null : 'rgba(255,150,60,0.08)';
  }
  surfaceAt() { return 'wood'; }

  drawHUD(ctx) {
    const g = this.game, f = g.flags;
    if (this.end || g.locked || g.dialogue.active) return;
    const p = g.player;
    if (!f.tutMove) {
      if (dist(p.x, p.y, this.spawn.x, this.spawn.y) > 60) f.tutMove = true;
      else drawTip(ctx, g, IS_TOUCH ? 'Usa la cruceta para caminar' : 'Camina con  W A S D  o con las flechas', 0.75 + Math.sin(this.t * 4) * 0.25, 236);
    } else if (g.missions.isCurrent('abuelo') && g.target && g.target.who === 'abuelo') {
      drawTip(ctx, g, IS_TOUCH ? 'Toca el botón E para hablar' : 'Presiona  E  para hablar', 1, 236);
    } else if (g.missions.isCurrent('figura') && !f.tutRun) {
      drawTip(ctx, g, IS_TOUCH ? 'Sigue la flecha dorada hasta la figura' : 'Sigue la flecha dorada · mantén SHIFT para correr', 1, 236);
    }
  }

  build() {
    const g = this.game;
    this.static.push(
      { x: 0, y: 0, w: 960, h: 122 }, { x: 0, y: 0, w: 28, h: 540 }, { x: 932, y: 0, w: 28, h: 540 },
      { x: 0, y: 512, w: 436, h: 28 }, { x: 524, y: 512, w: 436, h: 28 }, { x: 436, y: 530, w: 88, h: 10 },
      { x: 400, y: 252, w: 160, h: 58 },   // mesa
      { x: 348, y: 262, w: 32, h: 34 }, { x: 580, y: 262, w: 32, h: 34 }, // taburetes
      { x: 58, y: 148, w: 206, h: 46 },    // hamaca
      { x: 786, y: 122, w: 146, h: 50 },   // fogón
      { x: 742, y: 232, w: 48, h: 40 },    // mecedora
      { x: 286, y: 420, w: 48, h: 28 },    // mesita del radio
      { x: 34, y: 440, w: 38, h: 40 }, { x: 888, y: 440, w: 38, h: 40 } // matas
    );

    const abuelo = new NPC({
      id: this.end ? 'abuelo_fin' : 'abuelo', who: 'abuelo', title: 'el abuelo', x: 712, y: 300, dir: 'left',
      mission: this.end ? null : 'abuelo', showMark: !this.end,
      lines: [
        { who: 'abuelo', mood: 'happy', text: 'Mateo, ¿alguna vez has escuchado la historia del Caimán Cienaguero?' },
        { who: 'mateo', text: 'No, abuelo. ¿Qué pasó?' },
        { who: 'abuelo', mood: 'sad', text: 'Es una historia que nuestra gente nunca ha olvidado.' },
        { who: 'abuelo', text: 'Toca esta figura. Quizás puedas conocerla de una manera diferente.' }
      ],
      repeatLines: this.end
        ? [{ who: 'abuelo', mood: 'sad', text: 'Esta historia nunca debe olvidarse, mijo.' }]
        : [{ who: 'abuelo', text: 'Anda, Mateo. Toca la figura de caimán que está sobre la mesa.' }]
    });
    if (this.end) abuelo.talkable = false;
    this.npcs.push(abuelo);
    this.abuelo = abuelo;

    this.figure = new Interactable({
      x: 480, y: 266, r: 78, label: 'Tocar la figura', sortY: 250,
      enabled: () => !this.end,
      onInteract: () => {
        if (g.missions.isCurrent('abuelo')) {
          g.say([{ who: 'mateo', text: 'Una figura de caimán tallada en madera... Primero debería saludar al abuelo.' }]);
        } else if (g.missions.isCurrent('figura')) {
          this.touchFigure();
        }
      },
      drawFn: (ctx, t) => {
        const active = !this.end && g.missions.isCurrent('figura');
        const pulse = 0.5 + Math.sin(t * 3) * 0.5;
        if (active || this.end) glow(ctx, 480, 262, active ? 46 + pulse * 10 : 30, active ? 'rgba(255,214,120,0.8)' : 'rgba(255,200,120,0.4)');
        drawCaiman(ctx, 480, 262, -0.15, 0, { wood: true, scale: 0.3, amp: 1.5 });
      }
    });
    this.interactables.push(this.figure);

    this.interactables.push(new Interactable({
      x: 480, y: 528, r: 50, label: 'Salir',
      onInteract: () => g.say([{ who: 'mateo', text: this.end ? 'Ya es de noche. Mejor me quedo con el abuelo.' : 'Todavía no. El abuelo quiere contarme algo.' }])
    }));
    this.interactables.push(new Interactable({
      x: 310, y: 446, r: 44, label: 'Escuchar radio',
      onInteract: () => g.say([
        { who: 'mateo', mood: 'happy', text: 'En la radio suena una cumbia viejita. Al abuelo le encanta.' },
        { who: 'narrador', text: '«...y ya se preparan las comparsas para el Festival del Caimán Cienaguero, en enero...», dice el locutor.' }
      ])
    }));

    if (this.end) {
      this.lights.push({ x: 520, y: 248, r: 300, i: 0.95, color: 'rgba(255,190,90,1)', flicker: true });
      [160, 390, 640].forEach(x => this.lights.push({ x, y: 120, r: 110, i: 0.5, color: 'rgba(120,160,255,1)' }));
    } else {
      [160, 390, 640].forEach(x => this.lights.push({ x, y: 130, r: 230, i: 0.8, color: 'rgba(255,170,80,1)' }));
      this.lights.push({ x: 480, y: 330, r: 360, i: 0.6 });
    }
  }

  drawBackground(c) {
    const rnd = mulberry32(3);
    // piso de tablones
    for (let y = 0; y < 540; y += 18) {
      c.fillStyle = (y / 18) % 2 ? '#a0703c' : '#94653a';
      c.fillRect(0, y, 960, 18);
      c.fillStyle = '#6e4626'; c.fillRect(0, y + 17, 960, 1);
      for (let x = ((y / 18) % 3) * 70; x < 960; x += 210) { c.fillRect(x, y, 1, 18); c.fillStyle = '#5e3b1a'; c.fillRect(x + 4, y + 8, 2, 2); c.fillStyle = '#6e4626'; }
    }
    speckle(c, 0, 0, 960, 540, ['#8a5c32', '#a87a46'], 1400, rnd, 2);
    // alfombra tejida
    const rc = ['#e8613a', '#f6c945', '#1fb5b0', '#fdf6e3', '#3f9b3a'];
    c.fillStyle = '#5e1f0e'; c.fillRect(352, 214, 256, 140);
    for (let i = 0; i < 12; i++) { c.fillStyle = rc[i % rc.length]; c.fillRect(358, 220 + i * 11, 244, 8); }
    for (let x = 356; x < 604; x += 8) { c.fillStyle = '#fdf6e3'; c.fillRect(x, 354, 3, 6); c.fillRect(x, 208, 3, 6); }

    // pared del fondo
    c.fillStyle = '#ecd9b0'; c.fillRect(0, 0, 960, 122);
    speckle(c, 0, 10, 960, 90, ['#e2cc9f', '#f3e3c0'], 500, rnd, 2);
    c.fillStyle = '#5e3b1a'; c.fillRect(0, 0, 960, 12);
    for (let x = 0; x < 960; x += 80) { c.fillStyle = '#4a2e16'; c.fillRect(x, 0, 10, 12); }
    c.fillStyle = '#1fb5b0'; c.fillRect(0, 98, 960, 24);
    c.fillStyle = '#0e7c86'; c.fillRect(0, 98, 960, 3); c.fillRect(0, 119, 960, 3);

    // ventanas
    [160, 390, 640].forEach(cx => {
      const x = cx - 45, y = 22, w = 90, h = 68;
      c.fillStyle = '#5e3b1a'; c.fillRect(x - 6, y - 6, w + 12, h + 12);
      const sky = c.createLinearGradient(0, y, 0, y + h);
      if (this.end) { sky.addColorStop(0, '#070d22'); sky.addColorStop(1, '#1d2a5a'); }
      else { sky.addColorStop(0, '#f08a2c'); sky.addColorStop(0.7, '#f6c945'); sky.addColorStop(1, '#ffe9a8'); }
      c.fillStyle = sky; c.fillRect(x, y, w, h);
      if (this.end) { c.fillStyle = '#fff'; for (let i = 0; i < 10; i++) c.fillRect(x + rnd() * w, y + rnd() * h * 0.7, 1, 1); c.fillStyle = '#f2ecd0'; if (cx === 390) { c.beginPath(); c.arc(x + 62, y + 18, 8, 0, Math.PI * 2); c.fill(); } }
      else if (cx === 390) { c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(x + 45, y + 54, 14, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = this.end ? '#0a1028' : '#7a3a1a';
      c.fillRect(x, y + h - 10, w, 10);
      c.fillRect(x + 64, y + 30, 3, 30);
      c.beginPath(); c.arc(x + 65, y + 30, 14, Math.PI * 1.1, Math.PI * 1.9); c.fill();
      c.fillStyle = '#7a4a22'; c.fillRect(x + w / 2 - 2, y, 4, h); c.fillRect(x, y + h / 2 - 2, w, 4);
      c.fillStyle = '#1fb5b0'; c.fillRect(x - 24, y, 18, h); c.fillRect(x + w + 6, y, 18, h);
      c.fillStyle = '#0e7c86'; for (let k = 4; k < h; k += 6) { c.fillRect(x - 24, y + k, 18, 2); c.fillRect(x + w + 6, y + k, 18, 2); }
      c.fillStyle = '#8a5a2b'; c.fillRect(x - 8, y + h + 4, w + 16, 6);
    });
    // sombrero vueltiao colgado
    c.fillStyle = '#5e3b1a'; c.fillRect(273, 26, 3, 6);
    c.fillStyle = '#efe3c2'; c.beginPath(); c.ellipse(275, 52, 26, 20, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 2;
    [22, 16, 10].forEach(r => { c.beginPath(); c.ellipse(275, 52, r, r * 0.75, 0, 0, Math.PI * 2); c.stroke(); });
    c.fillStyle = '#efe3c2'; c.beginPath(); c.ellipse(275, 52, 7, 5, 0, 0, Math.PI * 2); c.fill();
    // retrato familiar
    c.fillStyle = '#5e3b1a'; c.fillRect(495, 30, 40, 48); c.fillStyle = '#d8c79f'; c.fillRect(499, 34, 32, 40);
    c.fillStyle = '#8a6a4a'; c.fillRect(507, 42, 16, 14); c.fillRect(503, 56, 24, 18);
    c.fillStyle = '#5e3b1a'; c.fillRect(540, 40, 28, 34); c.fillStyle = '#c9e4d8'; c.fillRect(543, 43, 22, 28);
    c.fillStyle = '#3f9b3a'; c.fillRect(546, 58, 16, 13); c.fillStyle = '#f6c945'; c.fillRect(551, 47, 6, 6);
    // repisa con tinajas
    c.fillStyle = '#5e3b1a'; c.fillRect(715, 60, 70, 6);
    [[728, '#b8431f'], [748, '#8a5a2b'], [768, '#c4562b']].forEach(([x, col]) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, 50, 8, 11, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = shade(col, -0.3); c.fillRect(x - 4, 38, 8, 4); });

    // paredes laterales e inferior
    c.fillStyle = '#4a2e16'; c.fillRect(0, 0, 28, 540); c.fillRect(932, 0, 28, 540);
    c.fillStyle = '#6e4626'; c.fillRect(22, 0, 6, 540); c.fillRect(932, 0, 6, 540);
    c.fillStyle = '#4a2e16'; c.fillRect(0, 512, 436, 28); c.fillRect(524, 512, 436, 28);
    c.fillStyle = '#6e4626'; c.fillRect(0, 512, 436, 5); c.fillRect(524, 512, 436, 5);
    // umbral de la puerta (afuera se ve la calle)
    c.fillStyle = this.end ? '#2a3050' : '#e0c690'; c.fillRect(436, 517, 88, 23);
    c.fillStyle = '#7a4a22'; c.fillRect(430, 512, 6, 28); c.fillRect(524, 512, 6, 28);
    c.fillStyle = '#b8431f'; c.fillRect(448, 490, 64, 20); c.fillStyle = '#e8613a'; for (let x = 452; x < 508; x += 8) c.fillRect(x, 494, 4, 12);

    // hamaca
    c.fillStyle = '#5e3b1a'; c.fillRect(48, 150, 10, 10); c.fillRect(262, 150, 10, 10);
    const hc = ['#e8313a', '#f6c945', '#1fb5b0', '#3f9b3a', '#f08a2c'];
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = hc[i % hc.length]; c.lineWidth = 5;
      c.beginPath(); c.moveTo(62, 152 + i * 5); c.quadraticCurveTo(160, 196 + i * 4, 258, 152 + i * 5); c.stroke();
    }
    c.strokeStyle = '#fdf6e3'; c.lineWidth = 1;
    for (let k = 0; k < 10; k++) { c.beginPath(); c.moveTo(58, 155); c.lineTo(80 + k * 2, 152 + k * 3); c.stroke(); c.beginPath(); c.moveTo(262, 155); c.lineTo(240 - k * 2, 152 + k * 3); c.stroke(); }

    // fogón de leña
    c.fillStyle = '#9a4a2a'; c.fillRect(786, 122, 146, 50);
    for (let y = 126; y < 172; y += 8) for (let x = 786 + ((y / 8) % 2) * 8; x < 930; x += 16) { c.fillStyle = '#7a3a1f'; c.fillRect(x, y, 14, 1); }
    c.fillStyle = '#2a2a2a'; c.beginPath(); c.ellipse(830, 134, 18, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a4a4a'; c.beginPath(); c.ellipse(830, 131, 14, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c4562b'; c.beginPath(); c.ellipse(890, 136, 14, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b4424'; for (let i = 0; i < 4; i++) c.fillRect(800 + i * 6, 160, 30, 4);

    // mesa
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(406, 300, 160, 18);
    c.fillStyle = '#5e3b1a'; c.fillRect(406, 296, 10, 18); c.fillRect(544, 296, 10, 18);
    c.fillStyle = '#8a5a2b'; c.fillRect(400, 236, 160, 64);
    c.fillStyle = '#a87040'; c.fillRect(400, 236, 160, 6);
    c.fillStyle = '#6e4220'; c.fillRect(400, 296, 160, 8);
    for (let x = 410; x < 560; x += 30) { c.fillStyle = '#7a4c26'; c.fillRect(x, 244, 1, 50); }
    c.fillStyle = '#fdf6e3'; c.fillRect(436, 244, 88, 40);
    c.fillStyle = '#e8613a'; c.fillRect(436, 244, 88, 3); c.fillRect(436, 281, 88, 3);
    c.fillStyle = '#f2efe6'; c.beginPath(); c.ellipse(420, 252, 9, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b3d1a'; c.beginPath(); c.ellipse(420, 251, 5, 3, 0, 0, Math.PI * 2); c.fill();
    if (this.end) {
      c.fillStyle = '#3a3a3a'; c.fillRect(530, 238, 14, 4); c.fillRect(532, 222, 10, 18);
      c.fillStyle = '#ffe9a8'; c.fillRect(534, 226, 6, 10);
    }

    // taburetes
    [[348, 262], [580, 262]].forEach(([x, y]) => {
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 3, y + 30, 32, 6);
      c.fillStyle = '#5e3b1a'; c.fillRect(x + 2, y + 18, 4, 16); c.fillRect(x + 26, y + 18, 4, 16);
      c.fillStyle = '#c9a24a'; c.fillRect(x, y, 32, 24);
      c.fillStyle = '#9a7a2a'; for (let k = 0; k < 32; k += 6) { c.fillRect(x + k, y, 2, 24); c.fillRect(x, y + (k % 24), 32, 2); }
    });
    // mecedora
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(744, 266, 50, 8);
    c.fillStyle = '#5e3b1a'; c.fillRect(742, 226, 48, 8); c.fillRect(742, 262, 48, 6);
    c.fillStyle = '#8a5a2b'; c.fillRect(746, 232, 40, 32);
    c.fillStyle = '#e8dcc0'; for (let k = 0; k < 40; k += 5) { c.fillRect(746 + k, 234, 2, 28); }
    c.fillStyle = '#5e3b1a'; c.fillRect(738, 238, 6, 30); c.fillRect(788, 238, 6, 30);

    // mesita con radio
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(290, 444, 48, 8);
    c.fillStyle = '#6e4220'; c.fillRect(286, 420, 48, 26);
    c.fillStyle = '#8a5a2b'; c.fillRect(286, 420, 48, 5);
    c.fillStyle = '#3a2a1a'; c.fillRect(294, 404, 32, 20);
    c.fillStyle = '#c9a24a'; c.fillRect(298, 408, 14, 12); c.fillStyle = '#e8dcc0'; c.fillRect(316, 408, 6, 4); c.fillRect(316, 414, 6, 4);
    c.fillStyle = '#1a1a1a'; c.fillRect(320, 394, 1, 10);

    // matas en materas
    [[53, 466], [907, 466]].forEach(([x, y]) => {
      c.fillStyle = '#b8431f'; c.fillRect(x - 14, y - 4, 28, 18); c.fillStyle = '#8a2f14'; c.fillRect(x - 14, y - 4, 28, 3);
      drawFlowerBush(c, x, y - 16, 18, rnd, ['#e8313a', '#f6c945']);
    });
  }

  drawTop(c) {
    if (!this.end) return;
  }

  objective() {
    const m = this.game.missions;
    if (this.end) return null;
    if (m.isCurrent('abuelo')) return { x: this.abuelo.x, y: this.abuelo.y, h: 92 };
    if (m.isCurrent('figura')) return { x: 480, y: 262, h: 30 };
    return null;
  }

  touchFigure() {
    const g = this.game;
    g.script(async alive => {
      await g.say([{ who: 'mateo', mood: 'surprised', text: 'Se siente tibia... como si tuviera vida propia.' }]);
      if (!alive()) return;
      g.missions.complete('figura');
      g.ui.bigText('Algo extraño está sucediendo...', true);
      AudioFX.sfx.magic();
      for (let i = 0; i < 16; i++) {
        this.particles.emit(480, 262, { count: 6, color: ['#f6c945', '#ffe9a8', '#1fb5b0'], speed: 120, life: 1.2, size: 3, glow: true, drag: 0.8 });
        await g.wait(0.1);
        if (!alive()) return;
      }
      await g.transition('pueblo', {}, 'magic');
    });
  }

  enter() {
    const g = this.game;
    if (this.end) {
      g.script(async alive => {
        g.player.dir = 'down';
        await g.wait(1.2); if (!alive()) return;
        g.player.dir = 'left'; await g.wait(0.5); g.player.dir = 'right'; await g.wait(0.5); g.player.dir = 'up';
        if (!alive()) return;
        await g.say([
          { who: 'mateo', text: '¿Abuelo...? Estoy en casa.' },
          { who: 'abuelo', mood: 'happy', text: 'Ahora entiendes, ¿verdad?' },
          { who: 'mateo', mood: 'happy', text: 'Sí, abuelo. Es una historia que debemos seguir contando.' },
          { who: 'abuelo', mood: 'happy', text: 'Por eso cada enero salen los tambores, los bailes y los caimanes a las calles, y el 20, día de San Sebastián, se recuerda a Tomasita. Mientras alguien la cuente, ella no se pierde.' },
          { who: 'abuelo', mood: 'sad', text: 'Esta historia nunca debe olvidarse.' },
          { who: 'abuelo', mood: 'happy', text: 'Pero mira, mijo... ¡hoy también es 20 de enero! ¿Oyes? Ya suenan los tambores.' },
          { who: 'mateo', mood: 'surprised', text: '¡El festival!' },
          { who: 'abuelo', mood: 'happy', text: 'Vamos, que ya empezó el desfile.' }
        ]);
        if (!alive()) return;
        g.missions.complete('regreso');
        await g.wait(1); if (!alive()) return;
        await g.transition('fiesta', { mode: 'hoy' }, 'fade');
      });
    } else if (!g.flags.introDone) {
      g.flags.introDone = true;
      g.script(async alive => {
        await g.wait(0.6); if (!alive()) return;
        await g.say([{ who: 'narrador', text: 'Ciénaga, Magdalena. Una tarde cualquiera, Mateo visita a su abuelo.' }]);
      });
    }
  }
}

/* =========================================================
   ESCENAS 2 y 3 — CIÉNAGA DEL PASADO (pueblo)
   ========================================================= */
class PuebloScene extends BaseScene {
  constructor(game, opts) {
    super(game, opts);
    this.width = 1920; this.height = 1280;
    this.music = 'pueblo';
    this.spawn = { x: 960, y: 760, dir: 'down' };
    this.tint = 'rgba(255,120,50,0.13)';
    this.darkness = 0.12; this.darkColor = '90,30,40';
    this.grade = { top: '#ffc078', bottom: '#c86a8a', a: 0.3 };
    this.rays = true;
    this.dusty = true;
    this.dayK = -1;   // 0 = tarde, 1 = noche (avanza con la historia)
    this.mapLabels = [
      { x: 960, y: 420, text: 'Plaza del Centenario' }, { x: 960, y: 700, text: 'Templete' },
      { x: 1290, y: 200, text: 'Iglesia San Juan Bautista' }, { x: 500, y: 200, text: 'Palacio Municipal' },
      { x: 1150, y: 700, text: 'Raspao' }, { x: 380, y: 660, text: 'Puesto de frutas' },
      { x: 170, y: 456, text: 'Jardín de cayenas' }, { x: 1540, y: 780, text: 'Redes de pesca' },
      { x: 1830, y: 470, text: 'Camino al Puerto' }, { x: 250, y: 700, text: 'Almendro' }
    ];
  }

  surfaceAt(x, y) {
    if (x > 594 && x < 1326 && y > 374 && y < 886) return 'tile';
    if ((y > 556 && y < 704) || (x > 890 && x < 1030) || (x > 1640 && x < 1770 && y > 300 && y < 560)) return 'dirt';
    return 'grass';
  }

  /* ----- Tomasita: conocerla y jugar a la lleva ----- */
  meetTomasita() {
    const g = this.game, tom = this.tomasita, jua = this.juanita;
    if (this.tag || !tom) return;
    g.script(async alive => {
      tom.dance = jua.dance = false;
      tom.faceTowards(g.player.x, g.player.y); jua.faceTowards(g.player.x, g.player.y);
      await g.say([
        { who: 'tomasita', mood: 'happy', text: '¡Hola! Tú no eres de aquí, ¿verdad? Yo soy Tomasita, y ella es Juanita, mi mejor amiga.' },
        { who: 'juanita', mood: 'happy', text: '¡Mucho gusto! ¿Y tú cómo te llamas?' },
        { who: 'mateo', mood: 'happy', text: 'Me llamo Mateo.' },
        { who: 'tomasita', mood: 'happy', text: 'Esta noche vamos al puerto a ver las velas sobre el agua. ¡Es lo más bonito de la fiesta de San Sebastián!' },
        { who: 'tomasita', mood: 'happy', text: 'Oye, Mateo, ¿jugamos a la lleva? ¡A que no me alcanzas!' }
      ]);
      if (!alive()) return;
      g.ui.bigText('¡Alcanza a Tomasita!');
      AudioFX.sfx.select();
      this.tag = { t: Settings.diff.tag };
      tom.talkable = false;
      tom.behavior = (n, dt) => this.tagRun(n, dt);
    });
  }
  tagRun(n, dt) {
    const p = this.game.player;
    const dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy) || 1;
    const sp = d > 230 ? 70 : 158;
    const tries = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
    const base = Math.atan2(dy, dx) + Math.sin(this.t * 2.3) * 0.5;
    for (const off of tries) {
      const a = base + off, nx = n.x + Math.cos(a) * sp * dt, ny = n.y + Math.sin(a) * sp * dt;
      if (nx > 630 && nx < 1290 && ny > 420 && ny < 870 && !critterBlocked(this, nx, ny)) {
        n.x = nx; n.y = ny; n.dir = dirTowards(Math.cos(a), Math.sin(a)); n.moving = true;
        if (d > 230) n.faceTowards(p.x, p.y);
        return;
      }
    }
    n.moving = false;
  }
  endTag(caught) {
    const g = this.game, tom = this.tomasita, jua = this.juanita;
    this.tag = null; tom.behavior = null;
    g.script(async alive => {
      tom.faceTowards(g.player.x, g.player.y);
      if (caught) {
        g.addScore(20, tom.x, tom.y - 60);
        g.ui.notify('¡ALCANZASTE A TOMASITA! +20', 'clue');
        setEmote(tom, '♥', 1.6);
      }
      jua.x = tom.x - 40; jua.y = tom.y + 12; jua.faceTowards(tom.x, tom.y);
      await g.say([
        caught
          ? { who: 'tomasita', mood: 'happy', text: '¡Me alcanzaste! ¡Eres rapidísimo, Mateo!' }
          : { who: 'tomasita', mood: 'happy', text: '¡Jajá, no me alcanzaste! La próxima vez corre con SHIFT, ¿oíste?' },
        { who: 'juanita', text: 'Tomasita, ya va a empezar la procesión de San Sebastián. ¡Vamos!' },
        { who: 'tomasita', mood: 'happy', text: '¡Adiós, Mateo! Esta noche estaremos en el puerto, viendo las velas sobre el agua.' },
        { who: 'mateo', mood: 'worried', text: 'Adiós, Tomasita... (Las velas sobre el agua... ¿por qué siento algo raro?)' }
      ]);
      if (!alive()) return;
      g.flags.metTomasita = true;
      g.flags.talk_tomasita_p = true;
      this.updateVendedoraLines();
      // se van caminando hacia el camino del puerto y desaparecen
      [tom, jua].forEach((n, i) => n.moveTo(1500 + i * 30, 620 + i * 20, 100).then(() => { n.hidden = true; }));
      g.addScore(10, tom.x, tom.y - 64);
      g.ui.notify('CONOCISTE A TOMASITA +10', 'info');
      g.missions.addProgress('habitantes');
    });
  }
  updateVendedoraLines() {
    const v = this.vendedora;
    if (!v || !this.game.flags.metTomasita) return;
    v.lines = [
      { who: 'vendedora', text: '¡Mangos, guayabas, bollos de yuca! ¡Lleve, lleve!' },
      { who: 'vendedora', text: 'Hace un ratico vi a Tomasita y a Juanita yendo hacia el camino del agua.' },
      { who: 'mateo', text: '¡Las conocí en la plaza! Iban a ver las velas en el puerto.' },
      { who: 'vendedora', mood: 'worried', text: 'Tomasita es la hija de unos pescadores de aquí, la niña más alegre de Ciénaga. Pero de noche la orilla es peligrosa...' }
    ];
  }

  /* ----- retos de las pistas ----- */
  askFlower(carmen) {
    const g = this.game;
    g.script(async alive => {
      carmen.faceTowards(g.player.x, g.player.y);
      await g.say([
        { who: 'mateo', text: 'Señora, ¿puedo tomar la flor de cayena de su jardín? Creo que es una señal de Tomasita.' },
        { who: 'carmen', mood: 'worried', text: '¿De Tomasita? Esa niña pasó corriendo por aquí y se le cayó la flor del cabello... iba de prisa hacia el agua.' },
        { who: 'carmen', mood: 'happy', text: 'Llévatela, mijo. Y si la ves, dile que se cuide.' }
      ]);
      if (!alive()) return;
      g.flags.permisoFlor = true;
      if (!g.flags.talk_carmen) { g.flags.talk_carmen = true; g.addScore(10, carmen.x, carmen.y - 64); }
      g.ui.notify('DOÑA CARMEN TE DIO PERMISO', 'info');
    });
  }
  ninoClimb() {
    const g = this.game, n = this.nino, p = g.player;
    g.script(async alive => {
      n.faceTowards(p.x, p.y);
      await g.say([{ who: 'nino', mood: 'happy', text: '¿Una cinta en la palmera de la esquina? ¡Yo trepo palmeras desde chiquito! ¡Vamos!' }]);
      if (!alive()) return;
      await g.tween('fade', 0, 1, 0.4); if (!alive()) return;
      const back = n.behavior; n.behavior = null; n.target = null;
      p.x = 1742; p.y = 958; p.dir = 'right';
      n.x = 1796; n.y = 932; n.dir = 'up';
      g.updateCamera(0, true);
      await g.tween('fade', 1, 0, 0.4); if (!alive()) return;
      // trepa
      for (let i = 0; i < 24; i++) { n.y -= 3; n.moving = true; n.animT = i; if (i % 6 === 0) AudioFX.sfx.flap(); await g.wait(0.05); if (!alive()) return; }
      g.flags.cintaDown = true;
      AudioFX.sfx.clue();
      this.particles.emit(1792, 860, { count: 14, color: ['#e8313a', '#ffb0b0', '#3f9b3a'], speed: 60, life: 1, gravity: 80, spin: true });
      for (let i = 0; i < 24; i++) { n.y += 3; await g.wait(0.04); if (!alive()) return; }
      n.moving = false; n.faceTowards(p.x, p.y);
      await g.say([{ who: 'nino', mood: 'happy', text: '¡Ahí está! Es de Tomasita: siempre lleva cintas rojas en las trenzas.' }]);
      if (!alive()) return;
      n.behavior = back;
      n.moveTo(780, 980, 110);
      g.missions.setHint('Recoge la cinta que bajó el niño.');
    });
  }

  /* ----- misiones secundarias ----- */
  questCocos() {
    const g = this.game, v = this.vendedora, f = g.flags;
    v.faceTowards(g.player.x, g.player.y);
    if (!f.qCocos) {
      g.say([
        { who: 'vendedora', text: 'Ay, mijo, ¿me haces un favor? Se me acabaron los cocos para las cocadas.' },
        { who: 'vendedora', mood: 'happy', text: 'Debajo de las palmeras siempre caen algunos. ¿Me traes tres?' },
        { who: 'mateo', mood: 'happy', text: '¡Claro que sí!' }
      ]).then(() => { f.qCocos = 'active'; g.ui.notify('MISIÓN SECUNDARIA: LOS COCOS DE LA VENDEDORA', 'mission'); });
    } else if (f.qCocos === 'active' && (f.qCocosN || 0) < 3) {
      g.say([{ who: 'vendedora', text: `¿Y los cocos? Me faltan ${3 - (f.qCocosN || 0)}. Búscalos debajo de las palmeras.` }]);
    } else if (f.qCocos === 'active') {
      g.say([
        { who: 'vendedora', mood: 'happy', text: '¡Ay, bendito! Ahora sí hay cocadas para la fiesta. Toma, prueba una recién hecha.' },
        { who: 'mateo', mood: 'happy', text: '¡Mmm, qué rica!' }
      ]).then(() => {
        f.qCocos = 'done'; g.addScore(30, v.x, v.y - 64); setEmote(g.player, '♥', 1.6);
        AudioFX.sfx.mission(); g.ui.notify('MISIÓN SECUNDARIA COMPLETADA +30', 'mission');
      });
    } else g.say([{ who: 'vendedora', mood: 'happy', text: 'Gracias por los cocos, mijo. ¡Esas cocadas van a volar!' }]);
  }
  questRed() {
    const g = this.game, pe = this.pescador, f = g.flags;
    pe.faceTowards(g.player.x, g.player.y);
    if (!f.qRed) {
      g.say([
        { who: 'pescador', mood: 'worried', text: 'Muchacho, ¿no has visto mi atarraya? La dejé secando y la brisa se la llevó.' },
        { who: 'pescador', text: 'Sin ella no hay pesca mañana. Creo que voló hacia el sur, detrás de las casas.' },
        { who: 'mateo', mood: 'happy', text: '¡Yo te la busco!' }
      ]).then(() => { f.qRed = 'active'; g.ui.notify('MISIÓN SECUNDARIA: LA ATARRAYA DEL PESCADOR', 'mission'); });
    } else if (f.qRed === 'active' && !f.item_red) {
      g.say([{ who: 'pescador', text: 'Busca por el sur del pueblo, detrás de las casas. ¡Esa atarraya me la tejió mi papá!' }]);
    } else if (f.qRed === 'active') {
      g.say([
        { who: 'pescador', mood: 'happy', text: '¡Mi atarraya! Gracias, muchacho. Mañana, si Dios quiere, hay pescado fresco.' }
      ]).then(() => {
        f.qRed = 'done'; g.addScore(30, pe.x, pe.y - 64); setEmote(g.player, '♥', 1.6);
        AudioFX.sfx.mission(); g.ui.notify('MISIÓN SECUNDARIA COMPLETADA +30', 'mission');
      });
    } else g.say([{ who: 'pescador', mood: 'worried', text: 'Ve con cuidado, muchacho. El agua no perdona a los distraídos.' }]);
  }

  drawAbove(ctx) {
    // la cinta enredada en la copa de la palmera
    const g = this.game;
    if (g.missions.isCurrent('pistas') && !g.flags.cintaDown && !g.flags.item_cinta) {
      glow(ctx, 1792, 846, 26 + Math.sin(this.t * 3) * 4, 'rgba(255,120,120,0.7)');
      drawRibbon(ctx, 1792, 846, this.t);
    }
  }

  /** Avance de la tarde a la noche según lo que ha hecho Mateo. */
  dayTarget() {
    const g = this.game;
    const talked = ['pescador', 'vendedora', 'anciano'].filter(id => g.flags['talk_' + id]).length;
    return Math.min(1, talked * 0.12 + g.clues * 0.18 + (g.flags.gateOpen ? 0.1 : 0));
  }
  updateScene(dt) {
    if (this.tag && !this.game.locked && !this.game.dialogue.active) {
      this.tag.t -= dt;
      const p = this.game.player, tom = this.tomasita;
      if (dist(p.x, p.y, tom.x, tom.y) < 32) this.endTag(true);
      else if (this.tag.t <= 0) this.endTag(false);
    }
    const target = this.dayTarget();
    this.dayK = this.dayK < 0 ? target : this.dayK + (target - this.dayK) * Math.min(1, dt * 0.25);
    const k = this.dayK;
    this.darkness = lerp(0.12, 0.58, k);
    this.darkColor = [lerp(90, 14, k), lerp(30, 18, k), lerp(40, 62, k)].map(Math.round).join(',');
    this.tint = `rgba(255,${Math.round(lerp(120, 90, k))},50,${(0.13 - k * 0.1).toFixed(3)})`;
    this.grade = { top: mixHex3('#ffc078', '#ff7a5a', '#6a78e0', k), bottom: mixHex3('#c86a8a', '#9a3a8a', '#1a1448', k), a: lerp(0.3, 0.45, k) };
    this.rays = Math.max(0, 1 - k * 1.8);
    this.playerLight = k > 0.55 ? (k - 0.55) * 220 : 0;
    AudioFX.ambientNight = k;
  }
  drawHUD(ctx) {
    const k = this.dayK, W = this.game.W;
    if (!this.game.flags.tutMap && !this.game.locked && !this.game.dialogue.active) {
      this.tipT = (this.tipT || 0) + 1 / 60;
      if (this.tipT > 9) this.game.flags.tutMap = true;
      else drawTip(ctx, this.game, IS_TOUCH ? 'Toca MAPA para ver el pueblo · la flecha dorada te guía' : 'Presiona  Q  para ver el mapa · la flecha dorada te guía', Math.min(1, (9 - this.tipT) * 2));
    }
    const label = k < 0.33 ? 'TARDE' : k < 0.7 ? 'ATARDECER' : 'ANOCHECER';
    const x = W - 112, y = 178;
    ctx.save();
    ctx.fillStyle = 'rgba(7,13,34,0.72)'; ctx.beginPath(); rrect(ctx, x, y, 96, 26, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(246,201,69,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    // sol que baja y se vuelve luna
    const ix = x + 15, iy = y + 13;
    if (k < 0.7) {
      ctx.fillStyle = mixHex3('#ffe07a', '#ff8a4a', '#ff6a4a', k / 0.7);
      ctx.beginPath(); ctx.arc(ix, iy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.4;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 8, iy + Math.sin(a) * 8); ctx.lineTo(ix + Math.cos(a) * 10, iy + Math.sin(a) * 10); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#f2ecd0'; ctx.beginPath(); ctx.arc(ix, iy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(7,13,34,1)'; ctx.beginPath(); ctx.arc(ix + 3.5, iy - 2.5, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fdf6e3'; ctx.font = '600 12px "Fredoka", sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 30, y + 17);
    // cosas que lleva Mateo / misiones secundarias activas
    const f = this.game.flags, chips = [];
    if (f.velaTaken && !f.item_vela) chips.push('LLEVAS: VELA APAGADA');
    if (f.qCocos === 'active') chips.push(`COCOS ${f.qCocosN || 0}/3`);
    if (f.qRed === 'active') chips.push(f.item_red ? 'LLEVAS: ATARRAYA' : 'BUSCA: ATARRAYA');
    ctx.font = '600 11px "Fredoka", sans-serif';
    chips.forEach((c, i) => {
      const w = ctx.measureText(c).width + 20, cy = y + 34 + i * 26;
      ctx.fillStyle = 'rgba(7,13,34,0.72)'; ctx.beginPath(); rrect(ctx, W - 16 - w, cy, w, 22, 11); ctx.fill();
      ctx.fillStyle = '#ffd9b0'; ctx.textAlign = 'right'; ctx.fillText(c, W - 26, cy + 15);
    });
    // la lleva con Tomasita
    if (this.tag) {
      const s = Math.ceil(this.tag.t);
      ctx.textAlign = 'center'; ctx.font = '600 16px "Fredoka", sans-serif';
      ctx.fillStyle = 'rgba(7,13,34,0.8)'; ctx.beginPath(); rrect(ctx, W / 2 - 150, 232, 300, 32, 16); ctx.fill();
      ctx.strokeStyle = '#ffd0d6'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = s <= 5 ? '#ff8a8a' : '#ffd0d6';
      ctx.fillText(`¡ALCANZA A TOMASITA!  ${s} s`, W / 2, 254);
    }
    ctx.restore();
  }

  build() {
    const g = this.game;
    const H = (x, y, w, h) => this.static.push({ x, y: y + 8, w, h: h - 8 });
    // casas norte
    this.houses = [
      [60, 70, 190, 230, '#1fb5b0', '#c4562b', '#f6c945'], [1550, 70, 190, 230, '#f7f1e3', '#b8402a', '#2f6f6a'],
      [60, 960, 190, 230, '#f08a2c', '#a3401f', '#1fb5b0'], [290, 960, 190, 230, '#a98ad8', '#c4562b', '#f6c945'], [520, 960, 190, 230, '#1fb5b0', '#b8431f', '#f6c945'],
      [1080, 960, 190, 230, '#f6c945', '#c4562b', '#3f9b3a'], [1310, 960, 190, 230, '#e86a8a', '#a3401f', '#1fb5b0'], [1540, 960, 190, 230, '#9ad35a', '#c4562b', '#e8613a']
    ];
    this.houses.forEach(([x, y, w, h]) => H(x, y, w, h));
    this.static.push({ x: 290, y: 52, w: 420, h: 248 }); // Palacio Municipal
    this.static.push({ x: 1080, y: 52, w: 420, h: 248 }); // iglesia San Juan Bautista
    this.static.push({ x: 890, y: 586, w: 140, h: 78 }, { x: 922, y: 664, w: 76, h: 10 }); // templete
    this.benches = [[680, 440], [1190, 440], [680, 840], [1190, 840], [880, 870], [988, 870]];
    this.benches.concat([[240, 806]]).forEach(([x, y]) => this.static.push({ x, y, w: 52, h: 16 }));
    this.trees = [[845, 476], [1075, 476], [760, 822], [1150, 822]];
    this.trees.forEach(([x, y]) => this.static.push({ x: x - 6, y: y - 6, w: 12, h: 8 }));
    this.static.push({ x: 1112, y: 628, w: 76, h: 34 }); // carrito del raspao
    this.lamps = [[640, 420], [1280, 420], [640, 870], [1280, 870], [200, 540], [1700, 540], [880, 1000], [1040, 330]];
    this.lamps.forEach(([x, y]) => { this.static.push({ x: x - 5, y: y - 6, w: 10, h: 6 }); this.lights.push({ x, y: y - 50, r: 120, i: 0.8, color: 'rgba(255,200,100,1)', flicker: true }); });
    this.palms = [[1240, 560, 2], [620, 760, 3], [1300, 760, 4], [120, 470, 5], [480, 460, 6], [1460, 470, 7], [1780, 430, 8], [140, 900, 9], [520, 920, 10], [1440, 920, 11], [1800, 900, 12], [1820, 1180, 13], [1780, 330, 14], [40, 1240, 15], [800, 1240, 16], [1110, 1240, 17]];
    this.palms.forEach(([x, y]) => this.static.push({ x: x - 7, y: y - 6, w: 14, h: 8 }));
    this.static.push({ x: 244, y: 744, w: 12, h: 10 }); // tronco del almendro
    this.static.push({ x: 330, y: 600, w: 100, h: 40 }); // puesto de frutas
    this.static.push({ x: 1610, y: 740, w: 100, h: 34 }); // canoa en tierra
    this.static.push({ x: 1494, y: 752, w: 8, h: 8 }, { x: 1574, y: 752, w: 8, h: 8 }); // postes de redes
    // cercas norte y sur del camino al puerto
    this.static.push({ x: 1740, y: 0, w: 180, h: 30 });

    // reja hacia el puerto (se abre al hallar las pistas)
    this.gateCollider = { x: 1858, y: 556, w: 18, h: 148 };
    if (!g.flags.gateOpen) this.static.push(this.gateCollider);
    this.static.push({ x: 1858, y: 300, w: 62, h: 256 }, { x: 1858, y: 704, w: 62, h: 256 });

    /* --- habitantes --- */
    const habit = (o) => this.npcs.push(new NPC(Object.assign({ mission: 'habitantes' }, o)));
    habit({
      id: 'pescador', who: 'pescador', title: 'el pescador', x: 1560, y: 650, dir: 'left',
      lines: [
        { who: 'pescador', mood: 'happy', text: 'La celebración está comenzando.' },
        { who: 'pescador', text: 'Hoy es 20 de enero, día de San Sebastián. Esta noche todo el pueblo se reúne: hay tambores, hay velas... y el agua de la ciénaga anda inquieta.' },
        { who: 'mateo', text: '¿Inquieta? ¿Por qué?' },
        { who: 'pescador', mood: 'worried', text: 'Los pescadores lo sabemos: cuando el agua calla así, algo se mueve allá abajo.' }
      ],
      repeatLines: [{ who: 'pescador', mood: 'worried', text: 'Ve con cuidado, muchacho. El agua no perdona a los distraídos.' }]
    });
    habit({
      id: 'vendedora', who: 'vendedora', title: 'la vendedora', x: 456, y: 628, dir: 'down',
      lines: [
        { who: 'vendedora', text: '¡Mangos, guayabas, bollos de yuca! ¡Lleve, lleve!' },
        { who: 'vendedora', text: 'Vi a Tomasita cerca del camino hacia el agua.' },
        { who: 'mateo', text: '¿Tomasita? ¿Quién es ella?' },
        { who: 'vendedora', text: '¿No la conoces? Es la hija de unos pescadores de aquí, la niña más alegre de Ciénaga. Iba con Juanita, como siempre. Esas dos no se separan.' }
      ],
      repeatLines: [{ who: 'vendedora', text: 'El camino hacia el agua sale por el este del pueblo, pasando la cerca.' }]
    });
    habit({
      id: 'anciano', who: 'anciano', title: 'el anciano', x: 316, y: 818, dir: 'down',
      lines: [
        { who: 'anciano', text: 'Si buscas respuestas, escucha las historias de quienes vivimos aquí.' },
        { who: 'anciano', text: 'Las historias no se guardan en los libros, muchacho. Se guardan en la voz de la gente. Así llegan de Pueblo Viejo a Ciénaga, y de los abuelos a los nietos.' },
        { who: 'anciano', text: 'Tomasita dejó señales en el camino: una flor, una vela y una cinta. Encuéntralas y sabrás hacia dónde fue.' }
      ],
      repeatLines: [{ who: 'anciano', text: 'Busca la flor, la vela y la cinta. El pueblo te mostrará el camino.' }]
    });
    // el raspao de la plaza
    this.npcs.push(new NPC({ id: 'raspao', who: 'raspao', title: 'el raspadero', x: 1196, y: 664, dir: 'left', lines: [
      { who: 'raspao', mood: 'happy', text: '¡Raspao, raspao! ¡Bien frío pa\' este calor! ¿De qué lo quieres, pelao: de mora, de limón o de tamarindo?' },
      { who: 'mateo', mood: 'happy', text: '¡De mora! En mi tiempo también venden raspao aquí, al lado del templete.' },
      { who: 'raspao', text: 'Hielo raspao con sirope de colores y un chorrito de leche condensada. En la Plaza del Centenario siempre ha habido algo fresquito pa\' la gente.' }
    ], repeatLines: [{ who: 'raspao', mood: 'happy', text: '¡Vuelve cuando quieras! El raspao no se acaba mientras haya calor en Ciénaga.' }] }));
    const plaque = (id, x, y, label, lines) => this.interactables.push(new Interactable({
      x, y, r: 60, label,
      onInteract: game => {
        game.say(lines).then(() => { if (!game.flags['ver_' + id]) { game.flags['ver_' + id] = true; game.addScore(10, x, y - 60); } });
      }
    }));
    plaque('templete', 960, 712, 'Mirar el templete', [
      { who: 'narrador', text: 'El Templete es el gran símbolo de Ciénaga. Sus columnas blancas están inspiradas en los templos romanos.' },
      { who: 'narrador', text: 'Está en el centro de la Plaza del Centenario y es el punto de encuentro de los cienagueros: aquí se cita la gente, se conversa y se celebra.' },
      { who: 'mateo', mood: 'surprised', text: '¡Es el templete de la plaza! Todavía existe: mi abuelo me trae aquí a comer raspao los domingos.' }
    ]);
    plaque('iglesia', 1290, 330, 'Mirar la iglesia', [
      { who: 'narrador', text: 'La iglesia de San Juan Bautista es la construcción más antigua del centro histórico de Ciénaga. Sus orígenes se remontan al año 1612.' },
      { who: 'narrador', text: 'La levantaron manos indígenas. Siglos después la ampliaron, agrandaron su cúpula y le cambiaron el viejo reloj de la torre.' },
      { who: 'mateo', text: 'La torre blanca del reloj... desde la plaza siempre se ve.' }
    ]);
    plaque('palacio', 500, 330, 'Mirar el palacio', [
      { who: 'narrador', text: 'El Palacio Municipal, de estilo republicano, mira hacia la Plaza del Centenario. Es la sede de la alcaldía.' },
      { who: 'narrador', text: 'Junto con la iglesia, el templete y las casonas de balcones, forma el centro histórico de Ciénaga, que hoy es Pueblo Patrimonio de Colombia.' }
    ]);

    // habitantes adicionales (dan puntos una sola vez, no cuentan para la misión)
    const pace = (x1, x2, speed) => (n, dt) => {
      n.moving = true;
      n.x += n.vx * dt;
      if (n.x > x2) { n.x = x2; n.vx = -speed; } if (n.x < x1) { n.x = x1; n.vx = speed; }
      n.dir = n.vx < 0 ? 'left' : 'right';
      const p = g.player; if (dist(p.x, p.y, n.x, n.y) < 70) { n.moving = false; n.x -= n.vx * dt; n.faceTowards(p.x, p.y); }
    };
    const mujer = new NPC({ id: 'mujer', who: 'mujer', title: 'una señora', x: 1110, y: 760, behavior: pace(1080, 1240, 30), lines: [{ who: 'mujer', text: 'Esta noche hasta el viento huele a fiesta. ¿Escuchas los tambores a lo lejos?' }] });
    mujer.vx = 30; this.npcs.push(mujer);
    var nino = new NPC({ id: 'nino', who: 'nino', title: 'un niño', x: 760, y: 980, scale: 1.6, behavior: pace(730, 860, 55), lines: [{ who: 'nino', text: '¡Mi abuela dice que de noche no hay que andar solo por la orilla!' }, { who: 'nino', text: 'Pero yo no le tengo miedo a nada... bueno, casi a nada.' }] });
    nino.vx = 55; this.npcs.push(nino);

    this.vendedora = this.npcs.find(n => n.id === 'vendedora');
    this.pescador = this.npcs.find(n => n.id === 'pescador');
    this.nino = nino;
    this.updateVendedoraLines();

    /* --- Tomasita y Juanita juegan en la plaza (antes de la tragedia) --- */
    if (!g.flags.metTomasita) {
      const tom = new NPC({ id: 'tomasita_p', who: 'tomasita', title: 'Tomasita', x: 850, y: 830, dir: 'down', mission: 'habitantes', dance: true, solid: false });
      const jua = new NPC({ id: 'juanita_p', who: 'juanita', x: 800, y: 850, dir: 'right', talkable: false, dance: true, solid: false });
      Object.defineProperty(tom, 'label', { get: () => 'Hablar con Tomasita' });
      tom.interact = () => this.meetTomasita();
      this.tomasita = tom; this.juanita = jua;
      this.npcs.push(tom, jua);
    }

    /* --- doña Carmen, dueña del jardín de cayenas --- */
    const carmen = new NPC({
      id: 'carmen', who: 'carmen', title: 'doña Carmen', x: 280, y: 470, dir: 'left',
      lines: [
        { who: 'carmen', text: 'Buenas, mijo. ¿Te gustan mis cayenas? Son las más bonitas de Ciénaga.' },
        { who: 'carmen', mood: 'happy', text: 'Las riego todas las tardes, antes de que empiecen a sonar los tambores.' }
      ],
      repeatLines: [{ who: 'carmen', text: 'Cuidado con pisarme las matas, ¿oíste?' }]
    });
    carmen.interact = game => {
      if (game.missions.isCurrent('pistas') && !game.flags.permisoFlor && !game.flags.item_flor) this.askFlower(carmen);
      else game.talkTo(carmen);
    };
    this.carmen = carmen;
    this.npcs.push(carmen);

    /* --- pistas: cada una con un pequeño reto --- */
    const clueVisible = () => g.missions.isCurrent('pistas');
    const clues = {
      // la flor está en un jardín ajeno: hay que pedir permiso
      flor: { clueType: 'flor', x: 170, y: 400, name: 'Flor de cayena', text: 'Una flor de cayena, todavía fresca. Tomasita solía llevar una en el cabello.',
        onInteract: game => {
          if (game.flags.permisoFlor) return true;
          game.say([{ who: 'mateo', mood: 'worried', text: 'La flor está en el jardín de alguien. Mejor le pido permiso a la señora que vive aquí.' }]);
          return false;
        } },
      // la vela está apagada: hay que encenderla en un farol
      vela: { clueType: 'vela', x: 1656, y: 350, name: 'Vela', unlit: true, labelText: 'Recoger la vela', text: 'La vela vuelve a alumbrar. Alguien la llevaba encendida camino al agua...',
        isVisible: () => clueVisible() && !g.flags.velaTaken,
        onInteract: game => {
          game.flags.velaTaken = true;
          AudioFX.sfx.pickup();
          game.say([{ who: 'mateo', text: 'Una vela a medio consumir... pero está apagada. Puedo encenderla en uno de los faroles del pueblo.' }]);
          game.missions.setHint('Enciende la vela en cualquier farol del pueblo.');
          return false;
        } },
      // la cinta se enredó en una palmera: el niño ayuda a bajarla
      cinta: { clueType: 'cinta', x: 1790, y: 942, name: 'Cinta roja', text: 'Una cinta roja, de las que adornan las trenzas en días de fiesta. Está húmeda...',
        isVisible: () => clueVisible() && !!g.flags.cintaDown }
    };
    this.clueItems = {};
    Object.entries(clues).forEach(([id, o]) => {
      if (g.flags['item_' + id]) return;
      const it = new Collectible(Object.assign({ id, kind: 'clue', isVisible: clueVisible }, o));
      this.items.push(it); this.clueItems[id] = it;
    });
    // faroles: allí se enciende la vela
    this.lamps.forEach(([x, y]) => this.interactables.push(new Interactable({
      x, y, r: 48, label: 'Encender la vela', sortY: y - 1,
      enabled: () => g.missions.isCurrent('pistas') && !!g.flags.velaTaken && !g.flags.item_vela,
      onInteract: game => {
        const v = this.clueItems.vela;
        AudioFX.sfx.magic();
        this.particles.emit(x, y - 50, { count: 20, color: ['#ffd36b', '#ffe9a8', '#e8613a'], speed: 70, life: 0.9, glow: true });
        v.unlit = false; v.x = x; v.y = y + 14;
        game.collect(v);
      },
      drawFn: (ctx, t) => { if (g.missions.isCurrent('pistas') && g.flags.velaTaken && !g.flags.item_vela) glow(ctx, x, y - 50, 30 + Math.sin(t * 4) * 6, 'rgba(255,214,120,0.9)'); }
    })));
    // palmera donde quedó enredada la cinta
    this.interactables.push(new Interactable({
      x: 1790, y: 930, r: 60, label: 'Examinar la palmera', sortY: 900,
      enabled: () => g.missions.isCurrent('pistas') && !g.flags.cintaDown && !g.flags.item_cinta,
      onInteract: game => {
        game.flags.cintaSeen = true;
        game.say([{ who: 'mateo', mood: 'surprised', text: '¡Una cinta roja enredada arriba de la palmera! Está muy alta, no la alcanzo... Quizás el niño del pueblo sepa trepar.' }]);
        game.missions.setHint('Pídele ayuda al niño que juega cerca de la plaza.');
      }
    }));
    nino.interact = game => {
      if (game.missions.isCurrent('pistas') && game.flags.cintaSeen && !game.flags.cintaDown) this.ninoClimb();
      else game.talkTo(nino);
    };

    /* --- misiones secundarias --- */
    this.vendedora.interact = game => (game.flags.talk_vendedora ? this.questCocos() : game.talkTo(this.vendedora));
    this.pescador.interact = game => (game.flags.talk_pescador ? this.questRed() : game.talkTo(this.pescador));
    [['coco1', 145, 492], ['coco2', 1485, 494], ['coco3', 168, 924]].forEach(([id, x, y]) => {
      if (g.flags['item_' + id]) return;
      this.items.push(new Collectible({
        id, kind: 'quest', qtype: 'coco', x, y, name: 'Coco',
        isVisible: () => g.flags.qCocos === 'active',
        onInteract: (game, it) => {
          it.collected = true; game.flags['item_' + id] = true;
          game.flags.qCocosN = (game.flags.qCocosN || 0) + 1;
          AudioFX.sfx.pickup(); setEmote(game.player, '!', 1);
          game.ui.notify(`COCO ${game.flags.qCocosN}/3`, 'info');
          return false;
        }
      }));
    });
    if (!g.flags.item_red) this.items.push(new Collectible({
      id: 'red', kind: 'quest', qtype: 'red', x: 1400, y: 1226, name: 'Atarraya',
      isVisible: () => g.flags.qRed === 'active',
      onInteract: (game, it) => {
        it.collected = true; game.flags.item_red = true;
        AudioFX.sfx.pickup(); setEmote(game.player, '!', 1);
        game.ui.notify('¡ENCONTRASTE LA ATARRAYA!', 'info');
        return false;
      }
    }));

    /* --- figuritas opcionales --- */
    [['fig1', 960, 110], ['fig2', 110, 1236], ['fig3', 1470, 905]].forEach(([id, x, y]) => {
      if (!g.flags['item_' + id]) this.items.push(new Collectible({ id, kind: 'figurine', x, y, name: 'Figurita de caimán' }));
    });

    // reja
    this.interactables.push(new Interactable({
      x: 1846, y: 640, r: 60, label: 'Examinar', sortY: 704,
      enabled: () => !g.flags.gateOpen,
      onInteract: () => g.say([{ who: 'mateo', mood: 'worried', text: 'El camino hacia el agua está cerrado. Todavía no sé lo suficiente sobre Tomasita.' }]),
      drawFn: ctx => { if (!g.flags.gateOpen) this.drawGate(ctx, false); }
    }));
    this.props.push({ y: 704, draw: ctx => { if (g.flags.gateOpen) this.drawGate(ctx, true); } });

    /* --- animales del pueblo --- */
    const zSW = { x: 70, y: 720, w: 470, h: 200 }, zE = { x: 1420, y: 780, w: 380, h: 140 };
    [['#f4ead8', 140, 760], ['#b8763a', 420, 860], ['#f4ead8', 470, 760], ['#6a3a22', 200, 880]].forEach(([c, x, y]) => this.critters.push(new Hen(this, x, y, zSW, c)));
    [['#b8763a', 1480, 820], ['#f4ead8', 1700, 860]].forEach(([c, x, y]) => this.critters.push(new Hen(this, x, y, zE, c)));
    const zPlaza = { x: 620, y: 400, w: 680, h: 460 };
    [[700, 520], [760, 500], [1180, 720], [1220, 560], [820, 800], [1120, 820]].forEach(([x, y]) => this.critters.push(new Bird(this, x, y, zPlaza)));
    this.interactables.push(new Dog(this, 820, 640, { x: 300, y: 580, w: 1400, h: 110 }));

    // salida al puerto
    this.addTrigger({ x: 1886, y: 556, w: 40, h: 148 }, () => g.transition('puerto', {}, 'fade'), () => g.flags.gateOpen && g.missions.isCurrent('puerto'), false);
  }

  drawGate(ctx, open) {
    const x = 1858, y = 556;
    ctx.fillStyle = '#4a2e16';
    ctx.fillRect(x, y - 30, 12, 34); ctx.fillRect(x, y + 118, 12, 34);
    if (!open) {
      for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#8a5a2b' : '#a07040'; ctx.fillRect(x + 2, y + 6 + k * 20, 10, 16); }
      ctx.fillStyle = '#5e3b1a'; ctx.fillRect(x - 2, y + 30, 16, 6); ctx.fillRect(x - 2, y + 110, 16, 6);
    } else {
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 12, y - 22, 40, 10); ctx.fillRect(x + 12, y + 130, 40, 10);
    }
  }

  drawBackground(c) {
    const rnd = mulberry32(11), W = this.width, Hh = this.height;
    drawGrass(c, 0, 0, W, Hh, rnd);
    drawStreet(c, 0, 556, W, 148, rnd);
    drawStreet(c, 890, 0, 140, Hh, rnd);
    drawStreet(c, 1640, 300, 130, 260, rnd);
    // Plaza del Centenario: caminos hacia el templete y jardineras de bordillo rojo
    c.fillStyle = '#c9c1ae'; c.fillRect(890, 300, 140, 74);    // atrio frente a la plaza
    drawPlazaCentenario(c, 594, 374, 732, 512, 960, 620, rnd);
    drawTempleteBase(c, 960, 620);

    // casas
    this.houses.forEach(([x, y, w, h, wall, roof, sh], i) => drawHouse(c, x, y, w, h, wall, roof, rnd, { shutter: sh, plants: i % 2 === 0, lit: i % 3 === 0 }));
    drawPalacioMunicipal(c, 290, 40, 420, 260, rnd);
    drawIglesiaSJB(c, 1080, 40, 420, 260, rnd);

    // bancas blancas, faroles, árboles de sombra y palmeras (troncos)
    this.benches.forEach(([x, y]) => drawWhiteBench(c, x, y));
    drawBench(c, 240, 806);
    this.trees.forEach(([x, y]) => drawTreeTrunk(c, x, y));
    drawRaspaoCart(c, 1150, 664);
    this.lamps.forEach(([x, y]) => drawLampPost(c, x, y));
    this.palms.forEach(([x, y, s]) => drawPalmTrunk(c, x, y, 64 + (s % 3) * 8, s % 2 ? 10 : -10));
    drawTreeTrunk(c, 250, 754);

    // puesto de frutas
    drawStall(c, 330, 594, rnd);
    // redes de pesca y canoa
    c.fillStyle = '#4a2e16'; c.fillRect(1495, 700, 6, 60); c.fillRect(1575, 700, 6, 60);
    c.strokeStyle = '#cfc6a0'; c.lineWidth = 1;
    for (let k = 0; k < 9; k++) { c.beginPath(); c.moveTo(1500, 706 + k * 5); c.quadraticCurveTo(1538, 724 + k * 5, 1576, 706 + k * 5); c.stroke(); }
    for (let k = 0; k < 10; k++) { c.beginPath(); c.moveTo(1504 + k * 8, 708); c.lineTo(1504 + k * 8, 752); c.stroke(); }
    drawCanoe(c, 1660, 758, 110, 0.05);

    // flores y matas sueltas
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * Hh;
      if ((y > 540 && y < 720) || (x > 870 && x < 1050) || (x > 580 && x < 1340 && y > 360 && y < 900) || y < 330) continue;
      drawFlowerBush(c, x, y, 10 + rnd() * 8, rnd);
    }
    // jardín de cayenas (donde está la flor)
    c.fillStyle = '#8a5a2b'; c.fillRect(110, 360, 120, 6); c.fillRect(110, 436, 120, 6);
    drawFlowerBush(c, 130, 400, 16, rnd, ['#e8313a', '#ef3340']); drawFlowerBush(c, 214, 398, 16, rnd, ['#e8313a', '#d6337a']);

    // cerca de madera al este del pueblo
    [[300, 556], [704, 960]].forEach(([y1, y2]) => {
      c.fillStyle = '#6e4626'; c.fillRect(1862, y1, 4, y2 - y1); c.fillRect(1874, y1, 4, y2 - y1);
      for (let y = y1; y < y2; y += 22) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(1864, y + 14, 14, 4); c.fillStyle = '#8a5a2b'; c.fillRect(1858, y, 22, 14); c.fillStyle = '#b07a43'; c.fillRect(1858, y, 22, 3); }
    });
    // letrero y camino al puerto
    drawSign(c, 1790, 520, 'PUERTO  ->');
    drawSign(c, 1230, 346, 'SAN JUAN BAUTISTA');
    drawSign(c, 560, 346, 'PALACIO MUNICIPAL');
    drawSign(c, 1088, 740, 'PLAZA DEL CENTENARIO');
    c.fillStyle = '#2a1a0c'; c.font = '9px "Fredoka", monospace'; c.textAlign = 'center';
    c.fillText('CACHIMBERO', 1790, 534);
  }

  drawTop(c) {
    this.swayPalms = this.palms.map(([x, y, s]) => new SwayPalm(x, y, 64 + (s % 3) * 8, s % 2 ? 10 : -10, s * 31));
    drawTreeCrown(c, 250, 700, 58, 77, ['#2e7d32', '#3f9b3a', '#6fb04a']);
    drawUmbrella(c, 380, 586, 50);
    this.lamps.forEach(([x, y]) => drawLampHead(c, x, y));
    drawTempleteDome(c, 960, 620);
    this.trees.forEach(([x, y], i) => drawTreeCrown(c, x, y - 52, 46, 90 + i, ['#2e7d32', '#3f9b3a', '#6fb04a']));
    drawUmbrella(c, 1150, 598, 27);
    // banderines sobre la plaza
    const rnd = mulberry32(5);
    drawBunting(c, 640, 420, 1280, 420, rnd, 30);
    drawBunting(c, 640, 870, 1280, 870, rnd, 30);
  }

  dynamicLights() {
    const k = this.dayK, L = [];
    if (k > 0.3) {
      const a = (k - 0.3) / 0.7;
      this.houses.forEach(([x, y, w, h], i) => {
        if (i % 4 === 3) return;   // algunas casas siguen a oscuras
        L.push({ x: x + w * 0.3, y: y + h * 0.62, r: 64, i: 0.55 * a, color: 'rgba(255,190,110,1)' });
        L.push({ x: x + w * 0.72, y: y + h * 0.62, r: 58, i: 0.45 * a, color: 'rgba(255,200,120,1)' });
      });
      L.push({ x: 1240, y: 290, r: 110, i: 0.35 * a, color: 'rgba(255,214,140,1)' });   // puerta de la iglesia
      L.push({ x: 1408, y: 120, r: 70, i: 0.5 * a, color: 'rgba(255,240,200,1)' });      // reloj de la torre
      [380, 500, 620].forEach(x => L.push({ x, y: 160, r: 60, i: 0.45 * a, color: 'rgba(255,200,120,1)' }));   // palacio
      L.push({ x: 960, y: 590, r: 150, i: 0.5 * a, color: 'rgba(255,248,225,1)' });     // templete iluminado
    }
    for (const p of this.particles.list) if (p.glow && p.color === '#d8ff7a') L.push({ x: p.x, y: p.y, r: 18, i: 0.6 });
    return L;
  }

  drawAnimated(ctx, cam) {
    // luciérnagas al anochecer
    if (this.dayK > 0.55 && Math.random() < 0.12 * this.dayK) {
      const x = cam.x + Math.random() * this.game.VW, y = cam.y + Math.random() * this.game.VH;
      if (this.surfaceAt(x, y) === 'grass') this.particles.emit(x, y, { count: 1, color: '#d8ff7a', speed: 8, life: 2.5, size: 2, glow: true, drag: 0.98 });
    }
    // hojas que caen del almendro
    if (Math.random() < 0.05) this.particles.emit(220 + Math.random() * 60, 690, { count: 1, color: '#c9a24a', speed: 10, life: 3, gravity: 18, size: 3, spin: true });
  }

  enter() {
    const g = this.game;
    if (!g.flags.arrivedPueblo) {
      g.flags.arrivedPueblo = true;
      g.script(async alive => {
        for (let i = 0; i < 6; i++) this.particles.emit(g.player.x, g.player.y - 20, { count: 8, color: ['#f6c945', '#ffe9a8'], speed: 90, life: 1, glow: true });
        await g.wait(0.8); if (!alive()) return;
        await g.say([
          { who: 'narrador', text: 'Cuando Mateo abrió los ojos, el aire olía a sal, a leña y a flores de cayena.' },
          { who: 'mateo', text: '¿Dónde estoy? Esto es Ciénaga... pero de hace muchísimos años.' },
          { who: 'narrador', text: 'Las calles se llenaban de gente. Algo importante iba a suceder esa noche.' },
          { who: 'mateo', text: 'Quizás los habitantes del pueblo puedan explicarme qué está pasando.' }
        ]);
      });
    }
  }

  objective() {
    const g = this.game, m = g.missions;
    if (m.isCurrent('habitantes')) {
      if (this.tomasita && !g.flags.metTomasita && !this.tomasita.hidden) return { x: this.tomasita.x, y: this.tomasita.y, h: 92 };
      const n = this.nearestTo(this.npcs.filter(n => n.mission === 'habitantes' && !g.flags['talk_' + n.id] && !n.hidden));
      return n ? { x: n.x, y: n.y, h: 92 } : null;
    }
    if (m.isCurrent('pistas')) {
      // cada pista apunta a su siguiente paso
      const goals = [];
      const C = this.clueItems;
      if (C.flor && !g.flags.item_flor) goals.push(g.flags.permisoFlor ? { x: C.flor.x, y: C.flor.y, h: 30 } : { x: this.carmen.x, y: this.carmen.y, h: 92 });
      if (C.vela && !g.flags.item_vela) goals.push(g.flags.velaTaken ? (() => { const L = this.nearestTo(this.lamps.map(([x, y]) => ({ x, y }))); return { x: L.x, y: L.y - 20, h: 60 }; })() : { x: C.vela.x, y: C.vela.y, h: 30 });
      if (C.cinta && !g.flags.item_cinta) goals.push(g.flags.cintaDown ? { x: C.cinta.x, y: C.cinta.y, h: 30 } : g.flags.cintaSeen ? { x: this.nino.x, y: this.nino.y, h: 80 } : { x: 1790, y: 930, h: 100 });
      return this.nearestTo(goals);
    }
    if (m.isCurrent('puerto')) return { x: 1890, y: 640, h: 30 };
    return null;
  }

  onMission(id) {
    const g = this.game;
    if (id === 'habitantes') {
      g.script(async alive => {
        await g.wait(0.5); if (!alive()) return;
        await g.say([{ who: 'mateo', mood: 'worried', text: 'Tomasita iba hacia el agua... y dejó señales: una flor, una vela y una cinta. Tengo que encontrarlas.' }]);
      });
    } else if (id === 'pistas') {
      g.flags.gateOpen = true;
      this.static = this.static.filter(s => s !== this.gateCollider);
      AudioFX.sfx.gate();
      this.particles.emit(1866, 630, { count: 30, color: ['#f6c945', '#ffe9a8'], speed: 80, life: 1.2, glow: true });
      g.ui.notify('¡EL CAMINO AL PUERTO SE HA ABIERTO!', 'mission');
      g.script(async alive => {
        await g.wait(0.6); if (!alive()) return;
        await g.say([{ who: 'mateo', text: 'La flor, la vela y la cinta... todas señalan hacia el agua. Debo ir al Puerto Cachimbero.' }]);
      });
    }
  }
}

/* =========================================================
   ESCENAS 4, 5 y 6 — PUERTO CACHIMBERO
   ========================================================= */
class PuertoScene extends BaseScene {
  constructor(game, opts) {
    super(game, opts);
    this.width = 2400; this.height = 900;
    this.waterTop = 150; this.shoreY = 570;
    this.music = 'night';
    this.spawn = { x: 110, y: 700, dir: 'right' };
    this.darkness = 0.62; this.darkColor = '5,9,32';
    this.grade = { top: '#5a7ae0', bottom: '#082040', a: 0.45 };
    this.playerLight = 130;
    this.camOffsetY = -110;
    this.mapSeeUp = true;
    this.floating = null;
  }

  build() {
    const g = this.game;
    this.water.push({ x: 0, y: 150, w: 2400, h: 420 }, { x: 770, y: 560, w: 80, h: 340 }, { x: 1580, y: 560, w: 90, h: 340 });
    this.docks.push(
      { x: 420, y: 330, w: 50, h: 245 }, { x: 1180, y: 300, w: 50, h: 275 }, { x: 2000, y: 360, w: 50, h: 215 },
      { x: 2170, y: 430, w: 170, h: 145 },
      { x: 760, y: 606, w: 100, h: 50 }, { x: 1570, y: 606, w: 110, h: 50 }
    );
    this.static.push({ x: 0, y: 0, w: 2400, h: 150 });
    this.huts = [[200, 690, 130, 110], [1000, 720, 130, 120], [1850, 700, 130, 110]];
    this.huts.forEach(([x, y, w, h]) => this.static.push({ x, y: y + 10, w, h: h - 10 }));
    this.mangroves = [[560, 840], [610, 860], [1330, 830], [1390, 860], [2160, 840], [2220, 870], [60, 860], [920, 880]];
    this.mangroves.forEach(([x, y]) => this.static.push({ x: x - 32, y: y - 40, w: 64, h: 44 }));
    this.palms = [[330, 640, 1], [690, 700, 2], [960, 640, 3], [1460, 700, 4], [1760, 650, 5], [2080, 700, 6], [2380, 650, 7], [140, 620, 8]];
    this.palms.forEach(([x, y]) => this.static.push({ x: x - 7, y: y - 6, w: 14, h: 8 }));

    this.torches = [[300, 625], [700, 620], [1150, 640], [1520, 625], [1800, 640], [2150, 615]];
    this.torches.forEach(([x, y]) => {
      this.static.push({ x: x - 3, y: y - 4, w: 6, h: 4 });
      this.lights.push({ x, y: y - 40, r: 150, i: 0.85, color: 'rgba(255,150,60,1)', flicker: true });
      this.props.push({ y, draw: (ctx, game, t) => drawTorch(ctx, x, y, t) });
    });
    this.candles = [];
    for (let i = 0; i < 9; i++) this.candles.push([2186 + (i % 5) * 34, 448 + Math.floor(i / 5) * 100 + (i % 2) * 14]);
    this.lights.push({ x: 2255, y: 500, r: 230, i: 0.95, color: 'rgba(255,190,90,1)', flicker: true });
    this.lights.push({ x: 1900, y: 70, r: 260, i: 0.5, color: 'rgba(200,220,255,1)' }); // luna
    // pueblos palafitos de la Ciénaga Grande, a lo lejos
    this.palafitos = [[700, 384, 0.8], [780, 372, 0.65], [1540, 380, 0.75], [1620, 368, 0.62], [1880, 388, 0.7]];
    this.palafitos.forEach(([x, y, sc]) => {
      this.lights.push({ x, y: y - 16, r: 50, i: 0.6, color: 'rgba(255,190,100,1)', flicker: true });
      this.props.push({ y: y + 20 * sc, draw: ctx => drawPalafito(ctx, x, y, sc) });
    });

    // garzas en la orilla
    [[960, 612, { x: 880, y: 600, w: 280, h: 70 }], [1800, 618, { x: 1700, y: 600, w: 260, h: 70 }]].forEach(([x, y, z]) => this.critters.push(new Bird(this, x, y, z, 'garza')));
    this.mapLabels = [
      { x: 445, y: 300, text: 'Muelle' }, { x: 1205, y: 270, text: 'Muelle' }, { x: 2025, y: 330, text: 'Muelle' },
      { x: 2255, y: 410, text: 'Muelle de las velas' }, { x: 1300, y: 210, text: 'Ciénaga Grande' },
      { x: 810, y: 590, text: 'Puente' }, { x: 1625, y: 590, text: 'Puente' }, { x: 265, y: 800, text: 'Bohío' },
      { x: 1065, y: 830, text: 'Bohío' }, { x: 1915, y: 800, text: 'Bohío' }
    ];
    // juncales altos: escondites donde el caimán no ve a Mateo
    this.reeds = [[400, 632], [1010, 628], [1350, 642], [1720, 630], [2080, 645]];
    this.reeds.forEach(([x, y], i) => this.props.push({ y: y + 18, draw: (ctx, game, t) => drawReedClump(ctx, x, y, t, i, game.player.hidden && pointInRect(game.player.x, game.player.y, reedRect(x, y))) }));
    this.canoes = [[600, 420, 100, 0.2, 0], [1450, 360, 90, -0.3, 1], [1700, 480, 110, 0.1, 2], [260, 300, 80, 0.5, 3], [880, 260, 90, -0.1, 4]];

    [['fig4', 445, 350], ['fig5', 1205, 320], ['fig6', 2025, 380]].forEach(([id, x, y]) => {
      if (!g.flags['item_' + id]) this.items.push(new Collectible({ id, kind: 'figurine', x, y, name: 'Figurita de caimán' }));
    });

    this.caiman = new Caiman(this, 900, 420);

    // Escena 5: encuentro
    this.addTrigger({ x: 560, y: 560, w: 70, h: 340 }, () => this.encounter(), () => g.missions.isCurrent('caiman'));
    // Escena 6: historia de Tomasita
    this.addTrigger({ x: 2140, y: 420, w: 260, h: 480 }, () => this.tomasitaScene(), () => g.missions.isCurrent('tomasita'));
  }

  drawBackground(c) {
    const rnd = mulberry32(21), W = this.width;
    // cielo nocturno
    const sky = c.createLinearGradient(0, 0, 0, 150);
    sky.addColorStop(0, '#060a24'); sky.addColorStop(1, '#1f2c62');
    c.fillStyle = sky; c.fillRect(0, 0, W, 150);
    for (let i = 0; i < 260; i++) { c.fillStyle = rnd() < 0.2 ? '#ffe9a8' : '#fff'; c.fillRect(rnd() * W, rnd() * 120, rnd() < 0.15 ? 2 : 1, rnd() < 0.15 ? 2 : 1); }
    glow(c, 1900, 60, 90, 'rgba(240,240,200,0.35)');
    c.fillStyle = '#f2ecd0'; c.beginPath(); c.arc(1900, 60, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d8d0b0'; c.beginPath(); c.arc(1892, 54, 5, 0, Math.PI * 2); c.arc(1910, 68, 4, 0, Math.PI * 2); c.fill();
    // Sierra Nevada en la distancia
    c.fillStyle = '#18204a';
    c.beginPath(); c.moveTo(0, 150);
    for (let x = 0; x <= W; x += 40) c.lineTo(x, 118 + Math.sin(x * 0.004) * 16 + Math.sin(x * 0.013) * 8);
    c.lineTo(W, 150); c.fill();
    c.fillStyle = '#10163a';
    c.beginPath(); c.moveTo(0, 150);
    for (let x = 0; x <= W; x += 30) c.lineTo(x, 134 + Math.sin(x * 0.009 + 2) * 8);
    c.lineTo(W, 150); c.fill();
    [[700, 104], [1500, 102], [2200, 108]].forEach(([x, y]) => { c.fillStyle = '#c9d2ea'; c.beginPath(); c.moveTo(x - 18, y + 10); c.lineTo(x, y); c.lineTo(x + 20, y + 10); c.fill(); });

    // agua de la ciénaga
    const wg = c.createLinearGradient(0, 150, 0, 570);
    wg.addColorStop(0, '#0a2444'); wg.addColorStop(1, '#13506e');
    c.fillStyle = wg; c.fillRect(0, 150, W, 420);
    speckle(c, 0, 150, W, 420, ['#0e3a5a', '#164f70', '#0b2c4a'], 2600, rnd, 3);
    // reflejo de la luna
    for (let y = 160; y < 560; y += 8) { const w = 30 + rnd() * 50; c.fillStyle = `rgba(240,236,200,${0.18 - (y - 160) / 3000})`; c.fillRect(1900 - w / 2 + (rnd() - 0.5) * 20, y, w, 2); }

    // tierra
    drawGrass(c, 0, 596, W, 304, rnd, '#2c5530', ['#356438', '#244a29', '#3d6e3c'], '#1c3a20');
    // orilla de arena
    c.fillStyle = '#bfa070'; c.fillRect(0, 568, W, 34);
    speckle(c, 0, 568, W, 34, ['#a88a5c', '#cfb282', '#9a7d50'], 1600, rnd, 2);
    c.fillStyle = '#8a7048'; c.fillRect(0, 568, W, 4);
    // caños que cortan el camino
    [[770, 80], [1580, 90]].forEach(([x, w]) => {
      c.fillStyle = '#b09060'; c.fillRect(x - 8, 560, w + 16, 340);
      const cg = c.createLinearGradient(x, 0, x + w, 0);
      cg.addColorStop(0, '#0e3e5c'); cg.addColorStop(0.5, '#13506e'); cg.addColorStop(1, '#0e3e5c');
      c.fillStyle = cg; c.fillRect(x, 560, w, 340);
      speckle(c, x, 560, w, 340, ['#0b2c4a', '#1a5a7a'], 200, rnd, 3);
    });
    // camino de tierra
    c.fillStyle = 'rgba(160,130,80,0.35)';
    for (let x = 0; x < W; x += 6) { const y = 640 + Math.sin(x * 0.01) * 18; c.fillRect(x, y, 6, 26); }

    // muelles y puentes
    drawDock(c, 420, 330, 50, 250); drawDock(c, 1180, 300, 50, 280); drawDock(c, 2000, 360, 50, 220);
    drawDock(c, 2170, 430, 170, 150);
    c.fillStyle = '#e8dcc0'; c.fillRect(2170, 430, 170, 3);
    drawBridge(c, 760, 606, 100, 50); drawBridge(c, 1570, 606, 110, 50);

    // bohíos, manglares, palmeras
    this.huts.forEach(([x, y, w, h]) => drawHut(c, x, y, w, h, rnd));
    this.mangroves.forEach(([x, y]) => drawMangrove(c, x, y, 34, rnd));
    this.palms.forEach(([x, y, s]) => drawPalmTrunk(c, x, y, 70, s % 2 ? 12 : -12));
    // canastos y redes
    [[360, 760], [1160, 880], [1960, 860]].forEach(([x, y]) => { c.fillStyle = '#a07a3a'; c.beginPath(); c.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#6e4a1a'; c.beginPath(); c.ellipse(x, y - 2, 10, 5, 0, 0, Math.PI * 2); c.fill(); });
    drawCanoe(c, 1260, 700, 100, -0.2, '#6b3d1a');
    drawSign(c, 120, 600, 'P. CACHIMBERO');
  }

  drawTop(c) {
    this.swayPalms = this.palms.map(([x, y, s]) => new SwayPalm(x, y, 70, s % 2 ? 12 : -12, s * 17, true));
    const rnd = mulberry32(8);
    // juncos en la orilla
    for (let i = 0; i < 90; i++) {
      const x = rnd() * this.width;
      if (this.isDockPoint(x, 575) || (x > 750 && x < 870) || (x > 1560 && x < 1690)) continue;
      c.strokeStyle = rnd() < 0.5 ? '#3d6e3c' : '#2a5030'; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 3, 590); c.lineTo(x + k * 3 + (rnd() - 0.5) * 8, 562 - rnd() * 14); c.stroke(); }
    }
  }

  updateScene() {
    const p = this.game.player;
    const was = p.hidden;
    p.hidden = !p.running && this.reeds.some(([x, y]) => pointInRect(p.x, p.y, reedRect(x, y)));
    if (p.hidden && !was) { AudioFX.sfx.flap(); this.particles.emit(p.x, p.y - 20, { count: 5, color: ['#3d6e3c', '#5a8a4a'], speed: 40, life: 0.7, size: 3, spin: true, gravity: 40 }); }
  }
  drawHUD(ctx) {
    const p = this.game.player, W = this.game.W;
    if (!p.hidden && !(p.running && this.caiman && this.caiman.state === 'patrol')) return;
    const txt = p.hidden ? 'ESCONDIDO EN LOS JUNCOS' : '¡CORRER HACE RUIDO!';
    ctx.save(); ctx.font = '600 13px "Fredoka", sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 26;
    ctx.fillStyle = 'rgba(7,13,34,0.8)'; ctx.beginPath(); rrect(ctx, W / 2 - w / 2, 232, w, 28, 14); ctx.fill();
    ctx.strokeStyle = p.hidden ? '#7fe08a' : '#ff8a8a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = p.hidden ? '#bff5c4' : '#ffb0b0'; ctx.fillText(txt, W / 2, 251);
    ctx.restore();
  }

  surfaceAt(x, y) {
    if (this.isDockPoint(x, y)) return 'wood';
    if (y < 604) return 'sand';
    if (Math.abs(y - (653 + Math.sin(x * 0.01) * 18)) < 18) return 'dirt';
    return 'grass';
  }

  drawAnimated(ctx, cam) {
    const t = this.t;
    this.drawWaterShimmer(ctx, cam);
    // espuma de la orilla
    ctx.fillStyle = 'rgba(220,240,255,0.5)';
    for (let x = Math.floor(cam.x / 12) * 12; x < cam.x + this.game.VW; x += 12) {
      if (this.isDockPoint(x, 566)) continue;
      ctx.fillRect(x, 564 + Math.sin(t * 2 + x * 0.05) * 3, 8, 2);
    }
    // canoas meciéndose
    this.canoes.forEach(([x, y, len, a, ph]) => drawCanoe(ctx, x + Math.sin(t * 0.5 + ph) * 6, y + Math.sin(t * 1.4 + ph) * 2, len, a + Math.sin(t + ph) * 0.04));
    // velas del muelle final
    this.candles.forEach(([x, y]) => { glow(ctx, x, y - 12, 16, 'rgba(255,200,100,0.5)'); drawCandle(ctx, x, y, t); });
    if (this.floating) {
      const f = this.floating;
      glow(ctx, f.x, f.y - 10, 20, 'rgba(255,200,100,0.6)');
      ctx.fillStyle = '#7a4a22'; ctx.fillRect(f.x - 10, f.y - 2 + Math.sin(t * 2) * 1.5, 20, 5);
      drawCandle(ctx, f.x, f.y - 2 + Math.sin(t * 2) * 1.5, t, 0.9);
      drawCayena(ctx, f.x + 16, f.y + 4 + Math.sin(t * 2 + 1) * 1.5, 0.7);
    }
    // luciérnagas
    if (Math.random() < 0.12) {
      const x = cam.x + Math.random() * this.game.VW, y = 600 + Math.random() * 300;
      this.particles.emit(x, y, { count: 1, color: '#d8ff7a', speed: 8, life: 2.5, size: 2, glow: true, drag: 0.98 });
    }
  }

  dynamicLights() {
    const L = [];
    if (this.floating) L.push({ x: this.floating.x, y: this.floating.y, r: 90, i: 0.9, color: 'rgba(255,190,90,1)', flicker: true });
    for (const p of this.particles.list) if (p.glow && p.color === '#d8ff7a') L.push({ x: p.x, y: p.y, r: 18, i: 0.6 });
    // el caimán se deja ver cuando avisa o persigue
    const cm = this.caiman;
    if (cm && (cm.state === 'warn' || cm.state === 'chase' || cm.state === 'emerging')) {
      L.push({ x: cm.headX, y: cm.headY, r: cm.state === 'warn' ? 80 : 60, i: cm.state === 'warn' ? 0.7 : 0.5, color: cm.state === 'warn' ? 'rgba(255,90,90,1)' : null });
    }
    return L;
  }

  objective() {
    const m = this.game.missions;
    if (m.isCurrent('caiman')) return { x: 595, y: 700, h: 30 };
    if (m.isCurrent('tomasita')) return { x: 2200, y: 640, h: 40 };
    return null;
  }

  enter() {
    const g = this.game;
    g.script(async alive => {
      await g.wait(0.6); if (!alive()) return;
      await g.say([
        { who: 'narrador', text: 'El Puerto Cachimbero, una ensenada junto a la ciénaga adonde llegaban las canoas de los pescadores. La noche había caído y solo las antorchas iluminaban la orilla.' },
        { who: 'mateo', mood: 'worried', text: 'El agua está demasiado quieta... Debo mantenerme en tierra firme y en los muelles.' }
      ]);
      if (!alive()) return;
      if (g.missions.isCurrent('puerto')) g.missions.complete('puerto');
    });
    // partida continuada después del encuentro: el caimán ya patrulla
    if (g.missions.isDone('caiman')) {
      const cm = this.caiman;
      cm.x = 1300; cm.y = this.shoreY - 140; cm.submerged = 0.6; cm.setState('patrol');
      AudioFX.music('danger');
    }
  }

  encounter() {
    const g = this.game, cm = this.caiman;
    g.script(async alive => {
      g.player.walkTo(g.player.x + 10, g.player.y, 40);
      cm.x = g.player.x + 190; cm.y = this.shoreY - 105; cm.angle = Math.PI * 0.85;
      g.ui.bigText('Algo se mueve en el agua...', true);
      AudioFX.music('danger');
      for (let i = 0; i < 14; i++) {
        if (i % 4 === 0) AudioFX.sfx.bubbles();
        this.particles.emit(cm.x + (Math.random() - 0.5) * 60, cm.y + (Math.random() - 0.5) * 20, { count: 2, color: 'rgba(200,235,255,0.9)', speed: 12, life: 0.8, size: 3 });
        this.ripples.push({ x: cm.x + (Math.random() - 0.5) * 40, y: cm.y, r: 4, life: 1.2 });
        await g.wait(0.16); if (!alive()) return;
      }
      cm.emerge();
      AudioFX.sfx.reveal();
      g.shake = 12;
      this.particles.emit(cm.x, cm.y, { count: 30, color: ['#bfe9ff', '#fff'], speed: 90, life: 0.9, size: 3 });
      await g.wait(0.5); if (!alive()) return;
      g.ui.bigText('¡Es el Caimán!');
      await g.wait(2); if (!alive()) return;
      await g.say([
        { who: 'mateo', mood: 'scared', text: '¡Un caimán! Tengo que alejarme de la orilla... pero allá, al final del puerto, brillan unas velas.' },
        { who: 'mateo', mood: 'worried', text: 'Si me escondo entre los juncos no me verá. Y dicen que el caimán le teme al fuego de las antorchas... ¡y nada de correr cerca del agua!' }
      ]);
      if (!alive()) return;
      g.missions.complete('caiman');
    });
  }

  tomasitaScene() {
    const g = this.game, cm = this.caiman;
    g.script(async alive => {
      cm.setState('hidden');
      cm.x = 2300; cm.y = 330;
      AudioFX.music('night');
      g.player.invuln = 0;
      await g.player.walkTo(2160, 650, 90, 'right'); if (!alive()) return;
      g.player.dir = 'up';
      await g.say([{ who: 'narrador', text: 'Las velas iluminaban el muelle. Y entonces, como un recuerdo que despierta, Mateo las vio...' }]);
      if (!alive()) return;
      const tom = new NPC({ id: 'tomasita', who: 'tomasita', x: 2290, y: 470, dir: 'up', talkable: false, solid: false, alpha: 0, facePlayer: false });
      const jua = new NPC({ id: 'juanita', who: 'juanita', x: 2236, y: 500, dir: 'down', talkable: false, solid: false, alpha: 0, facePlayer: false });
      this.npcs.push(tom, jua);
      for (let i = 0; i <= 20; i++) {
        tom.alpha = jua.alpha = i / 20;
        if (i % 4 === 0) { this.particles.emit(tom.x, tom.y - 20, { count: 4, color: ['#ffe9a8', '#fff'], speed: 40, life: 1, glow: true }); this.particles.emit(jua.x, jua.y - 20, { count: 4, color: ['#ffe9a8', '#fff'], speed: 40, life: 1, glow: true }); }
        await g.wait(0.06); if (!alive()) return;
      }
      await g.say([{ who: 'narrador', text: 'Tomasita y Juanita habían ido al puerto a ver las velas sobre el agua. Juanita emprendió el regreso hacia la orilla.' }]);
      if (!alive()) return;
      await jua.moveTo(2236, 600, 55); if (!alive()) return;
      await g.say([{ who: 'tomasita', mood: 'happy', text: '¡Juanita, espera!' }]);
      if (!alive()) return;
      jua.dir = 'up';
      await g.wait(0.6); if (!alive()) return;
      // sonido de agua
      AudioFX.sfx.bubbles();
      for (let i = 0; i < 5; i++) { this.ripples.push({ x: tom.x + (Math.random() - 0.5) * 30, y: 420, r: 4, life: 1.2 }); await g.wait(0.12); }
      if (!alive()) return;
      AudioFX.sfx.splash();
      g.shake = 14;
      this.particles.emit(tom.x, 425, { count: 50, color: ['#bfe9ff', '#ffffff', '#8fd3f0'], speed: 150, life: 1, size: 3, gravity: 140 });
      await g.tween('fade', g.fade, 1, 0.35); if (!alive()) return;
      tom.hidden = true;
      this.floating = { x: 2290, y: 410 };
      await g.wait(1.2); if (!alive()) return;
      await g.say([{ who: 'juanita', mood: 'scared', text: '¡Tomasita!' }]);
      if (!alive()) return;
      await g.say([{ who: 'juanita', mood: 'scared', text: '¡El caimán se la llevó!' }]);
      if (!alive()) return;
      for (let i = 0; i < 4; i++) this.ripples.push({ x: 2290, y: 410, r: 6 + i * 8, life: 1.6 });
      await g.tween('fade', 1, 0, 1.6); if (!alive()) return;
      await g.say([
        { who: 'narrador', text: 'Cuenta la tradición oral que aquella noche de San Sebastián el caimán se llevó a Tomasita en las aguas de Ciénaga.' },
        { who: 'narrador', text: 'Los pescadores salieron en sus canoas, con arpones y antorchas, a buscar al caimán por toda la ciénaga.' },
        { who: 'pescador', mood: 'worried', text: '¡Muchacho, sube a la canoa! ¡Hay que buscarla! Tú vigila el agua y esquiva los troncos.' }
      ]);
      if (!alive()) return;
      AudioFX.music('danger');
      const boat = await g.startMinigame(CanoeGame); if (!alive()) return;
      AudioFX.music('night');
      const bonus = Math.max(0, boat.lights * 5 - boat.hits * 5);
      if (bonus) g.addScore(bonus, g.player.x, g.player.y - 60);
      g.ui.notify(`BÚSQUEDA: ${boat.lights} VELAS · +${bonus}`, 'mission');
      await g.say([
        { who: 'narrador', text: 'Buscaron toda la noche, de orilla a orilla, con las antorchas en alto. Pero el agua guardó silencio.' },
        { who: 'narrador', text: 'Con los años, aquella búsqueda se volvió danza: unos bailan el caimán y otros, con arpones de mentira, lo persiguen y lo encierran.' },
        { who: 'narrador', text: 'Desde entonces, para que nadie olvidara su nombre, Ciénaga convirtió el dolor en memoria... y la memoria en fiesta.' },
        { who: 'mateo', mood: 'sad', text: 'Tomasita... Ahora sé por qué el abuelo quería que conociera esta historia.' }
      ]);
      if (!alive()) return;
      for (let i = 20; i >= 0; i--) { jua.alpha = i / 20; await g.wait(0.05); if (!alive()) return; }
      g.missions.complete('tomasita');
      await g.wait(1.2); if (!alive()) return;
      await g.transition('fiesta', {}, 'fade');
    });
  }
}

/* =========================================================
   ESCENA 7 — LA TRADICIÓN (fiesta en la plaza)
   ========================================================= */
class FiestaScene extends BaseScene {
  constructor(game, opts) {
    super(game, opts);
    this.width = 1440; this.height = 810;
    this.music = 'fiesta';
    this.spawn = { x: 720, y: 640, dir: 'up' };
    this.darkness = 0.42; this.darkColor = '12,8,40';
    this.grade = { top: '#ff8aa8', bottom: '#4a30a8', a: 0.4 };
    this.playerLight = 90;
    // el Festival de hoy (epílogo): de día y con el abuelo
    this.hoy = opts.mode === 'hoy';
    if (this.hoy) {
      this.darkness = 0.04; this.darkColor = '60,30,20';
      this.grade = { top: '#ffe6a0', bottom: '#ff8a6a', a: 0.28 };
      this.rays = true; this.playerLight = 0;
      this.spawn = { x: 720, y: 660, dir: 'up' };
    }
    this.fireT = 2;
    this.mapLabels = [
      { x: 230, y: 590, text: 'Tambores' }, { x: 720, y: 320, text: 'Templete' }, { x: 720, y: 600, text: 'Ronda de baile' },
      { x: 1180, y: 650, text: 'Verseador' }, { x: 120, y: 290, text: 'Comida' }, { x: 1320, y: 290, text: 'Comida' }
    ];
  }
  surfaceAt() { return 'tile'; }

  build() {
    const g = this.game;
    this.static.push({ x: 0, y: 0, w: 1440, h: 176 });
    this.static.push({ x: 653, y: 208, w: 134, h: 90 }); // templete
    this.static.push({ x: 60, y: 300, w: 120, h: 50 }, { x: 1260, y: 300, w: 120, h: 50 }); // mesas de comida
    this.palms = [[40, 470, 1], [1400, 470, 2], [40, 760, 3], [1400, 760, 4], [460, 200, 5], [980, 200, 6]];
    this.palms.forEach(([x, y]) => this.static.push({ x: x - 7, y: y - 6, w: 14, h: 8 }));

    // tamboreros
    [['tamborero', 230, 440, true], ['tamb2', 280, 490, false], ['tamb3', 200, 540, false]].forEach(([id, x, y, talk]) => {
      const n = new NPC({
        id, who: 'tamborero', x, y, dir: 'right', dance: true, talkable: talk, facePlayer: false,
        lines: [
          { who: 'tamborero', text: '¡Que suene el tambor! Así recordamos a Tomasita: con música y no con miedo.' },
          { who: 'tamborero', text: 'El tambor alegre, el llamador y las maracas cuentan la historia mejor que mil palabras.' }
        ]
      });
      if (id === 'tamb3') { n.look = LOOKS.portador; n.prop = 'maracas'; }
      this.npcs.push(n);
    });
    // ronda de bailadores
    const looks = ['bailadora1', 'bailador', 'bailadora2', 'bailador', 'bailadora3', 'bailador'];
    this.ring = [];
    looks.forEach((lk, i) => {
      const n = new NPC({
        id: i === 0 ? 'bailadora' : 'baile' + i, who: 'bailadora', lookKey: lk, solid: false, dance: true, facePlayer: false,
        talkable: i === 0, lines: [{ who: 'bailadora', mood: 'happy', text: 'Bailamos para que su historia siga viva, de generación en generación.' }, { who: 'bailadora', text: '¡Anímate, muchacho! La cumbia se baila con los pies y se recuerda con el corazón.' }, { who: 'bailadora', mood: 'happy', text: 'Háblame otra vez y te enseño los pasos.' }]
      });
      if (i === 0) {
        Object.defineProperty(n, 'label', { get: () => g.flags.talk_bailadora ? 'Bailar con la bailadora' : 'Hablar' });
        n.interact = game => { if (!game.flags.talk_bailadora) game.talkTo(n); else this.playDance(n); };
      }
      n.ringA = i / looks.length * Math.PI * 2;
      n.behavior = (npc, dt) => {
        npc.ringA += dt * 0.5;
        npc.x = 720 + Math.cos(npc.ringA) * 140; npc.y = 500 + Math.sin(npc.ringA) * 70;
        npc.dir = dirTowards(-Math.sin(npc.ringA), Math.cos(npc.ringA));
      };
      this.npcs.push(n); this.ring.push(n);
    });
    // portadores de caimanes
    const wander = (n, dt) => {
      if (!n.wt || dist(n.x, n.y, n.wt.x, n.wt.y) < 6) n.wt = { x: 380 + Math.random() * 700, y: 380 + Math.random() * 300 };
      const dx = n.wt.x - n.x, dy = n.wt.y - n.y, d = Math.hypot(dx, dy);
      const p = g.player;
      if (dist(p.x, p.y, n.x, n.y) < 60) { n.moving = false; n.faceTowards(p.x, p.y); return; }
      n.x += dx / d * 35 * dt; n.y += dy / d * 35 * dt; n.dir = dirTowards(dx, dy); n.moving = true;
    };
    this.npcs.push(new NPC({ id: 'portador', who: 'portador', x: 1000, y: 620, prop: 'caiman', solid: false, behavior: wander, lines: [{ who: 'portador', text: 'Este caimán lo hicimos entre todos los vecinos. Cada año sale a recorrer las calles.' }] }));
    this.npcs.push(new NPC({ id: 'port2', who: 'portador', lookKey: 'bailador', x: 480, y: 640, prop: 'caiman', solid: false, talkable: false, behavior: wander }));
    this.npcs.push(new NPC({ id: 'nino_fiesta', who: 'nino', x: 1100, y: 450, scale: 1.6, prop: 'caiman', dir: 'down', lines: [{ who: 'nino', text: '¡Mira mi caimán! Lo tallé con mi abuelo.' }, { who: 'nino', text: 'Cuando sea viejito se lo voy a regalar a mi nieto, para que él también cuente la historia.' }] }));
    this.npcs.push(new NPC({ id: 'mujer_fiesta', who: 'mujer', lookKey: 'vendedora', x: 120, y: 370, dir: 'down', talkable: false, solid: false }));

    // marías mulatas buscando migas junto a las mesas de comida
    [[90, 380, { x: 40, y: 360, w: 200, h: 70 }], [150, 400, { x: 40, y: 360, w: 200, h: 70 }], [1290, 390, { x: 1220, y: 360, w: 200, h: 70 }]]
      .forEach(([x, y, z]) => this.critters.push(new Bird(this, x, y, z)));

    // gran caimán de comparsa
    this.parade = { x: 150, dir: 1 };
    this.props.push({
      get y() { return 760; },
      draw: (ctx, game, t) => {
        const P = this.parade;
        const x = P.x, y = 750;
        [-60, -20, 20, 60].forEach((o, i) => drawHumanoid(ctx, x + o * P.dir, y + (i % 2) * 6, i % 2 ? LOOKS.bailador : LOOKS.portador, P.dir > 0 ? 'right' : 'left', t + i, true, 2));
        drawCaiman(ctx, x, y - 54 + Math.sin(t * 3) * 3, P.dir > 0 ? 0 : Math.PI, t, { festive: true, scale: 1.25, amp: 8, swaySpeed: 3 });
      }
    });

    // verseador: improvisa versos, como en la danza tradicional
    this.npcs.push(new NPC({
      id: 'verseador', who: 'verseador', title: 'el verseador', x: 1180, y: 600, dir: 'left',
      lines: [
        { who: 'verseador', text: '¡Oigan, oigan, que ahí va el verso! El caimán se fue pa\' la ciénaga, Tomasita no volvió... pero Ciénaga la nombra cada vez que suena el tambor.' },
        { who: 'verseador', text: 'En la danza paramos el baile pa\' que el verseador improvise. Y el coro responde con el final de la historia.' }
      ],
      repeatLines: [{ who: 'verseador', text: '¡Que no pare el tambor, que el verso sale solito!' }]
    }));
    const vers = this.npcs[this.npcs.length - 1];
    vers.lines.push({ who: 'verseador', mood: 'happy', text: 'Y tú, muchacho, ¿tienes buen oído? Háblame otra vez y te pruebo: yo canto y tú rimas.' });
    Object.defineProperty(vers, 'label', { get: () => g.flags.talk_verseador ? 'Rimar con el verseador' : 'Hablar' });
    vers.interact = game => { if (!game.flags.talk_verseador) game.talkTo(vers); else this.playVerses(vers); };

    // tambor alegre: minijuego de ritmo
    const drum = new Interactable({
      x: 250, y: 572, r: 56, sortY: 560,
      enabled: () => !this.hoy && !!g.flags.fiestaIntro,
      onInteract: () => this.playDrums(),
      drawFn: (ctx, t) => {
        if (!this.hoy && g.flags.fiestaIntro && !g.flags.drumDone) glow(ctx, 250, 548, 36 + Math.sin(t * 4) * 6, 'rgba(255,214,120,0.8)');
      }
    });
    Object.defineProperty(drum, 'label', { get: () => g.flags.drumDone ? 'Tocar otra vez' : 'Tocar el tambor' });
    this.interactables.push(drum);

    // figura brillante para regresar
    this.interactables.push(new Interactable({
      x: 720, y: 345, r: 64, label: 'Tocar la figura',
      enabled: () => !this.hoy && !!g.flags.fiestaIntro && !!g.flags.drumDone,
      onInteract: () => this.returnHome(),
      drawFn: (ctx, t) => {
        if (this.hoy) return;
        ctx.fillStyle = '#5e3b1a'; ctx.fillRect(696, 336, 48, 18); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(696, 330, 48, 8);
        if (g.flags.drumDone) glow(ctx, 720, 326, 50 + Math.sin(t * 3) * 8, 'rgba(255,214,120,0.85)');
        drawCaiman(ctx, 720, 326, -0.15, 0, { wood: true, scale: 0.28, amp: 1.5 });
      }
    }));

    // el abuelo acompaña a Mateo en el Festival de hoy
    if (this.hoy) {
      const ab = new NPC({ id: 'abuelo_hoy', who: 'abuelo', title: 'el abuelo', x: 800, y: 670, dir: 'left', showMark: false });
      Object.defineProperty(ab, 'label', { get: () => 'Hablar con el abuelo' });
      ab.interact = () => this.festivalEnd();
      this.abuelo = ab; this.npcs.push(ab);
    }

    // farolitos de colores
    const cols = ['rgba(255,80,80,1)', 'rgba(255,210,90,1)', 'rgba(80,230,220,1)', 'rgba(140,255,120,1)'];
    this.lanterns = [];
    for (let i = 0; i < 12; i++) { const x = 80 + i * 116, y = 250; this.lanterns.push([x, y, cols[i % 4]]); }
    for (let i = 0; i < 8; i++) { const x = 140 + i * 165, y = 700; this.lanterns.push([x, y, cols[(i + 2) % 4]]); }
    this.lanterns.forEach(([x, y, c]) => this.lights.push({ x, y, r: 130, i: 0.8, color: c, flicker: true }));
    this.lights.push({ x: 720, y: 500, r: 300, i: 0.65 });
  }

  drawBackground(c) {
    const rnd = mulberry32(31), W = this.width, H = this.height;
    c.fillStyle = '#2a1a3a'; c.fillRect(0, 0, W, H);
    for (let y = 176; y < H; y += 40) for (let x = 0; x < W; x += 40) {
      c.fillStyle = ((x + y) / 40) % 2 ? '#c9a878' : '#b8966a'; c.fillRect(x, y, 40, 40);
      c.fillStyle = 'rgba(80,50,20,0.25)'; c.fillRect(x, y, 40, 1); c.fillRect(x, y, 1, 40);
    }
    speckle(c, 0, 176, W, H - 176, ['#a8865a', '#d8b888'], 1500, rnd, 2);
    // casas iluminadas al fondo
    const walls = ['#1fb5b0', '#f6c945', '#e86a8a', '#9ad35a', '#f08a2c', '#a98ad8', '#1fb5b0'];
    for (let i = 0; i < 7; i++) drawHouse(c, 10 + i * 206, -10, 190, 186, walls[i], '#a3401f', rnd, { lit: true, shutter: walls[(i + 3) % 7], plants: true });
    // círculo de baile
    c.strokeStyle = 'rgba(253,246,227,0.35)'; c.lineWidth = 3; c.setLineDash([10, 8]);
    c.beginPath(); c.ellipse(720, 500, 150, 78, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    drawTempleteBase(c, 720, 250);
    // mesas de comida
    [[60, 300], [1260, 300]].forEach(([x, y]) => {
      c.fillStyle = '#fdf6e3'; c.fillRect(x, y, 120, 44); c.fillStyle = '#e8313a'; for (let k = 0; k < 120; k += 12) c.fillRect(x + k, y + 38, 6, 8);
      ['#f6c945', '#8a5a2b', '#f08a2c', '#3f9b3a'].forEach((f, k) => { c.fillStyle = f; c.beginPath(); c.arc(x + 18 + k * 28, y + 18, 8, 0, Math.PI * 2); c.fill(); });
    });
    this.palms.forEach(([x, y, s]) => drawPalmTrunk(c, x, y, 66, s % 2 ? 10 : -10));
    // tambores en el suelo
    [[180, 470], [250, 560]].forEach(([x, y]) => { c.fillStyle = '#8a5a2b'; c.fillRect(x - 10, y - 18, 20, 18); c.fillStyle = '#e9dcc0'; c.beginPath(); c.ellipse(x, y - 18, 10, 4, 0, 0, Math.PI * 2); c.fill(); });
  }

  drawTop(c) {
    const rnd = mulberry32(13);
    this.swayPalms = this.palms.map(([x, y, s]) => new SwayPalm(x, y, 66, s % 2 ? 10 : -10, s * 23, true));
    drawTempleteDome(c, 720, 250);
    drawBunting(c, 0, 230, 720, 140, rnd, 40); drawBunting(c, 720, 140, 1440, 230, rnd, 40);
    drawBunting(c, 0, 420, 1440, 420, rnd, 60);
    drawBunting(c, 0, 680, 1440, 680, rnd, 50);
    // pendón del festival
    c.fillStyle = '#2a1a0c'; c.fillRect(456, 128, 528, 40);
    c.fillStyle = '#e8313a'; c.fillRect(460, 132, 520, 32);
    c.fillStyle = '#f6c945'; c.fillRect(460, 132, 520, 3); c.fillRect(460, 161, 520, 3);
    for (let x = 466; x < 980; x += 20) { c.fillStyle = x % 40 ? '#1fb5b0' : '#f6c945'; c.beginPath(); c.moveTo(x, 164); c.lineTo(x + 10, 164); c.lineTo(x + 5, 174); c.fill(); }
    c.font = '16px "Fredoka", monospace'; c.textAlign = 'center';
    c.fillStyle = '#5a0f18'; c.fillText('¡VIVA EL CAIMÁN CIENAGUERO!', 721, 155);
    c.fillStyle = '#fdf6e3'; c.fillText('¡VIVA EL CAIMÁN CIENAGUERO!', 720, 154);
    this.lanterns.forEach(([x, y, col]) => {
      c.fillStyle = '#2a1a10'; c.fillRect(x - 1, y - 18, 2, 8);
      c.fillStyle = col.replace(',1)', ',0.95)'); c.beginPath(); c.ellipse(x, y - 4, 8, 10, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x - 3, y - 10, 2, 10);
    });
  }

  updateScene(dt) {
    const P = this.parade;
    P.x += P.dir * 45 * dt;
    if (P.x > 1300) P.dir = -1;
    if (P.x < 140) P.dir = 1;
    // confeti
    if (Math.random() < 0.5) {
      const cam = this.game.cam;
      this.particles.emit(cam.x + Math.random() * this.game.VW, cam.y - 10, { count: 1, color: ['#e8313a', '#f6c945', '#1fb5b0', '#3f9b3a', '#fdf6e3', '#d6337a'], speed: 20, life: 4, gravity: 40, size: 3, spin: true, drag: 0.95 });
    }
    // fuegos artificiales (solo de noche)
    this.fireT -= dt;
    if (this.fireT <= 0 && !this.hoy) {
      this.fireT = 1.6 + Math.random() * 2;
      const cam = this.game.cam;
      const x = cam.x + 120 + Math.random() * (this.game.VW - 240), y = cam.y + 60 + Math.random() * 120;
      const col = [['#ff6b78', '#ffd0d6'], ['#f6c945', '#fff3c0'], ['#1fb5b0', '#bff5ef'], ['#9ad35a', '#e6ffd0']][(Math.random() * 4) | 0];
      this.particles.emit(x, y, { count: 40, color: col, speed: 140, life: 1.3, size: 3, glow: true, gravity: 30, drag: 0.85 });
      this.burst = { x, y, life: 0.5 };
      AudioFX.sfx.smallSplash();
    }
    if (this.burst) { this.burst.life -= dt; if (this.burst.life <= 0) this.burst = null; }
  }

  dynamicLights() {
    return this.burst ? [{ x: this.burst.x, y: this.burst.y, r: 260 * this.burst.life * 2, i: 0.7, color: 'rgba(255,230,180,1)' }] : [];
  }

  enter() {
    const g = this.game;
    if (this.hoy) {
      g.script(async alive => {
        await g.wait(0.8); if (!alive()) return;
        this.abuelo.faceTowards(g.player.x, g.player.y);
        await g.say([
          { who: 'narrador', text: 'Ciénaga, hoy. Es 20 de enero, y el Festival del Caimán Cienaguero llena las calles de música.' },
          { who: 'abuelo', mood: 'happy', text: '¿Ves, Mateo? Toda esta gente está contando la historia de Tomasita, cada uno a su manera.' },
          { who: 'mateo', mood: 'happy', text: 'Con tambores, con bailes, con versos... ¡y con caimanes!' },
          { who: 'abuelo', mood: 'happy', text: 'Anda, disfruta el festival. Cuando quieras, ven y hablamos.' }
        ]);
      });
      return;
    }
    if (g.flags.fiestaIntro) return;   // partida continuada: ya se vio la introducción
    g.script(async alive => {
      await g.wait(1); if (!alive()) return;
      await g.say([
        { who: 'narrador', text: 'Pasaron los años. Y cada enero, en el Festival del Caimán Cienaguero, Ciénaga se llena de tambores, bailes, verseadores y caimanes. El 20, día de San Sebastián, se recuerda a Tomasita.' },
        { who: 'narrador', text: 'Hay historias que no deben desaparecer.' },
        { who: 'mateo', mood: 'sad', text: 'Ahora entiendo por qué debemos recordarla.' }
      ]);
      if (!alive()) return;
      g.flags.fiestaIntro = true;
      g.missions.setHint('Únete a los tamboreros: toca el tambor alegre (a la izquierda de la plaza).');
    });
  }

  objective() {
    const g = this.game;
    if (this.hoy) return g.missions.isCurrent('festival') ? { x: this.abuelo.x, y: this.abuelo.y, h: 92 } : null;
    if (!g.flags.fiestaIntro || !g.missions.isCurrent('regreso')) return null;
    return g.flags.drumDone ? { x: 720, y: 330, h: 40 } : { x: 250, y: 560, h: 40 };
  }

  playDrums() {
    const g = this.game;
    g.script(async alive => {
      const first = !g.flags.drumDone;
      if (first) {
        await g.say([
          { who: 'tamborero', text: '¿Quieres tocar el tambor alegre, muchacho? El llamador marca el paso y tú repicas encima.' },
          { who: 'tamborero', text: 'Presiona E justo cuando cada parche llegue al tambor grande. ¡Escucha la música!' }
        ]);
        if (!alive()) return;
      }
      g.player.dir = 'up';
      AudioFX.music(null);
      await g.wait(0.4); if (!alive()) return;
      const res = await g.startDrumGame(); if (!alive()) return;
      AudioFX.music('fiesta');
      g.ui.bigText(res.rank);
      await g.wait(1.6); if (!alive()) return;
      const pct = Math.round(res.acc * 100);
      if (first) {
        g.flags.drumDone = true;
        g.flags.drumBest = pct;
        g.addScore(res.bonus, g.player.x, g.player.y - 60);
        g.ui.notify(`RITMO ${pct}% · BONO +${res.bonus}`, 'mission');
        g.unlockCard('tambores');
      } else if (pct > (g.flags.drumBest || 0)) {
        g.flags.drumBest = pct;
        g.ui.notify(`¡NUEVO RÉCORD DE RITMO: ${pct}%!`, 'clue');
      }
      await g.say([
        { who: 'tamborero', text: pct >= 60 ? `¡Así se toca! ${res.perfect} golpes perfectos. Tomasita estaría bailando.` : 'El ritmo se aprende escuchando, muchacho. Lo importante es que el tambor no se calle.' }
      ]);
      if (!alive()) return;
      if (first) g.missions.setHint('Ahora toca la figura que brilla junto al templete.');
    });
  }

  playVerses(npc) {
    const g = this.game;
    g.script(async alive => {
      const first = !g.flags.versesDone;
      npc.faceTowards(g.player.x, g.player.y);
      await g.say([{ who: 'verseador', mood: 'happy', text: first
        ? '¡Así me gusta! Yo canto tres versos y tú pones la última palabra. Pero ojo: tiene que RIMAR con el segundo verso.'
        : '¡Otra ronda! A ver si esta vez rimas todas.' }]);
      if (!alive()) return;
      const res = await g.startVerseGame(); if (!alive()) return;
      const { correct, total } = res;
      const rank = correct === total ? '¡VERSEADOR MAYOR!' : correct >= 3 ? '¡BUEN OÍDO!' : '¡SIGUE PRACTICANDO!';
      g.ui.bigText(rank);
      if (first) {
        g.flags.versesDone = true;
        g.flags.versesBest = correct;
        g.addScore(correct * 10, g.player.x, g.player.y - 60);
        g.ui.notify(`RIMAS ${correct}/${total} · +${correct * 10}`, 'mission');
      } else if (correct > (g.flags.versesBest || 0)) {
        g.flags.versesBest = correct;
        g.ui.notify(`¡NUEVO RÉCORD: ${correct}/${total} RIMAS!`, 'clue');
      }
      await g.wait(1.4); if (!alive()) return;
      await g.say([{ who: 'verseador', mood: correct >= 3 ? 'happy' : null, text: correct === total
        ? '¡Eso es tener sabor! Así se defiende un verso en la plaza.'
        : correct >= 3 ? '¡Nada mal! Con un poquito más de práctica me quitas el puesto.' : 'El verso se aprende escuchando, compadre. ¡Vuelve cuando quieras!' }]);
    });
  }

  playDance(npc) {
    const g = this.game;
    g.script(async alive => {
      const first = !g.flags.danceDone;
      await g.say([{ who: 'bailadora', mood: 'happy', text: first
        ? '¡Así me gusta! Yo hago los pasos y tú los repites con las flechas. Cada vez te pongo uno más, ¿listo?'
        : '¡Otra vez! A ver si ahora llegas hasta el final.' }]);
      if (!alive()) return;
      const res = await g.startMinigame(DanceGame); if (!alive()) return;
      const { rounds, total } = res;
      g.ui.bigText(rounds === total ? '¡REY DE LA CUMBIA!' : rounds >= 3 ? '¡BUENOS PASOS!' : '¡SIGUE BAILANDO!');
      if (first) {
        g.flags.danceDone = true; g.flags.danceBest = rounds;
        g.addScore(rounds * 10, g.player.x, g.player.y - 60);
        g.ui.notify(`BAILE ${rounds}/${total} RONDAS · +${rounds * 10}`, 'mission');
      } else if (rounds > (g.flags.danceBest || 0)) {
        g.flags.danceBest = rounds;
        g.ui.notify(`¡NUEVO RÉCORD DE BAILE: ${rounds}/${total}!`, 'clue');
      }
      await g.wait(1.4); if (!alive()) return;
      await g.say([{ who: 'bailadora', mood: rounds >= 3 ? 'happy' : null, text: rounds === total
        ? '¡Uy, pero qué sabor! Así se baila la cumbia en Ciénaga.'
        : rounds >= 3 ? '¡Bien bailado! Con un poquito más de práctica no te gana nadie.' : 'Los pasos se aprenden bailando, muchacho. ¡Vuelve cuando quieras!' }]);
    });
  }

  /** Epílogo: conversación final con el abuelo (y el final secreto si lo completaste todo). */
  festivalEnd() {
    const g = this.game, ab = this.abuelo;
    if (!g.missions.isCurrent('festival')) return;
    g.script(async alive => {
      ab.faceTowards(g.player.x, g.player.y);
      await g.say([
        { who: 'abuelo', mood: 'happy', text: '¿Te gustó el festival, mijo?' },
        { who: 'mateo', mood: 'happy', text: 'Mucho, abuelo. Ahora cada tambor me recuerda a Tomasita.' },
        { who: 'abuelo', text: 'Así es como una historia sigue viva: alguien la cuenta, alguien la escucha... y un día, el que escuchó la vuelve a contar.' }
      ]);
      if (!alive()) return;
      if (g.secretReady()) {
        await g.say([
          { who: 'abuelo', mood: 'surprised', text: '¿Encontraste las seis figuritas? ¿Ayudaste a la vendedora y al pescador, versaste y hasta bailaste cumbia?' },
          { who: 'abuelo', mood: 'happy', text: 'Entonces ya estás listo. Esta figura la talló mi abuelo, y él la recibió del suyo...' }
        ]);
        if (!alive()) return;
        AudioFX.sfx.magic();
        this.gift = { t: 0 };
        for (let i = 0; i < 14; i++) {
          this.particles.emit(g.player.x, g.player.y - 70, { count: 6, color: ['#f6c945', '#ffe9a8', '#1fb5b0'], speed: 90, life: 1.1, glow: true });
          await g.wait(0.12); if (!alive()) return;
        }
        await g.say([
          { who: 'abuelo', mood: 'happy', text: 'Ahora es tuya, Mateo. Cuando seas viejito, cuéntale la historia a tus nietos.' },
          { who: 'mateo', mood: 'happy', text: 'Te lo prometo, abuelo. Tomasita nunca se va a perder.' }
        ]);
        if (!alive()) return;
        g.flags.secretEnding = true;
        g.addScore(100, g.player.x, g.player.y - 80);
        g.ui.notify('★ FINAL SECRETO: EL REGALO DEL ABUELO +100 ★', 'clue');
        g.unlockCard('secreto');
        await g.wait(1.2); if (!alive()) return;
      }
      g.missions.complete('festival');
      await g.wait(1); if (!alive()) return;
      g.finishGame();
    });
  }

  drawAbove(ctx) {
    // la figura del abuelo flotando sobre Mateo (final secreto)
    if (!this.gift) return;
    this.gift.t += 1 / 60;
    const p = this.game.player, y = p.y - 70 - Math.min(1, this.gift.t) * 10 + Math.sin(this.gift.t * 3) * 3;
    glow(ctx, p.x, y, 46, 'rgba(255,214,120,0.85)');
    drawCaiman(ctx, p.x, y, -0.15, 0, { wood: true, scale: 0.3, amp: 1.5 });
  }

  returnHome() {
    const g = this.game;
    g.script(async alive => {
      await g.say([{ who: 'mateo', mood: 'happy', text: 'Gracias, Tomasita. Prometo seguir contando tu historia.' }]);
      if (!alive()) return;
      g.ui.bigText('La figura comienza a brillar...', true);
      await g.wait(1); if (!alive()) return;
      await g.transition('house', { mode: 'end' }, 'magic');
    });
  }
}

function createScene(game, name, opts = {}) {
  switch (name) {
    case 'house': return new HouseScene(game, opts);
    case 'pueblo': return new PuebloScene(game, opts);
    case 'puerto': return new PuertoScene(game, opts);
    case 'fiesta': return new FiestaScene(game, opts);
  }
  throw new Error('Escena desconocida: ' + name);
}

/* =========================================================
   ESCENA 0 — Fondo ilustrado del menú (Ciénaga al atardecer)
   ========================================================= */
let _menuBg = null;
function drawMenuBackdrop(ctx, t) {
  if (!_menuBg) {
    _menuBg = makeLayer(960, 540, c => {
      const rnd = mulberry32(99);
      const sky = c.createLinearGradient(0, 0, 0, 330);
      sky.addColorStop(0, '#24124a'); sky.addColorStop(0.45, '#8a2f50'); sky.addColorStop(0.75, '#e8613a'); sky.addColorStop(1, '#f6c945');
      c.fillStyle = sky; c.fillRect(0, 0, 960, 330);
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.5})`; c.fillRect(rnd() * 960, rnd() * 120, 1, 1); }
      glow(c, 480, 316, 220, 'rgba(255,200,90,0.55)');
      c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(480, 318, 64, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(480, 318, 48, 0, Math.PI * 2); c.fill();
      // nubes
      c.fillStyle = 'rgba(255,170,120,0.55)';
      [[160, 120, 90], [760, 90, 110], [600, 180, 70], [300, 200, 60]].forEach(([x, y, w]) => { c.fillRect(x - w / 2, y, w, 6); c.fillRect(x - w / 3, y - 5, w * 0.6, 5); });
      // Sierra Nevada
      c.fillStyle = '#5a2a50';
      c.beginPath(); c.moveTo(0, 330); c.lineTo(0, 280);
      [[90, 250], [170, 270], [260, 226], [340, 262], [420, 290], [560, 296], [640, 250], [720, 214], [800, 258], [880, 240], [960, 272]].forEach(([x, y]) => c.lineTo(x, y));
      c.lineTo(960, 330); c.fill();
      c.fillStyle = '#f2d8e0';
      [[260, 226], [720, 214]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 16, y + 12); c.lineTo(x, y); c.lineTo(x + 16, y + 12); c.fill(); });
      // agua
      const wg = c.createLinearGradient(0, 330, 0, 540);
      wg.addColorStop(0, '#e8813a'); wg.addColorStop(0.35, '#8a3a50'); wg.addColorStop(1, '#0b2a4a');
      c.fillStyle = wg; c.fillRect(0, 330, 960, 210);
      // orilla izquierda con casas y palmeras
      c.fillStyle = '#1a0f22';
      c.beginPath(); c.moveTo(0, 540); c.lineTo(0, 350); c.lineTo(120, 352); c.lineTo(250, 372); c.lineTo(300, 420); c.lineTo(330, 540); c.fill();
      [[20, 312, 50, 40], [80, 300, 60, 52], [150, 322, 50, 40], [205, 334, 40, 36]].forEach(([x, y, w, h]) => {
        c.fillStyle = '#1a0f22'; c.fillRect(x, y, w, h); c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + w / 2, y - 18); c.lineTo(x + w + 6, y); c.fill();
        c.fillStyle = '#f6c945'; c.fillRect(x + 8, y + 12, 8, 8); if (w > 45) c.fillRect(x + w - 18, y + 12, 8, 8);
      });
      // orilla derecha con muelle
      c.fillStyle = '#1a0f22';
      c.beginPath(); c.moveTo(960, 540); c.lineTo(960, 360); c.lineTo(860, 370); c.lineTo(760, 410); c.lineTo(700, 540); c.fill();
      c.fillRect(600, 420, 170, 8);
      for (let x = 610; x < 770; x += 30) c.fillRect(x, 420, 5, 34);
      // palmeras en silueta
      [[60, 300, 120, -16], [270, 380, 110, 18], [880, 360, 130, -14], [800, 400, 100, 12]].forEach(([x, y, h, lean]) => {
        c.strokeStyle = '#140a1a'; c.lineWidth = 7;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); c.stroke();
        c.lineWidth = 6;
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.5;
          c.beginPath(); c.moveTo(x + lean, y - h);
          c.quadraticCurveTo(x + lean + Math.cos(a) * 30, y - h + Math.sin(a) * 20 - 10, x + lean + Math.cos(a) * 54, y - h + Math.sin(a) * 30 + 26);
          c.stroke();
        }
      });
      // canoa con pescador
      c.fillStyle = '#140a1a';
      c.beginPath(); c.moveTo(380, 470); c.quadraticCurveTo(440, 486, 500, 470); c.lineTo(492, 478); c.quadraticCurveTo(440, 490, 388, 478); c.fill();
      c.fillRect(436, 446, 8, 26); c.beginPath(); c.arc(440, 442, 6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(426, 440); c.lineTo(454, 440); c.lineTo(440, 432); c.fill();
      c.lineWidth = 2; c.strokeStyle = '#140a1a'; c.beginPath(); c.moveTo(446, 452); c.lineTo(472, 500); c.stroke();
    }, 2);
  }
  ctx.drawImage(_menuBg, 0, 0, 960, 540);
  // reflejo del sol
  for (let i = 0; i < 18; i++) {
    const y = 336 + i * 11;
    const w = (80 - i * 3) * (0.7 + Math.sin(t * 2 + i) * 0.3);
    ctx.fillStyle = `rgba(255,220,130,${0.5 - i * 0.025})`;
    ctx.fillRect(480 - w / 2 + Math.sin(t * 1.5 + i * 2) * 6, y, w, 3);
  }
  // olas
  ctx.fillStyle = 'rgba(255,200,160,0.25)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 97 + t * 12) % 960, y = 360 + (i * 37) % 170;
    ctx.fillRect(x, y + Math.sin(t + i) * 2, 16, 2);
  }
  // pájaros
  ctx.strokeStyle = '#2a1030'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const x = (t * (22 + i * 4) + i * 190) % 1100 - 70, y = 90 + i * 22 + Math.sin(t * 2 + i) * 6;
    const f = Math.sin(t * 8 + i) * 4;
    ctx.beginPath(); ctx.moveTo(x - 8, y - f); ctx.lineTo(x, y); ctx.lineTo(x + 8, y - f); ctx.stroke();
  }
  // ojos del caimán que asoman
  const k = (t % 12) / 12;
  if (k > 0.35 && k < 0.85) {
    const a = Math.min(1, Math.min(k - 0.35, 0.85 - k) * 8);
    ctx.globalAlpha = a;
    drawCaiman(ctx, 640, 500, Math.PI, t, { submerged: 0.85, scale: 0.9, amp: 3 });
    ctx.globalAlpha = 1;
  }
}
