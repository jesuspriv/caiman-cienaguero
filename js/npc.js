'use strict';
/* =========================================================
   npc.js — Habitantes y personajes secundarios.
   Cada NPC tiene apariencia propia, diálogo inicial (da puntos
   solo la primera vez) y diálogo repetido.
   ========================================================= */

function dirTowards(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

class NPC {
  constructor(o) {
    Object.assign(this, {
      id: '', who: 'mujer', lookKey: null, title: 'habitante',
      x: 0, y: 0, dir: 'down', scale: 2,
      lines: [], repeatLines: null, mission: null,
      solid: true, talkable: true, facePlayer: true, showMark: true,
      behavior: null, dance: false, prop: null, hidden: false, alpha: 1,
      r: 58
    }, o);
    this.look = LOOKS[this.lookKey || this.who];
    this.t = Math.random() * 10;
    this.moving = false;
    this.target = null;
  }

  get label() { return 'Hablar'; }
  get available() { return this.talkable && !this.hidden; }
  interact(game) { game.talkTo(this); }
  box() { return { x: this.x - 10, y: this.y - 10, w: 20, h: 10 }; }

  moveTo(x, y, speed = 70) {
    return new Promise(resolve => { this.target = { x, y, speed, resolve }; });
  }

  faceTowards(px, py) { this.dir = dirTowards(px - this.x, py - this.y); }

  update(dt, game) {
    this.t += dt;
    this.moving = false;
    this.reactions(dt, game);
    if (this.target) {
      const T = this.target;
      const dx = T.x - this.x, dy = T.y - this.y, d = Math.hypot(dx, dy);
      if (d < 2) {
        this.x = T.x; this.y = T.y; this.target = null; T.resolve();
      } else {
        const s = Math.min(d, T.speed * dt);
        this.x += dx / d * s; this.y += dy / d * s;
        this.dir = dirTowards(dx, dy);
        this.moving = true;
      }
      return;
    }
    if (this.behavior) { this.behavior(this, dt, game); return; }
    const p = game.player;
    if (this.facePlayer && p && dist(p.x, p.y, this.x, this.y) < 110) this.faceTowards(p.x, p.y);
  }

  /** Globitos: ♪ al bailar, y un saludo cuando Mateo se acerca (si ya hablaron). */
  reactions(dt, game) {
    updateEmote(this, dt);
    if (this.hidden || this.alpha <= 0 || !game || game.locked || game.dialogue.active) return;
    this.emoteCd = (this.emoteCd === undefined ? 1 + Math.random() * 4 : this.emoteCd) - dt;
    const p = game.player;
    const near = p && dist(p.x, p.y, this.x, this.y) < 120;
    if (near && !this.wasNear && this.talkable && game.flags['talk_' + this.id] && this.emoteCd <= 0) {
      setEmote(this, this.dance || FESTIVE.includes(this.who) ? '♪' : '♥');
      this.emoteCd = 8;
    } else if (this.dance && this.emoteCd <= 0 && !this.emote) {
      setEmote(this, '♪', 1.3);
      this.emoteCd = 4 + Math.random() * 6;
    }
    this.wasNear = near;
  }

  draw(ctx, game) {
    if (this.hidden || this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
    const bob = this.dance ? Math.abs(Math.sin(this.t * 6)) * -4 : 0;
    drawHumanoid(ctx, this.x, this.y + bob, this.look, this.dir, this.t, this.moving || this.dance, this.scale);

    if (this.prop === 'caiman') {
      const lift = Math.sin(this.t * 4) * 3;
      drawCaiman(ctx, this.x, this.y - 54 * this.scale / 2 + lift + bob, Math.sin(this.t * 2) * 0.3 - 0.2, this.t, { festive: true, scale: 0.32, amp: 4, swaySpeed: 5 });
    } else if (this.prop === 'maracas') {
      const s = Math.sin(this.t * 16) * 3;
      ctx.fillStyle = '#e8613a'; ctx.beginPath(); ctx.arc(this.x - 15, this.y - 30 + s, 4, 0, Math.PI * 2); ctx.arc(this.x + 15, this.y - 30 - s, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const marked = this.talkable && this.showMark && game && !game.flags['talk_' + this.id];
    if (this.emote) drawEmote(ctx, this.x, this.y - 58 * this.scale / 2 - (marked ? 30 : 8) + bob, this.emote);

    // indicador "!" si aún no se ha hablado con él
    if (marked) {
      const y = this.y - 58 * this.scale / 2 - 10 + Math.sin(this.t * 4) * 3;
      const x = this.x;
      glow(ctx, x, y - 6, 16, 'rgba(246,201,69,0.7)', 0.6);
      ctx.fillStyle = '#f6c945'; ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y - 6, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 3, y + 0.5); ctx.lineTo(x, y + 5); ctx.lineTo(x + 3, y + 0.5); ctx.fill();
      ctx.fillStyle = '#2a1a0c';
      ctx.beginPath(); ctx.moveTo(x - 1.4, y - 11); ctx.lineTo(x + 1.4, y - 11); ctx.lineTo(x + 0.8, y - 4.6); ctx.lineTo(x - 0.8, y - 4.6); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - 2.4, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }
}
