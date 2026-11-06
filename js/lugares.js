'use strict';
/* =========================================================
   lugares.js — Más lugares reales de Ciénaga y su comida típica.

   Edificios dibujados a partir de fotos reales (Wikimedia Commons):
     · La Casa del Diablo: casona blanca de un piso, con pórtico de
       columnas en la esquina, balaustradas y cornisa con relieves.
     · El Palacio Azul: casona republicana de dos pisos, azul, con
       ventanas en arco y un balcón corrido de baranda labrada.
     · La estación del tren: el ferrocarril de Santa Marta llegó a
       Ciénaga en 1887 y con él la bonanza del banano.
   Y la comida: arepa e' huevo, bollo de yuca, cocada, raspao,
   cayeye, pescado frito con patacón y arroz con coco, carimañola.
   ========================================================= */

/* ---------------- Casa del Diablo ---------------- */
function drawCasaDelDiablo(c, x, y, w, h, rnd) {
  const bottom = y + h, roofH = 40, corn = y + roofH, wallY = corn + 24;
  const WH = '#ece8dc', WH_SH = '#cfc8b6', DK = '#5a5348';
  // sombra en el suelo
  const hs = c.createLinearGradient(0, bottom - 4, 0, bottom + 18);
  hs.addColorStop(0, 'rgba(0,0,0,0.3)'); hs.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hs; c.fillRect(x + 4, bottom - 4, w + 8, 22);
  // azotea plana, gastada, con una mata que creció entre las grietas
  c.fillStyle = '#bdb6a6'; c.fillRect(x - 4, y, w + 8, roofH);
  speckle(c, x, y, w, roofH, ['#aea795', '#cbc5b6', '#9c9483'], w / 3, rnd, 2);
  c.strokeStyle = 'rgba(60,50,40,0.45)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + w * 0.62, y + 4); c.lineTo(x + w * 0.66, y + 16); c.lineTo(x + w * 0.63, y + 28); c.lineTo(x + w * 0.7, y + 38); c.stroke();
  [[x + w * 0.8, y + 18, 14], [x + w * 0.22, y + 10, 9]].forEach(([px, py, r]) => {
    c.fillStyle = '#3f7a2a'; c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5f9e3f'; c.beginPath(); c.arc(px - r * 0.3, py - r * 0.3, r * 0.6, 0, Math.PI * 2); c.fill();
  });
  // cornisa con dentículos y relieves (guirnaldas y medallones)
  c.fillStyle = WH; c.fillRect(x - 6, corn, w + 12, 24);
  c.fillStyle = WH_SH; c.fillRect(x - 6, corn + 20, w + 12, 4);
  c.fillStyle = '#fbf8f0'; c.fillRect(x - 6, corn, w + 12, 3);
  for (let dx = x - 4; dx < x + w + 4; dx += 7) { c.fillStyle = WH_SH; c.fillRect(dx, corn + 4, 4, 4); }
  for (let i = 0; i < 9; i++) {
    const mx = x + 24 + i * (w - 48) / 8;
    c.fillStyle = WH_SH; c.beginPath(); c.arc(mx, corn + 14, 4, 0, Math.PI * 2); c.fill();
    if (i < 8) { c.strokeStyle = WH_SH; c.lineWidth = 1.5; c.beginPath(); c.arc(mx + (w - 48) / 16, corn + 10, (w - 48) / 16 - 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  }
  // muro blanco, con manchas de humedad
  c.fillStyle = WH; c.fillRect(x, wallY, w, bottom - wallY);
  speckle(c, x, wallY, w, bottom - wallY, ['#e2ddcf', '#f4f1e8', '#d6d0c0'], w / 2, rnd, 2);
  for (let i = 0; i < 7; i++) {
    const sx = x + 10 + rnd() * (w - 30), sw = 8 + rnd() * 18, sh = 20 + rnd() * 50;
    const sg = c.createLinearGradient(0, wallY, 0, wallY + sh);
    sg.addColorStop(0, 'rgba(90,80,64,0.35)'); sg.addColorStop(1, 'rgba(90,80,64,0)');
    c.fillStyle = sg; c.fillRect(sx, wallY, sw, sh);
  }
  c.fillStyle = WH_SH; c.fillRect(x, bottom - 14, w, 14);   // zócalo
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, wallY, w, 3);

  // pórtico de la esquina (a la izquierda): columnas pareadas y fondo en sombra
  const px = x + 14, pw = Math.min(150, w * 0.36);
  c.fillStyle = '#3c362e'; c.fillRect(px, wallY + 2, pw, bottom - wallY - 16);
  c.fillStyle = '#4c453b'; c.fillRect(px, wallY + 2, pw, 10);
  // puerta del fondo y ladrillo a la vista (la casa está en ruinas)
  c.fillStyle = '#2a241e'; c.fillRect(px + pw * 0.38, wallY + 26, pw * 0.24, bottom - wallY - 42);
  c.fillStyle = '#8a4a2e'; c.fillRect(px + 8, wallY + 30, 26, 30);
  c.strokeStyle = '#5e2e1a'; c.lineWidth = 1;
  for (let by = wallY + 34; by < wallY + 60; by += 6) { c.beginPath(); c.moveTo(px + 8, by); c.lineTo(px + 34, by); c.stroke(); }
  const cols = [px + 2, px + 14, px + pw - 26, px + pw - 14];
  cols.forEach(cx => {
    c.fillStyle = WH; c.fillRect(cx, wallY + 2, 11, bottom - wallY - 16);
    c.fillStyle = WH_SH; c.fillRect(cx + 8, wallY + 2, 3, bottom - wallY - 16);
    c.fillStyle = '#fbf8f0'; c.fillRect(cx - 2, wallY + 2, 15, 6);   // capitel
    c.fillStyle = '#fbf8f0'; c.fillRect(cx - 2, bottom - 20, 15, 6); // basa
    for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(cx + 2 + k * 3, wallY + 10, 1, bottom - wallY - 32); }
  });
  // balaustrada entre las columnas
  const balY = bottom - 40;
  c.fillStyle = WH; c.fillRect(px + 26, balY, pw - 52, 4); c.fillRect(px + 26, bottom - 18, pw - 52, 4);
  for (let bx = px + 28; bx < px + pw - 28; bx += 7) {
    c.fillStyle = WH; c.beginPath(); c.ellipse(bx + 2, balY + 12, 2.6, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = WH_SH; c.fillRect(bx + 3, balY + 6, 1, 12);
  }
  // ventanas altas con frontón y postigos de madera
  const start = px + pw + 18, n = Math.max(3, Math.floor((x + w - start - 10) / 52));
  const step = (x + w - start - 10) / n;
  for (let i = 0; i < n; i++) {
    const wx = start + i * step + step / 2 - 15, wy = wallY + 22, ww = 30, wh = bottom - wy - 34;
    c.fillStyle = '#fbf8f0'; c.beginPath(); c.moveTo(wx - 6, wy - 4); c.lineTo(wx + ww / 2, wy - 16); c.lineTo(wx + ww + 6, wy - 4); c.fill();
    c.fillStyle = WH_SH; c.fillRect(wx - 6, wy - 4, ww + 12, 3);
    c.fillStyle = '#fbf8f0'; c.fillRect(wx - 4, wy - 1, ww + 8, wh + 3);
    const door = i === n - 2;
    const sc = door ? '#6b4428' : (i % 2 ? '#5d6b5a' : '#6b4428');
    c.fillStyle = sc; c.fillRect(wx, wy + 2, ww, door ? wh + 18 : wh);
    c.fillStyle = shade(sc, -0.25); c.fillRect(wx + ww / 2 - 1, wy + 2, 2, door ? wh + 18 : wh);
    for (let k = 6; k < (door ? wh + 18 : wh); k += 5) { c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(wx + 2, wy + 2 + k, ww - 4, 1); }
    if (!door) {
      // antepecho con balaustres
      c.fillStyle = WH; c.fillRect(wx - 4, wy + wh + 2, ww + 8, 3);
      for (let b = 0; b < 5; b++) { c.beginPath(); c.ellipse(wx + 3 + b * 6, wy + wh + 10, 2, 5, 0, 0, Math.PI * 2); c.fill(); }
    }
    // un postigo caído y una grieta
    if (i === 0) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(wx + 2, wy + 4, 10, 4); }
  }
  c.strokeStyle = 'rgba(60,50,40,0.5)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + w * 0.72, wallY); c.lineTo(x + w * 0.7, wallY + 18); c.lineTo(x + w * 0.73, wallY + 34); c.stroke();
  // escalón de la acera
  c.fillStyle = '#c8c1b0'; c.fillRect(x - 4, bottom - 4, w + 8, 4);
}

