'use strict';
/* =========================================================
   quiz.js — «¿Cuánto sabes de Ciénaga?»
   Preguntas con los datos reales que el juego enseña (historia,
   álbum y escenas). Tras cada respuesta se explica el dato,
   para que el quiz también enseñe. Récord guardado en el navegador.
   ========================================================= */

const QUIZ_QUESTIONS = [
  { q: 'Mateo usa un sombrero «vueltiao». ¿Con qué se teje?', a: 'Con caña flecha, herencia del pueblo zenú', wrong: ['Con plástico reciclado', 'Con lana de oveja'],
    why: 'El sombrero vueltiao se teje a mano con fibras de caña flecha, una tradición del pueblo indígena zenú. En 2004 fue declarado símbolo cultural de Colombia.' },
  { q: '¿Qué día recuerda Ciénaga a Tomasita?', a: 'El 20 de enero, día de San Sebastián', wrong: ['El 25 de diciembre', 'El 7 de agosto'],
    why: 'Según la tradición, lo de Tomasita ocurrió un 20 de enero, día de San Sebastián, en plena fiesta. Por eso ese día se conmemora su leyenda, al cierre del Festival del Caimán Cienaguero.' },
  { q: '¿En qué departamento de Colombia queda Ciénaga?', a: 'Magdalena', wrong: ['Antioquia', 'Nariño'],
    why: 'Ciénaga está en el Magdalena, en el Caribe colombiano, entre el mar y la Ciénaga Grande de Santa Marta.' },
  { q: '¿Cómo llegó la historia de Tomasita hasta nuestros días?', a: 'Contada de generación en generación', wrong: ['En un periódico de la época', 'En una película'],
    why: 'Es tradición oral: no aparece en archivos ni documentos. La gente la ha contado de abuelos a nietos durante muchos años.' },
  { q: 'En la danza del caimán, ¿qué hacen los «pescadores»?', a: 'Persiguen y encierran al caimán con arpones de mentira', wrong: ['Pescan peces de verdad', 'Tocan la flauta'],
    why: 'Un danzante lleva el caimán y se balancea en el centro, mientras los «pescadores» lo persiguen y lo encierran, como en la búsqueda de aquella noche.' },
  { q: '¿Cuál de estos instrumentos acompaña la danza del caimán?', a: 'El tambor alegre', wrong: ['El violín', 'La batería eléctrica'],
    why: 'Se acompaña con instrumentos de la costa: tambora, tambor alegre, llamador, caña de millo y guacharaca.' },
  { q: 'En las pausas de la danza, ¿qué hacen los verseadores?', a: 'Improvisan versos y el coro responde', wrong: ['Cuentan chistes', 'Reparten dulces'],
    why: 'En las pausas, los verseadores improvisan versos y un coro repite el desenlace de la historia.' },
  { q: 'Hay otra leyenda del Magdalena con la que no se debe confundir esta historia. ¿Cuál es?', a: 'El Hombre Caimán, de Plato', wrong: ['El Silbón', 'La Patasola'],
    why: 'El Hombre Caimán es otra leyenda, de Plato (Magdalena). La del Caimán Cienaguero es la de Tomasita, en Ciénaga.' },
  { q: 'Según algunos relatos, ¿en qué pueblo vecino de Ciénaga nació la historia?', a: 'Pueblo Viejo', wrong: ['Cartagena', 'Leticia'],
    why: 'Se dice que el relato nació en Pueblo Viejo, vecino de Ciénaga. Como toda historia oral, tiene varias versiones.' },
  { q: '¿Qué son los palafitos de la Ciénaga Grande?', a: 'Casas construidas sobre pilotes en el agua', wrong: ['Canoas de pesca', 'Instrumentos musicales'],
    why: 'En la Ciénaga Grande de Santa Marta hay pueblos enteros de palafitos: casas sobre pilotes, rodeadas de agua.' },
  { q: '¿Con qué desfile se abre el Festival del Caimán Cienaguero?', a: 'El de los «machorros»', wrong: ['Un desfile militar', 'Un desfile de carros antiguos'],
    why: 'El festival lo abre el desfile de los «machorros», hombres disfrazados de mujer, como en los orígenes de la fiesta. Después vienen la Gran Parada de Caimanes, los verseadores y los bailes.' },
  { q: '¿Qué reconocimiento celebró el festival en 2026?', a: 'Patrimonio Cultural Inmaterial de la Nación', wrong: ['Récord Guinness', 'Reserva natural'],
    why: 'En 2026 el Festival del Caimán Cienaguero celebró su edición 63 y su declaratoria como Patrimonio Cultural Inmaterial de la Nación.' },
  { q: '¿Por qué Ciénaga convirtió esta historia en fiesta?', a: 'Para que nadie olvidara a Tomasita', wrong: ['Para vender caimanes', 'Porque Tomasita era una reina'],
    why: 'Ciénaga convirtió el dolor en memoria, y la memoria en fiesta. Mientras alguien cuente la historia, Tomasita no se pierde.' },
  { q: '¿Qué caimán real vive en el Caribe colombiano?', a: 'El caimán aguja', wrong: ['El dragón de Komodo', 'El cocodrilo del Nilo'],
    why: 'El caimán aguja (Crocodylus acutus) es una especie real del Caribe colombiano. Es un animal silvestre que hay que proteger.' }
];
const QUIZ_LEN = 8;

