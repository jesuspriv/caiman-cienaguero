'use strict';
/* =========================================================
   sprites.js — Gráficos procedurales ilustrados (vectoriales).
   Personajes, caimán y elementos del decorado se dibujan con
   Canvas: el juego no depende de imágenes externas.
   ========================================================= */

const PAL = {
  turquoise: '#1fb5b0', turquoiseDark: '#0e7c86', sea: '#156b8a', seaDeep: '#0b3d5c',
  green: '#3f9b3a', greenDark: '#25692b', leaf: '#5cc04a',
  yellow: '#f6c945', orange: '#f08a2c', sunset: '#e8613a',
  wood: '#8a5a2b', woodDark: '#5e3b1a', woodLight: '#b07a43',
  night: '#101a3a', nightDeep: '#070d22', sand: '#e6c98f', sandDark: '#c9a86a',
  cream: '#fdf6e3'
};

/* ---------- Utilidades ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const _shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + amt;
  if (_shadeCache.has(key)) return _shadeCache.get(key);
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  const out = '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  _shadeCache.set(key, out);
  return out;
}

/**
 * Capa pre-dibujada. scale > 1 la guarda con más resolución para que se
 * vea nítida al ampliarla; se dibuja siempre en coordenadas lógicas (w x h).
 */
function makeLayer(w, h, fn, scale = 1) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  c.ls = scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (scale !== 1) ctx.scale(scale, scale);
  if (fn) fn(ctx);
  return c;
}

/** Copia una porción (en coordenadas lógicas) de una capa creada con makeLayer. */
function blitLayer(ctx, layer, x, y, w, h) {
  const k = layer.ls || 1;
  ctx.drawImage(layer, x * k, y * k, w * k, h * k, x, y, w, h);
}

/** Escala de las capas del mundo: hasta 2x sin pasarse de memoria. */
function worldLayerScale(w, h) {
  return Math.max(1, Math.min(2, Math.sqrt(18e6 / (w * h))));
}

