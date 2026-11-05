# Cambios para mejorar el juego

Objetivo de esta ronda: que niños y jóvenes que no conocen la historia del Caimán Cienaguero **aprendan algo** y quieran **seguir jugando**, sin perder la esencia de la historia.

## Para aprender (lo educativo)

1. **Quiz «¿Cuánto sabes de Ciénaga?»**
   - 8 preguntas al azar de un banco de 14, todas con datos reales que el juego enseña: el 20 de enero, Magdalena, la tradición oral, la danza, los instrumentos, los verseadores, Pueblo Viejo, los palafitos, los «machorros», el Patrimonio Cultural, el caimán aguja…
   - Después de cada respuesta, acertada o no, explica el dato, así que el quiz también enseña.
   - Muestra una medalla («¡Guardián de la memoria de Ciénaga!») y guarda el récord.
   - Está en el menú principal y en la pantalla de victoria («¿CUÁNTO APRENDISTE?»).
2. **«¿Sabías que...?» en cada capítulo**
   - Cada tarjeta de capítulo muestra un dato real: Ciénaga y la Ciénaga Grande, la tradición oral, los palafitos, la danza, el 20 de enero y el festival como patrimonio.
   - La tarjeta dura un poco más para que dé tiempo de leerlo.

## Para que lo jueguen todos

3. **Dificultad** (en Opciones):
   - **FÁCIL (NIÑOS):** el agua no quita vidas, el caimán es más lento y ve menos, y hay más tiempo en los versos, la lleva, el tambor y el baile (5 vidas).
   - **NORMAL:** el juego como estaba.
   - **DIFÍCIL:** caimán más rápido y atento, y menos tiempo en los retos.
4. **Tutorial en pantalla**: consejos para caminar, hablar con E, seguir la flecha, correr con SHIFT y abrir el mapa. En celulares los textos cambian («Usa la cruceta», «Toca MAPA»).

## Para no perder el avance

5. **La partida se guarda sola** al empezar cada escena, al completar misiones y cada 15 segundos de juego libre.
   - El menú muestra **CONTINUAR** con el capítulo donde ibas («Capítulo 2 · Ciénaga de antaño») y JUGAR pasa a llamarse NUEVA PARTIDA.
   - Al terminar la historia, la partida guardada se borra.
   - Si continúas después del encuentro con el caimán, este ya está patrullando, y la fiesta no repite su introducción.

## Presentación más profesional

6. **Menú rediseñado**: CONTINUAR y JUGAR grandes arriba, y debajo una cuadrícula con Instrucciones, Álbum, ¿Cuánto sabes?, Opciones, Créditos y Salir. Se navega con las flechas en las cuatro direcciones.
7. **Pantalla de créditos**: el proyecto, la historia (qué es ficción y qué viene de la tradición), la música original, las tipografías y el autor y la licencia de cada foto del álbum.
8. **Instrucciones actualizadas**: controles agrupados; peligros con los consejos de sigilo; una sección «RETOS» con los 4 minijuegos y el final secreto. Ahora todo cabe sin desplazarse.
9. **Opciones y créditos compactos**: ya caben sin barra de desplazamiento.

## Gráficos

10. **El pueblo de noche cobra vida**: al anochecer se encienden las ventanas de las casas y la capilla, y aparecen luciérnagas en el pasto.

## Ronda gráfica: PixiJS, GSAP y el sombrero vueltiao

11. **Capa de efectos con PixiJS (WebGL)** encima del juego, sin reescribirlo (`js/fx.js`):
    - **Agua que se ondula y brilla** de verdad en el puerto, en la canoa y en el río del menú; los textos encima del agua no se deforman.
    - **Resplandor (bloom)** en el sol, las antorchas, las ventanas, los bombillos de la fiesta y las luciérnagas.
    - **Tono de color por escena**: cálido en la casa y el pueblo, azul de noche en el puerto, más vivo en la fiesta.
    - **Caimán cerca**: la imagen pierde color, se enrojece y los colores se separan.
    - **Al recibir un golpe**: una onda expansiva sale desde Mateo.
    - **Grano de película** suave.
    - Si el computador no tiene WebGL, o el juego baja de 28 cuadros por segundo, los efectos se reducen o se apagan solos.
