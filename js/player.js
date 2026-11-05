'use strict';
/* =========================================================
   player.js — Mateo, el protagonista.
   Movimiento en 8 direcciones, colisiones por ejes separados,
   animación de caminata, invulnerabilidad y retroceso.
   ========================================================= */

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 150;
    this.dir = 'down';
    this.moving = false;
    this.animT = 0;
    this.w = 18;          // caja de colisión (a la altura de los pies)
    this.h = 10;
    this.invuln = 0;
    this.knockX = 0;
    this.knockY = 0;
    this.look = LOOKS.mateo;
    this.visible = true;
    this.dustT = 0;
    this.autoMove = null; // movimiento guiado en cinemáticas
    this.running = false;
    this.idleT = 0;       // tiempo quieto (para los globitos de espera)
    this.emote = null;
  }

  get hitbox() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
  get cx() { return this.x; }
  get cy() { return this.y - 16; }

  update(dt, input, scene) {
    let dx = 0, dy = 0;
    updateEmote(this, dt);
    if (this.autoMove) {
      const a = this.autoMove;
      const ddx = a.x - this.x, ddy = a.y - this.y, d = Math.hypot(ddx, ddy);
      if (d < 3) {
        this.x = a.x; this.y = a.y; this.autoMove = null;
        if (a.face) this.dir = a.face;
        a.resolve && a.resolve();
      } else { dx = ddx / d; dy = ddy / d; }
    } else if (input) {
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    }

    this.moving = !!(dx || dy);
    this.running = this.moving && !this.autoMove && !!(input && input.run);
    // globitos de espera: si Mateo se queda quieto un rato
    if (input && !this.moving) {
      this.idleT += dt;
      if (this.idleT > 7 && !this.emote) { setEmote(this, Math.random() < 0.5 ? '♪' : '…', 1.8); this.idleT = 2; }
    } else this.idleT = 0;
    if (this.moving) {
      if (Math.abs(dx) > Math.abs(dy) + 0.01) this.dir = dx < 0 ? 'left' : 'right';
      else this.dir = dy < 0 ? 'up' : 'down';
      this.animT += dt * (this.running ? 1.45 : 1);
      // un paso por cada media zancada (sonido según el suelo)
      const ph = Math.floor(this.animT * 11 / Math.PI);
      if (ph !== this.stepPh) { this.stepPh = ph; if (scene.surfaceAt) AudioFX.sfx.step(scene.surfaceAt(this.x, this.y), this.running); }
      this.dustT -= dt;
      if (this.dustT <= 0 && scene.particles && scene.dusty) {
        this.dustT = this.running ? 0.11 : 0.22;
        scene.particles.emit(this.x, this.y - 1, { count: this.running ? 3 : 2, color: 'rgba(230,201,143,0.7)', speed: this.running ? 26 : 14, life: 0.4, size: 3 });
      }
    } else {
      this.animT = 0;
    }

    const sp = this.autoMove ? (this.autoMove.speed || 90) : this.speed * (this.running ? 1.6 : 1);
    const vx = dx * sp + this.knockX;
    const vy = dy * sp + this.knockY;
    const decay = Math.pow(0.02, dt);
    this.knockX *= decay; this.knockY *= decay;

    this.moveAxis(vx * dt, 0, scene);
    this.moveAxis(0, vy * dt, scene);

    if (this.invuln > 0) this.invuln -= dt;
  }

  moveAxis(mx, my, scene) {
    if (!mx && !my) return;
    this.x += mx; this.y += my;
    const cols = scene.colliders;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (!rectsOverlap(this.hitbox, c)) continue;
      if (mx > 0) this.x = c.x - this.w / 2 - 0.01;
      else if (mx < 0) this.x = c.x + c.w + this.w / 2 + 0.01;
      if (my > 0) this.y = c.y - 0.01;
      else if (my < 0) this.y = c.y + c.h + this.h + 0.01;
    }
    this.x = clamp(this.x, this.w / 2 + 2, scene.width - this.w / 2 - 2);
    this.y = clamp(this.y, this.h + 30, scene.height - 2);
  }

  knockback(fromX, fromY, force = 320) {
    const dx = this.x - fromX, dy = this.y - fromY, d = Math.hypot(dx, dy) || 1;
    this.knockX = dx / d * force;
    this.knockY = dy / d * force;
  }

  walkTo(x, y, speed = 90, face = null) {
    return new Promise(resolve => { this.autoMove = { x, y, speed, face, resolve }; });
  }

  draw(ctx) {
    if (!this.visible) return;
    // parpadeo durante la invulnerabilidad
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
    if (this.hidden) ctx.globalAlpha = 0.6;
    drawHumanoid(ctx, this.x, this.y, this.look, this.dir, this.animT, this.moving, 2);
    ctx.globalAlpha = 1;
    if (this.emote) drawEmote(ctx, this.x, this.y - 64, this.emote);
    if (this.invuln > 1.4) {
      glow(ctx, this.x, this.y - 22, 34, 'rgba(255,77,94,0.9)', Math.min(1, (this.invuln - 1.4) * 1.6));
    }
  }
}
