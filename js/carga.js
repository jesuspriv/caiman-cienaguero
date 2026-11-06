'use strict';
/* =========================================================
   carga.js — Pantalla de carga.
   Mientras cargan las letras, los efectos gráficos y la canción
   de la fiesta, muestra un caimán desfilando, una barra de
   progreso y datos reales de Ciénaga. Al terminar pide tocar la
   pantalla o presionar una tecla: ese primer toque también
   permite que el navegador deje sonar la música.
   ========================================================= */

const DATOS_CARGA = [
  'Ciénaga queda en el Caribe colombiano, entre el mar y la Ciénaga Grande de Santa Marta.',
  'La historia de Tomasita no está en los libros: llegó hasta hoy contada de abuelos a nietos.',
  'En la Ciénaga Grande hay pueblos palafitos: casas construidas sobre pilotes, en medio del agua.',
  'En la danza del caimán, los «pescadores» persiguen al caimán con arpones de mentira.',
  'Cada 20 de enero, día de San Sebastián, Ciénaga conmemora la Leyenda de Tomasita.',
  'El Festival del Caimán Cienaguero fue declarado Patrimonio Cultural Inmaterial de la Nación.',
  'El ferrocarril de Santa Marta llegó a Ciénaga en 1887, y con él la bonanza del banano.',
  'Los orígenes de la iglesia de San Juan Bautista se remontan a 1612: la levantaron manos indígenas.',
  'El centro histórico de Ciénaga es Monumento Nacional desde 1994.',
  'El cayeye es puré de guineo verde con mantequilla y queso costeño. ¡Se come al desayuno!',
  'En la costa, la «ñapa» es lo que el vendedor te regala de más, para que vuelvas.',
  'El sombrero vueltiao se teje con caña flecha y es herencia del pueblo zenú.'
];

const Carga = (() => {
  const el = document.getElementById('loading');
  const fill = document.getElementById('load-fill'), status = document.getElementById('load-status');
  const factEl = document.getElementById('load-fact'), startEl = document.getElementById('load-start');
  const cv = document.getElementById('loading-art'), ctx = cv.getContext('2d');
  let shown = 0, target = 0, ready = false, gone = false, t = 0, last = performance.now();
  let fi = Math.floor(Math.random() * DATOS_CARGA.length), factT = 0, onGo = null;
  const t0 = performance.now();

  function setFact() { factEl.textContent = DATOS_CARGA[fi % DATOS_CARGA.length]; fi++; }
  setFact();

  function art() {
    const W = cv.width, H = cv.height;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#24124a'); sky.addColorStop(0.6, '#8a2f50'); sky.addColorStop(1, '#e8613a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const cols = ['#e8313a', '#f6c945', '#1fb5b0', '#3f9b3a', '#fdf6e3'];
    for (let i = 0; i < 26; i++) { ctx.fillStyle = cols[i % 5]; const x = i * 20; ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x + 14, 10); ctx.lineTo(x + 7, 24 + Math.sin(t * 3 + i) * 2); ctx.fill(); }
    ctx.fillStyle = '#b8966a'; ctx.fillRect(0, H - 34, W, 34);
    ctx.fillStyle = 'rgba(253,246,227,0.3)'; for (let x = -((t * 60) % 40); x < W; x += 40) ctx.fillRect(x, H - 18, 22, 3);
    // comparsa: Mateo con el caimán y un portador
    const x = ((t * 70) % (W + 260)) - 130, y = H - 14;
    if (typeof drawHumanoid === 'function') {
      drawHumanoid(ctx, x - 60, y, LOOKS.portador, 'right', t, true, 2, 'happy');
      drawHumanoid(ctx, x + 10, y, LOOKS.mateo, 'right', t, true, 2, 'happy');
      drawCaiman(ctx, x - 20, y - 58 + Math.sin(t * 6) * 3, 0, t, { festive: true, scale: 0.75, amp: 6, swaySpeed: 4 });
    }
    for (let i = 0; i < 18; i++) { ctx.fillStyle = cols[i % 5]; ctx.fillRect((i * 53 + t * 20) % W, (i * 37 + t * 40) % (H - 40) + 26, 3, 3); }
  }

  function frame(now) {
    if (gone) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    shown += (target - shown) * Math.min(1, dt * 6);
    fill.style.width = (shown * 100).toFixed(1) + '%';
    factT += dt; if (factT > 4.5) { factT = 0; setFact(); }
    try { art(); } catch (e) { /* el dibujo es decorativo */ }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function go(e) {
    if (!ready || gone) return;
    if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
    gone = true;
    if (typeof AudioFX !== 'undefined') AudioFX.init();
    el.classList.add('fade');
    setTimeout(() => { el.remove(); }, 600);
    if (onGo) onGo();
  }
  // mientras la pantalla de carga está, ninguna tecla llega al menú
  window.addEventListener('keydown', e => { if (gone) return; e.preventDefault(); e.stopImmediatePropagation(); go(); }, true);
  el.addEventListener('pointerdown', e => go(e));

  return {
    /** k entre 0 y 1, y lo que se está cargando. */
    step(k, text) { target = Math.max(target, k); if (text) status.textContent = text; },
    /** Ya cargó todo: se espera un toque (al menos 2,5 s en pantalla para leer el dato). */
    done(cb) {
      onGo = cb;
      const wait = Math.max(0, 2500 - (performance.now() - t0));
      setTimeout(() => {
        target = 1; ready = true;
        status.textContent = '¡Listo!';
        startEl.classList.remove('hidden');
      }, wait);
    },
    get active() { return !gone; }
  };
})();
