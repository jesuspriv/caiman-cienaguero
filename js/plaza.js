'use strict';
/* =========================================================
   plaza.js — La Plaza del Centenario de Ciénaga, dibujada a
   partir de fotos reales:
     · el Templete blanco: redondo, de columnas jónicas, con
       escalinata al frente y jarrones sobre la cornisa,
     · la iglesia San Juan Bautista: blanca, con cúpula y torre
       del reloj,
     · el Palacio Municipal: amarillo, de estilo republicano,
     · la plaza: caminos de cemento que llegan al templete,
       jardineras con bordillo rojo, árboles de sombra y bancas
       blancas,
     · el carrito del raspao.
   ========================================================= */

const WHITE = '#fbf8f0', WHITE_SH = '#ddd6c6', WHITE_DK = '#bdb4a0';

/* ---------------- El Templete ---------------- */

function templeteColumn(c, x, y, h) {
  // basa
  c.fillStyle = WHITE_DK; c.fillRect(x - 6, y - 4, 12, 4);
  c.fillStyle = WHITE_SH; c.fillRect(x - 5, y - 6, 10, 2);
  // fuste con estrías
  const g = c.createLinearGradient(x - 4, 0, x + 4, 0);
  g.addColorStop(0, '#fffdf6'); g.addColorStop(0.6, WHITE); g.addColorStop(1, WHITE_SH);
  c.fillStyle = g; c.fillRect(x - 4, y - h, 8, h - 6);
  c.fillStyle = 'rgba(160,150,130,0.35)'; c.fillRect(x - 1, y - h + 4, 1, h - 12); c.fillRect(x + 2, y - h + 4, 1, h - 12);
  // capitel jónico (volutas)
  c.fillStyle = WHITE; c.fillRect(x - 6, y - h - 2, 12, 4);
  c.fillStyle = WHITE_SH; c.beginPath(); c.arc(x - 6, y - h, 2.4, 0, Math.PI * 2); c.arc(x + 6, y - h, 2.4, 0, Math.PI * 2); c.fill();
  c.fillStyle = WHITE_DK; c.beginPath(); c.arc(x - 6, y - h, 1, 0, Math.PI * 2); c.arc(x + 6, y - h, 1, 0, Math.PI * 2); c.fill();
}

/** Podio, escalinata y columnas (capa de abajo). x, y = centro del piso. */
function drawTempleteBase(c, x, y) {
  // sombra
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(x + 10, y + 22, 84, 44, 0, 0, Math.PI * 2); c.fill();
  // escalinata al frente (sur), con los muros curvos a los lados
  const sw = 64;
  for (let k = 0; k < 4; k++) {
    const sy = y + 26 + k * 7;
    c.fillStyle = k % 2 ? '#e9e3d4' : '#f4efe3'; c.fillRect(x - sw / 2 - k * 2, sy, sw + k * 4, 7);
    c.fillStyle = 'rgba(120,110,90,0.35)'; c.fillRect(x - sw / 2 - k * 2, sy + 6, sw + k * 4, 1);
  }
  [-1, 1].forEach(s => {
    const wx = x + s * (sw / 2 + 6);
    c.fillStyle = WHITE_SH;
    c.beginPath(); c.moveTo(wx, y + 22); c.quadraticCurveTo(wx + s * 4, y + 44, wx + s * 16, y + 54);
    c.quadraticCurveTo(wx + s * 22, y + 58, wx + s * 14, y + 60); c.lineTo(wx - s * 2, y + 60); c.lineTo(wx - s * 2, y + 22); c.fill();
    c.fillStyle = WHITE;
    c.beginPath(); c.moveTo(wx - s * 2, y + 20); c.quadraticCurveTo(wx + s * 2, y + 42, wx + s * 14, y + 51);
    c.quadraticCurveTo(wx + s * 20, y + 55, wx + s * 12, y + 56); c.lineTo(wx - s * 4, y + 56); c.fill();
  });
  // podio redondo (lado y tapa)
  c.fillStyle = '#d9d1bf'; c.beginPath(); c.ellipse(x, y + 14, 72, 38, 0, 0, Math.PI); c.fill();
  c.fillRect(x - 72, y, 144, 14);
  c.fillStyle = '#cfc6b2'; c.fillRect(x - 72, y + 8, 144, 2);
  c.fillStyle = '#f2ede0'; c.beginPath(); c.ellipse(x, y, 72, 38, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e7e0cf'; c.beginPath(); c.ellipse(x, y, 62, 32, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(170,160,140,0.5)'; c.lineWidth = 1;
  for (let r = 14; r < 62; r += 12) { c.beginPath(); c.ellipse(x, y, r, r * 0.52, 0, 0, Math.PI * 2); c.stroke(); }
  // sombra del techo sobre el piso
  c.fillStyle = 'rgba(80,70,50,0.18)'; c.beginPath(); c.ellipse(x + 6, y - 2, 50, 24, 0, 0, Math.PI * 2); c.fill();
  // 8 columnas, de atrás hacia adelante
  const cols = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; cols.push({ x: x + Math.cos(a) * 52, y: y + Math.sin(a) * 27 }); }
  cols.sort((a, b) => a.y - b.y).forEach(p => templeteColumn(c, p.x, p.y, 46));
}

