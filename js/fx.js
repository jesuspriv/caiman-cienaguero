'use strict';
/* =========================================================
   fx.js — Capa de efectos gráficos con PixiJS (WebGL).
   El juego se sigue dibujando en su canvas 2D de siempre; esta
   capa toma esa imagen cada cuadro y le aplica, con la tarjeta
   gráfica:
     · agua que se ondula y brilla (solo donde hay agua),
     · resplandor (bloom) en faroles, velas y luciérnagas,
     · tono de color por escena,
     · separación de colores cuando el caimán está cerca,
     · onda expansiva al recibir un golpe,
     · grano de película suave.
   Si el navegador no tiene WebGL, o si el juego va lento, la capa
   se apaga sola y el juego se ve como antes. También se puede
   apagar en Opciones → GRÁFICOS.
   ========================================================= */

const FX_WATER_FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uMask;
uniform highp vec4 uInputSize;
uniform highp vec4 uOutputFrame;
uniform highp float uTime;
uniform float uAmp;
uniform highp vec4 uWorld;      // camera x, y + visible world size

void main(void) {
  vec2 suv = vTextureCoord * uInputSize.xy / uOutputFrame.zw;   // 0..1 on screen
  float m = texture(uMask, suv).r;
  if (m < 0.01) { finalColor = texture(uTexture, vTextureCoord); return; }
  vec2 wp = uWorld.xy + suv * uWorld.zw;                         // world pixel
  float t = uTime;
  vec2 off = vec2(
    sin(wp.y * 0.11 + t * 2.1 + sin(wp.x * 0.035 + t * 0.7) * 2.0),
    cos(wp.x * 0.07 - t * 1.6 + wp.y * 0.05)
  ) * uAmp * m;
  vec4 col = texture(uTexture, vTextureCoord + off * uInputSize.zw);
  // sparkles on the ripples
  float s = sin(wp.x * 0.045 + wp.y * 0.12 + t * 1.4) * sin(wp.x * 0.083 - wp.y * 0.05 - t * 1.1);
  s = pow(max(s, 0.0), 18.0);
  float lum = dot(col.rgb, vec3(0.3, 0.55, 0.15));
  col.rgb += vec3(0.75, 0.9, 1.0) * s * m * (0.06 + lum * 0.25);
  finalColor = col;
}`;

/* Tono de color por escena: saturación, contraste, brillo y tinte. */
const FX_GRADES = {
  menu: { saturation: 1.15, contrast: 1.03, brightness: 1.04, red: 1.02, green: 1, blue: 1.03 },
  HouseScene: { saturation: 1.1, contrast: 1.02, brightness: 1.04, red: 1.04, green: 1.01, blue: 0.97 },
  PuebloScene: { saturation: 1.14, contrast: 1.03, brightness: 1.04, red: 1.03, green: 1.01, blue: 0.98 },
  PuertoScene: { saturation: 1.08, contrast: 1, brightness: 1.1, red: 0.98, green: 1.02, blue: 1.06 },
  FiestaScene: { saturation: 1.2, contrast: 1.03, brightness: 1.06, red: 1.04, green: 1, blue: 1 },
  default: { saturation: 1.1, contrast: 1.02, brightness: 1.04, red: 1, green: 1, blue: 1 }
};

const FX = (() => {
  let app = null, game = null, source = null, sprite = null;
  let water = null, bloom = null, adjust = null, split = null, shock = null, noise = null;
  let maskCanvas = null, maskCtx = null, maskSource = null;
  let ready = false, failed = false, lastW = 0, lastH = 0;
  let prevHit = 0, shockT = -1, time = 0;
  let lightMode = false;
  const perf = { start: 0, frames: 0, last: 0 };
  const MW = 240, MH = 135;     // resolución de la máscara de agua

  const enabled = () => ready && !failed && Settings.data.gfx !== false;

  async function init(g) {
    game = g;
    if (!window.PIXI || !PIXI.filters) { failed = true; return; }
    try {
      app = new PIXI.Application();
      await app.init({
        width: g.canvas.width, height: g.canvas.height, preference: 'webgl',
        antialias: false, resolution: 1, autoStart: false, sharedTicker: false,
        background: '#000000', powerPreference: 'high-performance'
      });
      app.ticker.stop();
      const c = app.canvas;
      c.id = 'fx-layer';
      g.canvas.after(c);

      source = new PIXI.CanvasSource({ resource: g.canvas });
      sprite = new PIXI.Sprite(new PIXI.Texture({ source }));
      app.stage.addChild(sprite);

      maskCanvas = document.createElement('canvas');
      maskCanvas.width = MW; maskCanvas.height = MH;
      maskCtx = maskCanvas.getContext('2d');
      maskSource = new PIXI.CanvasSource({ resource: maskCanvas });

      water = new PIXI.Filter({
        glProgram: PIXI.GlProgram.from({ vertex: PIXI.filters.vertex, fragment: FX_WATER_FRAG, name: 'agua-cienaga' }),
        resources: {
          aguaUniforms: {
            uTime: { value: 0, type: 'f32' },
            uAmp: { value: 2.2, type: 'f32' },
            uWorld: { value: new Float32Array([0, 0, 960, 540]), type: 'vec4<f32>' }
          },
          uMask: maskSource
        }
      });
      water.padding = 0;
      adjust = new PIXI.filters.AdjustmentFilter(FX_GRADES.default);
      bloom = new PIXI.filters.AdvancedBloomFilter({ threshold: 0.8, bloomScale: 0.5, brightness: 1, blur: 4, quality: 4 });
      split = new PIXI.filters.RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
      shock = new PIXI.filters.ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: 22, wavelength: 140, speed: 620, brightness: 1.15, radius: -1 });
      noise = new PIXI.NoiseFilter({ noise: 0.035, seed: Math.random() });
      ready = true;
      resize();
    } catch (e) {
      console.warn('Efectos gráficos desactivados:', e);
      failed = true;
      if (app && app.canvas) app.canvas.remove();
    }
  }

  function resize() {
    const w = game.canvas.width, h = game.canvas.height;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    app.renderer.resize(w, h);
    source.resize(w, h);
    sprite.texture = new PIXI.Texture({ source });
    sprite.width = w; sprite.height = h;
  }

  /** Dibuja en la máscara (en coordenadas de pantalla 960x540) dónde hay agua. */
  function buildMask() {
    const c = maskCtx, g = game;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, MW, MH);
    c.setTransform(MW / g.W, 0, 0, MH / g.H, 0, 0);
    c.fillStyle = '#fff';
    let any = false;
    if (g.state === 'menu' || !g.scene) {
      c.fillRect(0, 338, g.W, g.H - 338); any = true;          // el río del menú
    } else if (g.minigame) {
      if (g.minigame.waterMask) { g.minigame.waterMask(c); any = true; }
    } else if (!g.mapOpen && !(g.chapter && g.chapterA > 0.02) && g.scene.water.length) {
      const z = g.zoom, cx = g.cam.x, cy = g.cam.y;
      c.save(); c.scale(z, z); c.translate(-cx, -cy);
      g.scene.water.forEach(w => c.fillRect(w.x, w.y, w.w, w.h));
      c.fillStyle = '#000';
      g.scene.docks.forEach(d => c.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4));
      c.restore();
      any = true;
    }
    maskSource.update();
    return any;
  }

  /** Se llama después de game.draw(): copia el canvas y aplica los efectos. */
  function render(dt) {
    const on = enabled();
    if (app) app.canvas.style.display = on ? 'block' : 'none';
    if (!on) return;
    resize();
    time += dt;
    const g = game, fxOn = Settings.data.effects;

    // si el juego va lento (menos de 28 cuadros por segundo durante 4 s seguidos),
    // primero se quita el bloom y luego toda la capa. Las pausas largas (pestaña
    // oculta, carga) no cuentan.
    const now = performance.now();
    if (now - perf.last > 250 || document.hidden) { perf.start = now; perf.frames = 0; }
    perf.last = now; perf.frames++;
    if (now - perf.start > 4000) {
      const fps = perf.frames * 1000 / (now - perf.start);
      perf.start = now; perf.frames = 0;
      if (fps < 28) {
        if (!lightMode) { lightMode = true; console.info('Efectos: modo ligero'); }
        else { failed = true; app.canvas.style.display = 'none'; console.info('Efectos: desactivados por rendimiento'); return; }
      }
    }

    const list = [];
    if (buildMask()) {
      water.resources.aguaUniforms.uniforms.uTime = time;
      const u = water.resources.aguaUniforms.uniforms.uWorld;
      if (g.state === 'menu' || !g.scene) { u[0] = 0; u[1] = 0; u[2] = g.W; u[3] = g.H; }
      else if (g.minigame) { u[0] = 0; u[1] = -(g.minigame.scroll || 0); u[2] = g.W; u[3] = g.H; }
      else { u[0] = g.cam.x; u[1] = g.cam.y; u[2] = g.VW; u[3] = g.VH; }
      water.resources.aguaUniforms.uniforms.uAmp = 2.2 * g.rs;
      list.push(water);
    }

    const key = g.state === 'menu' || !g.scene ? 'menu' : g.scene.constructor.name;
    const gr = FX_GRADES[key] || FX_GRADES.default;
    const d = g.danger || 0;
    adjust.saturation = gr.saturation * (1 - d * 0.35);
    adjust.contrast = gr.contrast + d * 0.08;
    adjust.brightness = gr.brightness;
    adjust.red = gr.red + d * 0.08; adjust.green = gr.green; adjust.blue = gr.blue;
    list.push(adjust);

    // el resplandor solo de noche o en lugares oscuros: de día encandilaría lo blanco
    const night = key === 'menu' || key === 'PuertoScene' || (key === 'PuebloScene' && g.scene.dayK > 0.45);
    if (!lightMode && night) list.push(bloom);

    if (fxOn && d > 0.05) {
      const k = d * (2.2 + Math.sin(time * 9) * 0.8) * g.rs;
      split.red = { x: -k, y: 0 }; split.blue = { x: k, y: 0 };
      list.push(split);
    }

    if (fxOn && g.hitFlash > prevHit + 0.3 && g.player) {
      const z = g.zoom;
      shock.centerX = (g.player.x - g.cam.x) * z * g.rs;
      shock.centerY = (g.player.y - 20 - g.cam.y) * z * g.rs;
      shock.amplitude = 22 * g.rs; shock.wavelength = 140 * g.rs; shock.speed = 620 * g.rs;
      shockT = 0;
    }
    prevHit = g.hitFlash || 0;
    if (shockT >= 0) {
      shockT += dt; shock.time = shockT;
      if (shockT > 1.1) shockT = -1; else list.push(shock);
    }

    if (!lightMode) { noise.seed = Math.random(); list.push(noise); }

    sprite.filters = list;
    source.update();
    app.renderer.render(app.stage);
  }

  /** Onda expansiva en un punto de la pantalla (coordenadas 960x540). */
  function shockAt(x, y) {
    if (!enabled() || !Settings.data.effects) return;
    shock.centerX = x * game.rs; shock.centerY = y * game.rs; shockT = 0;
  }

  return { init, render, shockAt, get active() { return enabled(); }, get app() { return app; } };
})();