/* ---------------- Palacio Azul ---------------- */
function drawPalacioAzul(c, x, y, w, h, rnd) {
  const bottom = y + h, roofH = 30, wallY = y + roofH + 10, mid = wallY + (bottom - wallY) * 0.46;
  const BL = '#8fb8e6', BL2 = '#6d98d0', TR = '#f4f6f8', DOOR = '#3f6fae';
  const hs = c.createLinearGradient(0, bottom - 4, 0, bottom + 18);
  hs.addColorStop(0, 'rgba(0,0,0,0.3)'); hs.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hs; c.fillRect(x + 4, bottom - 4, w + 8, 22);
  // azotea
  c.fillStyle = '#c9cdd2'; c.fillRect(x - 4, y, w + 8, roofH);
  speckle(c, x, y, w, roofH, ['#b9bec4', '#d8dce0'], w / 4, rnd, 2);
  // pretil con balaustres arriba
  c.fillStyle = TR; c.fillRect(x - 6, wallY - 12, w + 12, 4); c.fillRect(x - 6, wallY - 2, w + 12, 4);
  for (let bx = x - 2; bx < x + w + 2; bx += 6) { c.fillStyle = TR; c.fillRect(bx, wallY - 9, 3, 8); }
  // fachada azul
  const fg = c.createLinearGradient(x, 0, x + w, 0);
  fg.addColorStop(0, shade(BL, 0.06)); fg.addColorStop(1, shade(BL, -0.08));
  c.fillStyle = fg; c.fillRect(x, wallY + 2, w, bottom - wallY - 2);
  speckle(c, x, wallY, w, bottom - wallY, [BL2, shade(BL, 0.1)], w / 2, rnd, 2);
  // relieves del piso alto (rombos y flores, como en la foto)
  for (let rx = x + 10; rx < x + w - 6; rx += 18) {
    c.fillStyle = shade(BL, 0.18); c.beginPath(); c.moveTo(rx, wallY + 8); c.lineTo(rx + 4, wallY + 12); c.lineTo(rx, wallY + 16); c.lineTo(rx - 4, wallY + 12); c.fill();
  }
  c.fillStyle = TR; c.fillRect(x - 4, wallY + 2, w + 8, 4);
  // ventanas en arco del piso alto, con marco blanco labrado
  const n = Math.max(3, Math.round(w / 54)), bay = w / n;
  for (let i = 0; i < n; i++) {
    const cx = x + bay * i + bay / 2, ww = 26, top = wallY + 22, bot = mid - 4;
    c.fillStyle = TR; c.fillRect(cx - ww / 2 - 4, top, ww + 8, bot - top); c.beginPath(); c.arc(cx, top, ww / 2 + 4, Math.PI, 0); c.fill();
    c.fillStyle = '#2c4a6e'; c.fillRect(cx - ww / 2, top, ww, bot - top - 2); c.beginPath(); c.arc(cx, top, ww / 2, Math.PI, 0); c.fill();
    // abanico de vidrio en el arco
    c.strokeStyle = TR; c.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const a = Math.PI + k * Math.PI / 6; c.beginPath(); c.moveTo(cx, top); c.lineTo(cx + Math.cos(a) * ww / 2, top + Math.sin(a) * ww / 2); c.stroke(); }
    c.fillStyle = DOOR; c.fillRect(cx - ww / 2, top + 2, ww, bot - top - 4);
    c.fillStyle = shade(DOOR, -0.3); c.fillRect(cx - 1, top + 2, 2, bot - top - 4);
    // pilastra con capitel entre ventanas
    if (i > 0) { const pxx = x + bay * i - 3; c.fillStyle = TR; c.fillRect(pxx, wallY + 8, 6, mid - wallY - 6); c.fillRect(pxx - 2, wallY + 8, 10, 4); }
  }
  // balcón corrido: losa con ménsulas y baranda labrada
  const by = mid - 2;
  c.fillStyle = '#5d6670'; c.fillRect(x - 10, by + 10, w + 20, 4);
  for (let mx = x - 4; mx < x + w + 6; mx += 22) { c.fillStyle = '#d9dee4'; c.beginPath(); c.moveTo(mx, by + 14); c.lineTo(mx + 8, by + 14); c.lineTo(mx + 6, by + 24); c.lineTo(mx + 2, by + 24); c.fill(); }
  c.fillStyle = '#d9dee4'; c.fillRect(x - 10, by - 14, w + 20, 4);
  for (let bx = x - 8; bx < x + w + 8; bx += 7) {
    c.fillStyle = '#c4cad2'; c.beginPath(); c.ellipse(bx + 3, by - 3, 2.4, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8e97a2'; c.fillRect(bx + 4, by - 8, 1, 10);
  }
  c.fillStyle = '#e7ebef'; c.fillRect(x - 10, by + 4, w + 20, 6);
  // piso bajo: portones altos de madera azul con marco blanco
  const doors = Math.max(3, Math.round(w / 52)), dbay = w / doors;
  for (let i = 0; i < doors; i++) {
    const cx = x + dbay * i + dbay / 2, dw = 24, top = by + 34, bot2 = bottom - 12;
    c.fillStyle = TR; c.fillRect(cx - dw / 2 - 4, top - 4, dw + 8, bot2 - top + 4);
    c.fillStyle = TR; c.fillRect(cx - dw / 2 - 6, top - 8, dw + 12, 4);
    c.fillStyle = DOOR; c.fillRect(cx - dw / 2, top, dw, bot2 - top);
    c.fillStyle = shade(DOOR, -0.28); c.fillRect(cx - 1, top, 2, bot2 - top);
    c.fillStyle = shade(DOOR, 0.15); c.fillRect(cx - dw / 2 + 2, top + 4, dw / 2 - 4, 10); c.fillRect(cx + 2, top + 4, dw / 2 - 4, 10);
  }
  c.fillStyle = shade(BL, -0.25); c.fillRect(x, bottom - 12, w, 12);
  c.fillStyle = '#c8c1b0'; c.fillRect(x - 4, bottom - 4, w + 8, 4);
}