function speckle(ctx, x, y, w, h, colors, count, rnd, size = 2) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(rnd() * colors.length) | 0];
    const r = size * (0.35 + rnd() * 0.45);
    ctx.beginPath(); ctx.ellipse(x + rnd() * w, y + rnd() * h, r * 1.3, r, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Manchas grandes y difusas: dan un acabado "pintado" a suelos y pasto. */
function softPatches(ctx, x, y, w, h, colors, count, rnd, rmin = 40, rmax = 110) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let i = 0; i < count; i++) {
    const px = x + rnd() * w, py = y + rnd() * h, r = rmin + rnd() * (rmax - rmin);
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    const c = colors[(rnd() * colors.length) | 0];
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function glow(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/* =========================================================
   PERSONAJES — definición de apariencia
   ========================================================= */
const LOOKS = {
  mateo: { skin: '#b97a4f', hair: '#1b1410', hairStyle: 'short', shirt: '#eef3f5', shirtShade: '#c3ced4', pants: '#2b3448', shoes: '#ffffff', sole: '#9aa3ad', backpack: '#d9572b', hat: 'vueltiao' },
  abuelo: { skin: '#9c6440', hair: '#e8e4dc', hairStyle: 'short', shirt: '#f4efe0', guayabera: true, pants: '#6b5a40', shoes: '#4a2e18', hat: 'vueltiao', mustache: '#f2f2f2' },
  pescador: { skin: '#7a4a2c', hair: '#1a1a1a', hairStyle: 'short', shirt: '#2f8fb0', pants: '#e8dcc0', shoes: '#5a3a1a', hat: 'straw', net: true },
  vendedora: { skin: '#8a5636', hair: '#1a1210', hairStyle: 'bun', dress: '#e8613a', dressShade: '#b8431f', shirt: '#f6c945', headscarf: '#f6c945', shoes: '#5a3a1a', skirtStripe: '#f6c945' },
  anciano: { skin: '#6e4128', hair: '#d8d8d8', hairStyle: 'bald', shirt: '#f0e6c8', pants: '#3d3426', shoes: '#2a1a0e', beard: '#e6e6e6', cane: true },
  tomasita: { skin: '#a86b45', hair: '#1a1210', hairStyle: 'braids', ribbon: '#e8313a', dress: '#fdf6e3', dressShade: '#d8cdb0', shirt: '#fdf6e3', shoes: '#5a3a1a', flower: '#e8313a' },
  juanita: { skin: '#8a5636', hair: '#2a1a10', hairStyle: 'long', dress: '#1fb5b0', dressShade: '#0e7c86', shirt: '#1fb5b0', shoes: '#5a3a1a' },
  carmen: { skin: '#7a4a30', hair: '#d8d8d8', hairStyle: 'bun', dress: '#a98ad8', dressShade: '#7a5cc4', shirt: '#fdf6e3', shoes: '#5a3a1a', skirtStripe: '#e8313a', flower: '#e8313a' },
  mujer: { skin: '#9a5e3a', hair: '#1a1210', hairStyle: 'bun', dress: '#7a5cc4', dressShade: '#57409a', shirt: '#fdf6e3', shoes: '#5a3a1a' },
  nino: { skin: '#a86b45', hair: '#1a1210', hairStyle: 'short', shirt: '#f6c945', pants: '#1f6f9a', shoes: '#5a3a1a' },
  tamborero: { skin: '#6e4128', hair: '#1a1a1a', hairStyle: 'short', shirt: '#fdf6e3', pants: '#fdf6e3', shoes: '#3a2414', hat: 'vueltiao', drum: true },
  bailadora1: { skin: '#8a5636', hair: '#1a1210', hairStyle: 'bun', dress: '#e8313a', dressShade: '#a81f28', shirt: '#fdf6e3', skirtStripe: '#f6c945', shoes: '#5a3a1a', flower: '#f6c945' },
  bailadora2: { skin: '#a86b45', hair: '#1a1210', hairStyle: 'bun', dress: '#f6c945', dressShade: '#c99a1f', shirt: '#fdf6e3', skirtStripe: '#1fb5b0', shoes: '#5a3a1a', flower: '#e8313a' },
  bailadora3: { skin: '#7a4a2c', hair: '#1a1210', hairStyle: 'long', dress: '#1fb5b0', dressShade: '#0e7c86', shirt: '#fdf6e3', skirtStripe: '#e8613a', shoes: '#5a3a1a', flower: '#fdf6e3' },
  bailador: { skin: '#7a4a2c', hair: '#1a1a1a', hairStyle: 'short', shirt: '#fdf6e3', pants: '#fdf6e3', shoes: '#2a1a0e', hat: 'vueltiao', scarf: '#e8313a' },
  verseador: { skin: '#7a4a2c', hair: '#1a1a1a', hairStyle: 'short', shirt: '#e8613a', pants: '#fdf6e3', shoes: '#3a2414', hat: 'straw', scarf: '#f6c945', mustache: '#1a1a1a' },
  raspao: { skin: '#7a4a2c', hair: '#1a1a1a', hairStyle: 'short', shirt: '#fdf6e3', shirtShade: '#d8d0bc', pants: '#2b3448', shoes: '#3a2414', hat: 'straw', scarf: '#1fb5b0', mustache: '#1a1a1a' },
  portador: { skin: '#9a5e3a', hair: '#1a1a1a', hairStyle: 'short', shirt: '#3f9b3a', pants: '#e8dcc0', shoes: '#3a2414', scarf: '#f6c945' }
};

/* ---------- utilidades de dibujo vectorial ---------- */
const INK = '#26170f';
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Dibuja un personaje ilustrado (vista 3/4 top-down) con formas suaves,
 * sombreado y contorno. (x, y) es la posición de los pies; p es la escala
 * (1 unidad = p píxeles; el personaje mide unas 24 unidades de alto).
 */
/** Boca, lágrimas y gotas de sudor según la emoción (vista de frente). */
function drawMoodMouth(ctx, hy, mood, L) {
  const my = hy + 3;
  ctx.save();
  ctx.lineWidth = 0.42; ctx.strokeStyle = '#5a2a1a'; ctx.fillStyle = '#6a1e1e';
  ctx.beginPath();
  if (mood === 'happy') {          // sonrisa abierta
    ctx.moveTo(-1.5, my - 0.3); ctx.quadraticCurveTo(0, my + 2.2, 1.5, my - 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8a8a'; ctx.beginPath(); ctx.ellipse(0, my + 0.9, 0.7, 0.35, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'surprised') {
    ctx.ellipse(0, my + 0.4, 0.7, 0.95, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (mood === 'scared') {   // boca temblorosa
    ctx.ellipse(0, my + 0.5, 1.3, 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(-1, my - 0.1, 2, 0.4);
  } else if (mood === 'sad') {
    ctx.moveTo(-1.1, my + 0.7); ctx.quadraticCurveTo(0, my - 0.4, 1.1, my + 0.7); ctx.stroke();
  } else if (mood === 'worried') {
    ctx.moveTo(-1.1, my + 0.4); ctx.quadraticCurveTo(-0.5, my - 0.1, 0, my + 0.3); ctx.quadraticCurveTo(0.5, my + 0.6, 1.1, my + 0.1); ctx.stroke();
  } else if (mood === 'angry') {
    ctx.moveTo(-1, my + 0.5); ctx.lineTo(1, my + 0.5); ctx.stroke();
  }
  // lágrima (tristeza) y gota de sudor (miedo / preocupación)
  if (mood === 'sad') {
    ctx.fillStyle = 'rgba(140,210,255,0.9)'; ctx.beginPath();
    ctx.moveTo(-1.9, hy + 1.6); ctx.quadraticCurveTo(-2.6, hy + 3, -1.9, hy + 3.3); ctx.quadraticCurveTo(-1.2, hy + 3, -1.9, hy + 1.6); ctx.fill();
  }
  if (mood === 'scared' || mood === 'worried') {
    ctx.fillStyle = 'rgba(170,225,255,0.95)'; ctx.strokeStyle = 'rgba(60,120,170,0.8)'; ctx.lineWidth = 0.25; ctx.beginPath();
    ctx.moveTo(6.3, hy - 3.6); ctx.quadraticCurveTo(5.1, hy - 1.5, 6.3, hy - 1.1); ctx.quadraticCurveTo(7.5, hy - 1.5, 6.3, hy - 3.6); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/**
 * mood (opcional): 'happy' | 'sad' | 'surprised' | 'scared' | 'worried' | 'angry'.
 * Cambia ojos, cejas y boca; se usa sobre todo en los retratos de diálogo.
 */
function drawHumanoid(ctx, x, y, L, dir, t, moving, p = 2, mood = null) {
  const now = performance.now() / 1000;
  const seed = ((x * 0.137) % 5 + 5) % 5;
  const ph = moving ? Math.sin(t * 11) : 0;
  const bob = moving ? -Math.abs(Math.sin(t * 11)) * 0.7 : Math.sin(now * 2.2 + seed) * 0.18;
  const side = dir === 'left' || dir === 'right', up = dir === 'up';
  const skinS = shade(L.skin, -0.2);
  const top = L.shirt || L.dress;
  const pants = L.pants || L.skin;
  const H = L.hair;

  // sombra suave en el suelo
  const sg = ctx.createRadialGradient(x, y, 0, x, y, 7 * p);
  sg.addColorStop(0, 'rgba(0,0,0,0.38)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(x, y - 0.3 * p, 7 * p, 2.5 * p, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir === 'left' ? -p : p, p);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.55;
  const fs = fill => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const grad = (c, x0 = -4, x1 = 4) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, shade(c, 0.16)); g.addColorStop(0.5, c); g.addColorStop(1, shade(c, -0.24));
    return g;
  };

  /* --- piernas --- */
  const legCol = L.dress ? L.skin : pants;
  const leg = (hx, ang, lift, dark) => {
    ctx.save(); ctx.translate(hx, -7.2); ctx.rotate(ang);
    const len = 6.3 - lift;
    ctx.beginPath(); rrect(ctx, -1.3, 0, 2.6, len, 1.1); fs(dark ? shade(legCol, -0.22) : legCol);
    ctx.beginPath(); ctx.ellipse(side ? 0.7 : 0, len + 0.1, side ? 2.1 : 1.6, 1.15, 0, 0, Math.PI * 2);
    fs(dark ? shade(L.shoes, -0.2) : L.shoes);
    if (L.sole) { ctx.fillStyle = L.sole; ctx.fillRect(side ? -1.3 : -1.4, len + 0.55, side ? 4 : 2.8, 0.55); }
    ctx.restore();
  };
  if (side) { leg(0, -ph * 0.45, 0, true); leg(0, ph * 0.45, 0, false); }
  else { leg(-1.6, 0, Math.max(0, ph) * 1.2, false); leg(1.6, 0, Math.max(0, -ph) * 1.2, false); }

  ctx.translate(0, bob);
  const sleeve = top;

  /* --- brazos (función) --- */
  const arm = (sx, ang, back) => {
    ctx.save(); ctx.translate(sx, -12.3); ctx.rotate(ang);
    ctx.beginPath(); rrect(ctx, -1.1, -0.4, 2.2, 4.6, 1.1); fs(back ? shade(sleeve, -0.2) : grad(sleeve, -1.1, 1.1));
    ctx.beginPath(); ctx.arc(0, 4.9, 1.15, 0, Math.PI * 2); fs(back ? skinS : L.skin);
    ctx.restore();
  };
  const hit = L.drum && moving ? (Math.sin(t * 14) > 0 ? 0.35 : 0) : 0;
  const armA = L.drum ? 0.5 - hit : 0.12 + ph * 0.25;
  const armB = L.drum ? -0.5 + hit : -0.12 + ph * 0.25;

  // mochila de lado (detrás) y brazo trasero
  if (L.backpack && side) { ctx.beginPath(); rrect(ctx, -5.8, -12.8, 3.2, 6.2, 1.3); fs(grad(L.backpack, -5.8, -2.6)); }
  if (side) arm(0.3, -ph * 0.55, true);

  /* --- torso / vestido --- */
  const tw = side ? 3 : 4;
  if (L.dress) {
    const sw = moving ? ph * 0.6 : 0;
    const fl = side ? 4.6 : 5.8;
    ctx.beginPath();
    ctx.moveTo(-tw + 0.3, -8.4); ctx.lineTo(tw - 0.3, -8.4);
    ctx.quadraticCurveTo(fl - 0.6, -5.4, fl + sw, -2.3);
    ctx.quadraticCurveTo(sw, -1.3, -fl + sw, -2.3);
    ctx.quadraticCurveTo(-fl + 0.6, -5.4, -tw + 0.3, -8.4);
    ctx.closePath(); fs(grad(L.dress, -fl, fl));
    if (L.skirtStripe) {
      ctx.save(); ctx.strokeStyle = L.skirtStripe; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-fl + 0.9 + sw, -3.4); ctx.quadraticCurveTo(sw, -2.4, fl - 0.9 + sw, -3.4); ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = L.dressShade || shade(L.dress, -0.25); ctx.lineWidth = 0.4;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 1.3, -7.6); ctx.lineTo(k * 2.2 + sw, -2.6); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); rrect(ctx, -tw + 0.2, -13.2, (tw - 0.2) * 2, 5.4, 2.2); fs(grad(top, -tw, tw));
  } else {
    ctx.beginPath(); rrect(ctx, -tw, -13.2, tw * 2, 7, 2.5); fs(grad(top, -tw, tw));
    ctx.fillStyle = L.shirtShade || shade(top, -0.22);
    ctx.beginPath(); rrect(ctx, -tw + 0.3, -7.3, tw * 2 - 0.6, 0.9, 0.4); ctx.fill();
    if (L.guayabera && !up) {
      ctx.save(); ctx.strokeStyle = shade(top, -0.25); ctx.lineWidth = 0.35;
      (side ? [1.4] : [-1.7, 1.7]).forEach(px => { ctx.beginPath(); ctx.moveTo(px, -12.4); ctx.lineTo(px, -7.8); ctx.stroke(); });
      if (!side) { ctx.strokeRect(-3.2, -11, 1.4, 1.3); ctx.strokeRect(1.8, -11, 1.4, 1.3); }
      ctx.restore();
    }
  }
  if (L.scarf) {
    ctx.beginPath();
    if (side) { ctx.moveTo(-1.6, -13.2); ctx.lineTo(2.4, -13.2); ctx.lineTo(1.4, -11); }
    else { ctx.moveTo(-2.7, -13.3); ctx.lineTo(2.7, -13.3); ctx.lineTo(0, -10.4); }
    ctx.closePath(); fs(L.scarf);
  }

  /* --- mochila --- */
  if (L.backpack) {
    const bs = shade(L.backpack, -0.32);
    if (up) {
      ctx.beginPath(); rrect(ctx, -3.6, -12.8, 7.2, 6.6, 1.8); fs(grad(L.backpack, -3.6, 3.6));
      ctx.beginPath(); rrect(ctx, -3.6, -12.8, 7.2, 2.4, 1.2); fs(shade(L.backpack, 0.12));
      ctx.beginPath(); rrect(ctx, -2, -9.4, 4, 2.4, 0.8); fs(bs);
    } else if (!side) {
      ctx.save(); ctx.strokeStyle = bs; ctx.lineWidth = 0.85;
      ctx.beginPath(); ctx.moveTo(-2.3, -13); ctx.lineTo(-2.7, -7.6); ctx.moveTo(2.3, -13); ctx.lineTo(2.7, -7.6); ctx.stroke();
      ctx.restore();
    }
  }

  /* --- tambor alegre --- */
  if (L.drum && !up) {
    const dw = side ? 3.2 : 3.8, dx = side ? 2.4 : 0;
    ctx.beginPath(); rrect(ctx, dx - dw, -9.8, dw * 2, 6.6, 1); fs(grad('#8a5a2b', dx - dw, dx + dw));
    ctx.save(); ctx.strokeStyle = '#efe3c2'; ctx.lineWidth = 0.35; ctx.beginPath();
    for (let k = 0; k < 5; k++) { const xx = dx - dw + 0.6 + k * (dw * 2 - 1.2) / 4; ctx.moveTo(xx, -9.4); ctx.lineTo(xx + (k % 2 ? -0.8 : 0.8), -3.8); }
    ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.ellipse(dx, -9.8, dw, 1.4, 0, 0, Math.PI * 2); fs('#efe3c2');
  }

  /* --- brazos --- */
  if (side) arm(0.3, L.drum ? -0.7 + hit : ph * 0.55, false);
  else { arm(-4.1, armA, false); arm(4.1, armB, false); }

  /* --- cuello y cabeza --- */
  const hx = side ? 0.4 : 0, hy = -17.6, rx = side ? 4.7 : 4.9, ry = 4.6;
  ctx.fillStyle = skinS; ctx.beginPath(); rrect(ctx, hx - 1.2, -14.4, 2.4, 1.8, 0.6); ctx.fill();

  // pelo trasero (detrás de la cabeza)
  const backHair = () => {
    const st = L.hairStyle;
    if (st === 'bald') return;
    ctx.beginPath();
    if (st === 'long') {
      if (side) { ctx.ellipse(hx - 0.6, hy - 0.6, 5.3, 5, 0, 0, Math.PI * 2); rrect(ctx, hx - 5.6, hy - 1, 6, 9.6, 3); }
      else { ctx.ellipse(hx, hy - 0.6, 5.5, 5.1, 0, 0, Math.PI * 2); rrect(ctx, hx - 5.5, hy - 1, 11, 9.6, 3.2); }
    } else {
      ctx.ellipse(side ? hx - 0.5 : hx, hy - 0.9, 5.3, 4.95, 0, 0, Math.PI * 2);
    }
    fs(H);
    if (st === 'bun') {
      ctx.beginPath();
      if (side) ctx.arc(hx - 4, hy - 3.2, 2.1, 0, Math.PI * 2); else ctx.arc(hx, hy - 5.3, 2.2, 0, Math.PI * 2);
      fs(H);
    }
    if (st === 'braids' && !up) {
      const braid = bx => {
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(bx, hy + 1.4 + k * 1.8, 1.05, 1.15, 0, 0, Math.PI * 2); fs(k % 2 ? shade(H, 0.1) : H); }
        ctx.beginPath(); ctx.ellipse(bx - 0.9, hy + 8.2, 1, 0.6, -0.5, 0, Math.PI * 2); ctx.ellipse(bx + 0.9, hy + 8.2, 1, 0.6, 0.5, 0, Math.PI * 2); fs(L.ribbon);
      };
      if (side) braid(hx - 3.8); else { braid(-4.6); braid(4.6); }
    }
  };
  backHair();

  // orejas y nariz (detrás del contorno de la cabeza)
  if (!side) { [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(s * 4.85, hy + 0.7, 0.95, 1.3, 0, 0, Math.PI * 2); fs(L.skin); }); }
  else if (!up) { ctx.beginPath(); ctx.ellipse(hx + 4.6, hy + 1.3, 0.95, 0.85, 0, 0, Math.PI * 2); fs(L.skin); }

  const headPath = () => { ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2); };
  const hg = ctx.createRadialGradient(hx - 1.6, hy - 1.8, 0.5, hx, hy, 6);
  hg.addColorStop(0, shade(L.skin, 0.14)); hg.addColorStop(1, shade(L.skin, -0.12));
  headPath(); fs(hg);
  if (side) { ctx.beginPath(); ctx.ellipse(hx - 0.7, hy + 0.7, 0.9, 1.25, 0, 0, Math.PI * 2); fs(L.skin); }

  /* --- rostro --- */
  let faceMood = false;
  const blink = ((now + seed) % 4.2) < 0.13 && mood !== 'surprised' && mood !== 'scared';
  const wide = mood === 'surprised' || mood === 'scared';
  const eye = (ex, ey, w) => {
    if (mood === 'happy') {   // ojos cerrados de alegría (^ ^)
      ctx.save(); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(ex - w, ey + 0.4); ctx.quadraticCurveTo(ex, ey - 1.1, ex + w, ey + 0.4); ctx.stroke(); ctx.restore(); return;
    }
    if (wide) {
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(ex, ey - 0.1, w * 1.08, 1.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.lineWidth = 0.3; ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#2b1a12'; ctx.beginPath(); ctx.arc(ex + (side ? 0.25 : 0), ey, mood === 'scared' ? 0.5 : 0.68, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 0.15 + (side ? 0.25 : 0), ey - 0.25, 0.2, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (blink) { ctx.save(); ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(ex - w, ey + 0.2); ctx.lineTo(ex + w, ey + 0.2); ctx.stroke(); ctx.restore(); return; }
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(ex, ey, w, 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b1a12'; ctx.beginPath(); ctx.ellipse(ex + (side ? 0.25 : 0), ey + 0.15, w * 0.74, 1.0, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 0.22 + (side ? 0.25 : 0), ey - 0.3, 0.32, 0, Math.PI * 2); ctx.fill();
  };
  if (!up) {
    const ex = side ? [hx + 2.5] : [-1.75, 1.75];
    ex.forEach(px => eye(px, hy + 0.6, side ? 0.8 : 1.05));
    ctx.save(); ctx.strokeStyle = shade(H === '#e8e4dc' || H === '#d8d8d8' ? '#9a9a9a' : H, 0); ctx.lineWidth = 0.42;
    // cejas: el extremo interior sube (tristeza/preocupación) o baja (enojo)
    const bUp = wide ? -0.75 : 0, bIn = mood === 'sad' || mood === 'worried' || mood === 'scared' ? -0.7 : mood === 'angry' ? 0.6 : 0;
    if (mood && mood !== 'happy') ctx.lineWidth = 0.5;
    ex.forEach(px => {
      const sg = side ? 1 : (px < 0 ? 1 : -1);          // hacia el centro de la cara
      const ox = px - sg * 0.9, ix = px + sg * 0.9;
      ctx.beginPath(); ctx.moveTo(ox, hy - 1.05 + bUp + (bIn < 0 ? 0.15 : 0)); ctx.quadraticCurveTo(px, hy - 1.5 + bUp + bIn * 0.5, ix, hy - 1.1 + bUp + bIn); ctx.stroke();
    });
    ctx.restore();
    ctx.fillStyle = 'rgba(255,105,105,0.28)';
    (side ? [hx + 2.8] : [-3, 3]).forEach(px => { ctx.beginPath(); ctx.ellipse(px, hy + 2.3, 1.05, 0.7, 0, 0, Math.PI * 2); ctx.fill(); });
    if (mood && mood !== 'neutral' && !side) {
      faceMood = true;   // la boca se dibuja después (encima de barba y bigote)
    } else if (!L.beard) {
      ctx.save(); ctx.lineWidth = 0.42; ctx.strokeStyle = '#5a2a1a'; ctx.beginPath();
      if (side) { ctx.moveTo(hx + 3.2, hy + 3.05); ctx.quadraticCurveTo(hx + 3.7, hy + 3.35, hx + 4.1, hy + 2.9); }
      else { ctx.moveTo(-0.85, hy + 2.85); ctx.quadraticCurveTo(0, hy + 3.55, 0.85, hy + 2.85); }
      ctx.stroke(); ctx.restore();
    }
    if (!side) { ctx.fillStyle = skinS; ctx.beginPath(); ctx.ellipse(0, hy + 1.9, 0.5, 0.35, 0, 0, Math.PI * 2); ctx.fill(); }
    if (L.mustache) {
      ctx.beginPath();
      if (side) ctx.ellipse(hx + 3.6, hy + 2.4, 1.1, 0.5, 0, 0, Math.PI * 2);
      else { ctx.moveTo(-2, hy + 2.6); ctx.quadraticCurveTo(0, hy + 1.6, 2, hy + 2.6); ctx.quadraticCurveTo(0, hy + 3.1, -2, hy + 2.6); }
      ctx.fillStyle = L.mustache; ctx.fill();
    }
    if (L.beard) {
      ctx.beginPath();
      if (side) ctx.ellipse(hx + 2.2, hy + 3.3, 2.4, 1.7, 0.2, 0, Math.PI * 2); else ctx.ellipse(0, hy + 3.5, 3.4, 2.1, 0, 0, Math.PI * 2);
      fs(L.beard);
    }
    if (faceMood) drawMoodMouth(ctx, hy, mood, L);
  }

  /* --- pelo frontal (recortado dentro de la cabeza) --- */
  const st = L.hairStyle;
  ctx.save();
  headPath(); ctx.clip();
  ctx.fillStyle = H;
  if (up) {
    if (st === 'bald') { ctx.beginPath(); ctx.rect(hx - 6, hy - 0.5, 12, 6); ctx.fill(); ctx.fillStyle = L.skin; ctx.beginPath(); ctx.ellipse(hx, hy - 1.4, 3.6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.rect(hx - 6, hy - 6, 12, 12); ctx.fill(); }
  } else if (st !== 'bald') {
    ctx.beginPath();
    if (side) {
      ctx.moveTo(hx - 6, hy + 4); ctx.lineTo(hx - 6, hy - 6); ctx.lineTo(hx + 6, hy - 6); ctx.lineTo(hx + 6, hy - 1.6);
      ctx.quadraticCurveTo(hx + 3.2, hy - 2.6, hx + 1.4, hy - 1.1); ctx.lineTo(hx + 0.2, hy + (st === 'long' ? 4 : 2.2)); ctx.closePath();
    } else {
      const deep = st === 'long' || st === 'braids' ? 0.4 : 0;
      ctx.moveTo(-6, hy - 6); ctx.lineTo(6, hy - 6); ctx.lineTo(6, hy + 2.5);
      ctx.lineTo(4.1, hy + 2.5 + deep * 4); ctx.quadraticCurveTo(4, hy - 1.2, 2.6, hy - 1.7);
      ctx.quadraticCurveTo(1.4, hy - 0.9, 0.4, hy - 2.2); ctx.quadraticCurveTo(-1.2, hy - 1, -2.6, hy - 1.8);
      ctx.quadraticCurveTo(-4, hy - 1.2, -4.1, hy + 2.5 + deep * 4); ctx.lineTo(-6, hy + 2.5); ctx.closePath();
    }
    ctx.fill();
  } else {
    // calvo: canas a los lados
    ctx.beginPath();
    if (side) ctx.ellipse(hx - 3.4, hy + 0.3, 1.8, 2.3, 0, 0, Math.PI * 2);
    else { ctx.ellipse(-4.4, hy + 0.2, 1.4, 2.2, 0, 0, Math.PI * 2); ctx.ellipse(4.4, hy + 0.2, 1.4, 2.2, 0, 0, Math.PI * 2); }
    ctx.fill();
  }
  if (L.headscarf) {
    ctx.fillStyle = L.headscarf; ctx.beginPath(); ctx.rect(hx - 6, hy - 6, 12, 4.4); ctx.fill();
    ctx.fillStyle = shade(L.headscarf, 0.25); ctx.fillRect(hx - 6, hy - 2.2, 12, 0.6);
  }
  // brillo del pelo
  if (st !== 'bald' && !L.headscarf) {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(hx - 0.5, hy - 1, 3.6, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
  }
  ctx.restore();
  headPath(); ctx.stroke();
  if (up && st === 'braids') {
    [-2, 2].forEach(bx => {
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(bx, hy + 3 + k * 1.7, 1.05, 1.1, 0, 0, Math.PI * 2); fs(k % 2 ? shade(H, 0.1) : H); }
      ctx.beginPath(); ctx.ellipse(bx, hy + 9.6, 1.1, 0.6, 0, 0, Math.PI * 2); fs(L.ribbon);
    });
  }
  if (up && st === 'bun') { ctx.beginPath(); ctx.arc(hx, hy - 1.6, 2.2, 0, Math.PI * 2); fs(shade(H, 0.08)); }
  if (L.headscarf && !side) { ctx.beginPath(); ctx.ellipse(hx + 4.2, hy - 3, 1.3, 0.9, 0.5, 0, Math.PI * 2); fs(L.headscarf); }

  /* --- sombreros --- */
  if (L.hat === 'vueltiao' || L.hat === 'straw') {
    const v = L.hat === 'vueltiao';
    const c1 = v ? '#f2e8cc' : '#d9b45a', c2 = v ? '#2a2a2a' : '#8a5a2b';
    ctx.beginPath(); ctx.ellipse(hx, hy - 3.2, v ? 7.6 : 6.9, 2.3, 0, 0, Math.PI * 2); fs(grad(c1, hx - 7, hx + 7));
    if (v) {
      ctx.save(); ctx.strokeStyle = c2; ctx.lineWidth = 0.5; ctx.setLineDash([0.9, 0.7]);
      ctx.beginPath(); ctx.ellipse(hx, hy - 3.2, 6.2, 1.8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.beginPath(); ctx.ellipse(hx, hy - 3.2, 4.9, 1.35, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(hx - 3.6, hy - 3.6);
    ctx.bezierCurveTo(hx - 3.6, hy - 8.4, hx + 3.6, hy - 8.4, hx + 3.6, hy - 3.6);
    ctx.quadraticCurveTo(hx, hy - 2.6, hx - 3.6, hy - 3.6); fs(grad(c1, hx - 3.6, hx + 3.6));
    ctx.save(); ctx.clip();
    ctx.fillStyle = c2;
    if (v) { ctx.fillRect(hx - 4, hy - 4.9, 8, 0.7); ctx.fillRect(hx - 4, hy - 6.4, 8, 0.6); }
    else ctx.fillRect(hx - 4, hy - 4.7, 8, 1.1);
    ctx.restore();
  }
  if (L.flower) {
    const fx = side ? hx - 1.2 : up ? 3.1 : 3.4, fy = hy - (L.hat ? 6 : 3.4);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 0.9, fy + Math.sin(a) * 0.9, 0.85, 0, Math.PI * 2); ctx.fillStyle = L.flower; ctx.fill(); }
    ctx.fillStyle = '#f6c945'; ctx.beginPath(); ctx.arc(fx, fy, 0.5, 0, Math.PI * 2); ctx.fill();
  }

  /* --- accesorios --- */
  if (L.cane) {
    const cx = side ? 3.2 : 5;
    ctx.save(); ctx.strokeStyle = '#6b3d1a'; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(cx, -7.4); ctx.lineTo(cx + 0.6, -0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 0.8, -7.4, 0.8, Math.PI, 0); ctx.stroke(); ctx.restore();
  }
  if (L.net && !up) {
    const nx = side ? 2.2 : 4.2;
    ctx.beginPath(); rrect(ctx, nx, -8.2, 3.6, 5.8, 1); fs('rgba(214,204,166,0.85)');
    ctx.save(); ctx.strokeStyle = 'rgba(120,108,80,0.9)'; ctx.lineWidth = 0.25; ctx.beginPath();
    for (let k = 1; k < 4; k++) { ctx.moveTo(nx + k * 0.9, -8); ctx.lineTo(nx + k * 0.9, -2.6); }
    for (let k = 1; k < 6; k++) { ctx.moveTo(nx + 0.2, -8.2 + k * 0.95); ctx.lineTo(nx + 3.4, -8.2 + k * 0.95); }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#e8613a'; ctx.beginPath(); ctx.arc(nx + 1.8, -2.4, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* =========================================================
   CAIMÁN — cuerpo segmentado con cola ondulante
   ========================================================= */
const CAIMAN_PROFILE = [[0, 3], [0.08, 5.5], [0.17, 8.5], [0.25, 8], [0.34, 12], [0.45, 14], [0.56, 12.5], [0.64, 8.5], [0.8, 4.5], [1, 1.2]];
function caimanWidth(u) {
  for (let i = 1; i < CAIMAN_PROFILE.length; i++) {
    const [u1, w1] = CAIMAN_PROFILE[i];
    if (u <= u1) {
      const [u0, w0] = CAIMAN_PROFILE[i - 1];
      return w0 + (w1 - w0) * ((u - u0) / (u1 - u0));
    }
  }
  return 1;
}

/**
 * Dibuja el caimán visto desde arriba. +x local = hacia la cabeza.
 * opts: submerged (0..1), scale, wood (figura de madera), amp, swaySpeed
 */
function drawCaiman(ctx, x, y, angle, t, o = {}) {
  const sub = o.submerged || 0, sc = o.scale || 1;
  const col = o.wood
    ? { body: '#9a6534', dark: '#5e3b1a', light: '#c48a4f', belly: '#b07a43', eye: '#2a1a0e', pupil: '#2a1a0e' }
    : o.festive
      ? { body: '#2f9b4a', dark: '#1b5e2c', light: '#f6c945', belly: '#e8613a', eye: '#fdf6e3', pupil: '#1a1a1a' }
      : { body: '#4b6b2f', dark: '#2a3f18', light: '#7d9a45', belly: '#9aa85a', eye: '#f6c945', pupil: '#111' };
  const amp = o.amp !== undefined ? o.amp : 7;
  const sway = o.swaySpeed !== undefined ? o.swaySpeed : 4;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(sc, sc);

  const N = 18, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push({ x: 48 - u * 124, y: Math.sin(t * sway - u * 4.2) * amp * Math.pow(u, 1.6), w: caimanWidth(u), u });
  }
  const normal = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    return { x: -dy / l, y: dx / l };
  };
  const at = u => {
    const f = u * N, i = Math.min(N - 1, Math.floor(f)), k = f - i;
    return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
  };

  const bodyAlpha = 1 - sub * 0.82;

  // sombra
  if (sub < 0.5) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(-12, 6, 66, 14, 0, 0, Math.PI * 2); ctx.fill();
  }

  // patas
  if (sub < 0.6) {
    ctx.globalAlpha = bodyAlpha;
    [[0.33, 0], [0.58, Math.PI]].forEach(([u, phase]) => {
      const p = at(u);
      [-1, 1].forEach(s => {
        const sw = Math.sin(t * sway * 1.4 + phase + (s > 0 ? Math.PI : 0)) * 0.55;
        const a = s * (Math.PI / 2) + (u < 0.5 ? -0.5 * s : 0.5 * s) + sw;
        const bx = p.x, by = p.y + s * caimanWidth(u) * 0.7;
        const fx = bx + Math.cos(a) * 15 * (u < 0.5 ? 0.6 : -0.6) + (u < 0.5 ? 6 : -6);
        const fy = by + Math.sin(a) * 6 + s * 9;
        ctx.lineCap = 'round';
        ctx.strokeStyle = col.dark; ctx.lineWidth = 6.4;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.strokeStyle = col.body; ctx.lineWidth = 4.6;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = col.dark;
        for (let c = -1; c <= 1; c++) { ctx.beginPath(); ctx.arc(fx + (u < 0.5 ? 3 : -3) + c * 0.5, fy + c * 2.5, 1.6, 0, Math.PI * 2); ctx.fill(); }
      });
    });
  }

  // cuerpo
  ctx.globalAlpha = bodyAlpha;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const n = normal(i); const P = pts[i]; const X = P.x + n.x * P.w, Y = P.y + n.y * P.w; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
  for (let i = N; i >= 0; i--) { const n = normal(i); const P = pts[i]; ctx.lineTo(P.x - n.x * P.w, P.y - n.y * P.w); }
  ctx.closePath();
  ctx.fillStyle = col.body; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = col.dark; ctx.lineJoin = 'round'; ctx.stroke();
  // volumen: franja oscura en los flancos y lomo iluminado
  ctx.save(); ctx.clip();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const spine = (w, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
    for (let i = 0; i <= N; i++) { const P = pts[i]; i ? ctx.lineTo(P.x, P.y) : ctx.moveTo(P.x, P.y); }
    ctx.stroke();
  };
  [-1, 1].forEach(sd => {
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 5; ctx.beginPath();
    for (let i = 0; i <= N; i++) { const n = normal(i), P = pts[i]; const X = P.x + n.x * P.w * sd, Y = P.y + n.y * P.w * sd; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
  });
  spine(9, shade(col.body, 0.12) + '88');
  spine(3.5, shade(col.light, 0.1) + '66');
  ctx.restore();

  // franja clara lateral
  ctx.strokeStyle = col.belly; ctx.lineWidth = 1.5;
  [-1, 1].forEach(s => {
    ctx.beginPath();
    for (let i = 3; i <= 13; i++) { const n = normal(i); const P = pts[i]; const X = P.x + n.x * P.w * 0.82 * s, Y = P.y + n.y * P.w * 0.82 * s; i === 3 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.stroke();
  });

  // escamas dorsales
  for (let i = 5; i < N; i++) {
    const P = pts[i], n = normal(i);
    if (i < 12) {
      [-0.35, 0.35].forEach(k => {
        const X = P.x + n.x * P.w * k, Y = P.y + n.y * P.w * k;
        ctx.fillStyle = col.dark; ctx.beginPath(); ctx.ellipse(X, Y, 2.6, 2.1, Math.atan2(n.x, -n.y), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col.light; ctx.beginPath(); ctx.ellipse(X - 0.4, Y - 0.5, 1.2, 0.8, 0, 0, Math.PI * 2); ctx.fill();
      });
    } else {
      ctx.fillStyle = col.dark;
      ctx.beginPath(); ctx.moveTo(P.x + 3.2, P.y); ctx.quadraticCurveTo(P.x - 1, P.y - 3.2, P.x - 3, P.y); ctx.quadraticCurveTo(P.x - 1, P.y + 3.2, P.x + 3.2, P.y); ctx.fill();
    }
  }
  // hocico y dientes
  const snout = pts[0];
  ctx.fillStyle = col.dark;
  ctx.fillRect(snout.x - 4, snout.y - 2.5, 2, 1.5); ctx.fillRect(snout.x - 4, snout.y + 1, 2, 1.5);
  if (!o.wood) {
    ctx.fillStyle = '#f4efe0';
    for (let k = 0; k < 4; k++) {
      const P = at(0.03 + k * 0.03), w = caimanWidth(0.03 + k * 0.03);
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(P.x - 0.9, P.y + sd * (w - 0.4)); ctx.lineTo(P.x + 0.9, P.y + sd * (w - 0.4)); ctx.lineTo(P.x, P.y + sd * (w + 1.3)); ctx.fill(); });
    }
  }

  if (sub > 0) {
    ctx.globalAlpha = sub * 0.55;
    ctx.fillStyle = '#0d3b58';
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const n = normal(i); const P = pts[i]; i ? ctx.lineTo(P.x + n.x * P.w, P.y + n.y * P.w) : ctx.moveTo(P.x + n.x * P.w, P.y + n.y * P.w); }
    for (let i = N; i >= 0; i--) { const n = normal(i); const P = pts[i]; ctx.lineTo(P.x - n.x * P.w, P.y - n.y * P.w); }
    ctx.fill();
  }

  // ojos (siempre sobre el agua)
  ctx.globalAlpha = 1;
  const E = at(0.19);
  [-1, 1].forEach(s => {
    const ex = E.x, ey = E.y + s * 6.5;
    ctx.fillStyle = col.body; ctx.strokeStyle = col.dark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ex, ey, 3.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const eg = ctx.createRadialGradient(ex, ey, 0.3, ex + 0.5, ey, 2.5);
    eg.addColorStop(0, shade(col.eye, 0.35)); eg.addColorStop(1, col.eye);
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex + 0.5, ey, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.pupil; ctx.beginPath(); ctx.ellipse(ex + 0.6, ey, 0.7, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ex - 0.2, ey - 0.9, 0.6, 0, Math.PI * 2); ctx.fill();
  });
  // fosas nasales
  ctx.fillStyle = col.dark;
  ctx.beginPath(); ctx.arc(snout.x - 1, snout.y - 1.6, 1.3, 0, Math.PI * 2); ctx.arc(snout.x - 1, snout.y + 1.6, 1.3, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/* =========================================================
   RETRATOS para la caja de diálogo
   ========================================================= */
const PORTRAIT_BG = {
  abuelo: ['#f08a2c', '#5e3b1a'], mateo: ['#1fb5b0', '#0b3d5c'], pescador: ['#156b8a', '#0b2a40'],
  vendedora: ['#f6c945', '#b8431f'], anciano: ['#3f9b3a', '#1b3d1e'], tomasita: ['#f2d7c0', '#6e4a7a'],
  juanita: ['#1fb5b0', '#0b2a40'], narrador: ['#e8613a', '#2a1030'], mujer: ['#7a5cc4', '#2a1a40'],
  nino: ['#f6c945', '#7a4a10'], tamborero: ['#e8613a', '#3a1208'], bailadora: ['#e8313a', '#4a0a18'], portador: ['#3f9b3a', '#10301a'], verseador: ['#f6c945', '#7a2410'], carmen: ['#c4a8f0', '#3a2058'], raspao: ['#1fb5b0', '#0b3d5c']
};
const PORTRAIT_LOOK = { bailadora: 'bailadora1' };

function drawPortrait(canvas, who, mood = null) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / 96, 0, 0, canvas.width / 96, 0, 0);
  ctx.imageSmoothingEnabled = true;
  const [c1, c2] = PORTRAIT_BG[who] || ['#555', '#111'];
  const g = ctx.createRadialGradient(48, 40, 6, 48, 48, 70);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 96, 96);
  // patrón de fondo
  ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
  for (let i = 0; i < 96; i += 8) ctx.fillRect(i, (i * 3) % 96, 2, 2);
  ctx.globalAlpha = 1;
  if (who === 'narrador') {
    glow(ctx, 48, 52, 44, 'rgba(246,201,69,0.6)');
    drawCaiman(ctx, 50, 50, -0.5, 0, { wood: true, scale: 0.62, amp: 2 });
    return;
  }
  const look = LOOKS[PORTRAIT_LOOK[who] || who];
  if (look) drawHumanoid(ctx, 48, 146, look, 'down', 0, false, 5, mood);
}

/* =========================================================
   DECORADO — piezas reutilizables
   ========================================================= */
function drawPalmTrunk(ctx, x, y, h = 70, lean = 10) {
  const sg = ctx.createRadialGradient(x + 4, y, 0, x + 4, y, 16);
  sg.addColorStop(0, 'rgba(0,0,0,0.3)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x + 4, y, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  const P = k => ({ x: x + lean * k * k, y: y - h * k, w: 6.5 - k * 2.6 });
  // silueta del tronco
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) { const q = P(i / 12); i ? ctx.lineTo(q.x - q.w, q.y) : ctx.moveTo(q.x - q.w, q.y); }
  for (let i = 12; i >= 0; i--) { const q = P(i / 12); ctx.lineTo(q.x + q.w, q.y); }
  ctx.closePath();
  const g = ctx.createLinearGradient(x - 7, 0, x + 7 + lean, 0);
  g.addColorStop(0, '#b88a55'); g.addColorStop(0.45, '#9a6c3e'); g.addColorStop(1, '#6b4424');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#4a2e16'; ctx.lineWidth = 1.2; ctx.stroke();
  // anillos
  ctx.strokeStyle = 'rgba(74,46,22,0.55)'; ctx.lineWidth = 1;
  for (let k = 0.06; k < 0.98; k += 0.085) {
    const q = P(k);
    ctx.beginPath(); ctx.moveTo(q.x - q.w + 0.5, q.y); ctx.quadraticCurveTo(q.x, q.y + 2.4, q.x + q.w - 0.5, q.y); ctx.stroke();
  }
}

function drawPalmCrown(ctx, x, y, h = 70, lean = 10, seed = 1, dark = false) {
  const rnd = mulberry32(seed);
  const tx = x + lean, ty = y - h;
  const greens = dark ? ['#1f4a2a', '#2a5e34', '#173a20'] : ['#3f9b3a', '#5cc04a', '#2e7d32'];
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rnd() * 0.4;
    const len = 34 + rnd() * 14;
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.7 + 10;
    const cx = tx + Math.cos(a) * len * 0.5, cy = ty + Math.sin(a) * len * 0.35 - 8;
    ctx.strokeStyle = greens[i % 3]; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    ctx.strokeStyle = shade(greens[i % 3], -0.3); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    // foliolos
    ctx.strokeStyle = greens[(i + 1) % 3]; ctx.lineWidth = 2;
    for (let k = 0.3; k < 1; k += 0.14) {
      const qx = (1 - k) * (1 - k) * tx + 2 * (1 - k) * k * cx + k * k * ex;
      const qy = (1 - k) * (1 - k) * ty + 2 * (1 - k) * k * cy + k * k * ey;
      ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx + Math.cos(a + 1.2) * 7, qy + Math.sin(a + 1.2) * 7 + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx + Math.cos(a - 1.2) * 7, qy + Math.sin(a - 1.2) * 7 + 3); ctx.stroke();
    }
  }
  ctx.fillStyle = '#6b4a22';
  [[-4, 2], [3, 3], [0, -2]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(tx + dx, ty + dy, 4, 0, Math.PI * 2); ctx.fill(); });
}

function drawTreeCrown(ctx, x, y, r, seed, palette) {
  const rnd = mulberry32(seed);
  const cols = palette || ['#2e7d32', '#3f9b3a', '#5cc04a'];
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x + 6, y + r * 0.7, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * r * 0.6;
    ctx.fillStyle = cols[i % 2];
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r * (0.35 + rnd() * 0.25), 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = cols[2];
    ctx.beginPath(); ctx.arc(x - r * 0.3 + rnd() * r * 0.5, y - r * 0.4 + rnd() * r * 0.4, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTreeTrunk(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4424'; ctx.fillRect(x - 6, y - 40, 12, 40);
  ctx.fillStyle = '#4a2e16'; ctx.fillRect(x - 6, y - 40, 3, 40); ctx.fillRect(x + 2, y - 30, 2, 12);
}

/** Casa cienaguera vista en 3/4: techo de teja, fachada colorida. */
function drawHouse(ctx, x, y, w, h, wall, roof, rnd, opts = {}) {
  const roofH = Math.round(h * 0.52);
  const hs = ctx.createLinearGradient(0, y + h - 4, 0, y + h + 16);
  hs.addColorStop(0, 'rgba(0,0,0,0.32)'); hs.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hs; ctx.fillRect(x + 4, y + h - 4, w + 8, 20);
  // fachada
  const fg = ctx.createLinearGradient(x, 0, x + w, 0);
  fg.addColorStop(0, shade(wall, 0.1)); fg.addColorStop(1, shade(wall, -0.1));
  ctx.fillStyle = fg; ctx.fillRect(x, y + roofH, w, h - roofH);
  ctx.fillStyle = shade(wall, 0.18); ctx.fillRect(x, y + roofH, w, 3);
  ctx.fillStyle = shade(wall, -0.3); ctx.fillRect(x, y + h - 12, w, 12);
  speckle(ctx, x, y + roofH, w, h - roofH - 12, [shade(wall, -0.08), shade(wall, 0.08)], w / 3, rnd, 2);
  // techo de teja
  ctx.fillStyle = roof; ctx.fillRect(x - 8, y, w + 16, roofH + 6);
  ctx.fillStyle = shade(roof, 0.15); ctx.fillRect(x - 8, y, w + 16, Math.round(roofH * 0.45));
  ctx.save(); ctx.beginPath(); ctx.rect(x - 8, y, w + 16, roofH + 6); ctx.clip();
  for (let ry = y + 6, row = 0; ry < y + roofH + 10; ry += 7, row++) {
    const off = (row % 2) * 6;
    for (let rx = x - 14 + off; rx < x + w + 14; rx += 12) {
      const tg = ctx.createLinearGradient(0, ry - 7, 0, ry);
      tg.addColorStop(0, shade(roof, 0.12)); tg.addColorStop(1, shade(roof, -0.22));
      ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(rx + 6, ry - 3, 6.2, 4.4, 0, 0, Math.PI); ctx.lineTo(rx, ry - 7); ctx.lineTo(rx + 12, ry - 7); ctx.fill();
      ctx.strokeStyle = shade(roof, -0.35); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(rx + 6, ry - 3, 6.2, 4.4, 0, 0, Math.PI); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.fillStyle = shade(roof, 0.3); ctx.fillRect(x - 8, y + Math.round(roofH * 0.45), w + 16, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + roofH + 6, w, 4);
  // puerta
  const dw = 26, dh = Math.min(40, h - roofH - 8), dx = x + w / 2 - dw / 2, dy = y + h - dh;
  ctx.fillStyle = '#fdf6e3'; ctx.fillRect(dx - 3, dy - 3, dw + 6, dh + 3);
  ctx.fillStyle = opts.door || '#7a4a22'; ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = shade(opts.door || '#7a4a22', -0.3); ctx.fillRect(dx + dw / 2 - 1, dy, 2, dh);
  ctx.fillStyle = '#f6c945'; ctx.fillRect(dx + dw / 2 + 4, dy + dh / 2, 2, 2);
  // ventanas con postigos
  const winC = opts.shutter || '#1fb5b0';
  [x + 14, x + w - 40].forEach(wx => {
    if (wx + 26 > dx - 4 && wx < dx + dw + 4) return;
    const wy = y + roofH + 14;
    ctx.fillStyle = '#fdf6e3'; ctx.fillRect(wx - 2, wy - 2, 30, 24);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(wx, wy, 26, 20);
    const wg = ctx.createLinearGradient(wx, wy, wx + 26, wy + 20);
    if (opts.lit) { wg.addColorStop(0, '#fff1b8'); wg.addColorStop(1, '#f0a83a'); }
    else { wg.addColorStop(0, '#5a7a8a'); wg.addColorStop(1, '#2a3440'); }
    ctx.fillStyle = wg; ctx.fillRect(wx + 2, wy + 2, 22, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(wx + 4, wy + 16); ctx.lineTo(wx + 12, wy + 3); ctx.lineTo(wx + 16, wy + 3); ctx.lineTo(wx + 8, wy + 16); ctx.fill();
    ctx.fillStyle = winC; ctx.fillRect(wx - 8, wy, 7, 20); ctx.fillRect(wx + 27, wy, 7, 20);
    ctx.fillStyle = shade(winC, -0.3);
    for (let k = 3; k < 20; k += 4) { ctx.fillRect(wx - 8, wy + k, 7, 1); ctx.fillRect(wx + 27, wy + k, 7, 1); }
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(wx + 12, wy, 2, 20); ctx.fillRect(wx, wy + 9, 26, 2);
  });
  if (opts.plants) {
    [x + 4, x + w - 18].forEach(px => {
      ctx.fillStyle = '#b8431f'; ctx.fillRect(px, y + h - 10, 14, 10);
      ctx.fillStyle = '#3f9b3a'; ctx.beginPath(); ctx.arc(px + 7, y + h - 14, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8313a'; ctx.beginPath(); ctx.arc(px + 4.5, y + h - 16.5, 2, 0, Math.PI * 2); ctx.arc(px + 10.5, y + h - 13.5, 2, 0, Math.PI * 2); ctx.fill();
    });
  }
}

function drawBench(ctx, x, y, horizontal = true) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + 4, horizontal ? 54 : 18, horizontal ? 18 : 54);
  if (horizontal) {
    ctx.fillStyle = '#3a2414'; ctx.fillRect(x + 4, y + 12, 4, 8); ctx.fillRect(x + 44, y + 12, 4, 8);
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x, y, 52, 14);
    ctx.fillStyle = '#b07a43'; ctx.fillRect(x, y, 52, 3); ctx.fillRect(x, y + 6, 52, 2);
    ctx.fillStyle = '#5e3b1a'; ctx.fillRect(x, y + 12, 52, 2);
  } else {
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x, y, 14, 52);
    ctx.fillStyle = '#b07a43'; ctx.fillRect(x, y, 3, 52); ctx.fillRect(x + 6, y, 2, 52);
  }
}

function drawLampPost(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1e1e28'; ctx.fillRect(x - 2, y - 46, 4, 46); ctx.fillRect(x - 5, y - 4, 10, 4);
}
function drawLampHead(ctx, x, y) {
  ctx.fillStyle = '#1e1e28'; ctx.fillRect(x - 7, y - 58, 14, 3); ctx.fillRect(x - 5, y - 46, 10, 2);
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(x - 5, y - 55, 10, 9);
  ctx.fillStyle = '#fff6d0'; ctx.fillRect(x - 2, y - 53, 4, 5);
}

function drawFlowerBush(ctx, x, y, r, rnd, flowers = ['#e8313a', '#d6337a', '#f6c945']) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 3, y + r * 0.5, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#2e7d32' : '#3f9b3a';
    ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.6, r * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.4, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < r * 0.7; i++) {
    const fx = x + (rnd() - 0.5) * r * 1.5, fy = y + (rnd() - 0.5) * r * 0.9;
    ctx.fillStyle = flowers[(rnd() * flowers.length) | 0];
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 1.4, fy + Math.sin(a) * 1.4, 1.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(fx, fy, 0.8, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCanoe(ctx, x, y, len = 90, angle = 0, color = '#7a4a22') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(3, 5, len / 2, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -16, len / 2, 0); ctx.quadraticCurveTo(0, 16, -len / 2, 0); ctx.fill();
  ctx.fillStyle = shade(color, -0.35);
  ctx.beginPath(); ctx.moveTo(-len / 2 + 8, 0); ctx.quadraticCurveTo(0, -10, len / 2 - 8, 0); ctx.quadraticCurveTo(0, 10, -len / 2 + 8, 0); ctx.fill();
  ctx.fillStyle = shade(color, 0.2); ctx.fillRect(-6, -8, 4, 16); ctx.fillRect(14, -7, 4, 14);
  ctx.fillStyle = '#c9a86a'; ctx.fillRect(-len / 4, -1, len / 2.2, 2);
  ctx.restore();
}

/** Muelle de madera: tablones horizontales sobre pilotes. */
function drawDock(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 6, y + 6, w, h);
  for (let py = y; py < y + h; py += 10) {
    ctx.fillStyle = ((py - y) / 10) % 2 ? '#8a5a2b' : '#9a6838';
    ctx.fillRect(x, py, w, 9);
    ctx.fillStyle = '#5e3b1a'; ctx.fillRect(x, py + 9, w, 1);
    ctx.fillStyle = '#3a2414'; ctx.fillRect(x + 3, py + 3, 2, 2); ctx.fillRect(x + w - 5, py + 3, 2, 2);
  }
  ctx.fillStyle = '#4a2e16';
  for (let py = y; py < y + h; py += 50) { ctx.fillRect(x - 4, py, 6, 8); ctx.fillRect(x + w - 2, py, 6, 8); }
}

/** Puente de tablas vertical (cruza un caño de oeste a este). */
function drawBridge(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 4, y + 6, w, h);
  for (let px = x; px < x + w; px += 9) {
    ctx.fillStyle = ((px - x) / 9) % 2 ? '#8a5a2b' : '#a07040';
    ctx.fillRect(px, y, 8, h);
    ctx.fillStyle = '#5e3b1a'; ctx.fillRect(px + 8, y, 1, h);
  }
  ctx.fillStyle = '#4a2e16'; ctx.fillRect(x, y - 3, w, 3); ctx.fillRect(x, y + h, w, 3);
}

/** Bohío con techo de palma (vista superior). */
function drawHut(ctx, x, y, w, h, rnd) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 8, y + h - 4, w, 12);
  ctx.fillStyle = '#a9875a'; ctx.fillRect(x + 6, y + h * 0.5, w - 12, h * 0.5);
  ctx.fillStyle = '#7d6040';
  for (let k = x + 10; k < x + w - 8; k += 8) ctx.fillRect(k, y + h * 0.5, 2, h * 0.5);
  ctx.fillStyle = '#3a2414'; ctx.fillRect(x + w / 2 - 10, y + h - 30, 20, 30);
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath(); ctx.moveTo(x - 8, y + h * 0.6); ctx.lineTo(x + w / 2, y - 6); ctx.lineTo(x + w + 8, y + h * 0.6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const sx = x - 6 + rnd() * (w + 12), sy = y + h * 0.6 - rnd() * 6;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x + w / 2 + (sx - x - w / 2) * 0.3, y + 4 + rnd() * 10); ctx.stroke();
  }
  ctx.fillStyle = '#e0c060'; ctx.fillRect(x - 8, y + h * 0.6 - 3, w + 16, 4);
}

