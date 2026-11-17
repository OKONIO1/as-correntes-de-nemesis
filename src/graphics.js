// =============================================================
// graphics.js — o "acabamento" visual do jogo 3D:
//
//   Post   → pós-processamento: a cena é desenhada numa imagem
//            invisível e depois recebe BRILHO (bloom), correção
//            de cor por fase, vinheta e granulado de cinema.
//   Env    → "mapa de ambiente": um céu borrado que os metais,
//            a água e as pedras refletem.
//   céu    → céu novo com sol que brilha, nuvens que andam e estrelas.
//   Decor  → grama/pedrinhas no chão e partículas flutuando no ar.
//   Tex.normal → relevo nas texturas de pedra e chão.
// =============================================================

// ---------- trechos de shader usados em vários lugares ----------
const GLSL_NOISE = `
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
`;
const FULLSCREEN_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Visual de cada tema: nuvens, estrelas, partículas no ar, grama e "filtro de cor"
const LOOKS = {
  beach:     { clouds: 0.65, stars: 0, motes: { color: '#fff4d8', n: 160, size: 0.07, rise: 0.05, glow: 1.2 }, grass: { color: '#9a8a48', tip: '#e8d8a0', dens: 0.3, h: 0.7 }, grade: { tint: '#fff2e4', sat: 1.12, contrast: 1.06, bloom: 0.50, vig: 0.24 } },
  temple:    { clouds: 0.5, stars: 0.4, motes: { color: '#ffc8a0', n: 160, size: 0.06, rise: 0.03, glow: 1.4 }, grass: { color: '#7a7040', tip: '#b0a060', dens: 0.06, h: 0.45 }, grade: { exp: 1.05, tint: '#ffe8e8', sat: 1.08, contrast: 1.08, bloom: 0.59, vig: 0.32 } },
  swamp:     { clouds: 0.0, stars: 0, motes: { color: '#b8ff60', n: 120, size: 0.09, rise: 0.0, glow: 4, blink: 1 }, grass: { color: '#2e4a1e', tip: '#7a9a3a', dens: 0.45, h: 0.8 }, grade: { exp: 1.0, tint: '#f0fff0', sat: 0.82, contrast: 1.1, bloom: 0.68, vig: 0.38 } },
  cave:      { clouds: 0.0, stars: 0, motes: { color: '#ffd8a0', n: 140, size: 0.05, rise: 0.02, glow: 1.0 }, pebbles: true, grade: { exp: 1.55, tint: '#fff0e0', sat: 1.0, contrast: 1.06, bloom: 0.72, vig: 0.32 } },
  canyon:    { clouds: 0.35, stars: 0, motes: { color: '#ffd8a8', n: 180, size: 0.06, rise: -0.02, glow: 1.0, wind: 1.2 }, grass: { color: '#8a6a30', tip: '#c8a050', dens: 0.05, h: 0.5 }, grade: { tint: '#fff0e0', sat: 1.1, contrast: 1.08, bloom: 0.50, vig: 0.28 } },
  labyrinth: { clouds: 0.25, stars: 1, motes: { color: '#c8b0ff', n: 120, size: 0.06, rise: 0.02, glow: 2.0 }, pebbles: true, grade: { exp: 1.25, tint: '#f0e8ff', sat: 0.95, contrast: 1.1, bloom: 0.63, vig: 0.38 } },
  styx:      { clouds: 0.3, stars: 1, motes: { color: '#80fff0', n: 140, size: 0.08, rise: 0.08, glow: 3.0, blink: 1 }, pebbles: true, grade: { exp: 1.2, tint: '#e0fff8', sat: 0.9, contrast: 1.1, bloom: 0.72, vig: 0.38 } },
  forge:     { clouds: 0.5, stars: 0, motes: { color: '#ff7a20', n: 220, size: 0.06, rise: 1.2, glow: 5.0, blink: 1 }, pebbles: true, grade: { exp: 1.1, tint: '#fff0e0', sat: 1.1, contrast: 1.12, bloom: 0.81, vig: 0.38 } },
  olympus:   { clouds: 0.8, stars: 0, motes: { color: '#fff0b0', n: 160, size: 0.07, rise: 0.15, glow: 3.0, blink: 1 }, grass: { color: '#6a9a40', tip: '#b8d878', dens: 0.12, h: 0.45 }, grade: { exp: 0.9, tint: '#fffaf0', sat: 1.1, contrast: 1.04, bloom: 0.63, vig: 0.21 } },
  throne:    { clouds: 0.55, stars: 0.5, motes: { color: '#ff4a20', n: 200, size: 0.06, rise: 0.9, glow: 5.0, blink: 1 }, pebbles: true, grade: { exp: 1.1, tint: '#ffe8e0', sat: 1.08, contrast: 1.14, bloom: 0.81, vig: 0.38 } },
};
for (const k in THEMES3D) { THEMES3D[k].key = k; THEMES3D[k].look = LOOKS[k] || LOOKS.beach; }

