'use strict';
/* =========================================================
   album.js — Álbum de Ciénaga: tarjetas culturales que se
   desbloquean con pistas, figuritas y momentos de la historia.
   Lo desbloqueado se guarda en el navegador (localStorage) y se
   conserva entre partidas.
   ========================================================= */

const ALBUM_CARDS = [
  {
    photo: { file: 'Tomasita-Monumento Ciénaga Universal - Ciénaga, Magdalena-20251206-WA0030.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'Tomasita en el Monumento Ciénaga Universal, en Ciénaga.' },
    id: 'flor', title: 'Tomasita, hija de pescadores', how: 'Encuentra la flor de cayena',
    text: 'Según la tradición oral, Tomasita era una niña hija de pescadores de la zona de Ciénaga. Su historia no aparece en archivos ni documentos: ha llegado hasta hoy porque la gente la cuenta de generación en generación.',
    icon: c => { drawHumanoid(c, 80, 104, LOOKS.tomasita, 'down', 0, false, 3); drawCayena(c, 122, 40, 1.6); }
  },
  {
    photo: { file: 'Monumento Ciénaga Universal - Ciénaga, Magdalena-20251206.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'Monumento Ciénaga Universal, en Ciénaga.' },
    id: 'vela', title: '20 de enero, día de San Sebastián', how: 'Encuentra la vela',
    text: 'La tradición cuenta que lo de Tomasita ocurrió un 20 de enero, día de San Sebastián, mientras había fiesta. Por eso, cada 20 de enero Ciénaga conmemora la Leyenda de Tomasita como cierre del Festival del Caimán Cienaguero.',
    icon: (c, t) => { [50, 80, 110].forEach((x, i) => drawCandle(c, x, 96 - (i % 2) * 8, t + i, 2)); }
  },
  {
    photo: { file: 'Crocodylus acutus Colombia 01.JPG', author: 'Petruss', license: 'CC BY-SA 3.0', caption: 'Caimán aguja (Crocodylus acutus), especie real del Caribe colombiano. Foto tomada en un parque de Cundinamarca.' },
    id: 'cinta', title: 'Las versiones de la leyenda', how: 'Encuentra la cinta roja',
    text: 'Como toda historia oral, tiene variantes: en algunas versiones la niña se llama Tomasina, y a veces es su hermana quien se distrae. Se dice que el relato nació en Pueblo Viejo, vecino de Ciénaga. No debe confundirse con el Hombre Caimán de Plato, que es otra leyenda.',
    icon: (c, t) => { drawRibbon(c, 56, 60, t); drawRibbon(c, 104, 70, t + 1); c.fillStyle = '#fdf6e3'; c.font = '28px "Fredoka", monospace'; c.textAlign = 'center'; c.fillText('?', 80, 104); }
  },
  {
    photo: { file: 'Plaza Cienaga Panorama 2.jpg', author: 'Kevin Lopez Blanco', license: 'CC BY-SA 4.0', caption: 'Panorámica de la plaza de Ciénaga.' },
    id: 'fig1', title: 'Ciénaga, Magdalena', how: 'Figurita escondida en el pueblo',
    text: 'Ciénaga queda en el Caribe colombiano, entre el mar, la Ciénaga Grande de Santa Marta y la Sierra Nevada. A su gente se le llama cienaguera. Su centro histórico fue declarado Monumento Nacional en 1994.',
    icon: c => { drawHouse(c, 14, 30, 64, 78, '#1fb5b0', '#c4562b', mulberry32(3), {}); drawHouse(c, 82, 30, 64, 78, '#f6c945', '#b8431f', mulberry32(4), {}); }
  },
  {
    photo: { file: 'Templete de Ciénaga, Magdalena 2025-12-06.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'El Templete de Ciénaga.' },
    id: 'fig2', title: 'El Templete', how: 'Figurita escondida en el pueblo',
    text: 'El Templete, inspirado en los templos romanos, es el símbolo de la Plaza del Centenario. Se construyó en el siglo XX, mucho después de la época de Tomasita: en el juego aparece como homenaje a la Ciénaga de hoy.',
    icon: c => { c.save(); c.translate(80, 86); c.scale(0.7, 0.7); drawTempleteBase(c, 0, 0); drawTempleteDome(c, 0, 0); c.restore(); }
  },
  {
    photo: { file: 'CasadelDiablo-Ciénaga, Magdalena-20251206.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'La Casa del Diablo, una de las casas de la época de la bonanza.' },
    id: 'fig3', title: 'Tabaco, banano y memoria', how: 'Figurita escondida en el pueblo',
    text: 'Las bonanzas del tabaco y del banano dejaron en Ciénaga casas y edificios de estilo republicano. También dejaron memoria dolorosa: la noche del 5 al 6 de diciembre de 1928, en la plaza de la estación del tren, ocurrió la Masacre de las Bananeras contra trabajadores en huelga.',
    icon: c => { c.fillStyle = '#3f9b3a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(80 + Math.cos(i * 1.25) * 26, 54 + Math.sin(i * 1.25) * 14, 26, 8, i * 1.25, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f6c945'; for (let i = 0; i < 4; i++) c.fillRect(66 + i * 8, 64, 6, 30); c.fillStyle = '#6b3d1a'; c.fillRect(78, 54, 4, 52); }
  },
  {
    photo: { file: 'Casa sobre pilotes en la Ciénaga Grande de Santa Marta Colombia.jpeg', author: 'Oliver H', license: 'CC BY-SA 3.0', caption: 'Casa sobre pilotes en la Ciénaga Grande (foto de referencia: no es Cachimbero).' },
    id: 'fig4', title: 'Puerto Cachimbero', how: 'Figurita en los muelles del puerto',
    text: 'La tradición ubica la historia en Cachimbero, también llamado «el Rincón de Cachimbero»: según algunos relatos, una ensenada al oriente de Pueblo Viejo, junto a la ciénaga. Allí llegaban las canoas de los pescadores.',
    icon: c => { c.fillStyle = '#123a5a'; c.fillRect(0, 60, 160, 60); drawCanoe(c, 80, 84, 100, 0.1); c.fillStyle = '#5e3b1a'; for (let x = 20; x < 150; x += 26) c.fillRect(x, 40, 5, 34); }
  },
  {
    photo: { file: 'Puente en zona de palafitos en Nueva Venecia-Sitionuevo-Magdalena-Colombia.jpg', author: 'Augusto Sisa (Tecsie)', license: 'CC BY-SA 3.0', caption: 'Puente entre palafitos en Nueva Venecia.' },
    id: 'fig5', title: 'La Ciénaga Grande de Santa Marta', how: 'Figurita en los muelles del puerto',
    text: 'Es la laguna costera más grande de Colombia: sitio Ramsar desde 1998 y Reserva de Biosfera de la UNESCO desde 2000. En sus aguas están los pueblos palafitos Nueva Venecia, Buenavista y Trojas de Cataca, con casas sobre pilotes.',
    icon: c => { c.fillStyle = '#1f5f7a'; c.fillRect(0, 64, 160, 56); drawPalafito(c, 50, 70, 1.1); drawPalafito(c, 112, 66, 0.9); }
  },
  {
    photo: { file: 'IglesiaSanJuan-CienagaMagdalena-20251206.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'Iglesia de San Juan Bautista, en Ciénaga.' },
    id: 'fig6', title: 'Ciénaga y Macondo', how: 'Figurita en los muelles del puerto',
    text: 'Hay quienes ven en Ciénaga una de las inspiraciones del Macondo de Gabriel García Márquez, y por eso se la llama capital del realismo mágico. Su santo patrono es San Juan Bautista, como su iglesia principal.',
    icon: c => { c.fillStyle = '#f2e6c8'; c.fillRect(44, 24, 72, 84); c.fillStyle = '#c4562b'; c.fillRect(44, 24, 8, 84); c.fillStyle = '#f6c945'; for (let i = 0; i < 6; i++) c.fillRect(60 + (i % 3) * 16, 40 + Math.floor(i / 3) * 20, 4, 4); c.fillStyle = '#1fb5b0'; c.beginPath(); c.arc(84, 84, 10, 0, Math.PI * 2); c.fill(); }
  },
  {
    photo: { file: 'Caimán Cienaguero.jpg', author: 'Aquos', license: 'CC BY-SA 4.0', caption: 'Danza del Caimán Cienaguero en el Carnaval de Barranquilla.' },
    id: 'danza', title: 'La danza del caimán', how: 'Descubre la historia de Tomasita',
    text: 'Se baila en círculos, por parejas o en filas. Un danzante lleva el caimán y se balancea en el centro, mientras los «pescadores» con arpones de mentira lo persiguen y lo encierran. En las pausas, los verseadores improvisan versos y un coro repite el desenlace de la historia.',
    icon: (c, t) => { drawCaiman(c, 80, 60, 0, t, { festive: true, scale: 0.55, amp: 6 }); drawHumanoid(c, 34, 112, LOOKS.bailador, 'right', t, true, 2); drawHumanoid(c, 126, 112, LOOKS.bailadora1, 'left', t, true, 2); }
  },
  {
    id: 'tambores', title: 'Los instrumentos', how: 'Toca el tambor en la celebración',
    text: 'La danza se acompaña con instrumentos de la costa: tambora, tambor alegre, llamador, caña de millo y guacharaca. A veces se suma un acordeón o un clarinete. Un cantor lleva los versos y el coro le responde.',
    icon: c => { [[50, '#8a5a2b'], [80, '#a06a32'], [110, '#6b3d1a']].forEach(([x, col], i) => { const h = 50 - i * 8; c.fillStyle = col; c.fillRect(x - 13, 104 - h, 26, h); c.fillStyle = '#e9dcc0'; c.beginPath(); c.ellipse(x, 104 - h, 13, 5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a1a0c'; c.fillRect(x - 13, 100 - h / 2, 26, 2); }); }
  },
  {
    photo: { file: 'Caimán Cienaguero 2.jpg', author: 'Aquos', license: 'CC BY-SA 4.0', caption: 'El Caimán Cienaguero desfilando en el Carnaval de Barranquilla.' },
    id: 'festival', title: 'El Festival del Caimán Cienaguero', how: 'Termina la historia',
    text: 'Cada enero, Ciénaga celebra su festival: lo abre el desfile de los «machorros», hombres disfrazados de mujer, como en los orígenes de la fiesta. Le siguen la Gran Parada de Caimanes, el encuentro de verseadores y bailes. En 2026 se celebró su edición 63 y su declaratoria como Patrimonio Cultural Inmaterial de la Nación.',
    icon: (c, t) => { drawCaiman(c, 80, 70, Math.PI, t, { festive: true, scale: 0.75, amp: 8 }); c.fillStyle = '#f6c945'; for (let i = 0; i < 14; i++) c.fillRect((i * 37) % 160, (i * 23) % 40, 4, 4); }
  }
];

// tarjeta del final secreto (al completarlo todo)
ALBUM_CARDS.push({
  id: 'secreto', title: 'El regalo del abuelo', how: 'Consigue el final secreto completándolo todo',
  text: 'La tradición oral no está escrita en ningún libro: vive en la voz de quien la cuenta. Así llegó la historia de Tomasita hasta hoy, de los abuelos a los nietos. Ahora tú también puedes contarla.',
  icon: (c, t) => { glow(c, 80, 62, 60, 'rgba(255,214,120,0.8)'); drawCaiman(c, 80, 64, -0.15, 0, { wood: true, scale: 0.55, amp: 2 }); }
});

/** Fotos reales: se cargan desde Wikimedia Commons (licencias libres, con crédito). */
function commonsPhotoUrl(file, width = 640) {
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file.replace(/ /g, '_')) + '?width=' + width;
}
function commonsPageUrl(file) {
  return 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replace(/ /g, '_'));
}

/** Casa palafito sobre pilotes (Ciénaga Grande). */
function drawPalafito(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#4a2e16';
  [-18, -6, 6, 18].forEach(px => ctx.fillRect(px - 1.5, 0, 3, 22));
  ctx.fillStyle = 'rgba(190,230,255,0.35)'; ctx.fillRect(-24, 20, 48, 2);
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-24, -2, 48, 4);
  ctx.fillStyle = '#1fb5b0'; ctx.fillRect(-18, -24, 36, 22);
  ctx.fillStyle = '#e86a8a'; ctx.fillRect(-4, -16, 8, 14);
  ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.moveTo(-24, -22); ctx.lineTo(0, -38); ctx.lineTo(24, -22); ctx.fill();
  ctx.restore();
}

class Album {
  constructor() {
    this.key = 'caiman_album_v1';
    this.unlocked = new Set();
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) JSON.parse(raw).forEach(id => this.unlocked.add(id));
    } catch (e) { /* sin almacenamiento: el álbum vive solo en esta partida */ }
  }
  get total() { return ALBUM_CARDS.length; }
  get count() { return ALBUM_CARDS.filter(c => this.unlocked.has(c.id)).length; }
  has(id) { return this.unlocked.has(id); }
  card(id) { return ALBUM_CARDS.find(c => c.id === id) || null; }

  /** Devuelve la tarjeta si es nueva, o null si ya estaba (o no existe). */
  unlock(id) {
    const card = this.card(id);
    if (!card || this.unlocked.has(id)) return null;
    this.unlocked.add(id);
    try { localStorage.setItem(this.key, JSON.stringify([...this.unlocked])); } catch (e) { /* ignorar */ }
    return card;
  }
}
