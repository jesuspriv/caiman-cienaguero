'use strict';
/* =========================================================
   audio.js — Sonido procedural con Web Audio API.
   No se usan archivos externos: efectos y música se sintetizan
   en tiempo real: una cumbia original con tambora, llamador,
   tambor alegre, guacharaca, maracas, bajo, caña de millo y gaita.
   ========================================================= */
const AudioFX = (() => {
  let ctx = null, master = null, sfxGain = null, musicGain = null, farBus = null;
  let muted = false;
  let musicVol = 1, sfxVol = 1;
  let ambGain = null, ambWant = null, ambName = null, ambBeds = [], ambTimer = null, ambNight = 0, ambClock = 0, ambBell = 12;      // multiplicadores de Opciones (8/10 = nivel original)
  let noiseBuf = null;
  let mode = null, step = 0, nextTime = 0, timer = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // compresor final para que los tambores no saturen
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(comp);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8 * sfxVol; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.32 * musicVol; musicGain.connect(master);
    // reverberación de plaza (respuesta al impulso generada)
    const verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const dd = ir.getChannelData(ch); for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.22;
    musicGain.connect(verb); verb.connect(verbGain); verbGain.connect(master);
    // fiesta lejana (para el puerto): suave, opaca y con mucha reverberación
    farBus = ctx.createGain(); farBus.gain.value = 0.3;
    const farLp = ctx.createBiquadFilter(); farLp.type = 'lowpass'; farLp.frequency.value = 850;
    farBus.connect(farLp); farLp.connect(verb); farLp.connect(musicGain);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambGain = ctx.createGain(); ambGain.gain.value = 1; ambGain.connect(sfxGain);
    if (ambWant) applyAmbient();
  }

  // Tono simple con envolvente exponencial
  function tone(freq, dur, type = 'square', vol = 0.2, when = 0, dest = null, slideTo = null, abs = false) {
    if (!ctx) return;
    const t = abs ? when : ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Ruido filtrado (agua, maracas, guacharaca)
  function noise(dur, vol = 0.3, when = 0, ftype = 'lowpass', freq = 1000, dest = null, q = 1, abs = false, sweepTo = null) {
    if (!ctx) return;
    const t = abs ? when : ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxGain);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  const sfx = {
    blip() { tone(560 + Math.random() * 90, 0.035, 'square', 0.025); },
    select() { tone(520, 0.07, 'square', 0.08); tone(780, 0.09, 'square', 0.07, 0.05); },
    talk() { tone(440, 0.07, 'sine', 0.12); tone(587, 0.09, 'sine', 0.1, 0.06); },
    pickup() { [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.16, i * 0.07)); },
    clue() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.17, i * 0.08)); },
    mission() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.07, i * 0.09)); },
    hurt() { tone(320, 0.32, 'sawtooth', 0.14, 0, null, 70); noise(0.25, 0.2, 0, 'lowpass', 900); },
    splash() { noise(1.1, 0.55, 0, 'lowpass', 2600, null, 1, false, 180); tone(170, 0.6, 'sine', 0.22, 0, null, 50); noise(0.5, 0.2, 0.25, 'bandpass', 1500, null, 2); },
    smallSplash() { noise(0.45, 0.35, 0, 'lowpass', 2200, null, 1, false, 300); },
    bubbles() { for (let i = 0; i < 7; i++) tone(260 + Math.random() * 500, 0.07, 'sine', 0.08, i * 0.13, null, 900); },
    magic() { for (let i = 0; i < 14; i++) tone(392 * Math.pow(1.122, i), 0.35, 'triangle', 0.05, i * 0.07); noise(1.6, 0.06, 0, 'highpass', 5000); },
    reveal() { tone(98, 1.3, 'sawtooth', 0.1, 0, null, 49); tone(147, 1.3, 'triangle', 0.08, 0.1, null, 73); noise(1.0, 0.12, 0, 'lowpass', 420); },
    gate() { noise(0.45, 0.25, 0, 'bandpass', 420, null, 4); tone(180, 0.3, 'square', 0.06); tone(140, 0.3, 'square', 0.05, 0.15); },
    gameover() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'triangle', 0.18, i * 0.26)); },
    victory() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.26, 'square', 0.08, i * 0.13)); },
    alert() { tone(880, 0.1, 'square', 0.08); tone(660, 0.16, 'square', 0.08, 0.1); },
    // aviso del caimán: zumbido que sube y burbujas
    stalk() { tone(140, 1.1, 'sawtooth', 0.07, 0, null, 560); tone(70, 1.1, 'sine', 0.12, 0, null, 140); for (let i = 0; i < 6; i++) tone(240 + Math.random() * 400, 0.06, 'sine', 0.06, 0.1 + i * 0.15, null, 800); },
    heartbeat(v = 0.1) { tone(62, 0.14, 'sine', v); tone(54, 0.14, 'sine', v * 0.7, 0.17); },
    album() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, i * 0.06)); },
    chapter() { if (!ctx) return; INST.llamador(ctx.currentTime, sfxGain, 0.9); [392, 494, 587, 784].forEach((f, i) => tone(f, 0.9 - i * 0.1, 'triangle', 0.05, 0.12 + i * 0.12)); },
    /** Pasos según el suelo: grass | dirt | tile | wood | sand. */
    step(surface = 'dirt', run = false) {
      const v = (run ? 1.25 : 1) * (0.8 + Math.random() * 0.4);
      switch (surface) {
        case 'grass': noise(0.07, 0.045 * v, 0, 'lowpass', 650 + Math.random() * 200); break;
        case 'tile': noise(0.03, 0.04 * v, 0, 'highpass', 2600); tone(900 + Math.random() * 300, 0.025, 'sine', 0.018 * v); break;
        case 'wood': tone(150 + Math.random() * 30, 0.08, 'sine', 0.09 * v, 0, null, 85); noise(0.04, 0.035 * v, 0, 'bandpass', 800, null, 1.5); break;
        case 'sand': noise(0.09, 0.05 * v, 0, 'bandpass', 2300, null, 0.6, false, 1400); break;
        default: noise(0.06, 0.055 * v, 0, 'bandpass', 1500 + Math.random() * 300, null, 1.1);
      }
    },
    // animales del pueblo
    cluck() { for (let i = 0; i < 3; i++) tone(520 + Math.random() * 120, 0.06, 'square', 0.02, i * 0.09, null, 380); },
    bark() { [0, 0.22].forEach(w => { tone(340, 0.12, 'sawtooth', 0.05, w, null, 180); noise(0.1, 0.04, w, 'bandpass', 900, null, 2); }); },
    flap() { for (let i = 0; i < 5; i++) noise(0.05, 0.05, i * 0.06, 'bandpass', 1200, null, 0.8); },
    pet() { [660, 880].forEach((f, i) => tone(f, 0.12, 'sine', 0.06, i * 0.1)); },
    // minijuego del verseador
    right() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, i * 0.07)); noise(0.6, 0.05, 0.1, 'bandpass', 1200, null, 0.7); },
    wrong() { tone(220, 0.18, 'square', 0.05, 0, null, 160); tone(165, 0.24, 'square', 0.05, 0.14, null, 120); },
    // instrumentos del minijuego del tambor
    alegre() { INST.alegre(ctx.currentTime, sfxGain, 1.2, false); },
    llamador() { INST.llamador(ctx.currentTime, sfxGain, 1); },
    maraca(v = 0.04) { noise(0.04, v, 0, 'highpass', 7000); },
    bajo(f = 98) { tone(f, 0.5, 'triangle', 0.15); },
    gaita(semi = 0) { tone(587 * Math.pow(2, semi / 12), 0.23, 'triangle', 0.06); },
    click(strong = false) { tone(strong ? 1320 : 990, 0.04, 'square', 0.06); }
  };

  /* ---------------- Instrumentos de cumbia ----------------
     Todos se sintetizan: parches con caída de afinación, ruido
     filtrado para guacharaca y maracas, y una caña de millo con
     timbre nasal y vibrato. t = tiempo absoluto, d = destino. */
  function perc(t, d, f0, f1, dur, vol) {
    const g = ctx.createGain(); g.connect(d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(t, d, type, freq, q, dur, vol, attack = 0.002, sweepTo = null) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(attack, dur * 0.8)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(d);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  function vibrato(t, oscs, rate, depth, delay) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = rate;
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(depth, t + delay);
    lfo.connect(lg); oscs.forEach(o => lg.connect(o.frequency));
    lfo.start(t); return lfo;
  }

  const INST = {
    // tambora: golpe grave en el parche
    tambora(t, d, v = 1) { perc(t, d, 115, 52, 0.42, 0.5 * v); hiss(t, d, 'lowpass', 380, 0.7, 0.09, 0.16 * v); },
    // golpe en el aro de la tambora (madera)
    rim(t, d, v = 1) { hiss(t, d, 'bandpass', 2400, 5, 0.045, 0.2 * v); perc(t, d, 950, 720, 0.03, 0.035 * v); },
    // llamador: marca el contratiempo
    llamador(t, d, v = 1) { perc(t, d, 215, 140, 0.17, 0.36 * v); hiss(t, d, 'bandpass', 950, 1.4, 0.05, 0.11 * v); },
    // tambor alegre: golpe abierto o "slap"
    alegre(t, d, v = 1, slap = false) {
      if (slap) { hiss(t, d, 'bandpass', 1800, 1.1, 0.08, 0.34 * v); perc(t, d, 360, 280, 0.07, 0.12 * v); }
      else { perc(t, d, 325, 230, 0.24, 0.32 * v); hiss(t, d, 'bandpass', 1300, 1.5, 0.04, 0.09 * v); }
    },
    // guacharaca: raspado que sube de brillo
    guacharaca(t, d, dur, v = 0.07) { hiss(t, d, 'bandpass', 3600, 1.6, dur, v, dur * 0.65, 7200); },
    maraca(t, d, v = 0.03) { hiss(t, d, 'highpass', 7500, 0.8, 0.05, v, 0.004); },
    bass(t, d, f, dur, v = 0.2) {
      const g = ctx.createGain(); g.connect(d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(g);
      [[f, 'triangle', 1], [f * 2, 'sine', 0.35]].forEach(([fr, ty, gv]) => {
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = ty; o.frequency.value = fr; og.gain.value = gv;
        o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.02);
      });
    },
    // acompañamiento corto tipo acordeón ("chucu")
    comp(t, d, freqs, v = 0.022) {
      const g = ctx.createGain(); g.connect(d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.connect(g);
      freqs.forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t); o.stop(t + 0.15); });
    },
    // caña de millo: timbre nasal (cuadrada + sierra filtradas), vibrato y soplo
    cana(t, d, f, dur, v = 0.06) {
      const g = ctx.createGain(); g.connect(d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.025);
      g.gain.setValueAtTime(v, t + Math.max(0.03, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; lp.connect(g);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.1; bp.connect(lp);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o1.type = 'square'; o2.type = 'sawtooth'; g2.gain.value = 0.5;
      [o1, o2].forEach((o, i) => { const fr = f * (i ? 1.004 : 1); o.frequency.setValueAtTime(fr * 0.97, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.04); });
      o1.connect(bp); o2.connect(g2); g2.connect(bp);
      const lfo = vibrato(t, [o1, o2], 5.6, f * 0.012, Math.min(0.3, dur * 0.6));
      const end = t + dur + 0.08;
      o1.start(t); o2.start(t); o1.stop(end); o2.stop(end); lfo.stop(end);
      hiss(t, d, 'bandpass', f * 2.5, 2, dur, v * 0.22, 0.02);
    },
    // gaita: flauta suave con soplo
    gaita(t, d, f, dur, v = 0.07) {
      const g = ctx.createGain(); g.connect(d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.05);
      g.gain.setValueAtTime(v, t + Math.max(0.06, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = 0.18;
      o1.connect(g); o2.connect(g2); g2.connect(g);
      const lfo = vibrato(t, [o1, o2], 5, f * 0.009, Math.min(0.35, dur * 0.6));
      const end = t + dur + 0.1;
      o1.start(t); o2.start(t); o1.stop(end); o2.stop(end); lfo.stop(end);
      hiss(t, d, 'bandpass', f * 1.5, 3, dur, v * 0.35, 0.04);
    }
  };

  /* ---------------- Música procedural ---------------- */
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  const hz = (base, semi) => base * Math.pow(2, semi / 12);
  const mt = (f, d, type, v, t, slide) => tone(f, d, type, v, t, musicGain, slide || null, true);
  const mn = (d, v, t, type, f, q) => noise(d, v, t, type, f, musicGain, q || 1, true);

  // Acordes en semitonos sobre la tónica y patrones del tambor alegre (paso, slap)
  const CHORD = { I: [0, 4, 7], IV: [5, 9, 12], V: [7, 11, 14] };
  const ROOT = { I: 0, IV: 5, V: 7 };
  const ALEGRE = [
    [[0, 0], [3, 0], [6, 1], [8, 0], [11, 0], [14, 1]],
    [[0, 0], [2, 1], [6, 0], [8, 0], [10, 1], [12, 0], [14, 0]],
    [[0, 1], [3, 0], [4, 0], [7, 1], [8, 0], [11, 0], [13, 1], [14, 0]],
    [[0, 0], [6, 1], [8, 0], [11, 1], [14, 0], [15, 0]]
  ];

  /** Base de cumbia para un paso (semicorchea) del compás. */
  function groove(s, t, sd, d, o) {
    const k = s % 16, bar = Math.floor(s / 16);
    const ch = o.chords[bar % o.chords.length];
    if (k === 0) INST.tambora(t, d, 1);
    if (k === 8) INST.tambora(t, d, 0.6);
    if (k % 4 === 2) INST.rim(t, d, 0.5);
    if (k === 4 || k === 12) INST.llamador(t, d, 1);
    if (o.guach) {
      const b = k % 4;
      if (b === 0) INST.guacharaca(t, d, sd * 1.7, 0.07 * o.guach);
      else if (b >= 2) INST.guacharaca(t, d, sd * 0.75, 0.045 * o.guach);
    }
    if (o.maracas) INST.maraca(t, d, (k % 2 ? 0.018 : 0.03) * o.maracas);
    if (o.alegre) {
      const h = ALEGRE[(bar * 7 + 3) % ALEGRE.length].find(p => p[0] === k);
      if (h) INST.alegre(t, d, o.alegre, !!h[1]);
    }
    if (o.bass) {
      const r = o.bass * Math.pow(2, ROOT[ch] / 12);
      if (k === 0) INST.bass(t, d, r, sd * 3.5);
      if (k === 8) INST.bass(t, d, r * 1.5, sd * 3.5);
      if (o.walk && k === 14) INST.bass(t, d, r * Math.pow(2, 4 / 12), sd * 1.6, 0.14);
    }
    if (o.comp && k % 4 === 2) INST.comp(t, d, CHORD[ch].map(n => o.comp * Math.pow(2, n / 12)));
  }

  // Melodías originales: [paso, semitono, duración en pasos], 8 compases.
  const MEL_PUEBLO = [
    [0, 7, 2], [2, 9, 2], [4, 7, 2], [6, 4, 2], [8, 2, 4], [12, 4, 4],
    [16, 7, 3], [19, 4, 1], [20, 2, 2], [22, 0, 2], [24, 2, 8],
    [32, 4, 2], [34, 5, 2], [36, 9, 2], [38, 7, 2], [40, 12, 4], [44, 9, 4],
    [48, 7, 6], [54, 4, 2], [56, 7, 8],
    [64, 14, 2], [66, 11, 2], [68, 9, 2], [70, 7, 2], [72, 11, 4], [76, 9, 4],
    [80, 7, 3], [83, 9, 1], [84, 11, 2], [86, 9, 2], [88, 7, 8],
    [96, 4, 2], [98, 7, 2], [100, 9, 2], [102, 12, 2], [104, 11, 2], [106, 9, 2], [108, 7, 4],
    [112, 2, 4], [116, 4, 2], [118, 2, 2], [120, 0, 8]
  ];
  const MEL_FIESTA = [
    [0, 0, 1], [1, 2, 1], [2, 4, 2], [4, 7, 2], [6, 4, 2], [8, 7, 3], [11, 9, 1], [12, 7, 4],
    [16, 4, 2], [18, 2, 2], [20, 0, 2], [22, 2, 2], [24, 4, 6], [30, 2, 2],
    [32, 7, 1], [33, 9, 1], [34, 11, 2], [36, 14, 2], [38, 11, 2], [40, 9, 3], [43, 7, 1], [44, 9, 4],
    [48, 11, 2], [50, 9, 2], [52, 7, 2], [54, 9, 2], [56, 7, 6],
    [64, 7, 1], [65, 9, 1], [66, 12, 2], [68, 14, 2], [70, 12, 2], [72, 9, 3], [75, 7, 1], [76, 9, 4],
    [80, 12, 2], [82, 9, 2], [84, 7, 2], [86, 4, 2], [88, 7, 4], [92, 9, 4],
    [96, 11, 2], [98, 14, 2], [100, 11, 2], [102, 9, 2], [104, 7, 4], [108, 4, 2], [110, 2, 2],
    [112, 0, 6], [118, 2, 1], [119, 4, 1], [120, 0, 6]
  ];
  const melMap = list => new Map(list.map(n => [n[0], n]));
  const MAP_PUEBLO = melMap(MEL_PUEBLO), MAP_FIESTA = melMap(MEL_FIESTA);

  /** Toca la nota de la melodía que cae en el paso i (si hay). */
  function melody(map, i, t, sd, d, key, voice, v) {
    const n = map.get(i % 128);
    if (!n) return;
    INST[voice](t, d, key * Math.pow(2, n[1] / 12), n[2] * sd * 0.92, v);
  }

  const FIESTA_OPTS = { chords: ['I', 'I', 'V', 'V', 'I', 'I', 'V', 'I'], guach: 1, maracas: 1, alegre: 0.9, bass: 146.8, walk: true, comp: 293.7 };

  const MODES = {
    // Guitarra suave para la casa del abuelo y el menú
    calm: {
      bpm: 80,
      play(s, t, sd) {
        const prog = [[57, 61, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]];
        const ch = prog[Math.floor(s / 16) % 4].map(n => 440 * Math.pow(2, (n - 69) / 12));
        if (s % 8 === 0) mt(ch[0] / 2, sd * 7, 'triangle', 0.16, t);
        if (s % 2 === 0) mt(ch[(s / 2) % 3] * 2, sd * 3, 'triangle', 0.045, t);
        if (s % 16 === 10) mt(ch[2] * 2, sd * 6, 'sine', 0.05, t);
      }
    },
    // Cumbia cienaguera original, lenta, para el pueblo al atardecer (Sol mayor)
    pueblo: {
      bpm: 94,
      play(s, t, sd) {
        groove(s, t, sd, musicGain, { chords: ['I', 'I', 'IV', 'I', 'V', 'V', 'I', 'I'], guach: 1, alegre: 0.55, bass: 98, comp: 196 });
        if (s >= 32) {
          const cyc = Math.floor((s - 32) / 128);
          melody(MAP_PUEBLO, s - 32, t, sd, musicGain, 392, cyc % 2 ? 'gaita' : 'cana', cyc % 2 ? 0.075 : 0.055);
        }
      }
    },
    // Noche en el puerto: pad grave, grillos y la fiesta sonando a lo lejos
    night: {
      bpm: 94,
      play(s, t, sd) {
        if (s % 16 === 0) {
          const roots = [110, 98, 87, 98];
          const r = roots[Math.floor(s / 16) % 4];
          mt(r, sd * 15, 'sine', 0.09, t); mt(r * 1.5, sd * 15, 'sine', 0.04, t);
        }
        if (Math.random() < 0.25) { for (let i = 0; i < 3; i++) mt(4200 + Math.random() * 300, 0.03, 'sine', 0.012, t + i * 0.05); }
        const k = s % 16;
        if (k === 4 || k === 12) INST.llamador(t, farBus, 0.8);
        if (k === 0) INST.tambora(t, farBus, 0.7);
        const h = ALEGRE[Math.floor(s / 16) % ALEGRE.length].find(p => p[0] === k);
        if (h && Math.random() < 0.7) INST.alegre(t, farBus, 0.6, !!h[1]);
        if (s % 32 === 20) mt(hz(220, PENTA[Math.floor(Math.random() * 5)]), sd * 6, 'triangle', 0.03, t);
      }
    },
    // Tensión cuando aparece el caimán
    danger: {
      bpm: 112,
      play(s, t, sd) {
        if (s % 4 === 0) mt(65, sd * 2, 'sawtooth', 0.07, t, 55);
        if (s % 8 === 6) mt(130, 0.2, 'sine', 0.14, t, 70);
        if (s % 16 === 0) mt(hz(220, [0, 1, 0, 3][Math.floor(s / 16) % 4]), sd * 12, 'triangle', 0.04, t);
        if (Math.random() < 0.15) for (let i = 0; i < 3; i++) mt(4300, 0.03, 'sine', 0.01, t + i * 0.05);
      }
    },
    // Fiesta: cumbia cienaguera original con caña de millo y gaita (Re mayor)
    fiesta: {
      bpm: 116,
      play(s, t, sd) {
        groove(s, t, sd, musicGain, FIESTA_OPTS);
        if (s >= 16) {
          const i = s - 16, cyc = Math.floor(i / 128);
          melody(MAP_FIESTA, i, t, sd, musicGain, 587.3, cyc % 2 ? 'gaita' : 'cana', cyc % 2 ? 0.08 : 0.06);
        }
      }
    }
  };

  /** Acompañamiento del minijuego (paso k desde el primer golpe): todo menos el tambor alegre. */
  function backing(k) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.01, sd = 60 / 116 / 4;
    groove(k, t, sd, musicGain, Object.assign({}, FIESTA_OPTS, { alegre: 0 }));
    if (k >= 32) melody(MAP_FIESTA, k - 32, t, sd, musicGain, 587.3, 'cana', 0.06);
  }

  function scheduler() {
    if (!ctx || !mode) return;
    const m = MODES[mode];
    const sd = 60 / m.bpm / 4;
    while (nextTime < ctx.currentTime + 0.12) {
      m.play(step, nextTime, sd);
      nextTime += sd;
      step++;
    }
  }

  function music(name) {
    if (!ctx) { mode = name; return; }
    if (name === mode && timer) return;
    mode = name || null;
    step = 0;
    nextTime = ctx.currentTime + 0.06;
    if (!timer) timer = setInterval(scheduler, 30);
  }

  /* ---------- Sonido ambiente por escena ---------- */
  function bed(type, freq, q, vol) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.gain.setTargetAtTime(vol, ctx.currentTime, 1);
    src.connect(f); f.connect(g); g.connect(ambGain);
    src.start(ctx.currentTime, Math.random() * 1.5);
    return { src, f, g, vol };
  }
  const A = (f, d, type, v, w, slide) => tone(f, d, type, v, w || 0, ambGain, slide || null);
  const AN = (d, v, w, type, f, q, sweep) => noise(d, v, w || 0, type, f, ambGain, q || 1, false, sweep || null);
  const amb = {
    chirp() { const b = 2600 + Math.random() * 1800, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) A(b + Math.random() * 600, 0.05, 'sine', 0.022, i * 0.075, b * 1.4); },
    mulata() { A(1300, 0.22, 'sine', 0.02, 0, 3600); A(3400, 0.08, 'sine', 0.014, 0.25, 2200); },  // maría mulata
    crickets(v = 0.01) { const f = 4200 + Math.random() * 500; for (let i = 0; i < 6; i++) A(f, 0.025, 'sine', v, i * 0.045); },
    frog() { const f = 150 + Math.random() * 90; for (let i = 0; i < 3; i++) A(f, 0.07, 'sawtooth', 0.018, i * 0.12, f * 0.75); },
    lap() { AN(0.5, 0.04, 0, 'lowpass', 500, 1, 250); },
    bell() { [1, 2, 2.4, 3, 4.2].forEach((k, i) => A(196 * k, 3.2 - i * 0.4, 'sine', 0.03 / (i + 1), 0)); },
    cheer() { AN(1.4, 0.05, 0, 'bandpass', 900, 0.6, 1600); for (let i = 0; i < 3; i++) A(1800 + Math.random() * 900, 0.18, 'sine', 0.012, 0.2 + i * 0.25, 2600); },
    tick(hi) { AN(0.02, 0.03, 0, 'highpass', hi ? 4000 : 3000); },
    dog() { [0, 0.25].forEach(w => A(300, 0.1, 'sawtooth', 0.012, w, 180)); }
  };
  function applyAmbient() {
    if (ambWant === ambName) return;
    ambName = ambWant;
    // las capas anteriores se apagan suavemente
    ambBeds.forEach(b => { b.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5); b.src.stop(ctx.currentTime + 3); });
    ambBeds = [];
    if (ambName === 'pueblo') ambBeds = [bed('bandpass', 900, 0.5, 0.018), bed('bandpass', 520, 1.6, 0.02)];   // brisa y murmullo
    else if (ambName === 'puerto') ambBeds = [bed('lowpass', 380, 0.7, 0.05), bed('bandpass', 1400, 0.4, 0.008)]; // olas y brisa
    else if (ambName === 'fiesta') ambBeds = [bed('bandpass', 750, 0.9, 0.045)];                                 // gente
    else if (ambName === 'house') ambBeds = [bed('lowpass', 300, 0.5, 0.01)];
    if (!ambTimer) ambTimer = setInterval(ambientTick, 100);
  }
  function ambientTick() {
    if (!ctx || !ambName || muted) return;
    const r = Math.random, n = ambNight, t = ctx.currentTime;
    switch (ambName) {
      case 'pueblo':
        if (r() < 0.06 * (1 - n)) amb.chirp();
        if (r() < 0.012 * (1 - n)) amb.mulata();
        if (r() < 0.05 * n) amb.crickets(0.008);
        if (r() < 0.003) amb.dog();
        ambBell -= 0.1;
        if (ambBell <= 0) { ambBell = 45 + r() * 30; amb.bell(); setTimeout(() => ambName === 'pueblo' && amb.bell(), 1600); }
        if (ambBeds[1]) ambBeds[1].g.gain.setTargetAtTime(0.012 + 0.016 * (0.5 + Math.sin(t * 0.3) * 0.5) * (1 - n * 0.6), t, 0.4);
        break;
      case 'puerto':
        if (r() < 0.07) amb.frog();
        if (r() < 0.12) amb.crickets(0.009);
        if (r() < 0.04) amb.lap();
        if (ambBeds[0]) ambBeds[0].g.gain.setTargetAtTime(0.025 + 0.04 * (0.5 + Math.sin(t * 0.55) * 0.5), t, 0.3);
        break;
      case 'fiesta':
        if (r() < 0.012) amb.cheer();
        if (ambBeds[0]) ambBeds[0].g.gain.setTargetAtTime(0.035 + 0.02 * (0.5 + Math.sin(t * 0.4) * 0.5), t, 0.5);
        break;
      case 'house':
        ambClock += 0.1;
        if (ambClock >= 1) { ambClock = 0; amb.tick((t | 0) % 2 === 0); }
        if (r() < 0.015 * (1 - n)) amb.chirp();
        if (r() < 0.04 * n) amb.crickets(0.006);
        break;
    }
  }

  function setMuted(v) {
    muted = v;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05);
  }

  return {
    init,
    sfx: new Proxy(sfx, { get: (o, k) => (...a) => { if (ctx && !muted && o[k]) o[k](...a); } }),
    music: (name) => { music(name); },
    backing,
    start() { init(); if (mode && !timer && ctx) { const m = mode; mode = null; music(m); } },
    toggleMute() { setMuted(!muted); return muted; },
    get muted() { return muted; },
    /** Ambiente de la escena ('pueblo', 'puerto', 'fiesta', 'house' o null). */
    ambient(name) { ambWant = name || null; if (ctx) applyAmbient(); },
    /** 0 = de día, 1 = de noche (cambia pájaros por grillos). */
    set ambientNight(k) { ambNight = Math.max(0, Math.min(1, k)); },
    /** m y s entre 0 y 1 (0.8 = volumen original). */
    setVolumes(m, s) {
      musicVol = m / 0.8; sfxVol = s / 0.8;
      if (!ctx) return;
      musicGain.gain.setTargetAtTime(0.32 * musicVol, ctx.currentTime, 0.05);
      sfxGain.gain.setTargetAtTime(0.8 * sfxVol, ctx.currentTime, 0.05);
    },
    get muted() { return muted; }
  };
})();