// -------------------------------------------------------------
// PÓS-PROCESSAMENTO
// -------------------------------------------------------------
const Post = {
  enabled: true,
  bloomOn: true,
  rage: 0, lowHp: 0, hit: 0,

  init(renderer) {
    this.r = renderer;
    this.gl2 = renderer.capabilities.isWebGL2;
    const hf = { type: THREE.HalfFloatType, depthBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.sceneRT.samples = this.gl2 ? 4 : 0;
    this.mips = [];
    for (let i = 0; i < 6; i++) this.mips.push(new THREE.WebGLRenderTarget(4, 4, hf));
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad);

    // 1) pega só as partes MUITO claras da imagem
    this.mPre = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 4.0 }, knee: { value: 0.8 } },
      vertexShader: FULLSCREEN_VS,
      fragmentShader: `
        uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold, knee; varying vec2 vUv;
        void main() {
          vec3 s = (texture2D(tSrc, vUv + texel * vec2(-1, -1)).rgb + texture2D(tSrc, vUv + texel * vec2(1, -1)).rgb
                  + texture2D(tSrc, vUv + texel * vec2(-1, 1)).rgb + texture2D(tSrc, vUv + texel * vec2(1, 1)).rgb) * 0.25;
          float br = max(s.r, max(s.g, s.b));
          float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee); rq = rq * rq / (4.0 * knee + 1e-4);
          float w = max(rq, br - threshold) / max(br, 1e-4);
          gl_FragColor = vec4(min(s * w, vec3(12.0)), 1.0);
        }`,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    // 2) diminui a imagem várias vezes (cada vez mais borrada)
    this.mDown = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, texel: { value: new THREE.Vector2() } },
      vertexShader: FULLSCREEN_VS,
      fragmentShader: `
        uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
        vec3 T(float x, float y) { return texture2D(tSrc, vUv + texel * vec2(x, y)).rgb; }
        void main() {
          vec3 c = T(0., 0.) * 0.125
            + (T(-2., 2.) + T(2., 2.) + T(-2., -2.) + T(2., -2.)) * 0.03125
            + (T(0., 2.) + T(-2., 0.) + T(2., 0.) + T(0., -2.)) * 0.0625
            + (T(-1., 1.) + T(1., 1.) + T(-1., -1.) + T(1., -1.)) * 0.125;
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    // 3) aumenta de volta somando (o brilho "espalha")
    this.mUp = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, texel: { value: new THREE.Vector2() } },
      vertexShader: FULLSCREEN_VS,
      fragmentShader: `
        uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
        vec3 T(vec2 o) { return texture2D(tSrc, vUv + o * texel).rgb; }
        void main() {
          vec3 s = T(vec2(-1, -1)) + T(vec2(0, -1)) * 2.0 + T(vec2(1, -1))
                 + T(vec2(-1, 0)) * 2.0 + T(vec2(0, 0)) * 4.0 + T(vec2(1, 0)) * 2.0
                 + T(vec2(-1, 1)) + T(vec2(0, 1)) * 2.0 + T(vec2(1, 1));
          gl_FragColor = vec4(s / 16.0, 1.0);
        }`,
      blending: THREE.AdditiveBlending, transparent: true,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    // 4) junta tudo: brilho + tons de cinema + cor da fase + vinheta + granulado
    this.mComp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null },
        bloom: { value: 0.6 }, exposure: { value: 1.05 },
        tint: { value: new THREE.Color(1, 1, 1) }, sat: { value: 1.1 }, contrast: { value: 1.06 },
        vig: { value: 0.4 }, grain: { value: 0.035 }, time: { value: 0 },
        aberr: { value: 0 }, rage: { value: 0 }, lowHp: { value: 0 }, aspect: { value: 1.7 },
      },
      vertexShader: FULLSCREEN_VS,
      fragmentShader: `
        uniform sampler2D tScene, tBloom;
        uniform float bloom, exposure, sat, contrast, vig, grain, time, aberr, rage, lowHp, aspect;
        uniform vec3 tint;
        varying vec2 vUv;
        vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
        vec3 aces(vec3 c) {
          const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
          const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
          c *= exposure / 0.6; c = inM * c; c = RRTAndODTFit(c); c = outM * c; return clamp(c, 0.0, 1.0);
        }
        vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
        float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 uv = vUv, dc = uv - 0.5;
          vec3 col;
          if (aberr > 0.0) {
            vec2 o = dc * aberr;
            col = vec3(texture2D(tScene, uv + o).r, texture2D(tScene, uv).g, texture2D(tScene, uv - o).b);
          } else col = texture2D(tScene, uv).rgb;
          col += texture2D(tBloom, uv).rgb * bloom;
          col *= tint;
          col = aces(col);
          col = toSRGB(col);
          float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(l), col, sat * (1.0 - lowHp * 0.55));
          col = clamp((col - 0.3) * contrast + 0.3, 0.0, 1.0); // contraste (centrado no tom médio-escuro: não apaga as fases escuras)
          col = mix(col, col * vec3(1.25, 0.7, 0.6), rage * 0.45);           // Ira de Nêmesis: mundo avermelhado
          float d = length(dc * vec2(aspect, 1.0)) / length(vec2(aspect, 1.0) * 0.5);
          col *= mix(1.0, 1.0 - smoothstep(0.35, 1.15, d), vig + rage * 0.25 + lowHp * 0.2);
          col += (h(uv * 1000.0 + fract(time) * 37.0) - 0.5) * grain;
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
  },

  setSize(w, h) {
    this.w = w; this.h = h;
    this.sceneRT.setSize(w, h);
    let mw = Math.max(1, w >> 1), mh = Math.max(1, h >> 1);
    for (const m of this.mips) { m.setSize(mw, mh); mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1); }
    this.mComp.uniforms.aspect.value = w / h;
  },

  setQuality(q) {
    this.enabled = q !== 'baixa';
    const samples = this.gl2 ? (q === 'alta' ? 4 : 2) : 0;
    if (this.sceneRT.samples !== samples) { this.sceneRT.samples = samples; this.sceneRT.dispose(); }
    this.levels = q === 'alta' ? 6 : 5;
  },

  setTheme(T) {
    const g = (T.look && T.look.grade) || {};
    const u = this.mComp.uniforms;
    u.tint.value.set(g.tint || '#ffffff');
    u.sat.value = g.sat || 1.08;
    u.contrast.value = g.contrast || 1.06;
    u.bloom.value = g.bloom || 0.6;
    u.vig.value = g.vig || 0.3;
    u.exposure.value = 1.05 * (g.exp || 1);
    this.baseBloom = u.bloom.value;
  },

  pass(mat, src, dst) {
    this.quad.material = mat;
    mat.uniforms.tSrc.value = src.texture;
    mat.uniforms.texel.value.set(1 / src.width, 1 / src.height);
    this.r.setRenderTarget(dst);
    this.r.render(this.qs, this.cam);
  },

  render(scene, camera, dt) {
    const r = this.r;
    // sem pós: o próprio Three aplica os tons de cinema (ACES). Com pós: a cena fica
    // "crua" (HDR) e os tons são aplicados só no final (senão seria aplicado 2 vezes).
    r.toneMapping = this.enabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    // a neblina é misturada antes dos tons de cinema quando há pós: fica mais forte, então afinamos
    const fogBase = scene.userData.fogBase || (game.level && game.level.fog.density);
    if (scene.fog && fogBase) scene.fog.density = fogBase * (this.enabled ? 0.6 : 1);
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    // brilho
    const n = this.levels || 6, M = this.mips;
    this.pass(this.mPre, this.sceneRT, M[0]);
    for (let i = 1; i < n; i++) this.pass(this.mDown, M[i - 1], M[i]);
    r.autoClear = false;
    for (let i = n - 1; i > 0; i--) this.pass(this.mUp, M[i], M[i - 1]);
    r.autoClear = true;
    // imagem final
    const u = this.mComp.uniforms;
    u.time.value += dt || 0.016;
    u.tScene.value = this.sceneRT.texture;
    u.tBloom.value = M[0].texture;
    u.rage.value += (this.rage - u.rage.value) * 0.08;
    u.lowHp.value += (this.lowHp - u.lowHp.value) * 0.05;
    this.hit = Math.max(0, this.hit - (dt || 0.016) * 4);
    u.aberr.value = 0.004 * u.rage.value + 0.012 * this.hit;
    u.bloom.value = this.baseBloom * (1 + u.rage.value * 0.5);
    this.quad.material = this.mComp;
    r.setRenderTarget(null);
    r.render(this.qs, this.cam);
  },
};

