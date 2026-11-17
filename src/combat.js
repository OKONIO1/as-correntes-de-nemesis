// =============================================================
// combat.js — "sensação de golpe" e efeitos visuais de combate
//
//  FX     = partículas 3D (faíscas, poeira, cacos, respingos, fogo)
//           e anéis de impacto. Usa um "shader" pequeno para que cada
//           partícula tenha seu próprio tamanho, cor e transparência.
//  Combat = confere se as lâminas acertaram algo, aplica a micro-pausa
//           (hit-stop) e o tremor de câmera.
//
// Etapa 1: as lâminas quebram as ÂNFORAS do cenário.
// Etapa 2: inimigos, dano, números flutuantes e poderes.
// =============================================================

const FX = {
  MAX: 900,
  systems: [],
  rings: [],

  init(scene) {
    this.scene = scene;
    this.glow = this.makeSystem(true);   // brilha (soma luz)
    this.solid = this.makeSystem(false); // poeira, cacos
  },

  makeSystem(additive) {
    const N = this.MAX;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('rgba', new THREE.BufferAttribute(new Float32Array(N * 4), 4));
    geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(N), 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 800 } },
      vertexShader: `
        attribute vec4 rgba; attribute float size; varying vec4 vC; uniform float uScale;
        void main() {
          vC = rgba;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec4 vC;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          gl_FragColor = vec4(vC.rgb * ${additive ? '1.8' : '1.0'}, vC.a * smoothstep(0.5, ${additive ? '0.0' : '0.35'}, r));
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const pts = new THREE.Points(geo, material);
    pts.frustumCulled = false;
    this.scene.add(pts);
    const sys = { geo, material, pts, list: [] };
    this.systems.push(sys);
    return sys;
  },

  setScale(h) { for (const s of this.systems) s.material.uniforms.uScale.value = h * 1.2; },

  add(o) {
    const sys = o.glow ? this.glow : this.solid;
    if (sys.list.length >= this.MAX) sys.list.shift();
    const c = new THREE.Color(o.color || '#ffffff');
    sys.list.push({
      x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      life: o.life || 0.5, max: o.life || 0.5, size: o.size || 0.15,
      r: c.r, g: c.g, b: c.b, a: o.alpha === undefined ? 1 : o.alpha,
      gravity: o.gravity || 0, drag: o.drag || 0, grow: o.grow || 0,
    });
  },

  burst(p, n, o) {
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-1, 1));
      const up = o.up || 0;
      const sp = rand(o.speed[0], o.speed[1]);
      this.add({
        x: p.x + rand(-1, 1) * (o.jitter || 0), y: p.y + rand(-1, 1) * (o.jitter || 0), z: p.z + rand(-1, 1) * (o.jitter || 0),
        vx: Math.sin(ph) * Math.cos(th) * sp, vy: Math.cos(ph) * sp * (o.flatY || 1) + up, vz: Math.sin(ph) * Math.sin(th) * sp,
        life: rand(o.life[0], o.life[1]), size: rand(o.size[0], o.size[1]), color: choose(o.colors),
        gravity: o.gravity || 0, drag: o.drag || 0, glow: !!o.glow, alpha: o.alpha, grow: o.grow,
      });
    }
  },

  sparks(p, n, colors) {
    this.burst(p, n || 14, { speed: [4, 11], life: [0.15, 0.4], size: [0.06, 0.14], colors: colors || ['#fff7c2', '#ffcc33', '#ff9a2e'], glow: true, gravity: -14, drag: 3 });
  },
  dust(p, n) {
    this.burst({ x: p.x, y: p.y + 0.1, z: p.z }, n || 8, { speed: [0.8, 2.4], flatY: 0.25, up: 0.8, life: [0.4, 0.8], size: [0.35, 0.7], colors: ['#d8c098', '#c8ae84'], alpha: 0.5, drag: 2.5, grow: 0.8 });
  },
  shards(p, n, colors) {
    this.burst(p, n || 18, { speed: [2, 7], up: 3, life: [0.6, 1.1], size: [0.08, 0.18], colors, gravity: -22, drag: 0.5 });
  },
  fire(p, n) {
    this.burst(p, n || 10, { speed: [0.5, 2.5], up: 2.5, life: [0.3, 0.7], size: [0.2, 0.45], colors: ['#ffdf6b', '#ff9a2e', '#ff5a1f'], glow: true, drag: 1.5, jitter: 0.2 });
  },
  splash(p) {
    this.burst(p, 40, { speed: [2, 6], up: 5, life: [0.5, 1], size: [0.12, 0.3], colors: ['#e8f8ff', '#9fd3ff', '#5aa3c8'], gravity: -20, drag: 0.5 });
    this.ring(p, '#cfefff', 2.5);
  },

  // anel que se expande (impactos, pulo duplo)
  ring(p, color, radius) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, p.y + 0.05, p.z);
    this.scene.add(m);
    this.rings.push({ m, t: 0, life: 0.35, r: radius || 2 });
  },
  // anel em pé, virado para a câmera (acertos)
  hitRing(p, color, radius, camera) {
    this.ring(p, color, radius);
    const r = this.rings[this.rings.length - 1];
    r.m.position.set(p.x, p.y, p.z);
    r.m.quaternion.copy(camera.quaternion);
    r.life = 0.22;
  },

  update(dt) {
    for (const sys of this.systems) {
      const L = sys.list;
      for (const q of L) {
        q.vy += q.gravity * dt;
        if (q.drag) { const k = 1 - Math.min(1, q.drag * dt); q.vx *= k; q.vy *= k; q.vz *= k; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        q.size += q.grow * dt;
        q.life -= dt;
      }
      sys.list = L.filter(q => q.life > 0);
      const pos = sys.geo.attributes.position.array, col = sys.geo.attributes.rgba.array, sz = sys.geo.attributes.size.array;
      let i = 0;
      for (const q of sys.list) {
        const k = q.life / q.max;
        pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
        col[i * 4] = q.r; col[i * 4 + 1] = q.g; col[i * 4 + 2] = q.b; col[i * 4 + 3] = q.a * Math.min(1, k * 1.6);
        sz[i] = q.size * (0.5 + 0.5 * k);
        i++;
      }
      sys.geo.setDrawRange(0, i);
      sys.geo.attributes.position.needsUpdate = true;
      sys.geo.attributes.rgba.needsUpdate = true;
      sys.geo.attributes.size.needsUpdate = true;
    }
    for (const r of this.rings) {
      r.t += dt;
      const k = r.t / r.life;
      const s = r.r * (0.2 + 0.8 * Math.sqrt(k));
      r.m.scale.set(s, s, s);
      r.m.material.opacity = (1 - k) * 0.9;
      if (k >= 1) { this.scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); }
    }
    this.rings = this.rings.filter(r => r.t < r.life);
  },
};

const Combat = {
  hitStop: 0,

  update(dt, game) {
    const p = game.player;
    if (!p.attack || !p.hitSpheres.length) return;
    const id = p.attack.id;
    const def = p.attack.def;
    // o giro pesado e o 4º golpe destroem flechas e magias no ar
    if (def.kind === 'spin') Shots.destroyNear(new THREE.Vector3(p.pos.x, p.pos.y + 1.2, p.pos.z), def.reach);

    // ---- inimigos
    for (const e of Enemies.list) {
      if (e.dead) continue;
      // golpes em giro podem acertar o mesmo alvo de novo a cada 0,25 s
      if (e.hitMemo.id === id && !(def.kind === 'spin' && game.time - e.hitMemo.t > 0.25)) continue;
      const c = e.center;
      for (const s of p.hitSpheres) {
        const dx = s.x - c.x, dy = s.y - c.y, dz = s.z - c.z;
        const rr = s.r + e.radius + 0.15;
        if (dx * dx + dy * dy * 0.4 + dz * dz < rr * rr) {
          e.hitMemo.id = id; e.hitMemo.t = game.time;
          this.hitFoe(e, s, game, def);
          break;
        }
      }
    }
  },

  hitFoe(e, s, game, def) {
    const p = game.player;
    const dir = new THREE.Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
    if (dir.lengthSq() < 1e-4) dir.set(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    dir.normalize();
    const heavy = !!def.heavy;
    const big = heavy || def.dmg >= 16;
    const dmg = def.dmg * (p.rage > 0 ? 1.3 : 1);
    const dealt = e.hurt(dmg, {
      dir, kind: heavy ? 'heavy' : 'light',
      kb: heavy ? 15 : def.kind === 'spin' ? 6 : def.kind === 'v' ? 2 : 3.5,
      up: heavy ? 7 : def.kind === 'v' ? 3 : 0,
      color: heavy ? '#ffcf4a' : '#ffffff',
    }, game);
    const hitPos = new THREE.Vector3(s.x, s.y, s.z).lerp(e.center, 0.5);
    if (dealt === -1) { // bateu no escudo: herói é jogado para trás
      this.hitStop = Math.max(this.hitStop, 0.05);
      p.vel.x -= dir.x * 6; p.vel.z -= dir.z * 6;
      game.shake(0.1);
      return;
    }
    if (dealt === 0) return;
    this.hitStop = Math.max(this.hitStop, e.dead ? 0.12 : big ? 0.08 : 0.045);
    game.shake(e.dead ? 0.4 : big ? 0.3 : 0.14);
    Sound.hit(big);
    FX.sparks(hitPos, big ? 20 : 12);
    FX.burst(hitPos, 8, { speed: [2, 6], life: [0.2, 0.45], size: [0.06, 0.12], colors: ['#d8b860', '#b89840'], gravity: -14, drag: 1 });
    FX.hitRing(hitPos, big ? '#ffcf4a' : '#fff2c0', big ? 2 : 1.3, game.camera);
    p.fury = Math.min(HERO.maxFury, p.fury + (p.rage > 0 ? 0 : big ? 6 : 4));
    p.mana = Math.min(HERO.maxMana, p.mana + 1);
    if (p.rage > 0) p.heal(Math.max(1, dealt * 0.12), game); // Ira de Nêmesis: cura a cada golpe
    game.combo++;
    game.comboT = 2;
  },

  // ânforas do cenário
  updateBreakables(game) {
    const p = game.player;
    if (!p.attack || !p.hitSpheres.length) return;
    const id = p.attack.id;
    for (const b of game.level.builder.breakables) {
      if (b.broken || b.hitBy === id) continue;
      for (const s of p.hitSpheres) {
        const dx = s.x - b.pos.x, dy = s.y - b.pos.y, dz = s.z - b.pos.z;
        if (dx * dx + dy * dy + dz * dz < (s.r + b.r) * (s.r + b.r)) {
          b.hitBy = id;
          this.breakAmphora(b, game, p.attack.def);
          break;
        }
      }
    }
  },

  breakAmphora(b, game, def) {
    b.broken = true;
    b.obj.visible = false;
    const big = def.heavy || def.dmg >= 16;
    this.hitStop = Math.max(this.hitStop, big ? 0.09 : 0.055);   // micro-pausa
    game.shake(big ? 0.35 : 0.2);                                // tremor
    Sound.hit(big);
    FX.sparks(b.pos, 16);
    FX.shards(b.pos, 24, ['#b8642a', '#8a4a1e', '#1a1410', '#d8844a']);
    FX.hitRing(b.pos, '#ffcf4a', big ? 2.2 : 1.4, game.camera);
    // a ânfora guardava energia: um pouco de fúria e mana
    game.player.fury = Math.min(HERO.maxFury, game.player.fury + 8);
    game.player.mana = Math.min(HERO.maxMana, game.player.mana + 5);
    FX.burst({ x: b.pos.x, y: b.pos.y, z: b.pos.z }, 12, { speed: [1, 3], up: 2, life: [0.5, 0.9], size: [0.12, 0.22], colors: ['#ffd27a', '#ff7a3a'], glow: true, drag: 2 });
    game.combo++;
    game.comboT = 2;
  },
};