/* ---------------- Estación del tren ---------------- */
function drawEstacion(c, x, y, w, h, rnd) {
  const bottom = y + h, roofH = 70, wallY = y + roofH;
  const WALL = '#efd9a6', TRIM = '#2f6f4a', ROOF = '#8c8f94';
  const hs = c.createLinearGradient(0, bottom - 4, 0, bottom + 18);
  hs.addColorStop(0, 'rgba(0,0,0,0.3)'); hs.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hs; c.fillRect(x + 4, bottom - 4, w + 8, 22);
  // fachada
  const fg = c.createLinearGradient(x, 0, x + w, 0);
  fg.addColorStop(0, shade(WALL, 0.06)); fg.addColorStop(1, shade(WALL, -0.08));
  c.fillStyle = fg; c.fillRect(x, wallY, w, bottom - wallY);
  speckle(c, x, wallY, w, bottom - wallY, [shade(WALL, -0.06), shade(WALL, 0.06)], w / 3, rnd, 2);
  c.fillStyle = shade(WALL, -0.25); c.fillRect(x, bottom - 12, w, 12);
  // techo de zinc a dos aguas, con alero grande sobre el andén
  c.fillStyle = ROOF; c.fillRect(x - 16, y, w + 32, roofH + 6);
  c.fillStyle = shade(ROOF, 0.18); c.fillRect(x - 16, y, w + 32, roofH * 0.42);
  for (let rx = x - 14; rx < x + w + 16; rx += 6) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(rx, y, 2, roofH + 6); }
  c.fillStyle = shade(ROOF, 0.32); c.fillRect(x - 16, y + roofH * 0.42, w + 32, 2);
  // óxido
  for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(150,80,40,0.25)'; c.fillRect(x - 10 + rnd() * (w + 10), y + 4 + rnd() * (roofH - 8), 8 + rnd() * 14, 3 + rnd() * 5); }
  c.fillStyle = TRIM; c.fillRect(x - 16, y + roofH + 2, w + 32, 6);
  // calados de madera bajo el alero
  for (let vx = x - 14; vx < x + w + 14; vx += 10) { c.fillStyle = TRIM; c.beginPath(); c.moveTo(vx, y + roofH + 8); c.lineTo(vx + 10, y + roofH + 8); c.lineTo(vx + 5, y + roofH + 14); c.fill(); }
  // columnas de hierro del alero
  for (let px = x - 10; px <= x + w + 4; px += (w + 14) / 6) { c.fillStyle = '#2e3a34'; c.fillRect(px, y + roofH + 8, 5, bottom - y - roofH - 8); c.fillRect(px - 3, bottom - 6, 11, 6); }
  // reloj y letrero
  const cx = x + w / 2;
  c.fillStyle = '#fdf6e3'; c.beginPath(); c.arc(cx, wallY + 22, 13, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.moveTo(cx, wallY + 22); c.lineTo(cx, wallY + 13); c.moveTo(cx, wallY + 22); c.lineTo(cx + 6, wallY + 25); c.stroke();
  c.fillStyle = TRIM; c.fillRect(cx - 92, wallY + 40, 184, 22);
  c.fillStyle = '#f6c945'; c.fillRect(cx - 90, wallY + 42, 180, 2);
  c.font = '700 14px "Fredoka", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fdf6e3';
  c.fillText('ESTACIÓN  CIÉNAGA', cx, wallY + 57);
  // puertas y ventanilla de tiquetes
  const n = 6;
  for (let i = 0; i < n; i++) {
    const dx = x + 22 + i * (w - 44) / (n - 1) - 12;
    if (Math.abs(dx + 12 - cx) < 60) continue;
    c.fillStyle = '#fdf6e3'; c.fillRect(dx - 3, wallY + 34, 30, bottom - wallY - 44);
    c.fillStyle = TRIM; c.fillRect(dx, wallY + 37, 24, bottom - wallY - 49);
    c.fillStyle = shade(TRIM, -0.3); c.fillRect(dx + 11, wallY + 37, 2, bottom - wallY - 49);
  }
  c.fillStyle = '#fdf6e3'; c.fillRect(cx - 20, wallY + 72, 40, 26);
  c.fillStyle = '#2a2a2a'; c.fillRect(cx - 16, wallY + 76, 32, 18);
  c.fillStyle = '#c9a24a'; for (let k = 0; k < 5; k++) c.fillRect(cx - 14 + k * 7, wallY + 76, 1, 18);
  c.font = '600 8px "Fredoka", sans-serif'; c.fillStyle = '#2a1a0c'; c.fillText('TIQUETES', cx, wallY + 106);
  // campana de la estación
  c.fillStyle = '#2e3a34'; c.fillRect(x + w - 30, wallY + 6, 14, 3);
  c.fillStyle = '#c9a24a'; c.beginPath(); c.moveTo(x + w - 28, wallY + 22); c.quadraticCurveTo(x + w - 23, wallY + 6, x + w - 18, wallY + 22); c.fill();
}