// -------------------------------------------------------------
// MAPA DE AMBIENTE (reflexos)
// -------------------------------------------------------------
const Env = {
  tex: null,
  build(renderer, T, sunDir) {
    if (!this.pmrem) this.pmrem = new THREE.PMREMGenerator(renderer);
    const s = new THREE.Scene();
    const top = new THREE.Color(T.sky[0]), bottom = new THREE.Color(T.sky[1]);
    const ground = new THREE.Color(T.ground).multiplyScalar(0.35);
    const sunCol = new THREE.Color(T.sunColor || T.light.sunColor || '#ffffff');
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: top }, bottom: { value: bottom }, ground: { value: ground }, sunDir: { value: sunDir.clone() }, sunCol: { value: sunCol }, hasSun: { value: T.sunColor ? 1 : 0.25 } },
      vertexShader: `varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 top, bottom, ground, sunDir, sunCol; uniform float hasSun; varying vec3 vD;
        void main() {
          vec3 d = normalize(vD);
          vec3 c = d.y > 0.0 ? mix(bottom, top, pow(d.y, 0.6)) : mix(bottom, ground, min(1.0, -d.y * 4.0));
          float sd = max(dot(d, normalize(sunDir)), 0.0);
          c += sunCol * (pow(sd, 120.0) * 3.0 + pow(sd, 6.0) * 0.35) * hasSun;
          gl_FragColor = vec4(c * 0.35, 1.0);
        }`,
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
    const rt = this.pmrem.fromScene(s, 0.02);
    if (this.rt) this.rt.dispose();
    this.rt = rt;
    m.dispose();
    return rt.texture;
  },
};

