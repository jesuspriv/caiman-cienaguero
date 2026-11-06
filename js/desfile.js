'use strict';
/* =========================================================
   desfile.js — Minijuego «El Desfile del Caimán».
   Como en la Gran Parada de Caimanes del festival, Mateo carga
   un caimán gigante por la calle, entre la gente. Se cambia de
   carril con las flechas para esquivar charcos, un perro
   dormido y una carretilla de cocos, y se recogen notas
   musicales y flores de cayena. Hay que llegar al templete.
   ========================================================= */

const PARADE_LANES = [330, 400, 470];
const PARADE_GOAL = 42;   // segundos de recorrido

const PARADE_THINGS = {
  charco: { bad: true, msg: '¡Uy, un charco!' },
  perro: { bad: true, msg: '¡Shh, el perro estaba dormido!' },
  carretilla: { bad: true, msg: '¡Cuidado con la carretilla de cocos!' },
  nota: { pts: 10, col: '#f6c945' },
  cayena: { pts: 15, col: '#e8313a' },
  estrella: { pts: 40, col: '#ffe9a8' }
};

class ParadeGame {
  constructor(game, onDone) {
    this.game = game; this.onDone = onDone;
    this.hoy = !!(game.scene && game.scene.hoy);
    this.lane = 1; this.y = PARADE_LANES[1];
    this.lives = this.maxLives = Settings.diff.danceLives;
    this.speedK = Settings.diff.canoe;
    this.t = 0; this.run = 0; this.dist = 0; this.scroll = 0;
    this.things = []; this.spawnT = 1.2; this.invuln = 0;
    this.points = 0; this.got = 0; this.hits = 0;
    this.phase = 'count'; this.countT = 3.2;
    this.msg = null; this.pops = []; this.done = false;
    game.ui.showHUD(false);   // el desfile ocupa toda la pantalla
    this.crowd = [];
    const looks = ['vendedora', 'mujer', 'nino', 'pescador', 'bailadora2', 'tamborero', 'carmen', 'anciano', 'bailador', 'juanita'];
    for (let i = 0; i < 14; i++) this.crowd.push({ x: i * 74 + (i % 2) * 20, look: LOOKS[looks[i % looks.length]], s: i % 3 === 2 ? 1.5 : 1.8, ph: i * 0.7 });
  }

  key(code) {
    if (this.done) return false;
    if (code === 'ArrowUp' || code === 'KeyW') { this.move(-1); return true; }
    if (code === 'ArrowDown' || code === 'KeyS') { this.move(1); return true; }
    return code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD';
  }
  click(x, y) { this.move(y < this.y ? -1 : 1); }
  hit() {}
  move(d) {
    if (this.phase !== 'run') return;
    const n = clamp(this.lane + d, 0, 2);
    if (n !== this.lane) { this.lane = n; AudioFX.sfx.blip(); }
  }

  get speed() { return (230 + Math.min(1, this.run / PARADE_GOAL) * 110) * this.speedK; }

