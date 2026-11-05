'use strict';
/* =========================================================
   fauna.js — Vida en el escenario:
   - SwayPalm: copa de palmera que se mece con la brisa.
   - Hen: gallinas que picotean y huyen si Mateo corre cerca.
   - Dog: perro criollo que ladra, sigue a Mateo y se deja acariciar.
   - Bird: marías mulatas (y garzas en el puerto) que se espantan y vuelan.
   ========================================================= */

/* ---------- Palmeras que se mecen ---------- */
class SwayPalm {
  constructor(x, y, h, lean, seed, dark = false) {
    this.tx = x + lean; this.ty = y - h; this.seed = seed;
    // la copa se dibuja una sola vez en su propia capa (rápido de mover)
    this.layer = makeLayer(124, 104, c => drawPalmCrown(c, 62 - lean, 42 + h, h, lean, seed, dark), 2);
  }
  draw(ctx, t, cam, game) {
    if (cam && (this.tx < cam.x - 70 || this.tx > cam.x + game.VW + 70 || this.ty < cam.y - 70 || this.ty > cam.y + game.VH + 70)) return;
    // brisa: un vaivén lento más ráfagas cortas
    const gust = Math.max(0, Math.sin(t * 0.35 + this.seed)) ** 6;
    const a = Math.sin(t * 0.9 + this.seed * 1.7) * 0.035 + Math.sin(t * 2.3 + this.seed) * 0.012 + gust * Math.sin(t * 5 + this.seed) * 0.03;
    ctx.save();
    ctx.translate(this.tx, this.ty);
    ctx.rotate(a);
    ctx.scale(1 + Math.sin(t * 1.3 + this.seed) * 0.015, 1);
    ctx.drawImage(this.layer, -62, -42, 124, 104);
    ctx.restore();
  }
}

/* ---------- Utilidades de movimiento ---------- */
function critterBlocked(scene, x, y) {
  if (x < 8 || y < 40 || x > scene.width - 8 || y > scene.height - 4) return true;
  if (scene.isWaterPoint && scene.water.length && scene.isWaterPoint(x, y)) return true;
  for (const c of scene.static) if (x > c.x - 4 && x < c.x + c.w + 4 && y > c.y - 2 && y < c.y + c.h + 2) return true;
  return false;
}
function randomIn(zone) { return { x: zone.x + Math.random() * zone.w, y: zone.y + Math.random() * zone.h }; }

class Critter {
  constructor(scene, x, y, zone) {
    this.scene = scene; this.game = scene.game;
    this.x = x; this.y = y; this.zone = zone;
    this.vx = 0; this.vy = 0; this.face = 1;
    this.t = Math.random() * 10;
    this.target = null; this.wait = Math.random() * 2;
    this.emote = null;
  }
  /** Avanza hacia (tx,ty); devuelve true si llegó o se bloqueó. */
  stepTo(tx, ty, speed, dt) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d < 3) { this.vx = this.vy = 0; return true; }
    const nx = this.x + dx / d * speed * dt, ny = this.y + dy / d * speed * dt;
    if (critterBlocked(this.scene, nx, ny)) { this.vx = this.vy = 0; return true; }
    this.vx = dx / d * speed; this.vy = dy / d * speed;
    this.x = nx; this.y = ny;
    if (Math.abs(dx) > 1) this.face = dx < 0 ? -1 : 1;
    return false;
  }
  get playerDist() { const p = this.game.player; return p ? dist(p.x, p.y, this.x, this.y) : 999; }
  shadow(ctx, w = 9) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y, w, w * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/* ---------- Gallina ---------- */