class Quiz {
  constructor(ui) {
    this.ui = ui;
    this.$ = ui.$;
    this.best = 0;
    try { this.best = +localStorage.getItem('caiman_quiz_best') || 0; } catch (e) { /* sin almacenamiento */ }
  }

  start() {
    this.qs = QUIZ_QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, QUIZ_LEN)
      .map(q => ({ q: q.q, why: q.why, a: q.a, opts: [q.a, ...q.wrong].sort(() => Math.random() - 0.5) }));
    this.i = 0; this.right = 0;
    this.render();
  }

  render() {
    const q = this.qs[this.i], opts = this.$('quiz-opts');
    this.answered = false;
    this.$('quiz-progress').textContent = `PREGUNTA ${this.i + 1} DE ${this.qs.length} · ACIERTOS ${this.right}`;
    this.$('quiz-q').textContent = q.q;
    this.$('quiz-fb').textContent = ''; this.$('quiz-fb').className = 'quiz-fb';
    this.$('quiz-next').classList.add('hidden');
    opts.innerHTML = '';
    q.opts.forEach((o, k) => {
      const b = document.createElement('button');
      b.className = 'btn quiz-opt';
      b.textContent = `${'ABC'[k]}. ${o}`;
      b.addEventListener('click', () => { AudioFX.init(); this.answer(b, o); });
      b.addEventListener('mouseenter', () => { const list = this.ui.visibleButtons(); this.ui.setFocus(list.indexOf(b)); });
      opts.appendChild(b);
    });
    this.ui.setFocus(0);
  }

  answer(btn, opt) {
    if (this.answered) return;
    this.answered = true;
    const q = this.qs[this.i], ok = opt === q.a;
    if (ok) this.right++;
    this.$('quiz-opts').querySelectorAll('.quiz-opt').forEach(b => {
      b.classList.add('done');
      if (b.textContent.slice(3) === q.a) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    });
    const fb = this.$('quiz-fb');
    fb.className = 'quiz-fb ' + (ok ? 'ok' : 'bad');
    fb.textContent = (ok ? '¡Correcto! ' : 'No exactamente. ') + q.why;
    AudioFX.sfx[ok ? 'right' : 'wrong']();
    this.$('quiz-progress').textContent = `PREGUNTA ${this.i + 1} DE ${this.qs.length} · ACIERTOS ${this.right}`;
    const next = this.$('quiz-next');
    next.textContent = this.i + 1 < this.qs.length ? 'SIGUIENTE' : 'VER RESULTADO';
    next.classList.remove('hidden');
    const list = this.ui.visibleButtons(); this.ui.setFocus(list.indexOf(next));
  }

  next() {
    if (this.finished) { this.finished = false; this.start(); return; }
    if (!this.answered) return;
    this.i++;
    if (this.i < this.qs.length) { this.render(); return; }
    // resultado
    const n = this.right, total = this.qs.length;
    const record = n > this.best;
    if (record) { this.best = n; try { localStorage.setItem('caiman_quiz_best', n); } catch (e) { /* ignorar */ } }
    const medal = n === total ? '¡GUARDIÁN DE LA MEMORIA DE CIÉNAGA!' : n >= 6 ? '¡CONOCEDOR DE LA TRADICIÓN!' : n >= 4 ? '¡VAS MUY BIEN!' : '¡SIGUE APRENDIENDO!';
    this.$('quiz-progress').textContent = record ? `¡NUEVO RÉCORD! · MEJOR: ${this.best}/${total}` : `MEJOR RÉCORD: ${this.best}/${total}`;
    this.$('quiz-q').textContent = `${medal}  Acertaste ${n} de ${total}.`;
    this.$('quiz-opts').innerHTML = '';
    const fb = this.$('quiz-fb');
    fb.className = 'quiz-fb ok';
    fb.textContent = n === total
      ? 'Sabes la historia de Tomasita y la tradición de Ciénaga. Ahora te toca a ti contarla.'
      : 'Juega la historia y abre el Álbum de Ciénaga: ahí están todas las respuestas. ¡Y vuelve a intentarlo!';
    AudioFX.sfx[n >= total / 2 ? 'victory' : 'mission']();
    this.finished = true;
    const nx = this.$('quiz-next'); nx.textContent = 'JUGAR OTRA VEZ'; nx.classList.remove('hidden');
    this.ui.setFocus(0);
  }
}