  spawn() {
    const r = Math.random(), lane = (Math.random() * 3) | 0;
    const kind = r < 0.2 ? 'charco' : r < 0.36 ? 'perro' : r < 0.48 ? 'carretilla' : r < 0.78 ? 'nota' : r < 0.96 ? 'cayena' : 'estrella';
    this.things.push({ kind, lane, x: 1020, hit: false });
    // a veces, una fila de notas para seguir
    if (kind === 'nota' && Math.random() < 0.5) for (let k = 1; k < 4; k++) this.things.push({ kind: 'nota', lane, x: 1020 + k * 46, hit: false });
    // nunca se tapan los tres carriles a la vez
    if (PARADE_THINGS[kind].bad && Math.random() < 0.35) {
      const other = (lane + 1 + ((Math.random() * 2) | 0)) % 3;
      this.things.push({ kind: Math.random() < 0.5 ? 'charco' : 'perro', lane: other, x: 1020, hit: false });
    }
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    this.y += (PARADE_LANES[this.lane] - this.y) * Math.min(1, dt * 14);
    if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
    this.pops = this.pops.filter(p => (p.t -= dt) > 0);
    if (this.phase === 'count') {
      const before = Math.ceil(this.countT);
      this.countT -= dt;
      if (Math.ceil(this.countT) !== before && this.countT > 0) AudioFX.sfx.blip();
      if (this.countT <= 0) { this.phase = 'run'; this.msg = { text: '¡ARRANCA EL DESFILE!', col: '#f6c945', t: 1.4 }; AudioFX.sfx.select(); }
      return;
    }
    if (this.phase === 'end') {
      this.endT -= dt;
      this.scroll += 60 * dt;
      if (this.endT <= 0) this.finish();
      return;
    }
    const v = this.speed;
    this.run += dt; this.scroll += v * dt;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.run < PARADE_GOAL - 2.5) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawn(); this.spawnT = Math.max(0.55, 1.15 - this.run / PARADE_GOAL * 0.5) / this.speedK; }
    }
    for (const o of this.things) {
      o.x -= v * dt;
      if (o.hit || o.lane !== this.lane || Math.abs(o.x - 214) > 30) continue;
      const T = PARADE_THINGS[o.kind];
      if (T.bad) {
        if (this.invuln > 0) continue;
        o.hit = true; this.lives--; this.hits++; this.invuln = 1.3;
        this.game.shake = 8;
        AudioFX.sfx.wrong();
        this.msg = { text: this.lives > 0 ? T.msg : '¡Se acabó el desfile!', col: '#ff8a8a', t: 1.3 };
        if (this.lives <= 0) { this.phase = 'end'; this.endT = 1.6; this.completed = false; }
      } else {
        o.hit = true; this.points += T.pts; this.got++;
        AudioFX.sfx.pickup();
        this.pops.push({ x: o.x, y: PARADE_LANES[o.lane] - 40, text: '+' + T.pts, col: T.col, t: 0.8 });
      }
    }
    this.things = this.things.filter(o => o.x > -80 && !(o.hit && !PARADE_THINGS[o.kind].bad));
    if (this.run >= PARADE_GOAL) {
      this.phase = 'end'; this.endT = 2.2; this.completed = true;
      this.points += this.lives * 20;
      this.msg = { text: '¡LLEGASTE AL TEMPLETE! ¡QUÉ DESFILE!', col: '#7fe08a', t: 2.2 };
      AudioFX.sfx.mission();
    }
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.game.ui.showHUD(true);
    this.onDone({ completed: !!this.completed, points: this.points, got: this.got, hits: this.hits });
  }

  /* ---------------- dibujo ---------------- */
  drawThing(ctx, o, t) {
    const x = o.x, y = PARADE_LANES[o.lane];
    switch (o.kind) {
      case 'charco': {
        ctx.fillStyle = 'rgba(40,90,140,0.75)'; ctx.beginPath(); ctx.ellipse(x, y + 6, 32, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(190,230,255,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x - 6, y + 4, 14 + Math.sin(t * 4) * 2, 4, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'perro': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b8763a'; ctx.beginPath(); ctx.ellipse(x, y, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x - 20, y - 3, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.ellipse(x - 25, y - 7, 4, 6, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 23, y - 3); ctx.lineTo(x - 19, y - 3); ctx.stroke();
        ctx.fillStyle = '#fdf6e3'; ctx.font = '700 14px "Fredoka", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('z', x - 12, y - 20 - Math.sin(t * 2) * 3); ctx.font = '700 10px "Fredoka", sans-serif'; ctx.fillText('z', x - 4, y - 30 - Math.sin(t * 2 + 1) * 3);
        break;
      }
      case 'carretilla': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 32, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b4424'; ctx.fillRect(x - 30, y - 22, 52, 26);
        ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x - 30, y - 22, 52, 5);
        ctx.strokeStyle = '#4a2e16'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 22, y - 10); ctx.lineTo(x + 40, y - 2); ctx.stroke();
        ['#5e3b1a', '#7a4a22', '#5e3b1a', '#6b4424'].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x - 20 + k * 12, y - 26, 7, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(x - 10, y + 6, 7, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'nota': {
        const b = Math.sin(t * 6 + o.x * 0.05) * 3;
        glow(ctx, x, y - 30 + b, 22, 'rgba(246,201,69,0.6)');
        ctx.fillStyle = '#f6c945'; ctx.font = '700 28px "Fredoka", "Segoe UI Symbol", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('♪', x, y - 20 + b);
        break;
      }
      case 'cayena': {
        const b = Math.sin(t * 5 + o.x * 0.05) * 3;
        glow(ctx, x, y - 30 + b, 22, 'rgba(255,90,90,0.5)');
        drawCayena(ctx, x, y - 30 + b, 1.7);
        break;
      }
      case 'estrella': {
        const b = Math.sin(t * 7) * 4;
        glow(ctx, x, y - 32 + b, 30, 'rgba(255,240,180,0.9)');
        ctx.save(); ctx.translate(x, y - 32 + b); ctx.rotate(t * 2);
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 6 : 14; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
        break;
      }
    }
  }

  draw(ctx) {
    const W = this.game.W, H = this.game.H, t = this.t, hoy = this.hoy;
    ctx.save();
    // cielo
    const sky = ctx.createLinearGradient(0, 0, 0, 250);
    if (hoy) { sky.addColorStop(0, '#5ab8e8'); sky.addColorStop(1, '#ffe0a0'); }
    else { sky.addColorStop(0, '#1a1448'); sky.addColorStop(1, '#8a3a6a'); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 250);
    // casas de colores (se mueven despacio)
    const walls = ['#1fb5b0', '#f6c945', '#e86a8a', '#9ad35a', '#f08a2c', '#a98ad8', '#fdf6e3', '#8fb8e6'];
    const off = (this.scroll * 0.35) % 150;
    for (let i = -1; i < 8; i++) {
      const x = i * 150 - off, k = (Math.floor((this.scroll * 0.35) / 150) + i + 64) % walls.length;
      const wall = walls[k];
      ctx.fillStyle = shade(wall, -0.05); ctx.fillRect(x + 4, 96, 142, 160);
      ctx.fillStyle = '#b8431f'; ctx.fillRect(x, 82, 150, 22);
      ctx.fillStyle = shade('#b8431f', 0.15); ctx.fillRect(x, 82, 150, 8);
      ctx.fillStyle = hoy ? '#2f6f6a' : '#ffd58a';
      ctx.fillRect(x + 22, 130, 26, 34); ctx.fillRect(x + 100, 130, 26, 34);
      ctx.fillStyle = '#7a4a22'; ctx.fillRect(x + 62, 190, 26, 66);
    }
    // banderines
    const cols = ['#e8313a', '#f6c945', '#1fb5b0', '#3f9b3a', '#fdf6e3'];
    for (let i = 0; i < 40; i++) {
      const x = ((i * 26 - this.scroll * 0.5) % 1040 + 1040) % 1040 - 40;
      ctx.fillStyle = cols[i % 5]; ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x + 18, 70); ctx.lineTo(x + 9, 86 + Math.sin(t * 3 + i) * 2); ctx.fill();
    }
    if (!hoy) for (let i = 0; i < 8; i++) { const x = ((i * 140 - this.scroll * 0.5) % 1120 + 1120) % 1120 - 60; glow(ctx, x, 92, 30, 'rgba(255,214,120,0.7)'); ctx.fillStyle = ['#ff6b78', '#f6c945', '#7fe0d8'][i % 3]; ctx.beginPath(); ctx.ellipse(x, 92, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); }
    // la gente mirando el desfile (anda al ritmo de la calle)
    ctx.fillStyle = '#c9a878'; ctx.fillRect(0, 250, W, 30);
    for (const c of this.crowd) {
      const x = ((c.x - this.scroll) % 1036 + 1036) % 1036 - 40;
      const hop = Math.abs(Math.sin(t * 5 + c.ph)) * 4;
      drawHumanoid(ctx, x, 284 - hop, c.look, 'down', t + c.ph, false, c.s, 'happy');
    }
    // calle con tres carriles
    const st = ctx.createLinearGradient(0, 284, 0, H);
    st.addColorStop(0, '#b8966a'); st.addColorStop(1, '#8a6a44');
    ctx.fillStyle = st; ctx.fillRect(0, 284, W, H - 284);
    ctx.strokeStyle = 'rgba(253,246,227,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([26, 22]); ctx.lineDashOffset = this.scroll % 48;
    [365, 435].forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
    ctx.setLineDash([]);
    // confeti
    for (let i = 0; i < 30; i++) {
      const x = ((i * 97 - this.scroll * 0.8) % 1000 + 1000) % 1000 - 20, y = (i * 53 + t * 40) % 260 + 280;
      ctx.fillStyle = cols[i % 5]; ctx.fillRect(x, y, 4, 4);
    }
    // obstáculos y premios (los de atrás primero)
    const list = this.things.slice().sort((a, b) => a.lane - b.lane);
    for (const o of list) if (o.lane < this.lane || (o.lane === this.lane && o.x > 214)) this.drawThing(ctx, o, t);
    // Mateo con el caimán, y un portador que lleva la cola
    const blink = this.invuln > 0 && Math.floor(this.invuln * 10) % 2 === 0;
    if (!blink) {
      const walk = this.phase === 'run';
      drawHumanoid(ctx, 138, this.y, LOOKS.portador, 'right', t, walk, 2.4, 'happy');
      drawHumanoid(ctx, 214, this.y, LOOKS.mateo, 'right', t, walk, 2.4, this.invuln > 0.6 ? 'surprised' : 'happy');
      drawCaiman(ctx, 186, this.y - 66 + Math.sin(t * 6) * 3, 0, t, { festive: true, scale: 0.9, amp: 7, swaySpeed: 4 });
    }
    for (const o of list) if (!(o.lane < this.lane || (o.lane === this.lane && o.x > 214))) this.drawThing(ctx, o, t);
    // puntos que saltan
    ctx.textAlign = 'center'; ctx.font = '700 18px "Fredoka", sans-serif';
    for (const p of this.pops) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, p.y - (0.8 - p.t) * 40); }
    ctx.globalAlpha = 1;

    // barra de recorrido: de la plaza al templete
    const bx = 250, bw = 460, by = 18, k = Math.min(1, this.run / PARADE_GOAL);
    ctx.fillStyle = 'rgba(7,13,34,0.78)'; ctx.beginPath(); rrect(ctx, bx - 90, by - 6, bw + 180, 40, 18); ctx.fill();
    ctx.strokeStyle = '#f6c945'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); rrect(ctx, bx, by + 8, bw, 10, 5); ctx.fill();
    ctx.fillStyle = '#f6c945'; ctx.beginPath(); rrect(ctx, bx, by + 8, Math.max(10, bw * k), 10, 5); ctx.fill();
    ctx.font = '600 11px "Fredoka", sans-serif'; ctx.fillStyle = '#fdf6e3'; ctx.textAlign = 'right'; ctx.fillText('SALIDA', bx - 8, by + 18);
    ctx.textAlign = 'left'; ctx.fillText('TEMPLETE', bx + bw + 8, by + 18);
    drawCaiman(ctx, bx + bw * k, by + 12, 0, t, { festive: true, scale: 0.18, amp: 2 });
    // vidas y puntos
    ctx.textAlign = 'left'; ctx.font = '600 18px "Fredoka", sans-serif';
    ctx.fillStyle = 'rgba(7,13,34,0.78)'; ctx.beginPath(); rrect(ctx, 14, 64, 170, 58, 12); ctx.fill();
    ctx.fillStyle = '#ff6b78'; ctx.fillText('♥'.repeat(Math.max(0, this.lives)) + '♡'.repeat(this.maxLives - Math.max(0, this.lives)), 26, 88);
    ctx.fillStyle = '#f6c945'; ctx.fillText(`★ ${this.points}`, 26, 112);
    // ayuda
    ctx.textAlign = 'center'; ctx.font = '600 14px "Fredoka", sans-serif';
    ctx.fillStyle = 'rgba(7,13,34,0.72)'; ctx.beginPath(); rrect(ctx, W / 2 - 300, H - 34, 600, 26, 13); ctx.fill();
    ctx.fillStyle = '#7fe0d8';
    ctx.fillText(IS_TOUCH ? 'Toca arriba o abajo para cambiar de carril · recoge ♪ y flores' : '▲ ▼ para cambiar de carril · esquiva charcos, perros y carretillas · recoge ♪ y flores', W / 2, H - 16);
    // cuenta regresiva y mensajes
    if (this.phase === 'count') {
      const n = Math.ceil(this.countT);
      ctx.fillStyle = 'rgba(7,13,34,0.45)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '700 22px "Fredoka", sans-serif'; ctx.fillStyle = '#ffd9b0';
      ctx.fillText('LA GRAN PARADA DE CAIMANES', W / 2, H / 2 - 70);
      ctx.font = '700 96px "Fredoka", sans-serif'; ctx.fillStyle = '#f6c945';
      ctx.fillText(n > 3 ? '3' : String(Math.max(1, n)), W / 2, H / 2 + 30);
    }
    if (this.msg) {
      ctx.font = '700 26px "Fredoka", sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(this.msg.text, W / 2 + 2, 178);
      ctx.fillStyle = this.msg.col; ctx.fillText(this.msg.text, W / 2, 176);
    }
    ctx.restore();
  }
}