/** Andén y carrilera, de x1 a x2, con los rieles a la altura y. */
function drawRails(c, x1, x2, y, rnd) {
  c.fillStyle = '#b9ad98'; c.fillRect(x1, y - 26, x2 - x1, 16);            // andén de piedra
  c.fillStyle = '#9a8e78'; c.fillRect(x1, y - 12, x2 - x1, 3);
  c.fillStyle = '#8a8172'; c.fillRect(x1, y - 8, x2 - x1, 30);             // balasto
  speckle(c, x1, y - 8, x2 - x1, 30, ['#6f6758', '#a59c8a', '#7d7466'], (x2 - x1) / 2, rnd, 2);
  for (let sx = x1 + 4; sx < x2; sx += 14) { c.fillStyle = '#5e3b1a'; c.fillRect(sx, y - 6, 8, 26); c.fillStyle = '#7a4c26'; c.fillRect(sx, y - 6, 8, 2); }
  [y, y + 12].forEach(ry => { c.fillStyle = '#4a4e54'; c.fillRect(x1, ry, x2 - x1, 3); c.fillStyle = '#b8bec6'; c.fillRect(x1, ry, x2 - x1, 1); });
  // tope de la vía
  c.fillStyle = '#7a2a1a'; c.fillRect(x1 - 6, y - 4, 8, 22); c.fillStyle = '#f6c945'; c.fillRect(x1 - 6, y + 2, 8, 3);
}

