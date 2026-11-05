'use strict';
/* =========================================================
   missions.js — Progresión lineal de misiones.
   Solo la misión actual puede avanzar: no se pueden saltar etapas.
   ========================================================= */

const MISSION_LIST = [
  { id: 'abuelo', title: 'Habla con el abuelo', hint: 'Acércate al abuelo y presiona E.', goal: 1 },
  { id: 'figura', title: 'Toca la figura de caimán', hint: 'La figura de madera está sobre la mesa.', goal: 1 },
  { id: 'habitantes', title: 'Conoce a la gente del pueblo', hint: 'Tomasita, el pescador, la vendedora y el anciano.', goal: 4 },
  { id: 'pistas', title: 'Encuentra las tres pistas', hint: 'Una flor, una vela y una cinta. Algunas necesitarán ayuda.', goal: 3 },
  { id: 'puerto', title: 'Llega al Puerto Cachimbero', hint: 'Sigue el camino del este, hacia el agua.', goal: 1 },
  { id: 'caiman', title: 'Encuéntrate con el caimán', hint: 'Avanza por la orilla del puerto.', goal: 1 },
  { id: 'tomasita', title: 'Descubre la historia de Tomasita', hint: 'Llega a las velas del final del puerto. Escóndete en los juncos, no corras y busca las antorchas.', goal: 1 },
  { id: 'regreso', title: 'Regresa al presente', hint: 'Vive la celebración y toca la figura que brilla.', goal: 1 },
  { id: 'festival', title: 'Disfruta el Festival de hoy', hint: 'Recorre la fiesta y, cuando quieras, habla con el abuelo.', goal: 1 }
];

class MissionSystem {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.index = 0;
    this.progress = 0;
    this.hint = MISSION_LIST[0].hint;
  }

  get current() { return MISSION_LIST[this.index] || null; }
  get total() { return MISSION_LIST.length; }

  isCurrent(id) { return !!this.current && this.current.id === id; }

  isDone(id) {
    const i = MISSION_LIST.findIndex(m => m.id === id);
    return i > -1 && i < this.index;
  }

  /** Suma progreso solo si la misión indicada es la actual. */
  addProgress(id, n = 1) {
    if (!this.isCurrent(id)) return false;
    this.progress = Math.min(this.current.goal, this.progress + n);
    this.game.ui.updateMission(true);
    if (this.progress >= this.current.goal) this.complete(id);
    return true;
  }

  complete(id) {
    if (!this.isCurrent(id)) return false;
    const done = this.current;
    this.index++;
    this.progress = 0;
    this.hint = this.current ? this.current.hint : '';
    this.game.onMissionComplete(done, this.current);
    return true;
  }

  setHint(h) {
    this.hint = h;
    this.game.ui.updateMission(true);
  }

  text() {
    const m = this.current;
    if (!m) return '¡Historia completada!';
    return m.goal > 1 ? `${m.title} (${this.progress}/${m.goal})` : m.title;
  }

  serialize() { return { index: this.index, progress: this.progress, hint: this.hint }; }
  restore(s) { this.index = s.index; this.progress = s.progress; this.hint = s.hint; }
}
