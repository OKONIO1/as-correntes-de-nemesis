// =============================================================
// powers.js — os 4 PODERES DIVINOS + progresso salvo
//
//  1  Fúria de Zeus    — raio em linha reta: dano e PARALISIA (2,5 s)
//  2  Ímpeto de Ares   — explosão de fogo em volta: dano, arremesso e QUEIMADURA
//  3  Olhar de Medusa  — cone verde: PETRIFICA por 3 s (golpes viram crítico 2×)
//  4  Ira de Nêmesis   — com a Fúria CHEIA: 10 s de aura de fogo, golpes 50%
//                        mais rápidos, super-armadura e cura a cada acerto
//
// Teclas 1–4 usam o poder na hora. Q usa o poder selecionado
// (a rodinha do mouse troca a seleção). Os poderes são liberados
// nos ALTARES espalhados pelas fases (tecla E).
// =============================================================

const POWERS = [
  { key: '1', id: 'zeus',   name: 'Fúria de Zeus',   icon: '⚡', cost: 25, cd: 1.2, desc: 'Raio em linha reta que paralisa inimigos à distância.' },
  { key: '2', id: 'ares',   name: 'Ímpeto de Ares',  icon: '🔥', cost: 35, cd: 3,   desc: 'Explosão de chamas em volta do herói.' },
  { key: '3', id: 'medusa', name: 'Olhar de Medusa', icon: '👁', cost: 30, cd: 4,   desc: 'Cone verde que petrifica inimigos por 3 segundos.' },
  { key: '4', id: 'rage',   name: 'Ira de Nêmesis',  icon: '✦', cost: 0,  cd: 1,   fury: true, desc: 'Com a Fúria cheia: aura de fogo, golpes mais rápidos e cura a cada acerto.' },
];

// ---------- progresso salvo (memória do navegador) ----------
const SAVE_KEY_3D = 'nemesis3d-save';
const Save = {
  data: { unlocked: 1, powers: [false, false, false, false] },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY_3D));
      if (d && Array.isArray(d.powers)) this.data = { unlocked: d.unlocked || 1, powers: POWERS.map((_, i) => !!d.powers[i]) };
    } catch (e) { /* sem storage: joga sem salvar */ }
  },
  write() { try { localStorage.setItem(SAVE_KEY_3D, JSON.stringify(this.data)); } catch (e) { /* ok */ } },
  reset() { this.data = { unlocked: 1, powers: [false, false, false, false] }; this.write(); },
};

