'use strict';
/* =========================================================
   map.js — Mapa de la escena (tecla Q / TAB o botón del HUD).
   Muestra el escenario en miniatura, las zonas ya visitadas,
   los lugares importantes, los habitantes, las pistas halladas,
   el objetivo actual y la posición de Mateo.
   ========================================================= */

const MAP_TITLES = {
  pueblo: 'CIÉNAGA DE ANTAÑO',
  puerto: 'PUERTO CACHIMBERO',
  fiesta: 'FESTIVAL DEL CAIMÁN'
};
// dónde estaban las pistas (para marcar las ya encontradas)
const MAP_CLUES = { flor: [170, 400], vela: [1656, 350], cinta: [1790, 942] };

function drawSceneMap(ctx, game) {
  const s = game.scene, W = game.W, H = game.H, t = game.t;
  const pw = 820, ph = 470, px = (W - pw) / 2, py = (H - ph) / 2;
  const k = Math.min((pw - 40) / s.width, (ph - 110) / s.height);
  const mw = s.width * k, mh = s.height * k, mx = (W - mw) / 2, my = py + 58;
  const P = (x, y) => [mx + x * k, my + y * k];

  ctx.save();
  // fondo oscuro y panel de papel
  ctx.fillStyle = 'rgba(5,8,20,0.78)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1a1430'; ctx.beginPath(); rrect(ctx, px, py, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = '#f6c945'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = '#5e3b1a'; ctx.lineWidth = 2; ctx.beginPath(); rrect(ctx, px + 5, py + 5, pw - 10, ph - 10, 10); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = '600 22px "Fredoka", sans-serif'; ctx.fillStyle = '#f6c945';
  ctx.fillText('MAPA · ' + (MAP_TITLES[game.sceneName] || ''), W / 2, py + 36);

  // escenario en miniatura (con tono sepia de mapa antiguo)
  ctx.save();
  ctx.beginPath(); rrect(ctx, mx, my, mw, mh, 6); ctx.clip();
  ctx.drawImage(s.bg, mx, my, mw, mh);
  ctx.drawImage(s.top, mx, my, mw, mh);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(240,215,170,0.55)'; ctx.fillRect(mx, my, mw, mh);
  ctx.globalCompositeOperation = 'source-over';
  // zonas sin visitar: niebla
  const seen = game.flags['map_' + game.sceneName] || {};
  const c = MAP_CELL;
  // una casilla = un píxel; al ampliarla con suavizado la niebla queda con bordes suaves
  const cols = Math.ceil(s.width / c), rows = Math.ceil(s.height / c);
  const fog = document.createElement('canvas'); fog.width = cols + 2; fog.height = rows + 2;
  const fc = fog.getContext('2d');
  fc.fillStyle = 'rgba(26,20,48,0.85)'; fc.fillRect(0, 0, cols + 2, rows + 2);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (seen[x + ',' + y]) fc.clearRect(x + 1, y + 1, 1, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fog, 1, 1, cols, rows, mx, my, cols * c * k, rows * c * k);
  ctx.restore();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.beginPath(); rrect(ctx, mx, my, mw, mh, 6); ctx.stroke();

  const isSeen = (x, y) => seen[Math.floor(x / c) + ',' + Math.floor(y / c)];
  const pill = (x, y, text, col = '#fdf6e3', bg = 'rgba(42,26,12,0.85)') => {
    ctx.font = '600 11px "Fredoka", sans-serif';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = bg; ctx.beginPath(); rrect(ctx, x - w / 2, y - 9, w, 17, 8); ctx.fill();
    ctx.fillStyle = col; ctx.fillText(text, x, y + 3.5);
  };
  // lugares (solo los ya descubiertos)
  (s.mapLabels || []).forEach(L => { if (isSeen(L.x, L.y)) { const [x, y] = P(L.x, L.y); pill(x, y, L.text); } });

  // pistas encontradas
  if (game.sceneName === 'pueblo') {
    Object.entries(MAP_CLUES).forEach(([id, [cx, cy]]) => {
      if (!game.flags['item_' + id]) return;
      const [x, y] = P(cx, cy);
      ctx.fillStyle = '#3fa34d'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 1, y + 3); ctx.lineTo(x + 4, y - 3); ctx.stroke();
    });
  }
  // objetos de misiones secundarias (rombos naranjas)
  s.items.forEach(it => {
    if (it.kind !== 'quest' || !it.available || !isSeen(it.x, it.y)) return;
    const [x, y] = P(it.x, it.y);
    ctx.fillStyle = '#f08a2c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  // habitantes con quienes aún no has hablado
  s.npcs.forEach(n => {
    if (!n.talkable || n.hidden || game.flags['talk_' + n.id] || !isSeen(n.x, n.y)) return;
    const [x, y] = P(n.x, n.y);
    ctx.fillStyle = '#f6c945'; ctx.beginPath(); ctx.arc(x, y - 4, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a0c'; ctx.font = '700 10px "Fredoka", sans-serif'; ctx.fillText('!', x, y - 0.5);
  });
  // objetivo
  const o = s.objective && s.objective();
  if (o) {
    const [x, y] = P(o.x, o.y), r = 8 + Math.sin(t * 5) * 1.5;
    ctx.fillStyle = '#ff6b78'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // Mateo
  const p = game.player, [qx, qy] = P(p.x, p.y);
  glow(ctx, qx, qy, 16 + Math.sin(t * 6) * 3, 'rgba(127,224,216,0.9)', 0.6);
  ctx.fillStyle = '#7fe0d8'; ctx.strokeStyle = '#0b2a40'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(qx, qy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  pill(qx, qy - 16, 'TÚ', '#0b2a40', '#7fe0d8');

  // leyenda
  ctx.font = '600 12px "Nunito", sans-serif'; ctx.fillStyle = '#e8dcc0';
  ctx.fillText('● Tú    ★ Objetivo    ! Por conocer    ✓ Pista encontrada    ◆ Misión secundaria    ▒ Sin visitar', W / 2, py + ph - 30);
  ctx.fillStyle = '#7fe0d8'; ctx.font = '600 12px "Fredoka", sans-serif';
  ctx.fillText('[Q] o [TAB] para cerrar', W / 2, py + ph - 12);
  ctx.restore();
}