/** Cornisa redonda con jarrones (capa de arriba: tapa al jugador). */
function drawTempleteDome(c, x, y) {
  const ty = y - 50;
  // cara lateral de la cornisa (cilindro)
  c.fillStyle = '#e6dfcf'; c.beginPath(); c.ellipse(x, ty + 12, 66, 34, 0, 0, Math.PI); c.fill();
  c.fillRect(x - 66, ty, 132, 12);
  c.fillStyle = WHITE_SH; c.fillRect(x - 66, ty + 9, 132, 2);
  c.fillStyle = 'rgba(150,140,120,0.45)'; c.fillRect(x - 66, ty + 3, 132, 1);
  // medallones del friso
  [-40, 0, 40].forEach(dx => {
    c.fillStyle = WHITE; c.beginPath(); c.ellipse(x + dx, ty + 8 + Math.abs(dx) * 0.12, 6, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = WHITE_DK; c.lineWidth = 0.8; c.stroke();
  });
  // tapa
  c.fillStyle = WHITE; c.beginPath(); c.ellipse(x, ty, 66, 34, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = WHITE_DK; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#ebe5d6'; c.beginPath(); c.ellipse(x, ty - 1, 54, 27, 0, 0, Math.PI * 2); c.fill();
  // remate central escalonado
  c.fillStyle = '#e2dbca'; c.beginPath(); c.ellipse(x, ty - 2, 36, 18, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = WHITE; c.beginPath(); c.ellipse(x, ty - 5, 30, 14, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d4ccb9'; c.beginPath(); c.ellipse(x, ty - 5, 18, 8, 0, 0, Math.PI * 2); c.fill();
  // reflector (como en la foto)
  c.fillStyle = '#3a3a40'; c.fillRect(x - 4, ty - 14, 8, 6); c.fillStyle = '#fff6d0'; c.fillRect(x - 3, ty - 13, 6, 2);
  // jarrones sobre la cornisa, de atrás hacia adelante
  const urns = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; urns.push({ x: x + Math.cos(a) * 60, y: ty + Math.sin(a) * 30 }); }
  urns.sort((a, b) => a.y - b.y).forEach(u => {
    c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(u.x + 2, u.y + 1, 5, 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = WHITE_SH; c.fillRect(u.x - 4, u.y - 3, 8, 3);
    c.fillStyle = WHITE; c.beginPath(); c.ellipse(u.x, u.y - 8, 4, 5.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = WHITE_SH; c.fillRect(u.x + 1, u.y - 12, 2, 8);
    c.fillStyle = WHITE; c.beginPath(); c.ellipse(u.x, u.y - 14, 2.4, 3, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(u.x, u.y - 18, 1.4, 0, Math.PI * 2); c.fill();
  });
}

/* ---------------- Iglesia San Juan Bautista ---------------- */

function drawIglesiaSJB(c, x, y, w, h, rnd) {
  const facadeY = y + 110, bottom = y + h;
  // sombra al pie
  const hs = c.createLinearGradient(0, bottom - 4, 0, bottom + 18);
  hs.addColorStop(0, 'rgba(0,0,0,0.3)'); hs.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hs; c.fillRect(x + 4, bottom - 4, w + 8, 22);
  // techo de teja roja de la nave (detrás de la fachada)
  c.fillStyle = '#b8402a'; c.fillRect(x + 120, y + 10, w - 230, facadeY - y - 6);
  for (let ry = y + 16; ry < facadeY; ry += 7) { c.fillStyle = '#8f2f1e'; c.fillRect(x + 120, ry, w - 230, 2); }
  c.fillStyle = '#d4553a'; c.fillRect(x + 120, y + 10, w - 230, 6);
  // cuerpo blanco
  c.fillStyle = WHITE; c.fillRect(x, facadeY, w, bottom - facadeY);
  speckle(c, x, facadeY, w, bottom - facadeY, ['#f1ecdf', '#fffdf7'], w / 2, rnd, 2);
  c.fillStyle = WHITE_SH; c.fillRect(x, bottom - 14, w, 14);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, facadeY, w, 5);
  // cúpula a la izquierda
  const dx = x + 70, dy = facadeY - 6;
  c.fillStyle = WHITE_SH; c.fillRect(dx - 52, dy - 18, 104, 26);       // tambor
  for (let k = -2; k <= 2; k++) { c.fillStyle = '#7a6a58'; c.fillRect(dx + k * 18 - 3, dy - 12, 6, 10); }
  const dg = c.createRadialGradient(dx - 16, dy - 50, 6, dx, dy - 24, 60);
  dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, '#d6cfbe');
  c.fillStyle = dg; c.beginPath(); c.ellipse(dx, dy - 18, 50, 46, 0, Math.PI, 0); c.fill();
  c.strokeStyle = 'rgba(150,140,120,0.5)'; c.lineWidth = 1;
  for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(dx + k * 20, dy - 18); c.quadraticCurveTo(dx + k * 9, dy - 58, dx, dy - 64); c.stroke(); }
  c.fillStyle = WHITE; c.fillRect(dx - 7, dy - 78, 14, 14); c.fillStyle = WHITE_SH; c.fillRect(dx + 3, dy - 78, 4, 14);
  c.beginPath(); c.fillStyle = WHITE; c.arc(dx, dy - 80, 7, Math.PI, 0); c.fill();
  c.fillStyle = '#6b5a40'; c.fillRect(dx - 1, dy - 96, 2, 14); c.fillRect(dx - 5, dy - 92, 10, 2);
  // frontón central con la cruz
  const fx = x + w / 2 - 20, fw = 150;
  c.fillStyle = WHITE; c.beginPath(); c.moveTo(fx - fw / 2, facadeY + 10); c.lineTo(fx - fw / 2, facadeY - 18);
  c.quadraticCurveTo(fx - fw / 4, facadeY - 20, fx - 22, facadeY - 44); c.lineTo(fx + 22, facadeY - 44);
  c.quadraticCurveTo(fx + fw / 4, facadeY - 20, fx + fw / 2, facadeY - 18); c.lineTo(fx + fw / 2, facadeY + 10); c.fill();
  c.strokeStyle = WHITE_DK; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(fx, facadeY - 14, 9, Math.PI, 0); c.fill(); c.fillRect(fx - 9, facadeY - 14, 18, 14);
  c.fillStyle = '#6b5a40'; c.fillRect(fx - 1.5, facadeY - 66, 3, 22); c.fillRect(fx - 7, facadeY - 60, 14, 3);
  // pilastras y cornisa de la fachada
  c.fillStyle = WHITE_SH;
  [fx - fw / 2, fx - 24, fx + 20, fx + fw / 2 - 4].forEach(px => c.fillRect(px, facadeY + 8, 5, bottom - facadeY - 22));
  c.fillRect(x, facadeY + 52, w - 100, 4);
  // puerta principal en arco (madera)
  c.fillStyle = WHITE_DK; c.fillRect(fx - 20, bottom - 66, 40, 52); c.beginPath(); c.arc(fx, bottom - 66, 20, Math.PI, 0); c.fill();
  c.fillStyle = '#7a3a1c'; c.fillRect(fx - 16, bottom - 64, 32, 50); c.beginPath(); c.arc(fx, bottom - 64, 16, Math.PI, 0); c.fill();
  c.fillStyle = '#5a2810'; c.fillRect(fx - 1, bottom - 80, 2, 66);
  for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(fx - 14, bottom - 56 + k * 11, 28, 1); }
  // ventanas en arco
  [x + 26, x + 96, fx + 34].forEach(wx => {
    c.fillStyle = WHITE_DK; c.fillRect(wx - 1, facadeY + 70, 20, 30); c.beginPath(); c.arc(wx + 9, facadeY + 70, 10, Math.PI, 0); c.fill();
    c.fillStyle = '#3a2a1c'; c.fillRect(wx + 2, facadeY + 70, 14, 27); c.beginPath(); c.arc(wx + 9, facadeY + 70, 7, Math.PI, 0); c.fill();
  });
  // torre del reloj (derecha)
  const tx = x + w - 92, tw = 74, tTop = y - 70;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(tx - 6, facadeY, 6, bottom - facadeY);
  const tg = c.createLinearGradient(tx, 0, tx + tw, 0);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.7, WHITE); tg.addColorStop(1, WHITE_SH);
  c.fillStyle = tg; c.fillRect(tx, tTop + 40, tw, bottom - tTop - 40);
  // cornisas de los cuerpos de la torre
  [tTop + 40, tTop + 112, facadeY + 52].forEach(cy => { c.fillStyle = WHITE_SH; c.fillRect(tx - 4, cy, tw + 8, 5); c.fillStyle = WHITE_DK; c.fillRect(tx - 4, cy + 5, tw + 8, 1); });
  // campanario con arco y campana
  c.fillStyle = '#2a1a10'; c.fillRect(tx + 22, tTop + 62, 30, 34); c.beginPath(); c.arc(tx + 37, tTop + 62, 15, Math.PI, 0); c.fill();
  c.fillStyle = '#c99a3a'; c.beginPath(); c.moveTo(tx + 30, tTop + 86); c.quadraticCurveTo(tx + 31, tTop + 70, tx + 37, tTop + 68); c.quadraticCurveTo(tx + 43, tTop + 70, tx + 44, tTop + 86); c.fill();
  // reloj
  const cx = tx + tw / 2, cy = tTop + 140;
  c.fillStyle = WHITE_DK; c.beginPath(); c.arc(cx, cy, 15, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fffdf2'; c.beginPath(); c.arc(cx, cy, 12, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#2a2a30'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 8); c.moveTo(cx, cy); c.lineTo(cx + 6, cy + 2); c.stroke();
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.fillStyle = '#2a2a30'; c.fillRect(cx + Math.cos(a) * 10 - 0.5, cy + Math.sin(a) * 10 - 0.5, 1, 1); }
  // ventanita del cuerpo bajo
  c.fillStyle = '#3a2a1c'; c.fillRect(cx - 6, facadeY + 74, 12, 22); c.beginPath(); c.arc(cx, facadeY + 74, 6, Math.PI, 0); c.fill();
  // remate de la torre: cupulín con linterna
  c.fillStyle = WHITE; c.fillRect(tx + 8, tTop + 22, tw - 16, 20);
  c.fillStyle = WHITE_SH; c.fillRect(tx + tw - 14, tTop + 22, 6, 20);
  c.fillStyle = WHITE; c.beginPath(); c.ellipse(cx, tTop + 22, (tw - 16) / 2, 16, 0, Math.PI, 0); c.fill();
  c.strokeStyle = WHITE_DK; c.lineWidth = 1; c.stroke();
  [tx + 2, tx + tw - 2].forEach(px => { c.fillStyle = WHITE; c.beginPath(); c.ellipse(px, tTop + 36, 3, 5, 0, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = '#6b5a40'; c.fillRect(cx - 1, tTop - 6, 2, 14); c.fillRect(cx - 5, tTop - 2, 10, 2);
}

/* ---------------- Palacio Municipal ---------------- */

function drawPalacioMunicipal(c, x, y, w, h, rnd) {
  const roofH = 64, bottom = y + h, wallY = y + roofH, mid = wallY + (bottom - wallY) / 2;
  const YEL = '#eab94c', YEL_SH = '#c99632', TRIM = '#fbf6e6';
  const hs = c.createLinearGradient(0, bottom - 4, 0, bottom + 18);
  hs.addColorStop(0, 'rgba(0,0,0,0.3)'); hs.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hs; c.fillRect(x + 4, bottom - 4, w + 8, 22);
  // azotea con baranda
  c.fillStyle = '#cfc6b4'; c.fillRect(x - 4, y, w + 8, roofH);
  speckle(c, x, y, w, roofH, ['#c4baa6', '#dad2c2'], w / 4, rnd, 2);
  c.fillStyle = TRIM; c.fillRect(x - 6, wallY - 12, w + 12, 8);
  for (let bx = x; bx < x + w; bx += 9) { c.fillStyle = TRIM; c.fillRect(bx, wallY - 22, 4, 10); }
  c.fillStyle = TRIM; c.fillRect(x - 6, wallY - 24, w + 12, 3);
  // fachada amarilla
  const fg = c.createLinearGradient(x, 0, x + w, 0);
  fg.addColorStop(0, shade(YEL, 0.08)); fg.addColorStop(1, shade(YEL, -0.06));
  c.fillStyle = fg; c.fillRect(x, wallY - 4, w, bottom - wallY + 4);
  speckle(c, x, wallY, w, bottom - wallY, [shade(YEL, -0.06), shade(YEL, 0.06)], w / 3, rnd, 2);
  c.fillStyle = TRIM; c.fillRect(x, mid - 3, w, 6);           // cornisa entre pisos
  c.fillStyle = YEL_SH; c.fillRect(x, bottom - 12, w, 12);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, wallY - 4, w, 4);
  // pilastras blancas
  for (let px = x; px <= x + w - 6; px += w / 6) c.fillStyle = TRIM, c.fillRect(px, wallY, 6, bottom - wallY - 12);
  // cuerpo central saliente con frontón triangular
  const cx = x + w / 2, cw = 108;
  c.fillStyle = shade(YEL, 0.05); c.fillRect(cx - cw / 2, wallY - 10, cw, bottom - wallY + 10);
  c.fillStyle = TRIM; c.fillRect(cx - cw / 2 - 2, wallY - 10, 6, bottom - wallY); c.fillRect(cx + cw / 2 - 4, wallY - 10, 6, bottom - wallY);
  c.fillStyle = TRIM; c.beginPath(); c.moveTo(cx - cw / 2 - 8, wallY - 8); c.lineTo(cx, wallY - 44); c.lineTo(cx + cw / 2 + 8, wallY - 8); c.fill();
  c.fillStyle = YEL; c.beginPath(); c.moveTo(cx - cw / 2 + 6, wallY - 13); c.lineTo(cx, wallY - 36); c.lineTo(cx + cw / 2 - 6, wallY - 13); c.fill();
  c.fillStyle = TRIM; c.beginPath(); c.arc(cx, wallY - 20, 6, 0, Math.PI * 2); c.fill();
  // bandera de Colombia
  c.fillStyle = '#5a5a5a'; c.fillRect(cx - 1, wallY - 74, 2, 32);
  c.fillStyle = '#fcd116'; c.fillRect(cx + 1, wallY - 74, 20, 7);
  c.fillStyle = '#003893'; c.fillRect(cx + 1, wallY - 67, 20, 3.5);
  c.fillStyle = '#ce1126'; c.fillRect(cx + 1, wallY - 63.5, 20, 3.5);
  // ventanas altas: segundo piso con balcón, primer piso con reja
  const bay = w / 6;
  for (let i = 0; i < 6; i++) {
    const wx = x + i * bay + bay / 2 - 11;
    const central = Math.abs(wx + 11 - cx) < cw / 2;
    // piso alto
    c.fillStyle = TRIM; c.fillRect(wx - 3, wallY + 8, 28, 36); c.beginPath(); c.moveTo(wx - 5, wallY + 8); c.lineTo(wx + 11, wallY + 1); c.lineTo(wx + 27, wallY + 8); c.fill();
    c.fillStyle = '#2f6f6a'; c.fillRect(wx, wallY + 11, 22, 32);
    c.fillStyle = '#245652'; c.fillRect(wx + 10, wallY + 11, 2, 32);
    c.fillStyle = TRIM; c.fillRect(wx - 6, wallY + 43, 34, 3);
    c.fillStyle = '#3a3a40'; for (let b = 0; b < 7; b++) c.fillRect(wx - 5 + b * 5, wallY + 46, 1.5, 8);
    c.fillRect(wx - 6, wallY + 46, 34, 1.5);
    // piso bajo (en el centro, la puerta)
    if (central && i === 2 || central && i === 3) continue;
    c.fillStyle = TRIM; c.fillRect(wx - 3, mid + 10, 28, bottom - mid - 24);
    c.fillStyle = '#2f6f6a'; c.fillRect(wx, mid + 13, 22, bottom - mid - 28);
    c.fillStyle = '#245652'; c.fillRect(wx + 10, mid + 13, 2, bottom - mid - 28);
  }
  // portón central en arco
  c.fillStyle = TRIM; c.fillRect(cx - 24, mid + 14, 48, bottom - mid - 26); c.beginPath(); c.arc(cx, mid + 14, 24, Math.PI, 0); c.fill();
  c.fillStyle = '#7a3a1c'; c.fillRect(cx - 19, mid + 16, 38, bottom - mid - 28); c.beginPath(); c.arc(cx, mid + 16, 19, Math.PI, 0); c.fill();
  c.fillStyle = '#5a2810'; c.fillRect(cx - 1, mid + 2, 2, bottom - mid - 14);
  // escalones
  c.fillStyle = '#d8d0bf'; c.fillRect(cx - 34, bottom - 10, 68, 5); c.fillStyle = '#c2b9a6'; c.fillRect(cx - 40, bottom - 5, 80, 5);
}

/* ---------------- La plaza ---------------- */

/** Pavimento, caminos radiales hacia el templete y jardineras de bordillo rojo. */
function drawPlazaCentenario(c, px, py, pw, ph, tx, ty, rnd) {
  // pavimento claro
  c.fillStyle = '#d8d2c2'; c.fillRect(px, py, pw, ph);
  for (let y = py; y < py + ph; y += 24) for (let x = px; x < px + pw; x += 24) {
    c.fillStyle = ((x + y) / 24) % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.035)'; c.fillRect(x, y, 24, 24);
  }
  speckle(c, px, py, pw, ph, ['#cbc4b2', '#e4dfd2'], pw * ph / 400, rnd, 2);
  c.strokeStyle = 'rgba(140,130,110,0.25)'; c.lineWidth = 1;
  for (let x = px; x < px + pw; x += 24) { c.beginPath(); c.moveTo(x, py); c.lineTo(x, py + ph); c.stroke(); }
  for (let y = py; y < py + ph; y += 24) { c.beginPath(); c.moveTo(px, y); c.lineTo(px + pw, y); c.stroke(); }

  // jardineras: se dibujan aparte y se les recortan los caminos
  const mk = () => { const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph; return cv; };
  const ends = [[px, py], [px + pw / 2, py], [px + pw, py], [px + pw, py + ph / 2], [px + pw, py + ph], [px + pw / 2, py + ph], [px, py + ph], [px, py + ph / 2]];
  const cut = (k, inset, ring, road) => {
    k.fillRect(inset, inset, pw - inset * 2, ph - inset * 2);
    k.globalCompositeOperation = 'destination-out';
    k.beginPath(); k.ellipse(tx - px, ty - py + 18, ring, ring * 0.78, 0, 0, Math.PI * 2); k.fill();
    k.lineWidth = road; k.lineCap = 'round';
    ends.forEach(([ex, ey]) => { k.beginPath(); k.moveTo(tx - px, ty - py + 18); k.lineTo(ex - px, ey - py); k.stroke(); });
    k.globalCompositeOperation = 'source-over';
  };
  const curb = mk(), kc = curb.getContext('2d');
  kc.fillStyle = '#b4513a'; cut(kc, 30, 132, 40);
  const green = mk(), kg = green.getContext('2d');
  drawGrass(kg, 0, 0, pw, ph, rnd, '#4f8f36', ['#5fa043', '#468032', '#6cb04c', '#3f7a2a'], '#386e26');
  kg.globalCompositeOperation = 'destination-in'; kg.fillStyle = '#000';
  const mask = mk(), km = mask.getContext('2d'); km.fillStyle = '#000'; cut(km, 37, 140, 54);
  kg.drawImage(mask, 0, 0); kg.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.drawImage(curb, 2, 0, pw, ph, px + 2, py + 3, pw, ph);
  c.drawImage(curb, px, py);
  c.drawImage(green, px, py);

  // anillo alrededor del templete (baldosa más clara)
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(tx, ty + 18, 118, 92, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(180,81,58,0.55)'; c.lineWidth = 3; c.beginPath(); c.ellipse(tx, ty + 18, 104, 80, 0, 0, Math.PI * 2); c.stroke();

  // matas de flores en las jardineras
  [[px + 110, py + 70], [px + pw - 110, py + 70], [px + 110, py + ph - 70], [px + pw - 110, py + ph - 70],
   [px + 60, py + 190], [px + pw - 60, py + 190], [px + 60, py + ph - 180], [px + pw - 60, py + ph - 180]].forEach(([fx, fy], i) =>
    drawFlowerBush(c, fx, fy, 11, rnd, i % 2 ? ['#e8313a', '#f6c945'] : ['#d6337a', '#fdf6e3']));
}

/** Banca blanca de cemento, como las de la plaza. */
function drawWhiteBench(c, x, y) {
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x + 3, y + 6, 54, 14);
  c.fillStyle = '#c9c2b2'; c.fillRect(x + 4, y + 10, 6, 8); c.fillRect(x + 42, y + 10, 6, 8);
  c.fillStyle = '#f6f2e8'; c.fillRect(x, y, 52, 12);
  c.fillStyle = '#ffffff'; c.fillRect(x, y, 52, 3);
  c.fillStyle = '#d9d2c2'; c.fillRect(x, y + 10, 52, 2);
}

/* ---------------- El carrito del raspao ---------------- */

function drawRaspaoCart(c, x, y) {
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x + 4, y + 4, 40, 9, 0, 0, Math.PI * 2); c.fill();
  // ruedas
  [[x - 24, y], [x + 24, y]].forEach(([wx, wy]) => { c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(wx, wy - 4, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9aa3ad'; c.beginPath(); c.arc(wx, wy - 4, 3, 0, Math.PI * 2); c.fill(); });
  // caja del carrito
  c.fillStyle = '#1fb5b0'; c.fillRect(x - 34, y - 34, 68, 26);
  c.fillStyle = '#17908c'; c.fillRect(x - 34, y - 12, 68, 4);
  c.fillStyle = '#fdf6e3'; c.font = '700 8px "Fredoka", sans-serif'; c.textAlign = 'center'; c.fillText('RASPAO', x, y - 18);
  // tapa con el bloque de hielo y los frascos de sirope
  c.fillStyle = '#e8e2d2'; c.fillRect(x - 36, y - 40, 72, 7);
  c.fillStyle = '#dff3ff'; c.fillRect(x - 28, y - 52, 20, 13); c.fillStyle = '#ffffff'; c.fillRect(x - 28, y - 52, 20, 3);
  [['#e8313a', 0], ['#f6c945', 1], ['#3fa34d', 2], ['#9b59b6', 3]].forEach(([col, k]) => {
    const bx = x + k * 9 - 2;
    c.fillStyle = col; c.fillRect(bx, y - 54, 6, 14); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(bx + 1, y - 52, 1.5, 10);
    c.fillStyle = '#fdf6e3'; c.fillRect(bx + 1, y - 57, 4, 3);
  });
  // manija
  c.fillStyle = '#5a5a60'; c.fillRect(x + 34, y - 30, 14, 3);
}