12. **Opción GRÁFICOS: MEJORADOS / CLÁSICOS** en Opciones, para apagar la capa en equipos lentos.
13. **Animaciones con GSAP**: cada pantalla (menú, opciones, álbum, quiz, créditos…) entra con un rebote y los botones aparecen en cascada.
14. **Mateo usa sombrero vueltiao**, el sombrero típico de la costa. Y el quiz tiene una pregunta nueva sobre él: se teje con caña flecha, es herencia zenú y es símbolo cultural de Colombia (banco de 14 preguntas).
15. Las librerías están **dentro del proyecto** (`js/lib/`: PixiJS 8.6.6, pixi-filters 6.0.5, GSAP 3.12.5), así que el juego no necesita internet.

## La Plaza del Centenario, como es en la vida real

16. **La plaza del pueblo ahora es la Plaza del Centenario de Ciénaga**, redibujada a partir de fotos reales (`js/plaza.js`):
    - **El Templete** blanco: redondo, con 8 columnas jónicas, escalinata al frente con muros curvos, cornisa con medallones y jarrones encima, y su reflector. De noche queda iluminado.
    - **La iglesia San Juan Bautista**: blanca, con su cúpula, el frontón con la cruz, la puerta de madera en arco y la **torre del reloj** con campanario.
    - **El Palacio Municipal**: amarillo, de estilo republicano, con frontón, balcones, pilastras blancas y la bandera de Colombia.
    - **La plaza**: caminos de cemento que llegan al templete en forma de estrella, jardineras con **bordillo rojo**, árboles de sombra, bancas blancas y una palmera, como en la foto aérea.
17. **El carrito del raspao** junto al templete, con su raspadero, un personaje nuevo que habla con Mateo.
18. **Placas para aprender**: al mirar el templete, la iglesia y el palacio, el narrador cuenta datos reales. Por ejemplo, que la iglesia es la construcción más antigua del centro histórico, con orígenes en 1612 y levantada por manos indígenas, y que el templete se inspira en los templos romanos. Cada placa da 10 puntos la primera vez.
19. El mapa y los letreros usan los nombres reales: Plaza del Centenario, Iglesia San Juan Bautista y Palacio Municipal.
20. El resplandor solo se usa en lugares oscuros (el puerto, el pueblo de noche y el menú), para que el blanco del templete no encandile.

## La canción del Caimán en la fiesta

21. **En el capítulo de la fiesta suena la música de la danza del Caimán Cienaguero** ([video de YouTube](https://www.youtube.com/watch?v=rtkarkCPNEE), canal DANZAS FOLCLÓRICAS DE COLOMBIA), en lugar de la cumbia sintetizada (`js/cancion.js`).
    - Se reproduce con el reproductor oficial de YouTube, en un recuadro pequeño en la esquina con el crédito del canal. El audio no se descarga al proyecto.
    - Se pausa con la pausa del juego y mientras tocas el tambor alegre, que tiene su propio ritmo, y sigue el volumen de la música de Opciones (y la tecla M).
    - Con la ✕ del recuadro se quita y vuelve la música del juego.
    - Sin internet, o si YouTube no carga, suena la cumbia original como antes.
    - Los créditos ahora mencionan la canción y las librerías.
22. **La canción ahora va dentro del proyecto** (`audio/danza-caiman.mp3`): suena sin internet, sin recuadro de video y también abriendo el juego con doble clic. Si el archivo falta, el juego usa YouTube, y si tampoco, la cumbia original.

## Probado

- Un recorrido automatizado completo en dificultad FÁCIL, de la casa a la victoria, pasando por Tomasita, las pistas, el puerto, la canoa, la fiesta, el Festival de hoy y la victoria.
- Guardar y continuar después de recargar la página, en el pueblo y a mitad del puerto.
- El quiz completo, los créditos, las opciones y las instrucciones.
- Sin errores en la consola.
- **Falta**: jugarlo a mano y probarlo en un celular real.