/** Locomotora de vapor de la época, con un vagón de racimos de banano. */
function drawTren(c, x, y, t = 0) {
  // y = altura de los rieles; x = punta de la locomotora (mira a la izquierda)
  const by = y - 4;
  // vagón de banano
  const vx = x + 120;
  c.fillStyle = '#6b3d1a'; c.fillRect(vx, by - 34, 92, 30);
  c.fillStyle = '#8a5a2b'; for (let k = 0; k < 92; k += 10) c.fillRect(vx + k, by - 34, 8, 30);
  c.fillStyle = '#3f9b3a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(vx + 10 + k * 15, by - 38, 8, 7, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#9ad35a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(vx + 8 + k * 15, by - 41, 4, 3, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#2a2a2a'; c.fillRect(vx - 8, by - 10, 10, 3);
  [vx + 16, vx + 76].forEach(wx => { c.fillStyle = '#1e1e22'; c.beginPath(); c.arc(wx, by, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#7a7f86'; c.beginPath(); c.arc(wx, by, 3, 0, Math.PI * 2); c.fill(); });
  // locomotora
  c.fillStyle = '#26282c'; c.fillRect(x + 18, by - 34, 70, 24);                       // caldera
  c.fillStyle = '#3a3d43'; c.fillRect(x + 18, by - 34, 70, 6);
  c.fillStyle = '#c9a24a'; [x + 34, x + 56, x + 78].forEach(bx => c.fillRect(bx, by - 34, 3, 24));
  c.fillStyle = '#26282c'; c.fillRect(x + 84, by - 58, 34, 48);                       // cabina
  c.fillStyle = '#8b1e1e'; c.fillRect(x + 82, by - 62, 38, 6);
  c.fillStyle = '#f6d58a'; c.fillRect(x + 92, by - 52, 16, 14);
  c.fillStyle = '#26282c'; c.fillRect(x + 26, by - 54, 10, 20);                       // chimenea
  c.fillStyle = '#3a3d43'; c.fillRect(x + 22, by - 58, 18, 6);
  c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + 54, by - 38, 6, Math.PI, 0); c.fill();   // domo
  c.fillStyle = '#f6e7a8'; c.beginPath(); c.arc(x + 16, by - 26, 5, 0, Math.PI * 2); c.fill(); // farol
  c.fillStyle = '#8b1e1e'; c.beginPath(); c.moveTo(x + 18, by - 10); c.lineTo(x, by + 6); c.lineTo(x + 18, by + 6); c.fill(); // trompa
  c.fillStyle = '#8b1e1e'; c.fillRect(x + 14, by - 12, 106, 4);
  [x + 34, x + 58, x + 100].forEach((wx, i) => {
    const r = i === 2 ? 8 : 11;
    c.fillStyle = '#1e1e22'; c.beginPath(); c.arc(wx, by - (11 - r), r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#8b1e1e'; c.lineWidth = 2; c.beginPath(); c.arc(wx, by - (11 - r), r - 3, 0, Math.PI * 2); c.stroke();
  });
  c.fillStyle = '#9aa0a8'; c.fillRect(x + 34, by - 4, 24, 3);   // biela
  c.font = '700 7px "Fredoka", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#c9a24a';
  c.fillText('F.C. SANTA MARTA', x + 101, by - 22);
}

/* ---------------- Comida típica ---------------- */
const SABORES = {
  arepa: 'Arepa e\' huevo', bollo: 'Bollo de yuca', cocada: 'Cocadas', raspao: 'Raspao',
  cayeye: 'Cayeye', pescado: 'Pescado frito', carimanola: 'Carimañolas'
};

/** Dibuja un plato o porción de comida centrada en (x, y). */
function drawFood(c, kind, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const plate = (r = 20) => {
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(1, 3, r, r * 0.55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f7f4ec'; c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3f6fae'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, r - 3, (r - 3) * 0.55, 0, 0, Math.PI * 2); c.stroke();
  };
  switch (kind) {
    case 'arepa': {
      c.fillStyle = '#b7741e'; c.beginPath(); c.ellipse(0, 2, 14, 7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e3a33a'; c.beginPath(); c.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2c35a'; [[-6, -2], [4, 1], [7, -3], [-2, 3]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 1.6, 0, Math.PI * 2); c.fill(); });
      // mordisco con el huevo adentro
      c.fillStyle = '#fdf6e3'; c.beginPath(); c.arc(12, -1, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f6c945'; c.beginPath(); c.arc(10, 0, 2.6, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'bollo': {
      [-7, 6].forEach((ox, i) => {
        c.save(); c.rotate(i ? 0.25 : -0.15);
        c.fillStyle = '#c9c08a'; c.beginPath(); c.ellipse(ox, 0, 16, 5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e2d9a6'; c.beginPath(); c.ellipse(ox, -1, 14, 3, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#a8955a'; c.lineWidth = 0.8; for (let k = -10; k <= 10; k += 5) { c.beginPath(); c.moveTo(ox + k, -4); c.lineTo(ox + k + 2, 4); c.stroke(); }
        c.fillStyle = '#7a5a2a'; c.fillRect(ox - 1, -5, 2, 10); c.fillRect(ox - 13, -4, 2, 8); c.fillRect(ox + 11, -4, 2, 8);
        c.restore();
      });
      break;
    }
    case 'cocada': {
      plate(18);
      [[-7, -1], [6, -2], [0, 3]].forEach(([a, b], i) => {
        c.fillStyle = i === 1 ? '#a8692e' : '#e9dcc0'; c.beginPath(); c.arc(a, b, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = i === 1 ? '#c98a4a' : '#fbf6e6'; for (let k = 0; k < 6; k++) c.fillRect(a - 4 + (k * 37 % 8), b - 4 + (k * 23 % 7), 2, 1);
      });
      break;
    }
    case 'raspao': {
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(-8, -2); c.lineTo(8, -2); c.lineTo(6, 16); c.lineTo(-6, 16); c.fill();
      c.fillStyle = '#e8313a'; c.beginPath(); c.moveTo(-7, 2); c.lineTo(7, 2); c.lineTo(5.6, 15); c.lineTo(-5.6, 15); c.fill();
      c.fillStyle = '#fdf6e3'; c.beginPath(); c.arc(0, -3, 9, Math.PI, 0); c.fill();
      c.fillStyle = '#e8313a'; c.beginPath(); c.arc(-3, -5, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f08a2c'; c.beginPath(); c.arc(4, -6, 3.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fbf6e6'; c.fillRect(-1, -16, 2, 10);
      break;
    }
    case 'cayeye': {
      plate(20);
      c.fillStyle = '#d9cfa4'; c.beginPath(); c.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c4562b'; [[-5, -3], [2, -5], [5, -1], [-1, 0]].forEach(([a, b]) => c.fillRect(a, b, 3, 2));
      c.fillStyle = '#fbf6e6'; for (let k = 0; k < 10; k++) c.fillRect(-7 + (k * 29 % 14), -7 + (k * 17 % 7), 2, 1);
      c.fillStyle = '#f6c945'; c.beginPath(); c.ellipse(10, 4, 4, 1.6, 0, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'pescado': {
      plate(24);
      // arroz con coco
      c.fillStyle = '#d8c9a8'; c.beginPath(); c.ellipse(-10, 1, 7, 5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b89a6a'; for (let k = 0; k < 6; k++) c.fillRect(-14 + (k * 7 % 9), -2 + (k * 5 % 6), 1, 1);
      // patacones
      [[10, 4], [16, 0]].forEach(([a, b]) => { c.fillStyle = '#d9a032'; c.beginPath(); c.arc(a, b, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2c35a'; c.beginPath(); c.arc(a - 1, b - 1, 2.4, 0, Math.PI * 2); c.fill(); });
      // pescado frito
      c.fillStyle = '#9a5a22'; c.beginPath(); c.ellipse(2, -5, 12, 4.5, -0.1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(13, -6); c.lineTo(19, -10); c.lineTo(19, -1); c.fill();
      c.strokeStyle = '#6b3d1a'; c.lineWidth = 0.8; for (let k = -6; k <= 6; k += 3) { c.beginPath(); c.moveTo(2 + k, -8); c.lineTo(2 + k + 1, -2); c.stroke(); }
      c.fillStyle = '#fdf6e3'; c.beginPath(); c.arc(-7, -6, 1.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7cc055'; c.beginPath(); c.arc(-2, 7, 3, 0, Math.PI * 2); c.fill();   // limón
      break;
    }
    case 'carimanola': {
      [[-8, 0, -0.2], [6, -2, 0.15], [0, 5, 0]].forEach(([a, b, r]) => {
        c.save(); c.translate(a, b); c.rotate(r);
        c.fillStyle = '#b8701e'; c.beginPath(); c.ellipse(0, 1, 11, 4.6, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e0a03a'; c.beginPath(); c.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f4c463'; c.fillRect(-5, -2, 6, 1);
        c.restore();
      });
      break;
    }
  }
  c.restore();
}

/** Puesto de fritos: fogón de leña con caldero y mesa con arepas e' huevo. */
function drawFritanga(c, x, y, t = 0) {
  // mesa
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x - 40, y + 18, 84, 8);
  c.fillStyle = '#6b4424'; c.fillRect(x - 38, y + 4, 4, 18); c.fillRect(x + 34, y + 4, 4, 18);
  c.fillStyle = '#8a5a2b'; c.fillRect(x - 42, y - 8, 84, 14);
  c.fillStyle = '#fdf6e3'; c.fillRect(x - 40, y - 7, 80, 9);
  c.fillStyle = '#1fb5b0'; for (let k = 0; k < 80; k += 10) c.fillRect(x - 40 + k, y - 7, 5, 9);
  drawFood(c, 'arepa', x - 22, y - 9, 0.7); drawFood(c, 'arepa', x - 6, y - 11, 0.7); drawFood(c, 'carimanola', x + 18, y - 9, 0.6);
  // fogón de tres piedras con caldero
  const fx = x + 60, fy = y + 8;
  c.fillStyle = '#6b6258'; [[-12, 4], [12, 4], [0, -6]].forEach(([a, b]) => { c.beginPath(); c.ellipse(fx + a, fy + b, 7, 5, 0, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = '#5e3b1a'; c.fillRect(fx - 16, fy + 4, 32, 4);
  const fl = 0.7 + Math.sin(t * 13) * 0.3;
  c.fillStyle = '#f08a2c'; c.beginPath(); c.moveTo(fx - 7, fy + 4); c.lineTo(fx, fy - 6 - fl * 6); c.lineTo(fx + 7, fy + 4); c.fill();
  c.fillStyle = '#f6c945'; c.beginPath(); c.moveTo(fx - 3, fy + 4); c.lineTo(fx, fy - 2 - fl * 3); c.lineTo(fx + 3, fy + 4); c.fill();
  c.fillStyle = '#1e1e22'; c.beginPath(); c.ellipse(fx, fy - 10, 15, 9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#c99a3a'; c.beginPath(); c.ellipse(fx, fy - 14, 12, 5, 0, 0, Math.PI * 2); c.fill();   // aceite
  c.fillStyle = '#e3a33a'; c.beginPath(); c.ellipse(fx - 3, fy - 14, 5, 2.5, 0, 0, Math.PI * 2); c.fill();
  // letrero
  c.fillStyle = '#5e3b1a'; c.fillRect(x - 44, y - 44, 3, 36);
  c.fillStyle = '#f6c945'; c.fillRect(x - 46, y - 52, 58, 16);
  c.font = '700 9px "Fredoka", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#7a1e10';
  c.fillText('FRITOS', x - 17, y - 41);
}

/** Ícono de palabra costeña: globo de diálogo con la palabra. */
function drawWordIcon(c, word, t = 0) {
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); rrect(c, 16, 22, 132, 64, 16); c.fill();
  c.fillStyle = '#fdf6e3'; c.beginPath(); rrect(c, 12, 18, 132, 64, 16); c.fill();
  c.beginPath(); c.moveTo(40, 80); c.lineTo(34, 100); c.lineTo(58, 80); c.fill();
  c.fillStyle = '#7a1e10'; c.textAlign = 'center';
  let size = 26; c.font = `700 ${size}px "Fredoka", sans-serif`;
  while (c.measureText(word).width > 120 && size > 12) { size -= 2; c.font = `700 ${size}px "Fredoka", sans-serif`; }
  c.fillText(word, 78, 50 + size * 0.35);
  drawHumanoid(c, 132, 116, LOOKS.mateo, "left", t, false, 2);
  c.restore();
}
