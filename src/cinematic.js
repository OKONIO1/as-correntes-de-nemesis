// =============================================================
// cinematic.js — o PRÓLOGO ANIMADO (cinemática em 3D).
//
// São 5 "tomadas" (cenas), montadas com as mesmas peças do jogo
// (herói, esqueletos, Ares, templos, fogo), com a câmera se
// movendo como num filme e a narração embaixo, na faixa preta:
//
//   1. A Grande Trégua      — os deuses fazem o juramento no Olimpo
//   2. O Deus da Guerra     — Ares ergue um exército de esqueletos
//   3. Argos em chamas      — Teron luta na cidade e cai
//   4. A voz de ferro       — Nêmesis desce até Teron, na praia
//   5. As Correntes         — as correntes se prendem nele e ele se ergue
//
// Clique = próxima cena · Pular / ESC = vai direto para o jogo.
// =============================================================

const CV3 = THREE.Vector3;
const cl01 = (x) => Math.max(0, Math.min(1, x));
const sstep = (a, b, x) => { const t = cl01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const Cine = {
  active: false,

  // ---------- montagem comum ----------
  // shots = lista de cenas; opts.music = música (sem = trilha do prólogo)
  play(shots, onDone, opts) {
    opts = opts || {};
    if (typeof shots === 'function') { onDone = shots; shots = SHOTS; }
    this.shots = shots;
    this.onDone = onDone;
    this.gen = (this.gen || 0) + 1; this.switching = false; this.t = 0; // nova sessão de filme
    this.active = true;
    this.scene = new THREE.Scene();
    this.shotIdx = -1;
    this.actors = [];
    // as partículas (fogo, faíscas) passam a ser desenhadas na cena da cinemática
    this.fxScene = FX.scene;
    for (const s of FX.systems) { s.list = []; this.scene.add(s.pts); }
    FX.scene = this.scene;
    // um herói só para a cinemática
    this.hero = new Player(this.scene, new CV3(0, 0, 0));
    this.heroBlades(false);
    // espada e escudo de soldado comum (antes de receber as correntes)
    const bronze = mat('#b8802f', { metalness: 0.75, roughness: 0.45 }), iron = mat('#a8acb2', { metalness: 0.8, roughness: 0.3 });
    const sword = new THREE.Group();
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.02), iron); bl.position.y = -0.45; sword.add(bl);
    sword.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), bronze));
    sword.rotation.x = -Math.PI / 2;
    this.hero.j.armR.hand.add(sword);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16), bronze);
    shield.rotation.x = Math.PI / 2; shield.position.set(0, -0.05, 0.12);
    this.hero.j.armL.hand.add(shield);
    this.soldierGear = [sword, shield];
    if (this.hero.rig) { sword.visible = shield.visible = false; this.soldierGear = [this.hero.rig.node('1H_Axe'), this.hero.rig.node('Barbarian_Round_Shield')].filter(Boolean); }
    this.rigs = []; // fantasmas e Nêmesis com modelo (atualizados todo quadro)

    const el = document.getElementById('cine');
    el.classList.remove('hidden');
    document.body.classList.add('cinema');
    if (opts.music !== false) Sound.startMusic(opts.music || { tempo: 72, root: 45, seed: 5, mood: 'dark' });
    this.nextShot();
  },

  heroBlades(on) {
    const h = this.hero;
    for (const s of ['L', 'R']) { h.blades[s].g.visible = on; h.blades[s].trail.mesh.visible = on; }
    h.chain.visible = on; h.bladeLight.visible = on;
  },

  clearShot() {
    this.rigs = [];
    for (const a of this.actors) a.remove ? a.remove() : this.scene.remove(a);
    this.actors = [];
    if (this.group) this.scene.remove(this.group);
    if (this.builder) this.scene.remove(this.builder.group);
    for (const s of FX.systems) s.list = [];
    for (const r of FX.rings) this.scene.remove(r.m);
    FX.rings = [];
  },

  nextShot() {
    const fade = document.getElementById('cineFade');
    if (this.shotIdx >= 0) {
      // escurece, troca a cena, clareia
      if (this.switching || !this.active) return;
      this.switching = true;
      const gen = this.gen;
      fade.classList.add('on');
      setTimeout(() => {
        if (gen !== this.gen || !this.active) return; // troca atrasada de um filme que já acabou
        this.switching = false; this.loadShot(this.shotIdx + 1); fade.classList.remove('on');
      }, 450);
    } else this.loadShot(0);
  },

  loadShot(i) {
    if (!this.active) return;
    const keep = this.shots[i] && this.shots[i].same;
    if (!keep) this.clearShot();
    this.shotIdx = i;
    const S = this.shots[i];
    if (!S) { this.end(); return; }
    this.t = 0;
    if (!keep) {
      this.group = new THREE.Group(); this.scene.add(this.group);
      this.builder = new LevelBuilder(this.scene);
      this.scene.fog = S.fog ? new THREE.FogExp2(S.fog[0], S.fog[1]) : null;
      if (this.scene.fog) this.scene.userData.fogBase = S.fog[1];
      this.st = {};
    }
    Post.setTheme(THEMES3D[S.grade]);
    if (S.exp) Post.mComp.uniforms.exposure.value = S.exp;
    S.setup && S.setup(this, this.st);
    // narração
    const P = S.cap || PROLOGUE[S.text];
    const cap = document.querySelector('#cine .cap');
    cap.querySelector('.ttl').textContent = P.title;
    const tx = cap.querySelector('.txt');
    tx.style.color = P.who ? WHO_COLORS[P.who] : '';
    this.full = P.text; this.typed = 0; tx.textContent = '';
    cap.classList.remove('show'); void cap.offsetWidth; cap.classList.add('show');
    document.getElementById('cineTitle').classList.remove('show');
    document.querySelector('#cine .dots').innerHTML = this.shots.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  },

  // título grande no meio da tela
  title(pre, big) {
    const el = document.getElementById('cineTitle');
    el.querySelector('.pre').textContent = pre; el.querySelector('.big').textContent = big;
    el.classList.add('show');
  },

  // ---------- atores ----------
  // qualquer inimigo do jogo como "ator" (animado à mão)
  foe(Cls, x, y, z, yaw, extra) {
    const e = new Cls(this.scene, new CV3(x, y, z), yaw, extra);
    e.cineSpeed = 0; e.fallT = -1; e.state = 'idle'; e.st = 0;
    this.actors.push(e);
    return e;
  },
  // o herói entra na cena: posição, direção, com lâminas (true) ou como soldado
  heroAt(x, z, yaw, blades) {
    const h = this.hero;
    h.root.visible = true; this.heroBlades(blades !== false);
    for (const o of this.soldierGear) o.visible = blades === false;
    h.pos.set(x, 0, z); h.vel.set(0, 0, 0); h.yaw = yaw; h.attack = null; h.castT = 0;
    h.root.rotation.set(0, yaw, 0);
    return h;
  },
  // anda até um ponto (velocidade v) — devolve true quando chegou
  heroWalk(dt, tx, tz, v) {
    const h = this.hero, dx = tx - h.pos.x, dz = tz - h.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.15) { h.vel.set(0, 0, 0); return true; }
    h.yaw = Math.atan2(dx, dz);
    h.vel.set(dx / d * v, 0, dz / d * v);
    h.pos.x += h.vel.x * dt; h.pos.z += h.vel.z * dt;
    return false;
  },
  // fantasma (almas, Ione): figura translúcida que brilha
  ghost(scale, color) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.7, depthWrite: false, roughness: 0.6 });
    const prof = [[0.01, 0], [0.42, 0.02], [0.32, 0.5], [0.2, 0.95], [0.15, 1.05], [0.01, 1.08]].map(([r, h]) => new THREE.Vector2(r, h));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 10), m); g.add(body);
    const headG = new THREE.Group(); headG.position.y = 1.22; g.add(headG);
    Face.human(headG, { r: 0.15, y: 0, skinMat: m, eye: '#2a4a5a', brow: '#5a8a9a', lip: '#6aa8b8', socket: '#9ad8e0', hair: '#a8e8f0', longHair: true });
    const fmats = [];
    headG.traverse(o => { if (o.isMesh && o.material !== m) { o.material = o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; fmats.push(o.material); } });
    const arms = [];
    for (const sx of [-1, 1]) { const a = new THREE.Group(); a.position.set(sx * 0.17, 0.95, 0); const am = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.45, 5), m); am.position.y = -0.22; a.add(am); a.rotation.z = sx * 0.25; g.add(a); arms.push(a); }
    g.scale.setScalar(scale);
    const G = { g, m, arms, setFade(k) { m.opacity = 0.7 * k; m.emissiveIntensity = 1.2 * k; for (const f of fmats) f.opacity = 0.85 * k; g.visible = k > 0.01; } };
    if (Models.has('Rogue_Hooded')) {
      for (const c of [...g.children]) c.visible = false;
      const rig = new Rig('Rogue_Hooded', { height: 1.25, ghost: { color, opacity: 0.6 } });
      rig.obj.scale.multiplyScalar(1 / scale); // g já tem a escala
      g.add(rig.obj);
      const arms2 = [new THREE.Object3D(), new THREE.Object3D()];
      G.arms = arms2;
      G.setFade = (k) => { for (const mm of rig.mats) { mm.opacity = 0.6 * k; mm.emissiveIntensity = 0.9 * k; } g.visible = k > 0.01; };
      G.tick = (dt) => { rig.play(arms2[1].rotation.x < -1.2 ? 'Cheer' : arms2[1].rotation.x < -0.5 ? 'Interact' : 'Idle', { fade: 0.3 }); rig.update(dt); };
      rig.mixer.update(Math.random() * 2);
      this.rigs.push(G);
    }
    return G;
  },
  // casco de navio com vela
  ship(color) {
    const g = new THREE.Group(), wood = mat('#2a1a12'), sail = mat(color || '#1a0a0a', { side: THREE.DoubleSide });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 9), wood); hull.position.y = 0.4; g.add(hull);
    const prow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 4), wood); prow.rotation.x = Math.PI / 2; prow.rotation.y = Math.PI / 4; prow.position.set(0, 0.5, 5.6); g.add(prow);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 7, 6), wood); mast.position.y = 4; g.add(mast);
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6, 4, 4), sail); sl.position.set(0, 4.6, 0.2); sl.rotation.y = Math.PI / 2; g.add(sl);
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), this.glowMat('#ff3a1a', 2.5)); eye.position.set(0.01, 4.9, 0.22); eye.rotation.y = Math.PI / 2; g.add(eye);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.2), wood); o.position.set(s * 1.6, 0.2, -3 + i * 1.2); o.rotation.z = s * 0.5; g.add(o); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  },
  // mar simples com ondas
  sea(color, y, z, emissive) {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 60, 60), new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: emissive ? 0 : 0.4, flatShading: true, emissive: emissive || '#000000', emissiveIntensity: emissive ? 0.55 : 0 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, y, z || 0); this.group.add(sea);
    const base = Float32Array.from(sea.geometry.attributes.position.array);
    return (t) => {
      const p = sea.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = base[i * 3], yy = base[i * 3 + 1]; p.array[i * 3 + 2] = Math.sin(x * 0.2 + t * 1.2) * 0.25 + Math.cos(yy * 0.25 + t) * 0.2; }
      p.needsUpdate = true; sea.geometry.computeVertexNormals();
    };
  },
  // rastro de partículas de vento / cinzas / almas
  drift(color, n, box, vel, glow) {
    for (let i = 0; i < n; i++) FX.add({ x: box[0] + Math.random() * box[1], y: box[2] + Math.random() * box[3], z: box[4] + Math.random() * box[5], vx: vel[0], vy: vel[1], vz: vel[2], life: 1.6, size: glow ? 0.12 : 0.08, color, glow: !!glow, alpha: glow ? 1 : 0.6 });
  },
  skeleton(x, z, yaw) {
    const e = new SkeletonSword(this.scene, new CV3(x, 0, z), yaw);
    e.cineSpeed = 0; e.fallT = -1;
    this.actors.push(e);
    return e;
  },
  tickFoe(e, dt) {
    e.animT += dt; e.st = (e.st || 0) + dt;
    e.walk.set(e.cineSpeed, 0, 0);
    e.sync();
    if (e.rig) {
      if (e.fallT >= 0) { e.fallT += dt; e.rig.play(e.rigSpec.death || 'Death_A', { loop: false, fade: 0.08 }); e.rig.update(dt); }
      else animateFoeRig(e, dt);
      e.animate(dt);
      return;
    }
    e.animate(dt);
    if (e.fallT >= 0) { // derrubado
      e.fallT += dt;
      e.root.rotation.x = -Math.PI / 2 * sstep(0, 0.35, e.fallT);
      e.root.position.y = e.pos.y + 0.15 * sstep(0, 0.35, e.fallT);
    }
  },
  heroAttack(step) {
    const h = this.hero;
    h.attack = { def: step < 0 ? HEAVY : COMBO4[step], step, t: 0, id: ++h.attackId };
    Sound.swing(Math.min(step < 0 ? 2 : step, 2));
  },
  tickHero(dt, lie) {
    const h = this.hero;
    if (h.attack) { h.attack.t += dt; if (h.attack.t >= h.attack.def.dur) h.attack = null; }
    h.onGround = true;
    if (h.rig) { // modelo: animações de deitar, levantar e cair
      const prev = h._lie === undefined ? lie : h._lie; h._lie = lie;
      if (!lie) h.forceClip = null;
      else if (lie >= 0.999) h.forceClip = { name: 'Lie_Idle' };
      else if (lie < prev) h.forceClip = { name: 'Lie_StandUp', at: 1 - lie };
      else h.forceClip = { name: 'Death_B', at: Math.min(1, lie) };
      h.animate(dt);
      h.updateBlades(dt);
      return;
    }
    h.animate(dt);
    if (lie) { // deitado de costas (lie = 1) → em pé (lie = 0)
      h.root.rotation.x = -Math.PI / 2 * lie;
      h.root.position.y = h.pos.y + 0.22 * lie;
      h.root.updateMatrixWorld(true);
    } else h.root.rotation.x = 0;
    h.updateBlades(dt);
  },

  // corrente de elos ao longo de uma curva (de a até b, até a fração u)
  chainMesh(n) {
    const g = new THREE.TorusGeometry(0.06, 0.018, 4, 8); g.scale(1, 1.7, 1);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#9aa6b8', metalness: 0.9, roughness: 0.3, emissive: '#3a7aff', emissiveIntensity: 0.6 }), n);
    m.frustumCulled = false;
    this.group.add(m);
    return m;
  },
  layChain(m, a, b, u, sag, t) {
    const n = m.count, q = new THREE.Quaternion(), mx = new THREE.Matrix4(), prev = a.clone(), up = new CV3(0, 1, 0);
    const c = a.clone().add(b).multiplyScalar(0.5); c.y += sag;
    for (let i = 0; i < n; i++) {
      const k = (i + 1) / n;
      const s = Math.min(k, u);
      const p = new CV3(
        (1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * c.x + s * s * b.x,
        (1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * c.y + s * s * b.y + Math.sin(k * 12 - t * 6) * 0.08 * (1 - u),
        (1 - s) * (1 - s) * a.z + 2 * (1 - s) * s * c.z + s * s * b.z);
      const tan = p.clone().sub(prev); if (tan.lengthSq() < 1e-8) tan.set(0, 1, 0);
      q.setFromUnitVectors(up, tan.normalize());
      if (i % 2) q.multiply(new THREE.Quaternion().setFromAxisAngle(up, Math.PI / 2));
      const sc = k <= u + 0.001 ? 1 : 0.0001;
      mx.compose(p, q, new CV3(sc, sc, sc));
      m.setMatrixAt(i, mx);
      prev.copy(p);
    }
    m.instanceMatrix.needsUpdate = true;
  },

  // ---------- cenário ----------
  lights(o) {
    const g = this.group;
    g.add(new THREE.HemisphereLight(o.sky, o.ground, o.hemi));
    const d = new THREE.DirectionalLight(o.sun, o.sunI);
    d.position.copy(o.sunPos || new CV3(12, 20, 8));
    d.castShadow = true;
    d.shadow.mapSize.set(1024, 1024);
    Object.assign(d.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
    d.shadow.bias = -0.0005; d.shadow.normalBias = 0.03;
    g.add(d, d.target);
    return d;
  },
  floor(color, spots, size, o) {
    o = o || {};
    const m = mat(color, { map: Tex.make(color, spots, { blobs: 26, bricks: !!o.bricks, seed: o.seed || 3 }) });
    m.normalMap = Tex.normal(m.map, 2.2); m.normalScale.set(0.7, 0.7);
    const f = new THREE.Mesh(boxGeo(o.w || size, 1, o.d || size, 3), m);
    f.position.set(o.x || 0, -0.5 + (o.y || 0), o.z || 0); f.receiveShadow = true;
    this.group.add(f);
    return m;
  },
  plight(color, i, dist, pos) {
    const l = new THREE.PointLight(color, i, dist, 2);
    l.position.copy(pos); this.group.add(l); return l;
  },
  glowMat(color, k) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k || 3, roughness: 0.4 }); },

  // NÊMESIS: figura alta de manto escuro, olhos frios, auréola e correntes flutuando
  buildNemesis() {
    const g = new THREE.Group();
    const mats = [];
    const M = (m) => { m.transparent = true; mats.push(m); return m; };
    const robe = M(new THREE.MeshStandardMaterial({ color: '#2a2f38', metalness: 0.6, roughness: 0.4, emissive: '#1a3a7a', emissiveIntensity: 0.12, flatShading: true }));
    const prof = [[0.01, 0], [1.0, 0.05], [0.8, 0.8], [0.55, 1.6], [0.42, 2.05], [0.3, 2.25], [0.01, 2.3]].map(([r, h]) => new THREE.Vector2(r, h));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), robe); g.add(body);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), robe); hood.position.y = 2.38; g.add(hood);
    const faceG = new THREE.Group(); faceG.position.set(0, 2.34, 0.06); g.add(faceG);
    Face.human(faceG, { r: 0.19, y: 0, skin: '#c8d0dc', glow: true, eye: '#d8ecff', brow: '#4a5468', angry: 0.3, lip: '#5a6a8a', socket: '#6a7488', ears: false, hair: '#141820', longHair: true });
    faceG.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); M(o.material); } });
    const eyeM = M(this.glowMat('#d8ecff', 5));
    for (const sx of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.02), eyeM); e.position.set(sx, 2.4, 0.3); g.add(e); }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 40), M(this.glowMat('#7ab8ff', 4))); halo.position.set(0, 2.5, -0.3); g.add(halo);
    // braços (para levantar)
    const arms = [];
    for (const sx of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(sx * 0.42, 1.95, 0); g.add(sh);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 7), robe); arm.position.y = -0.45; sh.add(arm);
      const hand = new THREE.Group(); hand.position.y = -0.95; sh.add(hand);
      hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeM));
      sh.rotation.z = sx * 0.35;
      arms.push({ sh, hand });
    }
    // anéis de corrente girando em volta da cintura
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.25, 0.03, 4, 48), M(new THREE.MeshStandardMaterial({ color: '#8a96a8', metalness: 0.9, roughness: 0.3, emissive: '#3a7aff', emissiveIntensity: 0.8 })));
      r.position.y = 0.8 + i * 0.45; r.rotation.x = Math.PI / 2 + (i - 1) * 0.35;
      g.add(r); rings.push(r);
    }
    const light = new THREE.PointLight('#d8e4ff', 0, 16, 2); light.position.set(0, 1.2, 2.6); g.add(light);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const N = { g, mats, arms, rings, light, halo, setFade(k) { for (const m of mats) m.opacity = k; g.visible = k > 0.01; light.intensity = 3.5 * k; } };
    if (Models.has('Rogue_Hooded')) {
      // corpo de verdade: figura encapuzada de aço escuro com brilho azul
      for (const c of [...g.children]) if (c !== halo && c !== light && !rings.includes(c)) c.visible = false;
      const rig = new Rig('Rogue_Hooded', { height: 2.7, solid: { color: '#6a7282', metalness: 0.75, roughness: 0.35, emissive: '#3a6aff', emissiveIntensity: 0.06 }, meshes: { Rogue_Cape: { color: '#141a26' } } });
      for (const m of rig.mats) { m.transparent = true; mats.push(m); }
      g.add(rig.obj);
      N.rig = rig;
      N.arms = [{ sh: new THREE.Object3D(), hand: rig.bone('handslot.l') }, { sh: new THREE.Object3D(), hand: rig.bone('handslot.r') }];
      N.tick = (dt) => { rig.play(N.arms[0].sh.rotation.x < -0.4 ? 'Spellcasting' : 'Idle', { fade: 0.3 }); rig.update(dt); };
      this.rigs.push(N);
    }
    return N;
  },

  // ---------- laço ----------
  update(dt) {
    if (!this.active) return;
    const S = this.shots[this.shotIdx];
    if (!S) return;
    this.t += dt;
    if (S.chapter !== undefined) { // título grande do capítulo nos primeiros segundos
      const el = document.getElementById('cineTitle');
      if (this.t > 0.3 && !this.st._ct) { this.st._ct = true; this.title('CAPÍTULO ' + ROMAN[S.chapter], CHAPTERS[S.chapter].title); }
      if (this.t > 4.2 && this.st._ct === true) { this.st._ct = 2; el.classList.remove('show'); }
    }
    S.update(this, this.st, this.t, dt);
    for (const fn of this.builder.updaters) fn(this.t + 100);
    for (const R of this.rigs) if (R.tick && R.g.visible) R.tick(dt);
    // narração digitando
    if (this.typed < this.full.length) {
      this.typed = Math.min(this.full.length, this.typed + dt * 42);
      document.querySelector('#cine .txt').textContent = this.full.slice(0, Math.ceil(this.typed));
    }
    if (this.t > S.dur) this.nextShot();
  },

  render(dt) {
    Post.render(this.scene, camera, dt);
  },

  cam(pos, look, fov) {
    camera.position.copy(pos);
    camera.lookAt(look);
    if (fov && camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  },

  end() {
    if (!this.active) return;
    this.active = false;
    this.clearShot();
    // devolve as partículas para a cena do jogo
    for (const s of FX.systems) { s.list = []; this.fxScene.add(s.pts); }
    FX.scene = this.fxScene;
    const h = this.hero;
    for (const o of [h.root, h.blades.L.g, h.blades.R.g, h.blades.L.trail.mesh, h.blades.R.trail.mesh, h.bladeLight, h.chain]) this.scene.remove(o);
    this.scene = null; this.hero = null;
    camera.fov = 45; camera.updateProjectionMatrix();
    if (game.level) Post.setTheme(game.level.theme);
    document.getElementById('cine').classList.add('hidden');
    document.getElementById('cineFade').classList.remove('on');
    document.body.classList.remove('cinema');
    const fn = this.onDone; this.onDone = null;
    if (fn) fn();
  },

  init() {
    const el = document.getElementById('cine');
    el.addEventListener('click', (e) => { if (e.target.id !== 'btnCineSkip') this.skipShot(); });
    document.getElementById('btnCineSkip').addEventListener('click', () => this.end());
    addEventListener('keydown', (e) => {
      if (!this.active || e.repeat) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.end(); }
      else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); this.skipShot(); }
      else e.stopImmediatePropagation(); // nada de controlar o herói do jogo durante o filme
    }, true);
  },
  // 1º clique: termina de escrever a narração; 2º: próxima cena
  skipShot() {
    if (this.typed < this.full.length) { this.typed = this.full.length; document.querySelector('#cine .txt').textContent = this.full; return; }
    this.nextShot();
  },
};

