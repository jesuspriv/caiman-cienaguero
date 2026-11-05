'use strict';
/* =========================================================
   caiman.js — El Caimán del Puerto Cachimbero.
   Máquina de estados: oculto → emergiendo → patrulla →
   persecución → regreso / retirada. Movimiento suave con giro
   limitado. Puede salir un poco a la orilla, nunca lejos de ella.
   ========================================================= */

class Caiman {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.angle = Math.PI;
    this.speed = 0;
    this.state = 'hidden';
    this.stateT = 0;
    this.t = 0;
    this.submerged = 1;
    this.target = null;
    this.detectR = 230;
    this.loseR = 400;
    this.landLeash = 82;      // cuánto puede adentrarse en tierra
    this.patrolSpeed = 50;
    this.chaseSpeed = 104;
    this.hitR = 26;
    this.ripple = 0;
    this.alertT = 0;
    this.warnTime = 1.2;      // segundos de aviso antes de perseguir
    this.beatT = 0;
    this.bubbleT = 0;
    // dificultad elegida en Opciones
    const D = Settings.diff;
    this.chaseSpeed *= D.caiman; this.patrolSpeed *= D.caiman;
    this.detectR *= D.detect; this.warnTime = D.warn;
  }

  /** 0..1: qué tan cerca está el peligro (para el borde rojo de la pantalla). */
  danger(p) {
    if (this.state !== 'warn' && this.state !== 'chase') return 0;
    const k = clamp(1 - dist(this.x, this.y, p.x, p.y) / this.loseR, 0, 1);
    return this.state === 'chase' ? 0.45 + k * 0.55 : 0.25 + k * 0.35;
  }

  bubble(n = 2) {
    const s = this.scene;
    s.particles.emit(this.headX + (Math.random() - 0.5) * 30, this.headY + (Math.random() - 0.5) * 12, { count: n, color: 'rgba(210,240,255,0.95)', speed: 14, life: 0.7, size: 3 });
    s.ripples.push({ x: this.headX + (Math.random() - 0.5) * 24, y: this.headY, r: 4, life: 1 });
  }

  get headX() { return this.x + Math.cos(this.angle) * 40; }
  get headY() { return this.y + Math.sin(this.angle) * 40; }

  /** Zona permitida: el agua y una franja estrecha de orilla. */
  allowed(x, y) {
    const s = this.scene;
    if (x < 40 || x > s.width - 40 || y < s.waterTop + 40) return false;
    if (s.isWaterPoint(x, y)) return true;
    return y < s.shoreY + this.landLeash && s.nearWater(x, y, this.landLeash);
  }

  setState(st) { this.state = st; this.stateT = 0; this.target = null; }

  emerge() { this.setState('emerging'); }

  pickPatrolTarget(player) {
    const s = this.scene;
    for (let i = 0; i < 12; i++) {
      const x = clamp(player.x + (Math.random() - 0.5) * 820, 80, s.width - 80);
      const y = s.shoreY - 30 - Math.random() * 150;
      if (s.isWaterPoint(x, y)) return { x, y };
    }
    return { x: this.x, y: s.shoreY - 100 };
  }

  steer(tx, ty, speed, dt, turnRate = 3.2) {
    const desired = Math.atan2(ty - this.y, tx - this.x);
    let da = desired - this.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.angle += clamp(da, -turnRate * dt, turnRate * dt);
    this.speed = lerp(this.speed, speed, Math.min(1, dt * 2.5));
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    if (this.allowed(nx, ny)) { this.x = nx; this.y = ny; }
    else if (this.allowed(nx, this.y)) this.x = nx;
    else if (this.allowed(this.x, ny)) this.y = ny;
    else this.speed *= 0.5;
  }

  update(dt, game) {
    this.t += dt * (0.6 + this.speed / 60);
    this.stateT += dt;
    if (this.alertT > 0) this.alertT -= dt;
    const p = game.player;
    const s = this.scene;
    const dP = dist(this.x, this.y, p.x, p.y);
    const inWater = s.isWaterPoint(this.x, this.y);
    const underDock = s.isDockPoint(this.x, this.y);

    switch (this.state) {
      case 'hidden':
        this.submerged = 1;
        return;
      case 'emerging':
        this.submerged = Math.max(0.15, 1 - this.stateT / 2);
        this.steer(p.x, s.shoreY - 50, 25, dt, 1.2);
        if (this.stateT > 2.4) this.setState('patrol');
        break;
      case 'patrol':
        if (!this.target || dist(this.x, this.y, this.target.x, this.target.y) < 24 || this.stateT > 7) {
          this.target = this.pickPatrolTarget(p); this.stateT = 0;
        }
        this.steer(this.target.x, this.target.y, this.patrolSpeed, dt, 1.8);
        // correr hace ruido (lo atrae desde más lejos); escondido en los juncos no lo ve
        if (!p.hidden && dP < this.detectR * (p.running ? 1.6 : 1) && p.y < s.shoreY + this.landLeash + 70 && !game.locked) {
          this.setState('warn');
          this.alertT = this.warnTime;
          setEmote(p, '!', 1.3, true);
          AudioFX.sfx.stalk();
        }
        break;
      case 'warn':
        if (this.lostTrack(p, game)) break;
        // aviso: se hunde, burbujea y gira hacia Mateo antes de lanzarse
        this.steer(p.x, p.y - 4, 18, dt, 2.6);
        this.bubbleT -= dt;
        if (this.bubbleT <= 0) { this.bubbleT = 0.1; this.bubble(3); }
        if (dP > this.loseR || game.locked) this.setState('patrol');
        else if (this.stateT > this.warnTime) { this.setState('chase'); this.alertT = 0.6; AudioFX.sfx.alert(); }
        break;
      case 'chase':
        if (this.lostTrack(p, game)) break;
        this.steer(p.x, p.y - 4, this.chaseSpeed, dt, 3.4);
        if (dP > this.loseR || p.y > s.shoreY + this.landLeash + 140 || this.stateT > 9) this.setState('return');
        break;
      case 'return':
      case 'retreat': {
        if (!this.target) this.target = { x: this.x, y: s.shoreY - 120 };
        this.steer(this.target.x, this.target.y, this.state === 'retreat' ? 80 : 60, dt, 2.2);
        const done = this.state === 'retreat' ? this.stateT > 2.6 : (inWater && this.y < s.shoreY - 60);
        if (done) this.setState('patrol');
        break;
      }
      case 'script':
        if (this.target) this.steer(this.target.x, this.target.y, this.target.speed || 50, dt, 2);
        break;
    }

    // profundidad visual: en tierra se ve completo, en agua solo ojos y lomo
    if (this.state !== 'emerging' && this.state !== 'script') {
      const want = !inWater ? 0 : underDock ? 0.9 : this.state === 'chase' ? 0.3 : this.state === 'warn' ? 0.8 : 0.6;
      this.submerged = lerp(this.submerged, want, Math.min(1, dt * 3));
    }

    if (inWater) {
      this.ripple -= dt;
      if (this.ripple <= 0 && this.speed > 15) {
        this.ripple = 0.25;
        s.ripples.push({ x: this.x - Math.cos(this.angle) * 30, y: this.y - Math.sin(this.angle) * 30, r: 6, life: 1.2 });
      }
    }

    // pistas de su presencia: burbujas cerca y latido que se acelera
    if (!game.locked && (this.state === 'patrol' || this.state === 'warn' || this.state === 'chase')) {
      if (this.state === 'patrol' && dP < 380) {
        this.bubbleT -= dt;
        if (this.bubbleT <= 0) { this.bubbleT = 0.5 + Math.random() * 0.4; this.bubble(2); }
      }
      this.beatT -= dt;
      if (dP < 360 && this.beatT <= 0) {
        const k = 1 - dP / 360;
        this.beatT = lerp(1.2, 0.38, k) * (this.state === 'chase' ? 0.8 : 1);
        AudioFX.sfx.heartbeat(0.05 + k * 0.17);
      }
    }

    // contacto con Mateo (solo cuando ya avisó y está persiguiendo)
    if (this.state === 'chase' && !game.locked && p.invuln <= 0) {
      if (dist(this.headX, this.headY, p.x, p.y - 8) < this.hitR || dist(this.x, this.y, p.x, p.y - 8) < this.hitR - 4) {
        game.damage(this.x, this.y, 'caiman');
        this.setState('retreat');
        this.target = { x: this.x, y: s.shoreY - 140 };
      }
    }
  }

  /** Pierde a Mateo si se esconde, o se aleja si está junto a una antorcha. */
  lostTrack(p, game) {
    if (game.locked) return false;
    const s = this.scene;
    if (p.hidden) {
      this.setState('return'); this.confusedT = 1.6;
      return true;
    }
    if (s.torches && s.torches.some(([tx, ty]) => dist(p.x, p.y, tx, ty) < 95)) {
      this.setState('retreat'); this.target = { x: this.x, y: s.shoreY - 150 };
      this.confusedT = 1.2;
      if (!this.fireTold) { this.fireTold = true; game.ui.notify('¡EL FUEGO ASUSTA AL CAIMÁN!', 'info'); }
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.state === 'hidden') return;
    if (this.confusedT > 0) {
      this.confusedT -= 1 / 60;
      drawEmote(ctx, this.x, this.y - 30, { s: '?', t: 0.5, dur: 2 });
    }
    drawCaiman(ctx, this.x, this.y, this.angle, this.t, { submerged: this.submerged, amp: 6 + this.speed / 20, swaySpeed: 4 });
    if (this.alertT > 0) {
      const y = this.y - 34 - Math.sin(this.t * 3) * 4;
      ctx.globalAlpha = Math.min(1, this.alertT * 2);
      ctx.font = '20px "Fredoka", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText('!', this.x + 2, y + 2);
      ctx.fillStyle = '#ff4d5e'; ctx.fillText('!', this.x, y);
      ctx.globalAlpha = 1;
    }
  }
}