function drawMangrove(ctx, x, y, r, rnd) {
  ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI;
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.quadraticCurveTo(x + Math.cos(a) * r * 0.6, y - 14, x + Math.cos(a) * r, y + 4 + rnd() * 6); ctx.stroke();
  }
  drawTreeCrown(ctx, x, y - 24, r, (rnd() * 9999) | 0, ['#1f4a2a', '#2a5e34', '#3d7a3c']);
}

function drawCandle(ctx, x, y, t, s = 1) {
  ctx.fillStyle = '#efe6cf'; ctx.fillRect(x - 2 * s, y - 10 * s, 4 * s, 10 * s);
  ctx.fillStyle = '#c9bfa5'; ctx.fillRect(x + 1 * s, y - 10 * s, 1 * s, 10 * s);
  const f = Math.sin(t * 13 + x) * 0.8;
  ctx.fillStyle = '#f08a2c'; ctx.beginPath(); ctx.ellipse(x + f * 0.5, y - 13 * s, 2.4 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.ellipse(x + f * 0.3, y - 12.5 * s, 1.2 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill();
}

function drawCayena(ctx, x, y, s = 1) {
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = i % 2 ? '#d61f2c' : '#ef3340';
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s, 4 * s, 3 * s, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f6c945'; ctx.fillRect(x - 1 * s, y - 1 * s, 2 * s, 2 * s);
  ctx.fillStyle = '#3f9b3a'; ctx.fillRect(x + 5 * s, y + 4 * s, 5 * s, 2 * s);
}

function drawRibbon(ctx, x, y, t) {
  ctx.strokeStyle = '#e8313a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 9, y);
  for (let k = 0; k <= 18; k += 3) ctx.lineTo(x - 9 + k, y + Math.sin(t * 4 + k * 0.5) * 3);
  ctx.stroke();
  ctx.fillStyle = '#ff6b78'; ctx.fillRect(x - 3, y - 3, 6, 5);
}

/** Banderines de papel picado entre dos puntos (adorno festivo). */
function drawBunting(ctx, x1, y1, x2, y2, rnd, sag = 20) {
  const cols = ['#e8313a', '#f6c945', '#1fb5b0', '#3f9b3a', '#f08a2c', '#d6337a'];
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1;
  const pt = k => ({ x: x1 + (x2 - x1) * k, y: y1 + (y2 - y1) * k + Math.sin(k * Math.PI) * sag });
  ctx.beginPath();
  for (let k = 0; k <= 1.0001; k += 0.05) { const p = pt(k); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
  ctx.stroke();
  const n = Math.max(4, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 22));
  for (let i = 1; i < n; i++) {
    const p = pt(i / n);
    ctx.fillStyle = cols[(rnd() * cols.length) | 0];
    ctx.beginPath(); ctx.moveTo(p.x - 6, p.y); ctx.lineTo(p.x + 6, p.y); ctx.lineTo(p.x, p.y + 12); ctx.fill();
  }
}

function drawStall(ctx, x, y, rnd) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 6, y + 30, 100, 12);
  ctx.fillStyle = '#7a4a22'; ctx.fillRect(x, y + 10, 100, 30);
  ctx.fillStyle = '#9a6838'; ctx.fillRect(x, y + 10, 100, 6);
  ctx.fillStyle = '#5e3b1a'; ctx.fillRect(x + 4, y + 38, 6, 8); ctx.fillRect(x + 90, y + 38, 6, 8);
  const fruits = ['#f6c945', '#f08a2c', '#3f9b3a', '#e8313a', '#f2a03a'];
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = fruits[(rnd() * fruits.length) | 0];
    ctx.beginPath(); ctx.arc(x + 8 + rnd() * 84, y + 6 + rnd() * 12, 4 + rnd() * 2, 0, Math.PI * 2); ctx.fill();
  }
}
function drawUmbrella(ctx, x, y, r = 46) {
  const cols = ['#e8313a', '#fdf6e3'];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = cols[i % 2];
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, i / 8 * Math.PI * 2, (i + 1) / 8 * Math.PI * 2); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#5e3b1a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
}

