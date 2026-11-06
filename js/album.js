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
    photo: { file: 'PrometeodelaLibertad-Ciénaga, Magdalena-20251206-WA0027.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'Prometeo de la Libertad, de Rodrigo Arenas Betancur (1978), en memoria de la Masacre de las Bananeras.' },
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

/* ---------- Lugares reales de Ciénaga (se desbloquean al mirarlos) ---------- */
const LUGAR_CARDS = [
  {
    photo: { file: 'Templete de Cienaga - Plaza.jpg', author: 'Kevin Lopez Blanco', license: 'CC BY-SA 4.0', caption: 'El Templete en la Plaza del Centenario.' },
    id: 'l_templete', title: 'La Plaza del Centenario', how: 'Mira el templete en la plaza',
    text: 'Es la plaza principal de Ciénaga. En el centro está el Templete, y los caminos llegan a él como los rayos de una estrella, entre jardineras, árboles de sombra y bancas. Alrededor quedan la iglesia de San Juan Bautista y el Palacio Municipal. Es el punto de encuentro de los cienagueros.',
    icon: c => { c.save(); c.translate(80, 92); c.scale(0.62, 0.62); drawTempleteBase(c, 0, 0); drawTempleteDome(c, 0, 0); c.restore(); }
  },
  {
    photo: { file: 'Parroquia San Juan Bautist de Ciénaga, Magdalena.jpg', author: 'Luisnh1210', license: 'CC BY-SA 4.0', caption: 'Iglesia de San Juan Bautista, en Ciénaga.' },
    id: 'l_iglesia', title: 'Iglesia de San Juan Bautista', how: 'Mira la iglesia en la plaza',
    text: 'Es la construcción más antigua del centro histórico de Ciénaga: sus orígenes se remontan a 1612 y la levantaron manos indígenas. Siglos después la ampliaron, agrandaron su cúpula y le cambiaron el reloj de la torre. San Juan Bautista es el santo patrono de Ciénaga.',
    icon: c => { c.save(); c.translate(4, 8); c.scale(0.36, 0.36); drawIglesiaSJB(c, 0, 20, 420, 260, mulberry32(4)); c.restore(); }
  },
  {
    photo: { file: 'PalacioMunicipal-Ciénaga, Magdalena-20251206.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'Palacio Municipal de Ciénaga.' },
    id: 'l_palacio', title: 'El Palacio Municipal', how: 'Mira el palacio en la plaza',
    text: 'Es la sede de la alcaldía y mira hacia la Plaza del Centenario. Es de estilo republicano, como muchas casonas del centro histórico de Ciénaga, que fue declarado Monumento Nacional en 1994.',
    icon: c => { c.save(); c.translate(4, 8); c.scale(0.36, 0.36); drawPalacioMunicipal(c, 0, 20, 420, 260, mulberry32(5)); c.restore(); }
  },
  {
    photo: { file: 'CasadelDiablo-Ciénaga, Magdalena-20251206.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'La Casa del Diablo, en Ciénaga.' },
    id: 'l_diablo', title: 'La Casa del Diablo', how: 'Mira la Casa del Diablo, en el sur del pueblo',
    text: 'Es una casona blanca de estilo republicano, con columnas y balaustradas. Su construcción empezó hacia 1916, en plena bonanza del banano, y hoy está en ruinas. La gente cuenta que su dueño, Manuel Varela, hizo un pacto con el diablo para volverse rico. Es una leyenda: nadie lo ha probado, pero los mayores todavía la cuentan.',
    icon: c => { c.save(); c.translate(6, 22); c.scale(0.36, 0.36); drawCasaDelDiablo(c, 0, 0, 420, 200, mulberry32(6)); c.restore(); }
  },
  {
    photo: { file: 'PalacioAzul-Ciénaga, Magdalena-20251206.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'El Palacio Azul, en Ciénaga.' },
    id: 'l_azul', title: 'El Palacio Azul', how: 'Mira el Palacio Azul, en el sur del pueblo',
    text: 'Es una de las casonas republicanas más llamativas de Ciénaga: dos pisos azules, ventanas en arco y un balcón corrido con baranda labrada. Casas así se levantaron con la riqueza del tabaco y del banano, y son parte del centro histórico, que hoy es Pueblo Patrimonio de Colombia.',
    icon: c => { c.save(); c.translate(42, 4); c.scale(0.44, 0.44); drawPalacioAzul(c, 0, 0, 170, 250, mulberry32(7)); c.restore(); }
  },
  {
    photo: { file: 'Comisariato cienaga.jpg', author: 'Autor desconocido', license: 'Dominio público', caption: 'Comisariato de la United Fruit Company en Ciénaga, en 1928.' },
    id: 'l_estacion', title: 'El tren de Ciénaga', how: 'Mira la estación del tren, en el sur del pueblo',
    text: 'El ferrocarril de Santa Marta llegó a Ciénaga en 1887. Por sus rieles salían los racimos de banano hacia el puerto, y el pueblo se llenó de comercio. En 1928, en la plaza de la estación, ocurrió la Masacre de las Bananeras contra trabajadores en huelga; allí está hoy el monumento Prometeo de la Libertad.',
    icon: c => { c.fillStyle = '#8a8172'; c.fillRect(0, 96, 160, 24); drawRails(c, 6, 160, 100, mulberry32(8)); drawTren(c, 4, 100, 0); }
  }
];

/* ---------- Comida típica (se desbloquea al probarla) ---------- */
const SABOR_CARDS = [
  {
    photo: { file: 'Cayeye.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'Cayeye con guiso y queso costeño rallado.' },
    id: 's_cayeye', title: 'Cayeye', how: 'Pruébalo en la casa del abuelo',
    text: 'Puré de guineo verde con mantequilla y queso costeño; a veces lleva guiso de tomate y cebolla. Es típico del Magdalena: se come en Ciénaga, la Zona Bananera, Santa Marta, Fundación y Aracataca, sobre todo al desayuno. También se le dice mote de guineo.',
    icon: c => drawFood(c, 'cayeye', 80, 64, 3)
  },
  {
    photo: { file: 'Bollo de yuca.jpg', author: 'Jdvillalobos', license: 'CC BY 3.0', caption: 'Bollos de yuca.' },
    id: 's_bollo', title: 'Bollo de yuca', how: 'Pruébalo en el puesto de frutas del pueblo',
    text: 'Yuca rallada, envuelta en hojas y cocinada en agua hirviendo. Los bollos son herencia indígena, y en la costa se comen con queso, con suero o con chicharrón. También está el bollo limpio, que es de maíz.',
    icon: c => drawFood(c, 'bollo', 80, 64, 3.4)
  },
  {
    photo: { file: 'Cocadas colombianas by P R.png', author: 'P R', license: 'CC BY 2.0', caption: 'Cocadas colombianas.' },
    id: 's_cocada', title: 'Cocadas', how: 'Ayuda a la vendedora con los cocos',
    text: 'Dulce de coco rallado cocinado con azúcar o panela; algunas llevan leche o fruta. En la costa se venden en bandejas por las calles, y cada cocadera tiene su secreto.',
    icon: c => drawFood(c, 'cocada', 80, 64, 3.2)
  },
  {
    photo: { file: 'Raspao - panoramio.jpg', author: 'Jimmy Gómez N', license: 'CC BY-SA 3.0', caption: 'Un raspao (foto de referencia: no es de Ciénaga).' },
    id: 's_raspao', title: 'Raspao', how: 'Pídelo en la Plaza del Centenario',
    text: 'Hielo raspado con sirope de colores (de mora, de limón, de tamarindo) y, si quieres, leche condensada. Los raspaderos lo preparan en su carrito, en las plazas, para pasar el calor.',
    icon: c => drawFood(c, 'raspao', 80, 58, 3.2)
  },
  {
    photo: { file: 'Arepa de huevo.jpg', author: 'Jdvillalobos', license: 'CC BY 3.0', caption: 'Arepa e’ huevo.' },
    id: 's_arepa', title: 'Arepa e’ huevo', how: 'Pruébala en el puesto de fritos del pueblo',
    text: 'Arepa de maíz frita con un huevo adentro. Se fríe dos veces: primero se infla, se abre por un lado, se le mete el huevo crudo y vuelve al aceite hasta que el huevo se cocina. Es de toda la costa Caribe; Luruaco, en el Atlántico, hasta tiene su festival.',
    icon: c => drawFood(c, 'arepa', 80, 64, 3.6)
  },
  {
    photo: { file: 'Pescado frito-Ciénaga, Magdalena-20251206-WA0035.jpg', author: 'Jdvillalobos', license: 'CC BY-SA 4.0', caption: 'Pescado frito con arroz con coco, patacones y ensalada, en Ciénaga.' },
    id: 's_pescado', title: 'Pescado frito con arroz con coco', how: 'Pruébalo en la fiesta',
    text: 'Ciénaga es famosa por su pescado frito, servido con arroz con coco, patacones de plátano verde y ensalada. El pescado viene del mar y de la Ciénaga Grande, donde viven pescadores como los de esta historia.',
    icon: c => drawFood(c, 'pescado', 80, 64, 2.8)
  },
  {
    photo: { file: 'Barranquilla - Carimañolas.jpg', author: 'Jdvillalobos', license: 'CC BY 3.0', caption: 'Carimañolas (foto tomada en Barranquilla).' },
    id: 's_carimanola', title: 'Carimañolas', how: 'Pruébalas en la fiesta',
    text: 'Masa de yuca rellena de carne molida o de queso, con forma de torpedo, frita hasta quedar dorada. Se comen calientes, al desayuno o como pasabocas, en toda la costa Caribe.',
    icon: c => drawFood(c, 'carimanola', 80, 64, 3.2)
  }
];

/* ---------- Palabras costeñas (se desbloquean al oírlas en un diálogo) ---------- */
const PALABRAS = [
  { id: 'aja', word: 'Ajá', re: 'aj[aá]', def: 'Sirve para todo: para saludar, para decir que sí o para pedir que te sigan contando.', ej: '¡Ajá, pelao! ¿Y qué más?' },
  { id: 'pelao', word: 'Pelao, pelaíta', re: 'pela(?:o|os|ito|itos|íto|ítos|ita|itas|íta|ítas)', def: 'Niño o niña, muchacho o muchacha.', ej: 'Ese pelao corre como el viento.' },
  { id: 'mijo', word: 'Mijo, mija', re: 'mij[oa]s?', def: 'Viene de «mi hijo» o «mi hija». Así les dicen con cariño los mayores a los jóvenes, aunque no sean sus hijos.', ej: 'Cuídate, mijo.' },
  { id: 'eche', word: '¡Eche!', re: 'eche', pre: '¡', def: 'Para mostrar asombro o fastidio.', ej: '¡Eche, qué calor el de hoy!' },
  { id: 'vaina', word: 'Vaina', re: 'vainas?', def: 'Cualquier cosa, sobre todo cuando no sabes o no te acuerdas de cómo se llama.', ej: '¿Y esa vaina qué es?' },
  { id: 'bacano', word: 'Bacano', re: 'bacan(?:o|a|os|as|ísimo|ísima)', def: 'Muy bueno, divertido, chévere.', ej: '¡Qué bacano el festival!' },
  { id: 'ombe', word: '¡Ombe!', re: 'ombe', def: 'Viene de «hombre». Le da fuerza a lo que dices.', ej: '¡No, ombe! Así no es.' },
  { id: 'pechichar', word: 'Pechichar', re: 'pechich\\p{L}*', def: 'Consentir, mimar. Y un «pechiche» es alguien muy consentido.', ej: 'La abuela pechicha a todos sus nietos.' },
  { id: 'napa', word: 'Ñapa', re: 'ñapas?', def: 'Lo que el vendedor te regala de más, para que vuelvas.', ej: 'Y le pongo una arepita de ñapa.' },
  { id: 'bulla', word: 'Bulla', re: 'bullas?', def: 'Ruido, alboroto: mucha gente hablando y gozando al mismo tiempo.', ej: '¡Qué bulla la de los tambores!' },
  { id: 'llave', word: 'Mi llave', re: 'mi llave', def: 'Tu amigo de confianza, tu compañero de siempre.', ej: '¡Ajá, mi llave! ¿Vamos pa’ la fiesta?' },
  { id: 'jartar', word: 'Jartar', re: 'jart\\p{L}+', def: 'Comer (o beber) mucho, hasta quedar lleno.', ej: 'No te vayas a jartar todos los patacones.' }
];
PALABRAS.forEach(p => { p.rx = new RegExp((p.pre ? '(?<=' + p.pre + ')' : '(?<![\\p{L}])') + '(?:' + p.re + ')(?![\\p{L}])', 'giu'); });
const PALABRA_CARDS = PALABRAS.map(p => ({
  id: 'p_' + p.id, title: p.word, how: 'Escúchala en una conversación',
  text: p.def + ' Por ejemplo: «' + p.ej + '»',
  icon: (c, t) => drawWordIcon(c, p.word.split(',')[0], t)
}));

ALBUM_CARDS.forEach(c => { c.cat = 'historia'; });
LUGAR_CARDS.forEach(c => { c.cat = 'lugares'; ALBUM_CARDS.push(c); });
SABOR_CARDS.forEach(c => { c.cat = 'sabores'; ALBUM_CARDS.push(c); });
PALABRA_CARDS.forEach(c => { c.cat = 'palabras'; ALBUM_CARDS.push(c); });
const ALBUM_TABS = [
  { id: 'historia', label: 'HISTORIA' }, { id: 'lugares', label: 'LUGARES' },
  { id: 'sabores', label: 'SABORES' }, { id: 'palabras', label: 'PALABRAS' }
];

/** Busca palabras costeñas en un texto: [{ p, start, end }]. */
function findPalabras(text) {
  const out = [];
  PALABRAS.forEach(p => { p.rx.lastIndex = 0; let m; while ((m = p.rx.exec(text))) out.push({ p, start: m.index, end: m.index + m[0].length }); });
  return out.sort((a, b) => a.start - b.start).filter((m, i, a) => i === 0 || m.start >= a[i - 1].end);
}

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
  totalIn(cat) { return ALBUM_CARDS.filter(c => c.cat === cat).length; }
  countIn(cat) { return ALBUM_CARDS.filter(c => c.cat === cat && this.unlocked.has(c.id)).length; }
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