// =============================================================
// AS CENAS
// =============================================================
const SHOTS = [
  // ---------------------------------------------------------
  // 1. A GRANDE TRÉGUA — juramento dos deuses no Olimpo
  // ---------------------------------------------------------
  {
    text: 0, dur: 13, grade: 'olympus', fog: ['#f4e8d0', 0.012],
    setup(C, st) {
      const B = C.builder, g = C.group;
      const T = THEMES3D.olympus;
      B.sky('#4a7ad0', '#ffe2a8', new CV3(-0.3, 0.35, -0.9).normalize(), '#fff0c0', T);
      C.lights({ sky: '#fff4e0', ground: '#8a7a60', hemi: 0.8, sun: '#ffe0a8', sunI: 2.4, sunPos: new CV3(-8, 14, -18) });
      // plataforma de mármore redonda
      const marble = mat('#efe6d6', { map: Tex.make('#efe6d6', ['#d8cebc', '#fffaf0'], { blobs: 20, bricks: true, seed: 9 }) });
      marble.normalMap = Tex.normal(marble.map, 2); marble.normalScale.set(0.6, 0.6);
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(14, 13, 1.2, 40), marble); plat.position.y = -0.6; plat.receiveShadow = true; g.add(plat);
      const step = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 0.4, 32), marble); step.position.y = 0.2; step.receiveShadow = true; step.castShadow = true; g.add(step);
      B.temple(0, 0, -14, marble);
      // mar de nuvens embaixo
      const cloudM = new THREE.MeshStandardMaterial({ color: '#fff6ea', emissive: '#ffe8c8', emissiveIntensity: 0.25, roughness: 1, flatShading: true });
      const rng = makeRng(4);
      for (let i = 0; i < 60; i++) {
        const a = rng() * Math.PI * 2, r = 16 + rng() * 60, s = 4 + rng() * 9;
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), cloudM);
        c.position.set(Math.cos(a) * r, -5 - rng() * 4, Math.sin(a) * r); c.scale.y = 0.45; g.add(c);
      }
      // seis estátuas dos deuses em semicírculo, cada uma com uma chama dourada
      st.orbs = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i + 0.5) / 6 * Math.PI, R = 8.5;
        const x = Math.cos(a) * R, z = Math.sin(a) * R - 1;
        B.statue(x, 0, z, marble, Math.atan2(-x, -z));
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), C.glowMat('#ffd27a', 0));
        orb.position.set(x, 3.4, z); g.add(orb);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        g.add(beam);
        st.orbs.push({ orb, beam, pos: orb.position.clone(), lit: false });
      }
      st.center = new CV3(0, 2.2, 0);
      st.core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), C.glowMat('#fff2c0', 0)); st.core.position.copy(st.center); g.add(st.core);
      st.pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe6a8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      st.pillar.position.set(0, 30, 0); g.add(st.pillar);
      st.coreLight = C.plight('#ffd890', 0, 30, st.center);
      C.hero.root.visible = false;
    },
    update(C, st, t, dt) {
      // as chamas acendem uma a uma
      st.orbs.forEach((o, i) => {
        const on = sstep(1.5 + i * 0.5, 2.0 + i * 0.5, t);
        o.orb.material.emissiveIntensity = on * 4 + Math.sin(t * 6 + i) * 0.3 * on;
        if (on > 0.5 && !o.lit) { o.lit = true; FX.burst(o.pos, 20, { speed: [1, 3], life: [0.4, 0.9], size: [0.1, 0.25], colors: ['#fff2c0', '#ffd27a'], glow: true, drag: 2 }); Sound.orb && Sound.orb(); }
        // raios de luz até o centro (o juramento)
        const b = sstep(5.2, 6.2, t);
        const mid = o.pos.clone().lerp(st.center, 0.5 * b);
        const len = o.pos.distanceTo(st.center) * b;
        o.beam.position.copy(o.pos).lerp(st.center, 0.5 * b);
        o.beam.scale.set(1, Math.max(0.001, len), 1);
        o.beam.quaternion.setFromUnitVectors(new CV3(0, 1, 0), st.center.clone().sub(o.pos).normalize());
        o.beam.material.opacity = b * (1 - sstep(9, 11, t)) * 0.9;
        void mid;
      });
      const k = sstep(6.2, 6.8, t);
      st.core.material.emissiveIntensity = k * (6 + Math.sin(t * 8));
      st.core.scale.setScalar(0.5 + k * 1.2 + Math.sin(t * 5) * 0.05 * k);
      st.coreLight.intensity = k * 6;
      st.pillar.material.opacity = sstep(6.6, 7.2, t) * (1 - sstep(10.5, 12.5, t)) * 0.55;
      if (t > 6.6 && !st.boom) {
        st.boom = true; Sound.portal(); game.flash('rgba(255,240,200,0.55)');
        FX.ring(new CV3(0, 0.45, 0), '#ffe6a8', 9); FX.ring(new CV3(0, 0.45, 0), '#ffffff', 5);
        FX.burst(st.center, 80, { speed: [3, 10], life: [0.6, 1.4], size: [0.15, 0.35], colors: ['#fff6d0', '#ffd27a', '#ffffff'], glow: true, drag: 1.4 });
      }
      if (t > 7 && Math.random() < 0.5) FX.add({ x: rand(-0.5, 0.5), y: 0.5, z: rand(-0.5, 0.5), vy: rand(4, 9), life: 1.2, size: 0.18, color: '#ffe6a8', glow: true });
      // câmera: sobe e gira devagar ao redor do círculo
      const a = lerp(-0.75, 0.35, sstep(0, 13, t)), R = lerp(20, 13, sstep(0, 13, t)), h = lerp(1.6, 8, sstep(0, 13, t));
      C.cam(new CV3(Math.sin(a) * R, h, Math.cos(a) * R), new CV3(0, lerp(4, 2, sstep(0, 8, t)), -1), 42);
    },
  },

  // ---------------------------------------------------------
  // 2. O DEUS DA GUERRA — Ares ergue o exército dos mortos
  // ---------------------------------------------------------
  {
    text: 1, dur: 13, grade: 'throne', fog: ['#2a0806', 0.02],
    setup(C, st) {
      const B = C.builder, g = C.group, T = THEMES3D.throne;
      B.sky(T.sky[0], T.sky[1], new CV3(0.2, 0.25, -1).normalize(), '#ff3a2a', T);
      C.lights({ sky: '#ff8a5a', ground: '#3a0a06', hemi: 0.5, sun: '#ff9a6a', sunI: 1.2, sunPos: new CV3(-6, 14, -14) });
      C.floor(T.ground, T.spots, 90, { bricks: false, seed: 31 });
      // rachaduras de lava no chão
      const lava = C.glowMat('#ff4a0a', 2.2);
      const rng = makeRng(8);
      for (let i = 0; i < 26; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(rand(1.5, 5), 0.05, rand(0.06, 0.16)), lava);
        c.position.set(rng() * 40 - 20, 0.02, rng() * 30 - 12); c.rotation.y = rng() * 3; g.add(c);
      }
      // pedra-trono de Ares
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 0), mat('#2a1a18', { roughness: 0.9 }));
      rock.position.set(0, 0.2, -3); rock.scale.set(1.2, 0.55, 1); rock.castShadow = rock.receiveShadow = true; g.add(rock);
      st.ares = new Ares(C.scene, new CV3(0, 1.25, -3), 0);
      st.ares.state = 'idle'; C.actors.push(st.ares);
      st.redLight = C.plight('#ff3a1a', 3, 18, new CV3(0, 5, -0.5));
      // exército que sai do chão
      st.army = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
        const e = C.skeleton(-6.25 + c * 2.5 + (r % 2) * 1.2, 4 + r * 2.6, 0);
        e.riseT = 3.2 + r * 1.3 + rng() * 0.8; e.pos.y = -2.2;
        st.army.push(e);
      }
      C.hero.root.visible = false;
    },
    update(C, st, t, dt) {
      const A = st.ares;
      A.animT += dt;
      A.state = t > 2.2 && t < 9 ? 'fireWind' : 'idle';
      A.sync(); A.animate(dt);
      A.eyes.material.emissiveIntensity = t > 2.2 ? 6 : 3;
      st.redLight.intensity = 3 + (t > 2.2 ? 3 + Math.sin(t * 9) * 0.8 : 0);
      if (t > 2.4 && !st.roar) { st.roar = true; Sound.roar(0.8); FX.ring(new CV3(0, 0.1, -3), '#ff4a1a', 14); game.shake && (st.shake = 0.35); }
      if (t > 2.4 && t < 9 && Math.random() < 0.6) FX.fire(new CV3(A.pos.x + rand(-0.4, 0.4), A.pos.y + 3.9, A.pos.z + 0.4), 2);
      for (const e of st.army) {
        const k = sstep(e.riseT, e.riseT + 1.1, t);
        if (k > 0 && !e.risen && e.rig) e.forceClip = { name: 'Spawn_Ground_Skeletons', o: { loop: false } };
        if (k >= 1 && e.forceClip && t > e.riseT + 2.5) e.forceClip = null;
        if (k > 0 && !e.risen) { e.risen = true; FX.dust(new CV3(e.pos.x, 0, e.pos.z), 10); FX.burst(new CV3(e.pos.x, 0.2, e.pos.z), 12, { speed: [1, 3], up: 3, life: [0.4, 0.9], size: [0.1, 0.2], colors: ['#ff6a2a', '#ffb04a'], glow: true, gravity: -6, drag: 1 }); if (Math.random() < 0.4) Sound.bones(); }
        e.pos.y = lerp(-2.2, 0, k);
        e.root.rotation.z = Math.sin(t * 7 + e.riseT) * 0.15 * (1 - k);
        C.tickFoe(e, dt);
      }
      // câmera: começa no rosto de Ares (de baixo) e recua para mostrar o exército
      const k = sstep(4, 12, t);
      const shake = st.shake ? (st.shake = Math.max(0, st.shake - dt * 0.6)) : 0;
      const pos = new CV3(lerp(1.6, 9, k), lerp(2.2, 7.5, k), lerp(1.6, 17, k)).add(new CV3(rand(-1, 1), rand(-1, 1), 0).multiplyScalar(shake));
      C.cam(pos, new CV3(0, lerp(4.4, 1.6, k), lerp(-3, 3, k)), 40);
    },
  },

  // ---------------------------------------------------------
  // 3. ARGOS EM CHAMAS — a cidade queima, Teron luta e cai
  // ---------------------------------------------------------
  {
    text: 2, dur: 14, grade: 'forge', exp: 1.25, fog: ['#3a1408', 0.024],
    setup(C, st) {
      const B = C.builder, g = C.group, T = THEMES3D.forge;
      B.sky('#140403', '#7a2a0a', new CV3(0.3, 0.2, -1).normalize(), null, T);
      C.lights({ sky: '#ff9a5a', ground: '#3a1008', hemi: 0.55, sun: '#ffb070', sunI: 0.9, sunPos: new CV3(10, 16, 10) });
      C.floor('#6a5a4a', ['#4a3a2c', '#7a6a58'], 120, { bricks: true, seed: 12 });
      // casas dos dois lados da rua
      const wall = mat('#c8b8a0', { map: Tex.make('#c8b8a0', ['#a89880', '#d8c8b0'], { blobs: 10, seed: 5 }) }), roof = mat('#8a3a22');
      st.fires = [];
      const rng = makeRng(17);
      for (let x = -40; x < 40; x += 6.5) for (const side of [-1, 1]) {
        const w = 4.5 + rng() * 1.5, h = 3 + rng() * 2.5, d = 4 + rng();
        const house = new THREE.Mesh(boxGeo(w, h, d, 3), wall); house.position.set(x + rng(), h / 2, side * (7 + d / 2)); house.castShadow = house.receiveShadow = true; g.add(house);
        const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 1.6, 4), roof); rf.position.set(house.position.x, h + 0.8, house.position.z); rf.rotation.y = Math.PI / 4; rf.castShadow = true; g.add(rf);
        if (rng() < 0.6) st.fires.push(new CV3(house.position.x + rand(-1, 1), h + 0.8, house.position.z));
      }
      st.lights = [C.plight('#ff7a2a', 3, 22, new CV3(-6, 4, 5)), C.plight('#ff5a1a', 3, 22, new CV3(8, 4, -5)), C.plight('#ff9a3a', 2, 18, new CV3(20, 4, 4))];
      // exército marchando pela rua
      st.army = [];
      for (let i = 0; i < 10; i++) {
        const e = C.skeleton(-16 - (i % 5) * 2.2 - Math.floor(i / 5) * 3, (i % 5) * 1.6 - 3.2, Math.PI / 2);
        e.cineSpeed = 2.6; st.army.push(e);
      }
      // Teron, sozinho na rua
      const h = C.hero;
      h.root.visible = true; C.heroBlades(false);
      for (const o of C.soldierGear) o.visible = true;
      h.pos.set(6, 0, 0); h.vel.set(0, 0, 0); h.yaw = -Math.PI / 2; h.attack = null;
      st.nextAtk = 4.2; st.atkStep = 0;
    },
    update(C, st, t, dt) {
      const h = C.hero;
      // fogo nos telhados
      for (const f of st.fires) if (Math.random() < 0.8) FX.fire(f, 3);
      if (Math.random() < 0.3) { const f = choose(st.fires); FX.add({ x: f.x, y: f.y + 1, z: f.z, vx: rand(-0.3, 0.3), vy: rand(1, 2), life: 2.5, size: 1.2, grow: 0.8, color: '#2a1a14', alpha: 0.35, drag: 0.2 }); }
      st.lights.forEach((l, i) => { l.intensity = 2.6 + Math.sin(t * 13 + i * 2) * 0.5 + Math.sin(t * 29 + i) * 0.3; });
      // Teron corre na direção do exército e luta
      const charging = t > 2.8 && t < 4.2;
      h.vel.set(charging ? -7 : 0, 0, 0);
      if (charging) h.pos.x += h.vel.x * dt;
      if (t > st.nextAtk && t < 9.4) {
        C.heroAttack(st.atkStep % 4); st.atkStep++; st.nextAtk = t + 0.55;
        // derruba o esqueleto mais próximo
        let best = null, bd = 3.2;
        for (const e of st.army) if (e.fallT < 0) { const d = Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z); if (d < bd) { bd = d; best = e; } }
        if (best) { best.fallT = 0; best.cineSpeed = 0; Sound.bones(); FX.shards(new CV3(best.pos.x, 1, best.pos.z), 14, ['#e8e2cf', '#c8c2b0']); FX.sparks(new CV3(best.pos.x, 1.2, best.pos.z), 10); }
      }
      for (const e of st.army) {
        if (e.fallT < 0) {
          const near = Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z);
          e.cineSpeed = near < 1.8 ? 0 : 2.6;
          e.yaw = Math.atan2(h.pos.x - e.pos.x, h.pos.z - e.pos.z);
          if (e.cineSpeed) { e.pos.x += Math.sin(e.yaw) * e.cineSpeed * dt; e.pos.z += Math.cos(e.yaw) * e.cineSpeed * dt; }
          e.state = near < 2.2 && Math.sin(t * 3 + e.animT) > 0.6 ? 'swingWind' : 'chase';
          e.st = (e.st || 0) + dt;
        }
        C.tickFoe(e, dt);
      }
      // um meteoro de Ares atinge Teron
      if (t > 9.4 && !st.meteor) {
        st.meteor = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), C.glowMat('#ff7a2a', 5));
        st.meteor.position.set(h.pos.x + 10, 26, h.pos.z - 6); C.group.add(st.meteor);
      }
      if (st.meteor && !st.hit) {
        const target = new CV3(h.pos.x + 1.2, 0, h.pos.z);
        st.meteor.position.lerp(target, Math.min(1, dt * 4.5));
        FX.fire(st.meteor.position, 3);
        if (st.meteor.position.distanceTo(target) < 0.8) {
          st.hit = t; C.group.remove(st.meteor);
          Sound.explode(); game.flash('rgba(255,160,80,0.6)'); st.shake = 0.5;
          FX.ring(target, '#ffb04a', 7); FX.burst(target, 90, { speed: [3, 12], up: 3, life: [0.5, 1.3], size: [0.2, 0.5], colors: ['#ffdf6b', '#ff9a2e', '#ff5a1f'], glow: true, drag: 1.3 });
          FX.dust(target, 20);
        }
      }
      let lie = 0;
      if (st.hit) { // arremessado para trás e cai
        const k = sstep(st.hit, st.hit + 0.7, t);
        h.pos.x = lerp(st.hitX || (st.hitX = h.pos.x), st.hitX - 3.5, k);
        h.pos.y = Math.sin(k * Math.PI) * 1.2;
        lie = k; h.attack = null;
      }
      C.tickHero(dt, lie);
      // câmera: acompanha Teron de lado, depois se aproxima dele caído
      const shake = st.shake ? (st.shake = Math.max(0, st.shake - dt * 0.7)) : 0;
      const close = st.hit ? sstep(st.hit + 0.5, st.hit + 3.5, t) : 0;
      const look = new CV3(h.pos.x - 2, 1.2, h.pos.z);
      const pos = new CV3(h.pos.x + lerp(6, 2.2, close), lerp(5.5, 2.4, close), lerp(5.8, 3.2, close)).add(new CV3(rand(-1, 1), rand(-1, 1), 0).multiplyScalar(shake));
      C.cam(pos, look.lerp(new CV3(h.pos.x, 0.3, h.pos.z), close), 42);
    },
  },

  // ---------------------------------------------------------
  // 4. A VOZ DE FERRO — na praia, à noite, Nêmesis desce até Teron
  // ---------------------------------------------------------
  {
    text: 3, dur: 13, grade: 'styx', exp: 1.35, fog: ['#0a1622', 0.02],
    setup(C, st) {
      const B = C.builder, g = C.group, T = THEMES3D.styx;
      B.sky('#02050a', '#1a3040', new CV3(-0.4, 0.3, -1).normalize(), '#c8e8ff', T);
      C.lights({ sky: '#8ab8ff', ground: '#0a1016', hemi: 0.45, sun: '#a8c8ff', sunI: 0.7, sunPos: new CV3(-10, 14, -16) });
      C.floor('#8a7a5a', ['#6a5a40', '#9a8a68'], 40, { seed: 21 });
      // mar escuro
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 60, 60), new THREE.MeshStandardMaterial({ color: '#0a2a44', roughness: 0.15, metalness: 0.4, flatShading: true }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.6, -40); g.add(sea);
      st.sea = sea; st.seaBase = Float32Array.from(sea.geometry.attributes.position.array);
      // destroços da batalha
      const rng = makeRng(33);
      for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 5), mat('#5a3a20')); sp.position.set(rng() * 14 - 7, 0.3, rng() * 10 - 3); sp.rotation.set(1.2, rng() * 3, 0.3); sp.castShadow = true; g.add(sp); }
      for (let i = 0; i < 4; i++) B.rock((i % 2 ? -1 : 1) * (5 + rng() * 5), 0, -3 - rng() * 6, 0.6 + rng() * 0.6, mat('#4a4a4a'));
      // Teron caído
      const h = C.hero;
      h.root.visible = true; C.heroBlades(false);
      for (const o of C.soldierGear) o.visible = false;
      h.pos.set(0, 0, 0); h.yaw = 0; h.vel.set(0, 0, 0); h.attack = null;
      st.shield = C.soldierGear[1];
      // Nêmesis
      const N = C.buildNemesis();
      N.g.position.set(0, 7, -3.2); N.g.rotation.y = 0;
      C.group.add(N.g); N.setFade(0);
      st.N = N;
    },
    update(C, st, t, dt) {
      const N = st.N, h = C.hero;
      // ondas
      const p = st.sea.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = st.seaBase[i * 3], y = st.seaBase[i * 3 + 1]; p.array[i * 3 + 2] = Math.sin(x * 0.2 + t * 1.2) * 0.25 + Math.cos(y * 0.25 + t) * 0.2; }
      p.needsUpdate = true; st.sea.geometry.computeVertexNormals();
      // ela aparece e desce devagar
      const k = sstep(2, 5, t);
      N.setFade(k);
      N.g.position.y = lerp(7, 0.6, sstep(2, 8, t)) + Math.sin(t * 1.3) * 0.12;
      N.rings.forEach((r, i) => { r.rotation.z += dt * (0.6 + i * 0.3) * (i % 2 ? -1 : 1); });
      N.halo.rotation.z += dt * 0.3;
      if (k > 0 && Math.random() < 0.7) FX.add({ x: N.g.position.x + rand(-1.2, 1.2), y: N.g.position.y + rand(0, 2.5), z: N.g.position.z + rand(-1, 1), vy: rand(0.3, 1), life: 1.5, size: 0.12, color: '#8ac8ff', glow: true, alpha: k });
      if (t > 2 && !st.chime) { st.chime = true; Sound.orb && Sound.orb(); Sound.chain(); }
      C.tickHero(dt, 1);
      // Teron mexe a cabeça quando ela fala
      h.j.head.rotation.x = -0.4 * sstep(7, 8, t);
      // câmera: perto do rosto de Teron, olhando para cima, depois mostra os dois
      const c = sstep(0, 13, t);
      // começa no herói caído com o mar ao fundo; vai subindo o olhar até ela
      const up = sstep(2.5, 7, t);
      C.cam(new CV3(lerp(3.2, 4.2, c), lerp(1.4, 2.6, c), lerp(2.6, 6, c)), new CV3(0, 0.4, -0.6).lerp(N.g.position.clone().setY(N.g.position.y + 1.2), up * 0.55), 42);
    },
  },

  // ---------------------------------------------------------
  // 5. AS CORRENTES DE NÊMESIS — continua a cena da praia
  // ---------------------------------------------------------
  {
    text: 4, dur: 15, grade: 'styx', exp: 1.35, same: true,
    setup(C, st) {
      st.chains = [C.chainMesh(40), C.chainMesh(40)];
      st.t0 = 0;
    },
    update(C, st, t, dt) {
      const N = st.N, h = C.hero;
      N.setFade(1 - sstep(9, 11.5, t));
      N.g.position.y = 0.6 + Math.sin((t + 13) * 1.3) * 0.12 + sstep(9, 11.5, t) * 4;
      N.rings.forEach((r, i) => { r.rotation.z += dt * (0.6 + i * 0.3) * (i % 2 ? -1 : 1) * (1 + sstep(0, 2, t) * 3); });
      // ela ergue os braços
      for (const [i, a] of N.arms.entries()) a.sh.rotation.x = -1.3 * sstep(0.2, 1.2, t) * (1 - sstep(8.5, 9.5, t));
      // as correntes voam das mãos dela até os pulsos de Teron
      const fly = sstep(1, 3, t), gone = sstep(4.2, 5, t);
      for (let i = 0; i < 2; i++) {
        const a = N.arms[i].hand.getWorldPosition(new CV3());
        const b = (i ? h.j.armR : h.j.armL).hand.getWorldPosition(new CV3());
        st.chains[i].visible = gone < 1;
        C.layChain(st.chains[i], a, b, fly, 1.2 * (1 - fly) + 0.3, t);
        if (fly > 0.98 && !st.bound) { st.bound = true; Sound.chain(); Sound.portal(); game.flash('rgba(160,200,255,0.6)'); FX.ring(new CV3(0, 0.1, 0), '#8ac8ff', 6); }
      }
      if (st.bound && !st.armed && t > 3.6) {
        st.armed = true; C.heroBlades(true); Sound.furyCharge();
        for (const s of ['L', 'R']) FX.burst(h.blades[s].g.position, 40, { speed: [1, 5], life: [0.4, 1], size: [0.15, 0.35], colors: ['#ffdf6b', '#ff9a2e', '#ff5a1f'], glow: true, drag: 1.5 });
      }
      if (st.armed && Math.random() < 0.6) for (const s of ['L', 'R']) FX.fire(h.blades[s].g.position, 1);
      // ele se levanta
      const lie = 1 - sstep(4.5, 6.5, t);
      h.yaw = lerp(0, 0.4, sstep(6, 7, t));
      if (t > 7.2 && !st.spin) { st.spin = true; C.heroAttack(-1); Sound.furyBlast && Sound.furyBlast(); FX.ring(new CV3(0, 0.1, 0), '#ff9a2e', 7); }
      if (t > 8.2 && !st.spin2) { st.spin2 = true; C.heroAttack(3); }
      C.tickHero(dt, lie);
      // título
      if (t > 10.5 && !st.title) { st.title = true; Cine.title('PRÓLOGO', 'AS CORRENTES DE NÊMESIS'); Sound.win(); }
      // câmera: gira em volta dele enquanto levanta e depois sobe para o céu
      const a = lerp(0.9, -0.5, sstep(3, 9, t)), R = lerp(5.5, 9, sstep(6, 14, t)), y = lerp(2.2, 6, sstep(8, 15, t));
      C.cam(new CV3(Math.sin(a) * R, y, Math.cos(a) * R), new CV3(0, lerp(1, 1.6, sstep(4, 7, t)) + sstep(10, 15, t) * 1.5, -0.5), 42);
    },
  },
];