function drawTorch(ctx, x, y, t) {
  ctx.fillStyle = '#4a2e16'; ctx.fillRect(x - 2, y - 30, 4, 30);
  ctx.fillStyle = '#2a1a0e'; ctx.fillRect(x - 4, y - 34, 8, 5);
  const f = Math.sin(t * 15 + x) * 1.5;
  ctx.fillStyle = '#e8613a'; ctx.beginPath(); ctx.ellipse(x + f * 0.4, y - 40, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f6c945'; ctx.beginPath(); ctx.ellipse(x + f * 0.3, y - 38, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
}

/* =========================================================
   GLOBITOS DE REACCIÓN (♪ ! ? … ♥) sobre la cabeza
   ========================================================= */
/** Pone un globito en un personaje (jugador o NPC). */
function setEmote(ent, s, dur = 1.6, danger = false) {
  ent.emote = { s, t: 0, dur, danger };
}
function updateEmote(ent, dt) {
  if (!ent.emote) return;
  ent.emote.t += dt;
  if (ent.emote.t >= ent.emote.dur) ent.emote = null;
}
function drawEmote(ctx, x, y, e) {
  if (!e) return;
  const k = e.t / e.dur;
  const pop = e.t < 0.18 ? 0.4 + (e.t / 0.18) * 0.75 : e.t < 0.3 ? 1.15 - (e.t - 0.18) / 0.12 * 0.15 : 1;
  const a = k > 0.8 ? (1 - k) / 0.2 : 1;
  const fy = y - Math.min(1, e.t * 4) * 4 + Math.sin(e.t * 5) * 1.2;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, fy); ctx.scale(pop, pop);
  ctx.fillStyle = e.danger ? '#ff5a68' : '#fffaf0';
  ctx.strokeStyle = e.danger ? '#5a0a14' : '#2a1a0c'; ctx.lineWidth = 1.6;
  ctx.beginPath(); rrect(ctx, -12, -24, 24, 20, 8);
  ctx.moveTo(-4, -4.5); ctx.lineTo(0, 2); ctx.lineTo(4, -4.5);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = e.danger ? '#ffd0d6' : '#fffaf0'; ctx.fillRect(-3.2, -6, 6.4, 2.4);   // tapa la unión de la cola
  const col = { '♪': '#e8313a', '!': e.danger ? '#fff' : '#e8613a', '?': '#1f7ab5', '…': '#5a4a3a', '♥': '#e8313a' }[e.s] || '#2a1a0c';
  ctx.fillStyle = col; ctx.textAlign = 'center';
  ctx.font = `700 ${e.s === '…' ? 16 : 15}px "Fredoka", "Segoe UI Symbol", sans-serif`;
  ctx.fillText(e.s, 0, e.s === '…' ? -9 : -8.5);
  ctx.restore();
}