// -------------------------------------------------------------
// CÉU NOVO: degradê + sol com brilho + nuvens + estrelas
// -------------------------------------------------------------
LevelBuilder.prototype.sky = function (top, bottom, sunDir, sunColor, T) {
  const look = (T && T.look) || {};
  const ct = new THREE.Color(top), cb = new THREE.Color(bottom);
  const sc = new THREE.Color(sunColor || '#fff3c4');
  const cloudDark = ct.clone().lerp(cb, 0.35).multiplyScalar(0.7);
  const cloudLit = cb.clone().multiplyScalar(1.25).lerp(sc, sunColor ? 0.25 : 0.05);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: ct }, bottom: { value: cb }, sunDir: { value: sunDir.clone().normalize() }, sunCol: { value: sc },
      hasSun: { value: sunColor ? 1 : 0 }, clouds: { value: look.clouds || 0 }, stars: { value: look.stars || 0 },
      cDark: { value: cloudDark }, cLit: { value: cloudLit }, time: { value: 0 },
    },
    vertexShader: `varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 top, bottom, sunDir, sunCol, cDark, cLit; uniform float hasSun, clouds, stars, time; varying vec3 vD;
      ${GLSL_NOISE}
      void main() {
        vec3 d = normalize(vD);
        float hy = d.y;
        vec3 col = mix(bottom, top, clamp(hy * 1.6 + 0.2, 0.0, 1.0));
        col = mix(col, bottom * 1.08, exp(-abs(hy) * 10.0) * 0.35); // névoa do horizonte
        float sd = max(dot(d, sunDir), 0.0);
        if (clouds > 0.0 && hy > 0.0) {
          vec2 p = d.xz / (hy + 0.12) * 1.3 + vec2(time * 0.012, time * 0.004);
          float n = fbm(p);
          float c = smoothstep(0.62 - clouds * 0.25, 0.95 - clouds * 0.15, n) * smoothstep(0.0, 0.18, hy);
          float lit = clamp(fbm(p + sunDir.xz * 0.15) - n + 0.55, 0.0, 1.0);
          vec3 cc = mix(cDark, cLit, lit) + sunCol * pow(sd, 8.0) * 0.6 * hasSun;
          col = mix(col, cc, c * 0.85);
        }
        if (stars > 0.0) {
          vec3 sp = floor(d * 260.0);
          float r = hash12(sp.xy + sp.z * 17.31);
          float tw = 0.6 + 0.4 * sin(time * 2.5 + r * 80.0);
          col += vec3(0.9, 0.95, 1.0) * step(0.9972, r) * smoothstep(0.02, 0.35, hy) * stars * tw * 1.6;
        }
        col += sunCol * (pow(sd, 1400.0) * 40.0 + pow(sd, 90.0) * 1.2 + pow(sd, 8.0) * 0.18) * hasSun;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const g = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), mat);
  g.renderOrder = -10;
  g.frustumCulled = false;
  this.group.add(g);
  this.updaters.push((t) => { g.position.copy(camera.position); mat.uniforms.time.value = t; });
  return g;
};

// -------------------------------------------------------------
// RELEVO NAS TEXTURAS (normal map tirado do desenho da textura)
// -------------------------------------------------------------
Tex.normal = function (tex, strength) {
  const src = tex.image, S = src.width, H = src.height;
  const d = src.getContext('2d').getImageData(0, 0, S, H).data;
  const hgt = new Float32Array(S * H);
  for (let i = 0; i < S * H; i++) hgt[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const c = document.createElement('canvas'); c.width = S; c.height = H;
  const g = c.getContext('2d'), out = g.createImageData(S, H);
  const at = (x, y) => hgt[((y + H) % H) * S + ((x + S) % S)];
  const k = strength || 2.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k;
    const len = Math.hypot(dx, dy, 1);
    const o = (y * S + x) * 4;
    out.data[o] = (-dx / len * 0.5 + 0.5) * 255;
    out.data[o + 1] = (dy / len * 0.5 + 0.5) * 255;
    out.data[o + 2] = (1 / len * 0.5 + 0.5) * 255;
    out.data[o + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};

// -------------------------------------------------------------
// DETALHES: grama que balança, pedrinhas e partículas no ar
// -------------------------------------------------------------
const Decor = {
  // um tufo = 5 folhinhas finas (triângulos), mais escuro embaixo
  tuftGeo(base, tip) {
    const pos = [], col = [], cb = new THREE.Color(base), ct = new THREE.Color(tip);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI + Math.random() * 0.4, w = 0.05;
      const ca = Math.cos(a) * w, sa = Math.sin(a) * w;
      const lean = (Math.random() - 0.5) * 0.35, lz = (Math.random() - 0.5) * 0.35, hh = 0.6 + Math.random() * 0.4;
      // as duas faces da folha (frente e verso), ambas iluminadas por cima
      pos.push(-ca, 0, -sa, ca, 0, sa, lean, hh, lz, ca, 0, sa, -ca, 0, -sa, lean, hh, lz);
      for (let k = 0; k < 2; k++) col.push(cb.r, cb.g, cb.b, cb.r, cb.g, cb.b, ct.r, ct.g, ct.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    // normais para cima: a grama fica iluminada como o chão (sem "piscar")
    const nrm = g.attributes.normal;
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
    return g;
  },

  // espalha grama (ou pedrinhas) por cima dos chãos da fase
  ground(course) {
    const T = course.T, look = T.look || {}, L = course.L, rng = makeRng(99);
    const patches = course.patches || [];
    if (!patches.length) return;
    const dummy = new THREE.Object3D();
    if (look.grass) {
      const G = look.grass;
      const items = [];
      for (const p of patches) {
        const n = Math.round(p.len * p.w * G.dens);
        for (let i = 0; i < n; i++) {
          // mais grama perto das bordas, menos no meio (onde se luta)
          const side = rng() < 0.5 ? -1 : 1, edge = Math.pow(rng(), 0.6);
          items.push([p.x0 + rng() * p.len, p.y, side * edge * (p.w / 2 - 0.3), 0.5 + rng() * 0.8]);
        }
      }
      if (!items.length) return;
      const geo = this.tuftGeo(G.color, G.tip);
      const m = new THREE.MeshLambertMaterial({ vertexColors: true });
      const uTime = { value: 0 };
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = uTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          #ifdef USE_INSTANCING
            float ph = instanceMatrix[3].x * 0.45 + instanceMatrix[3].z * 0.7;
          #else
            float ph = 0.0;
          #endif
          float sway = sin(uTime * 1.8 + ph) * 0.6 + sin(uTime * 3.1 + ph * 1.7) * 0.25;
          transformed.x += sway * position.y * position.y * 0.22;
          transformed.z += cos(uTime * 1.3 + ph) * position.y * position.y * 0.08;`);
      };
      const im = new THREE.InstancedMesh(geo, m, items.length);
      items.forEach(([x, y, z, s], i) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, rng() * 6.28, 0);
        dummy.scale.set(s, s * G.h, s);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.frustumCulled = false;
      im.receiveShadow = true;
      L.group.add(im);
      L.updaters.push((t) => { uTime.value = t; });
    }
    if (look.pebbles || look.grass) {
      // pedrinhas e cascalho espalhados
      const items = [];
      for (const p of patches) {
        const n = Math.round(p.len * p.w * (look.pebbles ? 0.08 : 0.025));
        for (let i = 0; i < n; i++) items.push([p.x0 + rng() * p.len, p.y, (rng() - 0.5) * (p.w - 0.6), 0.06 + rng() * 0.16]);
      }
      if (!items.length) return;
      const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat(T.wall, { roughness: 0.9 }), items.length);
      const c = new THREE.Color();
      items.forEach(([x, y, z, s], i) => {
        dummy.position.set(x, y + s * 0.3, z);
        dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3);
        dummy.scale.set(s * (1 + rng()), s * 0.6, s * (1 + rng()));
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, c.set(T.wallSpots[i % T.wallSpots.length]).lerp(new THREE.Color(T.ground), rng() * 0.6));
      });
      im.frustumCulled = false;
      im.receiveShadow = true;
      L.group.add(im);
    }
  },

  // partículas que flutuam no ar em volta da câmera (pólen, poeira, vaga-lumes, brasas)
  motes(course) {
    const M = course.T.look && course.T.look.motes;
    if (!M) return;
    const N = M.n, BOX = 36;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = Math.random() * BOX; pos[i * 3 + 1] = Math.random() * BOX * 0.5; pos[i * 3 + 2] = Math.random() * BOX; seed[i] = Math.random(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }, center: { value: new THREE.Vector3() }, color: { value: new THREE.Color(M.color).multiplyScalar(M.glow) },
        size: { value: M.size }, rise: { value: M.rise }, wind: { value: M.wind || 0.2 }, blink: { value: M.blink || 0 },
        box: { value: new THREE.Vector3(BOX, BOX * 0.5, BOX) }, scale: { value: 800 },
      },
      vertexShader: `
        attribute float seed; uniform float time, size, rise, wind, scale; uniform vec3 center, box; varying float vA; varying float vS;
        void main() {
          vec3 p = position;
          p.y += time * rise * (0.5 + seed);
          p.x += time * wind * (0.5 + seed) + sin(time * 0.7 + seed * 40.0) * 0.6;
          p.z += cos(time * 0.5 + seed * 30.0) * 0.6;
          p = mod(p - center + box * 0.5, box) - box * 0.5 + center;   // dá a volta: sempre em torno da câmera
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          vA = (1.0 - smoothstep(BOXR * 0.6, BOXR, length(p - center))) * smoothstep(0.5, 2.5, dist);
          vS = seed;
          gl_PointSize = size * scale / max(0.1, dist);
          gl_Position = projectionMatrix * mv;
        }`.replace(/BOXR/g, (BOX * 0.5).toFixed(1)),
      fragmentShader: `
        uniform vec3 color; uniform float time, blink; varying float vA; varying float vS;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          float b = mix(1.0, max(0.0, sin(time * (1.5 + vS * 2.0) + vS * 50.0)), blink);
          gl_FragColor = vec4(color * b, vA * (1.0 - smoothstep(0.0, 0.5, r)));
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    course.L.group.add(pts);
    course.L.updaters.push((t) => {
      m.uniforms.time.value = t;
      m.uniforms.center.value.copy(game.camTarget).y += 2;
      m.uniforms.scale.value = innerHeight * renderer.getPixelRatio() * 1.2;
    });
  },
};