class Hen extends Critter {
  constructor(scene, x, y, zone, color = '#f4ead8') {
    super(scene, x, y, zone);
    this.color = color; this.state = 'idle'; this.peck = 0; this.cluckCd = 0;
  }
  update(dt) {
    this.t += dt; this.cluckCd -= dt;
    const p = this.game.player;
    const scare = p && p.running ? 95 : 48;
    if (p && this.playerDist < scare && !this.game.locked) {
      // huye en dirección contraria a Mateo
      const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (this.state !== 'flee') {
        this.state = 'flee';
        if (this.cluckCd <= 0) { AudioFX.sfx.cluck(); this.cluckCd = 2.5; }
        if (p.running) this.scene.particles.emit(this.x, this.y - 10, { count: 4, color: this.color, speed: 50, life: 0.8, size: 3, spin: true, gravity: 40 });
      }
      if (this.stepTo(this.x + dx / d * 40, this.y + dy / d * 40, 120, dt)) {
        // acorralada: escapa de lado
        this.stepTo(this.x - dy / d * 40, this.y + dx / d * 40, 120, dt);
      }
      return;
    }
    if (this.state === 'flee') { this.state = 'idle'; this.wait = 0.6; }
    if (this.state === 'idle') {
      this.wait -= dt;
      this.peck = Math.max(0, Math.sin(this.t * 9)) * (Math.sin(this.t * 0.7) > 0.2 ? 1 : 0);
      if (this.wait <= 0) { this.state = 'walk'; this.target = randomIn(this.zone); }
    } else if (this.state === 'walk') {
      this.peck = 0;
      if (this.stepTo(this.target.x, this.target.y, 26, dt)) { this.state = 'idle'; this.wait = 1.5 + Math.random() * 3; }
    }
  }
  draw(ctx) {
    const x = this.x, y = this.y, f = this.face;
    const moving = this.vx || this.vy;
    const bob = moving ? Math.abs(Math.sin(this.t * 14)) * -1.5 : 0;
    this.shadow(ctx, 8);
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(f, 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.lineJoin = 'round';
    // patas
    ctx.strokeStyle = '#e0a020'; ctx.lineWidth = 1.4;
    const lp = moving ? Math.sin(this.t * 14) * 2 : 0;
    ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(-1 + lp, 0); ctx.moveTo(2, -4); ctx.lineTo(2 - lp, 0); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
    // cola
    ctx.fillStyle = shade(this.color, -0.15);
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-11, -16, -8, -17); ctx.quadraticCurveTo(-6, -12, -3, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
    // cuerpo
    const g = ctx.createRadialGradient(-1, -10, 1, 0, -8, 9);
    g.addColorStop(0, shade(this.color, 0.12)); g.addColorStop(1, shade(this.color, -0.12));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -8, 7.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // ala
    ctx.fillStyle = shade(this.color, -0.08); ctx.beginPath(); ctx.ellipse(-1, -8, 4, 2.6, 0.2, 0, Math.PI * 2); ctx.fill();
    // cabeza (baja al picotear)
    const hy = -14 + this.peck * 8, hx = 5 + this.peck * 2;
    ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8313a'; ctx.beginPath(); ctx.ellipse(hx - 0.5, hy - 3.6, 1.8, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 2.2, hy + 2.6, 0.9, 1.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6c945'; ctx.beginPath(); ctx.moveTo(hx + 3, hy - 0.8); ctx.lineTo(hx + 6, hy + 0.2); ctx.lineTo(hx + 3, hy + 1); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(hx + 1.2, hy - 0.6, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/* ---------- Perro criollo ---------- */
class Dog extends Critter {
  constructor(scene, x, y, zone) {
    super(scene, x, y, zone);
    this.state = 'idle'; this.wag = 0; this.barkCd = 0; this.happy = 0; this.r = 40;
    this.sortY = undefined;
  }
  get label() { return 'Acariciar al perro'; }
  get available() { return !this.game.locked; }
  interact(game) {
    this.happy = 4; this.state = 'idle'; this.wait = 2.5;
    setEmote(this, '♥', 1.6);
    AudioFX.sfx.pet();
    this.face = game.player.x < this.x ? -1 : 1;
    if (!game.flags.petDog) {
      game.flags.petDog = true;
      game.addScore(5, this.x, this.y - 40);
      game.ui.notify('¡HICISTE UN AMIGO! +5', 'info');
    }
  }
  update(dt) {
    this.t += dt; this.barkCd -= dt; this.happy = Math.max(0, this.happy - dt);
    updateEmote(this, dt);
    const p = this.game.player, d = this.playerDist;
    this.wag += dt * (this.happy > 0 || d < 120 ? 22 : 7);
    if (p && d < 150 && d > 40 && this.barkCd <= 0 && !this.game.locked) {
      // saluda con un par de ladridos y se acerca
      AudioFX.sfx.bark(); setEmote(this, '!', 1); this.barkCd = 25;
    }
    if (this.happy > 0) { this.vx = this.vy = 0; return; }
    if (p && d < 170 && d > 46 && this.game.flags.petDog) {
      // ya es tu amigo: te sigue un poco
      this.stepTo(p.x + (this.x < p.x ? -30 : 30), p.y + 6, 70, dt);
      return;
    }
    if (this.state === 'idle') {
      this.vx = this.vy = 0; this.wait -= dt;
      if (this.wait <= 0) { this.state = 'walk'; this.target = randomIn(this.zone); }
    } else if (this.stepTo(this.target.x, this.target.y, 40, dt)) { this.state = 'idle'; this.wait = 2 + Math.random() * 4; }
  }
  draw(ctx) {
    const x = this.x, y = this.y, f = this.face;
    const moving = this.vx || this.vy;
    const s = Math.sin(this.t * 12);
    this.shadow(ctx, 13);
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const fur = '#c98a4b', furD = '#9a6230', furL = '#e8b884';
    // patas
    ctx.strokeStyle = furD; ctx.lineWidth = 3;
    const lp = moving ? s * 3 : 0;
    ctx.beginPath();
    ctx.moveTo(-7, -7); ctx.lineTo(-7 + lp, 0); ctx.moveTo(-3, -7); ctx.lineTo(-3 - lp, 0);
    ctx.moveTo(6, -7); ctx.lineTo(6 - lp, 0); ctx.moveTo(9, -7); ctx.lineTo(9 + lp, 0);
    ctx.stroke();
    // cola que se mueve
    ctx.strokeStyle = fur; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -13); ctx.quadraticCurveTo(-15, -18 + Math.sin(this.wag) * 3, -14 + Math.sin(this.wag) * 4, -23); ctx.stroke();
    // cuerpo
    ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
    const g = ctx.createLinearGradient(0, -18, 0, -6);
    g.addColorStop(0, furL); g.addColorStop(1, fur);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -12, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4e2c4'; ctx.beginPath(); ctx.ellipse(3, -9, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    // cabeza
    const hb = moving ? Math.abs(s) * -1 : Math.sin(this.t * 2) * 0.5;
    ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(12, -19 + hb, 6, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = furL; ctx.beginPath(); ctx.ellipse(17, -17.5 + hb, 3.6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(20.2, -18.2 + hb, 1.2, 0, Math.PI * 2); ctx.fill();
    // oreja caída
    ctx.fillStyle = furD; ctx.beginPath(); ctx.ellipse(9, -21 + hb, 2.4, 4.2, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // ojo (cerrado si está feliz)
    ctx.strokeStyle = '#2a1a10'; ctx.fillStyle = '#2a1a10'; ctx.lineWidth = 0.9;
    if (this.happy > 0) { ctx.beginPath(); ctx.arc(14, -20 + hb, 1.3, Math.PI, 0); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(14, -20.2 + hb, 1.1, 0, Math.PI * 2); ctx.fill(); }
    // lengua cuando está contento
    if (this.happy > 0 || this.vx) { ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.ellipse(18, -14.4 + hb, 1.2, 2, 0.2, 0, Math.PI * 2); ctx.fill(); }
    // pañoleta roja
    ctx.fillStyle = '#e8313a'; ctx.beginPath(); ctx.moveTo(7, -16); ctx.lineTo(11, -11); ctx.lineTo(13, -16); ctx.fill();
    ctx.restore();
    if (this.emote) drawEmote(ctx, x, y - 36, this.emote);
  }
}

/* ---------- Aves: maría mulata y garza ---------- */
class Bird extends Critter {
  constructor(scene, x, y, zone, kind = 'mulata') {
    super(scene, x, y, zone);
    this.kind = kind; this.z = 0; this.state = 'ground'; this.hop = 0; this.away = 0;
    this.peckT = Math.random() * 3;
  }
  get air() { return this.z > 14; }
  update(dt) {
    this.t += dt;
    const p = this.game.player, garza = this.kind === 'garza';
    if (this.state === 'ground') {
      const scare = (p && p.running ? 140 : 80) * (garza ? 1.3 : 1);
      if (p && this.playerDist < scare) {
        this.state = 'fly'; AudioFX.sfx.flap();
        const dx = this.x - p.x, d = Math.abs(dx) || 1;
        this.vx = (dx / d) * (garza ? 70 : 110) + (Math.random() - 0.5) * 40;
        this.vy = -20 - Math.random() * 20;
        this.face = this.vx < 0 ? -1 : 1;
        return;
      }
      // saltitos y picoteo
      this.hop = Math.max(0, this.hop - dt * 6);
      this.peckT -= dt;
      if (this.peckT <= 0) {
        this.peckT = 0.6 + Math.random() * 1.6;
        if (!garza && Math.random() < 0.6) {
          const t = { x: this.x + (Math.random() - 0.5) * 40, y: this.y + (Math.random() - 0.5) * 20 };
          if (pointInRect(t.x, t.y, this.zone) && !critterBlocked(this.scene, t.x, t.y)) { this.jump = t; this.hop = 1; this.face = t.x < this.x ? -1 : 1; }
        } else if (garza && Math.random() < 0.3) this.face *= -1;
      }
      if (this.jump) {
        const k = 1 - this.hop;
        this.x += (this.jump.x - this.x) * Math.min(1, dt * 8); this.y += (this.jump.y - this.y) * Math.min(1, dt * 8);
        this.z = Math.sin(k * Math.PI) * 5;
        if (this.hop <= 0) { this.jump = null; this.z = 0; }
      }
    } else if (this.state === 'fly') {
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.z += (garza ? 50 : 80) * dt;
      if (this.z > 260) { this.state = 'away'; this.away = 10 + Math.random() * 10; }
    } else if (this.state === 'away') {
      this.away -= dt;
      if (this.away <= 0) {
        // vuelve y se posa lejos de Mateo
        const spot = randomIn(this.zone);
        if (!p || dist(spot.x, spot.y, p.x, p.y) > 200) { this.x = spot.x; this.y = spot.y; this.state = 'land'; this.z = 220; this.face = Math.random() < 0.5 ? -1 : 1; }
        else this.away = 2;
      }
    } else if (this.state === 'land') {
      this.z -= 110 * dt;
      if (this.z <= 0) { this.z = 0; this.state = 'ground'; }
    }
  }
  draw(ctx) {
    if (this.state === 'away') return;
    const garza = this.kind === 'garza';
    const x = this.x, y = this.y - this.z;
    if (this.z < 200) {
      ctx.fillStyle = `rgba(0,0,0,${0.22 * (1 - this.z / 200)})`;
      ctx.beginPath(); ctx.ellipse(this.x, this.y, garza ? 9 : 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    const flying = this.state === 'fly' || this.state === 'land';
    ctx.save(); ctx.translate(x, y); ctx.scale(this.face, 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.lineJoin = 'round';
    if (garza) {
      // garza blanca: patas largas y cuello en S
      if (!flying) { ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1, -12); ctx.lineTo(-1, 0); ctx.moveTo(2, -12); ctx.lineTo(3, 0); ctx.stroke(); }
      ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8;
      ctx.fillStyle = '#f7f7f2'; ctx.beginPath(); ctx.ellipse(0, -16, 8, 4.5, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f7f7f2'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(5, -18); ctx.quadraticCurveTo(9, -22, 5, -26); ctx.quadraticCurveTo(3, -30, 7, -31); ctx.stroke();
      ctx.fillStyle = '#f6c945'; ctx.beginPath(); ctx.moveTo(8, -32); ctx.lineTo(15, -30.5); ctx.lineTo(8, -30); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(7.5, -31.5, 0.6, 0, Math.PI * 2); ctx.fill();
      if (flying) {
        const w = Math.sin(this.t * 8) * 9;
        ctx.fillStyle = '#ececE4'; ctx.beginPath(); ctx.moveTo(-3, -17); ctx.quadraticCurveTo(-6, -26 - w, 4, -30 - w); ctx.lineTo(3, -17); ctx.fill();
      }
    } else {
      // maría mulata: negra brillante con cola larga
      const body = ctx.createLinearGradient(0, -10, 0, -2);
      body.addColorStop(0, '#2a3a6a'); body.addColorStop(1, '#0a0a14');
      ctx.fillStyle = '#0a0a14';
      ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-11, -9 - (flying ? 0 : 2)); ctx.lineTo(-11, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -6, 5, 3.4, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(4, -9, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6e27a'; ctx.beginPath(); ctx.arc(4.8, -9.4, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(6, -9.6); ctx.lineTo(10, -8.6); ctx.lineTo(6, -8); ctx.fill();
      if (flying) {
        const w = Math.sin(this.t * 22) * 6;
        ctx.fillStyle = '#121a30'; ctx.beginPath(); ctx.moveTo(-2, -7); ctx.quadraticCurveTo(-4, -14 - w, 3, -15 - w); ctx.lineTo(2, -7); ctx.fill();
      } else { ctx.strokeStyle = '#222'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-0.5, 0); ctx.moveTo(1.5, -3); ctx.lineTo(1.5, 0); ctx.stroke(); }
    }
    ctx.restore();
  }
}