const Powers = {
  cd: [0, 0, 0, 0],
  selected: 0,
  effects: [],
  pool: [],

  // Luzes ficam SEMPRE na cena (só liga/desliga). Criar/remover luz faz o
  // Three.js recompilar os materiais e o jogo dá uma "engasgada".
  init(scene) {
    for (let i = 0; i < 2; i++) {
      const l = new THREE.PointLight('#ffffff', 0, 20, 1.5);
      l.busy = false;
      scene.add(l);
      this.pool.push(l);
    }
    this.rageLight = new THREE.PointLight('#ff6a1a', 0, 9, 1.6);
    scene.add(this.rageLight);
  },
  light(color, dist) {
    const l = this.pool.find(x => !x.busy) || this.pool[0];
    l.busy = true; l.color.set(color); l.distance = dist;
    return l;
  },
  freeLight(l) { l.intensity = 0; l.busy = false; },

  // nas arenas de teste dos chefes, tudo liberado (sem salvar)
  unlocked(i) { return Save.data.powers[i] || !!(game.level && game.level.testAllPowers); },
  clear() {
    for (const e of this.effects) e.dispose();
    this.effects = [];
    for (const l of this.pool) this.freeLight(l);
    if (this.rageLight) this.rageLight.intensity = 0;
    this.cd = [0, 0, 0, 0];
    if (typeof UI !== 'undefined' && UI.flashEl) UI.setRage(false);
  },
  unlock(i) {
    Save.data.powers[i] = true;
    Save.write();
    this.selected = i;
  },

  // ---------------------------------------------------------
  update(dt, game) {
    const p = game.player;
    for (let i = 0; i < 4; i++) this.cd[i] = Math.max(0, this.cd[i] - dt);
    for (let i = 0; i < 4; i++) {
      if (Input.just.has('Digit' + (i + 1)) || Input.just.has('Numpad' + (i + 1))) { this.selected = i; this.use(i, game); }
    }
    if (Input.just.has('KeyQ')) this.use(this.selected, game);

    // Ira de Nêmesis ativa
    if (p.rage > 0) {
      p.rage -= dt;
      p.fury = Math.max(0, HERO.maxFury * p.rage / 10);
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2, r = rand(0.3, 0.6);
        FX.add({ x: p.pos.x + Math.cos(a) * r, y: p.pos.y + rand(0.1, 1.8), z: p.pos.z + Math.sin(a) * r, vy: rand(1.5, 3.5), life: rand(0.3, 0.6), size: rand(0.18, 0.35), color: choose(['#ffdf6b', '#ff9a2e', '#ff4a1a']), glow: true, drag: 1 });
      }
      this.rageLight.position.set(p.pos.x, p.pos.y + 1.2, p.pos.z);
      this.rageLight.intensity = 2.5 + Math.sin(game.time * 20) * 0.4;
      if (p.rage <= 0) { p.rage = 0; this.rageLight.intensity = 0; UI.setRage(false); UI.toast('A Ira de Nêmesis se apagou'); }
    }

    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter(e => { const alive = e.update(e.t, dt); if (!alive) e.dispose(); return alive; });
  },

  use(i, game) {
    const P = POWERS[i], p = game.player;
    if (!this.unlocked(i)) { UI.toast(P.name + ': ainda bloqueado — encontre o altar'); Sound.fail(); return; }
    if (this.cd[i] > 0 || p.dashT > 0) { Sound.fail(); return; }
    if (P.fury) {
      if (p.rage > 0) return;
      if (p.fury < HERO.maxFury) { UI.toast('A Fúria precisa estar CHEIA'); Sound.fail(); return; }
    } else if (p.mana < P.cost) { UI.toast('Mana insuficiente'); Sound.fail(); return; }
    if (!P.fury) p.mana -= P.cost;
    this.cd[i] = P.cd;
    p.attack = null; p.queued = false;
    p.castT = 0.35; p.castKind = P.id;
    this[P.id](game);
  },

  // vira o herói para o inimigo vivo mais próximo à frente (mira automática)
  aim(game, maxDist, cone) {
    const p = game.player;
    let best = null, bestD = maxDist;
    for (const e of Enemies.list) {
      if (e.dead) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      let da = Math.atan2(dx, dz) - p.yaw;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < cone) { best = e; bestD = d; }
    }
    if (best) p.yaw = p.targetYaw = Math.atan2(best.pos.x - p.pos.x, best.pos.z - p.pos.z);
    this.aimTarget = best;
    return new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
  },

  // ---------------------------------------------------------
  // 1 — FÚRIA DE ZEUS
  // ---------------------------------------------------------
  zeus(game) {
    const p = game.player, scene = game.scene;
    let fwd = this.aim(game, 18, 0.7);
    const a = new THREE.Vector3(p.pos.x, p.pos.y + 1.35, p.pos.z).addScaledVector(fwd, 0.6);
    // mira também na altura do alvo (acerta harpias voando)
    if (this.aimTarget) fwd = this.aimTarget.center.sub(a).normalize();
    // o raio para ao bater numa parede
    let len = 18;
    const solids = game.level.builder.solids;
    for (let d = 0.5; d < 18; d += 0.4) {
      const q = a.clone().addScaledVector(fwd, d);
      if (solids.some(s => q.x > s.min.x && q.x < s.max.x && q.y > s.min.y && q.y < s.max.y && q.z > s.min.z && q.z < s.max.z)) { len = d; break; }
    }
    const b = a.clone().addScaledVector(fwd, len);

    // dano em quem estiver perto da linha
    const ab = b.clone().sub(a);
    for (const e of Enemies.list) {
      if (e.dead) continue;
      const c = e.center;
      const t = clamp(c.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
      const closest = a.clone().addScaledVector(ab, t);
      if (closest.distanceTo(c) < e.radius + 1.0) {
        e.hurt(25, { dir: new THREE.Vector3(fwd.x, 0, fwd.z).normalize(), kb: 4, color: '#9fd3ff', kind: 'power' }, game);
        if (!e.dead) { e.stun = Math.max(e.stun, 2.5); UI.damage(e.center.add(new THREE.Vector3(0, 1.4, 0)), 'PARALISADO', '#9fd3ff', 0.8); }
        FX.sparks(c, 24, ['#ffffff', '#9fd3ff', '#5ab0ff']);
      }
    }

    // visual: dois raios tortos (camada branca fina + camada azul grossa)
    const N = 14;
    const core = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const glow = new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const segs = [];
    const segGeoCore = new THREE.CylinderGeometry(0.05, 0.05, 1, 4); segGeoCore.rotateX(Math.PI / 2);
    const segGeoGlow = new THREE.CylinderGeometry(0.18, 0.18, 1, 5); segGeoGlow.rotateX(Math.PI / 2);
    for (let i = 0; i < N; i++) {
      const m1 = new THREE.Mesh(segGeoCore, core), m2 = new THREE.Mesh(segGeoGlow, glow);
      scene.add(m1, m2); segs.push(m1, m2);
    }
    const light = this.light('#9fd3ff', 26);
    light.position.copy(a).lerp(b, 0.5);
    const rebuild = () => {
      const pts = [a.clone()];
      for (let i = 1; i < N; i++) pts.push(a.clone().lerp(b, i / N).add(new THREE.Vector3(rand(-0.35, 0.35), rand(-0.35, 0.35), rand(-0.35, 0.35))));
      pts.push(b.clone());
      for (let i = 0; i < N; i++) {
        const p0 = pts[i], p1 = pts[i + 1], mid = p0.clone().lerp(p1, 0.5), l = p0.distanceTo(p1);
        for (const m of [segs[i * 2], segs[i * 2 + 1]]) { m.position.copy(mid); m.lookAt(p1); m.scale.set(1, 1, l); }
      }
    };
    rebuild();
    let next = 0.05;
    for (let i = 0; i < 18; i++) FX.sparks(a.clone().lerp(b, Math.random()), 2, ['#ffffff', '#9fd3ff']);
    FX.hitRing(b, '#9fd3ff', 2.5, game.camera);
    Sound.thunder();
    game.shake(0.35);
    UI.flash('rgba(160,210,255,0.35)');
    this.effects.push({
      t: 0,
      update: (t) => {
        if (t > next) { next += 0.05; rebuild(); }
        const k = 1 - t / 0.4;
        core.opacity = k; glow.opacity = 0.6 * k;
        light.intensity = 7 * k;
        return t < 0.4;
      },
      dispose: () => { for (const m of segs) scene.remove(m); this.freeLight(light); core.dispose(); glow.dispose(); segGeoCore.dispose(); segGeoGlow.dispose(); },
    });
  },

  // ---------------------------------------------------------
  // 2 — ÍMPETO DE ARES
  // ---------------------------------------------------------
  ares(game) {
    const p = game.player, scene = game.scene;
    const c = new THREE.Vector3(p.pos.x, p.pos.y + 0.9, p.pos.z);
    const R = 5.5;
    for (const e of Enemies.list) {
      if (e.dead) continue;
      const d = new THREE.Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
      const dist = d.length();
      if (dist > R + e.radius || Math.abs(e.pos.y - p.pos.y) > 3) continue;
      if (dist < 1e-3) d.set(1, 0, 0); else d.normalize();
      e.hurt(35, { dir: d, kb: 12, up: 6, kind: 'heavy', color: '#ff9a2e' }, game);
      if (!e.dead) { e.burn = 4; e.burnDps = 6; }
    }
    // visual: onda de fogo (anel), bola de luz, brasas e chão queimado
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.25, 6, 40), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(p.pos.x, p.pos.y + 0.4, p.pos.z);
    const ballMat = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), ballMat);
    ball.position.copy(c);
    const scorchMat = new THREE.MeshBasicMaterial({ color: '#1a0a04', transparent: true, opacity: 0.6, depthWrite: false });
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(R * 0.8, 28), scorchMat);
    scorch.rotation.x = -Math.PI / 2; scorch.position.set(p.pos.x, p.pos.y + 0.03, p.pos.z);
    const light = this.light('#ff7a2a', 22);
    light.position.copy(c);
    scene.add(ring, ball, scorch);
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(5, 11);
      FX.add({ x: c.x, y: c.y - 0.4, z: c.z, vx: Math.cos(a) * sp, vy: rand(0, 4), vz: Math.sin(a) * sp, life: rand(0.35, 0.7), size: rand(0.3, 0.6), color: choose(['#ffdf6b', '#ff9a2e', '#ff5a1f', '#d62a12']), glow: true, drag: 3 });
    }
    FX.fire(c, 30);
    Shots.destroyNear(c, R);
    Sound.furyBlast(); Sound.explode();
    game.shake(0.6);
    Combat.hitStop = Math.max(Combat.hitStop, 0.07);
    UI.flash('rgba(255,140,40,0.35)');
    this.effects.push({
      t: 0,
      update: (t) => {
        const k = Math.min(1, t / 0.35);
        const s = 0.5 + easeOut(k) * R;
        ring.scale.set(s, s, 1 + k);
        ringMat.opacity = 1 - k;
        ball.scale.setScalar(0.6 + easeOut(k) * 2.4);
        ballMat.opacity = 0.7 * (1 - k);
        light.intensity = 9 * Math.max(0, 1 - t / 0.6);
        scorchMat.opacity = 0.6 * Math.max(0, 1 - t / 3);
        return t < 3;
      },
      dispose: () => { scene.remove(ring, ball, scorch); this.freeLight(light); ringMat.dispose(); ballMat.dispose(); scorchMat.dispose(); ring.geometry.dispose(); ball.geometry.dispose(); scorch.geometry.dispose(); },
    });
  },

  // ---------------------------------------------------------
  // 3 — OLHAR DE MEDUSA
  // ---------------------------------------------------------
  medusa(game) {
    const p = game.player, scene = game.scene;
    const fwd = this.aim(game, 10, 0.8);
    const LEN = 10, ANG = 0.6;
    for (const e of Enemies.list) {
      if (e.dead) continue;
      const d = new THREE.Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
      const dist = d.length();
      if (dist > LEN + e.radius) continue;
      if (dist > 0.01 && d.normalize().dot(fwd) < Math.cos(ANG) && dist > 1.2) continue;
      e.petrify = 3; e.stun = 0; e.burn = 0;
      e.vel.set(0, 0, 0);
      UI.damage(e.center.add(new THREE.Vector3(0, 1.3, 0)), 'PETRIFICADO', '#c8c2b8', 0.9);
      FX.shards(e.center, 10, ['#9a948a', '#c8c2b8']);
    }
    const geo = new THREE.ConeGeometry(Math.tan(ANG) * LEN, LEN, 28, 1, true);
    geo.translate(0, -LEN / 2, 0);   // ponta na origem
    geo.rotateX(-Math.PI / 2);        // abre para +Z
    const coneMat = new THREE.MeshBasicMaterial({ color: '#7aff6a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(geo, coneMat);
    cone.position.set(p.pos.x, p.pos.y + 1.5, p.pos.z);
    cone.rotation.y = p.yaw;
    const light = this.light('#7aff6a', 16);
    light.position.copy(cone.position).addScaledVector(fwd, 3);
    scene.add(cone);
    for (let i = 0; i < 50; i++) {
      const a = p.yaw + rand(-ANG, ANG), sp = rand(6, 14);
      FX.add({ x: cone.position.x, y: cone.position.y + rand(-0.3, 0.3), z: cone.position.z, vx: Math.sin(a) * sp, vy: rand(-1.5, 1), vz: Math.cos(a) * sp, life: rand(0.4, 0.7), size: rand(0.12, 0.25), color: choose(['#b8ff7a', '#7aff6a', '#eaffc0']), glow: true, drag: 1.5 });
    }
    Sound.shoot();
    Sound.tone({ freq: 220, freq2: 880, dur: 0.6, type: 'sine', vol: 0.12 });
    this.effects.push({
      t: 0,
      update: (t) => {
        coneMat.opacity = t < 0.12 ? t / 0.12 * 0.45 : 0.45 * Math.max(0, 1 - (t - 0.12) / 0.6);
        light.intensity = 5 * Math.max(0, 1 - t / 0.7);
        return t < 0.75;
      },
      dispose: () => { scene.remove(cone); this.freeLight(light); coneMat.dispose(); geo.dispose(); },
    });
  },

  // ---------------------------------------------------------
  // 4 — IRA DE NÊMESIS
  // ---------------------------------------------------------
  rage(game) {
    const p = game.player;
    p.rage = 10;
    p.invuln = Math.max(p.invuln, 0.6);
    FX.ring(p.pos, '#ff7a1a', 5);
    FX.fire(new THREE.Vector3(p.pos.x, p.pos.y + 1, p.pos.z), 40);
    Sound.roar(1.3); Sound.furyBlast();
    game.shake(0.5);
    UI.flash('rgba(255,90,20,0.4)');
    UI.setRage(true);
    UI.banner('IRA DE NÊMESIS', 'Golpes mais rápidos · super-armadura · cura a cada acerto');
  },
};
