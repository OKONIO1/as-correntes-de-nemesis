// =============================================================
// cine_story.js — CENAS ANIMADAS dos 10 capítulos e do EPÍLOGO.
// (usa o "motor" de cinemática de cinematic.js)
//
// Cada capítulo abre com o título grande ("CAPÍTULO IV · O Gigante
// Acorrentado") e uma cena curta mostrando o que vem pela frente.
// =============================================================

// ---------- ajudantes ----------
// céu, luzes e chão a partir do tema de uma fase
function cineBase(C, key, o) {
  o = o || {};
  const T = THEMES3D[key], lt = T.light;
  const sunDir = o.sunDir || new CV3(0.5, 0.6, -0.8).normalize();
  C.builder.sky(o.sky ? o.sky[0] : T.sky[0], o.sky ? o.sky[1] : T.sky[1], sunDir, o.sunColor !== undefined ? o.sunColor : T.sunColor, T);
  C.lights({ sky: lt.hemiSky, ground: lt.hemiGround, hemi: lt.hemi * (o.hemi || 1), sun: lt.sunColor, sunI: lt.sun * (o.sun || 1), sunPos: sunDir.clone().multiplyScalar(30) });
  if (o.floor !== false) C.floor(T.ground, T.spots, o.size || 70, Object.assign({ bricks: !!T.bricks, seed: 7 }, o.floorOpts || {}));
  return T;
}
// câmera girando em volta de um ponto
function orbit(C, c, a, R, h, lookY) {
  C.cam(new CV3(c.x + Math.sin(a) * R, c.y + h, c.z + Math.cos(a) * R), new CV3(c.x, c.y + (lookY === undefined ? 1.5 : lookY), c.z), 42);
}
// um segundo "humano" (soldado grego) com o mesmo modelo do herói
function cineSoldier(C, x, z, yaw) {
  const p = new Player(C.scene, new CV3(x, 0, z));
  for (const s of ['L', 'R']) { p.blades[s].g.visible = false; p.blades[s].trail.mesh.visible = false; }
  p.chain.visible = false; p.bladeLight.visible = false;
  p.yaw = yaw; p.onGround = true;
  C.actors.push({ p, remove() { for (const o of [p.root, p.blades.L.g, p.blades.R.g, p.blades.L.trail.mesh, p.blades.R.trail.mesh, p.bladeLight, p.chain]) C.scene.remove(o); } });
  return p;
}
function petrify(root) { root.traverse(o => { if (o.isMesh) o.material = STONE_MAT; }); }
function shake(st, dt) { return st.shake ? (st.shake = Math.max(0, st.shake - dt * 0.7)) : 0; }
function jitter(v, k) { return v.add(new CV3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(k)); }
const chap = (i, def) => Object.assign({ chapter: i, grade: PHASES[i].theme, cap: { title: 'Capítulo ' + ROMAN[i] + ' · ' + CHAPTERS[i].title, text: CHAPTERS[i].text } }, def);
const epi = (i, def) => Object.assign({ cap: EPILOGUE[i] }, def);

// =============================================================
// CAPÍTULOS
// =============================================================
const CHAPTER_SHOTS = [
  // I — A Costa em Chamas: navios negros chegam à praia; Teron observa
  chap(0, {
    dur: 13, fog: ['#f2c9a0', 0.008],
    setup(C, st) {
      cineBase(C, 'beach', { floorOpts: { z: 22, d: 60, w: 120 } });
      st.wave = C.sea('#1f74a8', -0.6, -60);
      for (let i = 0; i < 5; i++) C.builder.groundY = 0, C.builder.column(-14 + i * 7, 6 + (i % 2) * 3, 4 + (i % 3), mat('#efe6d6'), i % 2 === 1);
      C.builder.olive(10, 0, 10, 1.2); C.builder.olive(-9, 0, 14, 1);
      st.ships = [-14, 0, 14].map((x, i) => { const s = C.ship('#140808'); s.position.set(x, -0.4, -70 - i * 6); C.group.add(s); return s; });
      st.army = [];
      C.heroAt(4, 12, Math.PI, true);
    },
    update(C, st, t, dt) {
      st.wave(t);
      st.ships.forEach((s, i) => { s.position.z = Math.min(-15, -70 - i * 6 + t * 6.5); s.rotation.z = Math.sin(t * 1.3 + i) * 0.04; s.position.y = -0.4 + Math.sin(t * 1.1 + i) * 0.12; });
      // esqueletos descem dos navios e vão para a praia
      if (t > 6.5 && st.army.length < 12 && Math.random() < 0.25) {
        const s = choose(st.ships), e = C.skeleton(s.position.x + rand(-1, 1), s.position.z + 5, 0);
        e.pos.y = -0.5; e.cineSpeed = 2.4; st.army.push(e); FX.splash(new CV3(e.pos.x, -0.4, e.pos.z));
      }
      for (const e of st.army) { e.pos.z += e.cineSpeed * dt; e.pos.y = Math.min(0, e.pos.y + dt * 0.4); C.tickFoe(e, dt); }
      C.tickHero(dt, 0);
      // câmera: por cima do ombro de Teron, depois avança para o mar
      const k = sstep(0, 13, t);
      C.cam(new CV3(lerp(7, 5.5, k), lerp(4.5, 3.4, k), lerp(19, 16.5, k)), new CV3(lerp(2, 0, k), lerp(1.5, 0.5, k), -18), 42);
    },
  }),

  // II — O Templo Esquecido: Teron entra no templo e a estátua de Atena desperta
  chap(1, {
    dur: 13, fog: ['#7a5060', 0.014],
    setup(C, st) {
      const T = cineBase(C, 'temple');
      const marble = mat(T.accent, { map: Tex.make(T.accent, T.spots, { blobs: 14, bricks: true, seed: 3 }) });
      C.builder.temple(0, 0, -14, marble);
      C.builder.groundY = 0;
      for (let i = 0; i < 10; i++) C.builder.column((i % 2 ? -1 : 1) * 5, 10 - i * 2.6, 2 + (i * 7) % 5, marble, i % 3 !== 0);
      C.builder.statue(0, 0, -6, marble, 0);
      st.statue = C.builder.group.children[C.builder.group.children.length - 1];
      st.statue.scale.setScalar(2.4);
      st.eyes = [-0.08, 0.08].map(x => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), C.glowMat('#ff3a1a', 0)); e.position.set(x, 6.25, -5.45); C.group.add(e); return e; });
      for (let i = 0; i < 6; i++) C.builder.rock(rand(-4, 4), 0, rand(-2, 8), rand(0.3, 0.7), mat('#8a7a8f'));
      C.heroAt(0, 16, Math.PI, true);
      st.light = C.plight('#ff4a2a', 0, 14, new CV3(0, 6, -3.5));
    },
    update(C, st, t, dt) {
      if (t < 8) C.heroWalk(dt, 0, 1, 2.2); else C.hero.vel.set(0, 0, 0);
      C.tickHero(dt, 0);
      const k = sstep(8, 9.5, t);
      st.eyes.forEach(e => { e.material.emissiveIntensity = k * 5; });
      st.light.intensity = k * 3;
      if (t > 8.3 && !st.d) { st.d = true; Sound.orb(); FX.burst(new CV3(0, 6.2, -5.4), 30, { speed: [1, 3], life: [0.5, 1.2], size: [0.1, 0.2], colors: ['#ffb0a0', '#ff4a2a'], glow: true, drag: 1.5 }); Sound.roar(1.6); st.shake = 0.3; }
      if (Math.random() < 0.4) C.drift('#d8c8b8', 1, [-6, 12, 0, 8, -8, 16], [0.2, -0.5, 0], false);
      // câmera atrás de Teron, depois olhando para cima, para a estátua
      const k2 = sstep(5, 12, t), h = C.hero.pos;
      C.cam(new CV3(h.x + lerp(1.5, 3, k2), lerp(2.2, 0.8, k2), h.z + lerp(4.5, 3, k2)), new CV3(0, lerp(1.5, 5.5, k2), lerp(h.z - 5, -6, k2)), 45);
    },
  }),

  // III — Olhos de Pedra: a Górgona transforma um soldado em estátua
  chap(2, {
    dur: 12, fog: ['#4a6a4a', 0.03],
    setup(C, st) {
      cineBase(C, 'swamp');
      for (let i = 0; i < 8; i++) C.builder.deadTree(rand(-12, 12), 0, rand(-14, -4), rand(0.9, 1.5));
      for (let i = 0; i < 10; i++) C.builder.reeds(rand(-10, 10), 0, rand(-6, 8));
      // estátuas de vítimas antigas
      for (const [x, z, y] of [[-4, -2, 0.6], [5, -5, -0.4], [-7, -8, 2]]) { const s = C.hero.rig ? THREE.SkeletonUtils.clone(C.hero.root) : C.hero.root.clone(true); petrify(s); s.position.set(x, 0, z); s.rotation.y = y; C.group.add(s); }
      st.gorgon = C.foe(Gorgon, 0, 0, -7, 0);
      st.soldier = cineSoldier(C, 0, -3, 0);
      st.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), new THREE.MeshBasicMaterial({ color: '#7aff6a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      C.group.add(st.beam);
      st.glow = C.plight('#7aff6a', 0, 12, new CV3(0, 2, -6));
      C.hero.root.visible = false; C.heroBlades(false);
    },
    update(C, st, t, dt) {
      const g = st.gorgon, s = st.soldier;
      g.state = t > 3.5 && t < 6 ? 'castWind' : 'idle';
      C.tickFoe(g, dt);
      st.glow.intensity = sstep(3.5, 5, t) * 4 * (1 - sstep(6, 7, t));
      if (!st.stone) { // o soldado foge
        s.vel.set(0, 0, 4.5); s.pos.z += 4.5 * dt; s.animate(dt);
      }
      if (t > 5 && !st.stone) {
        st.stone = true; petrify(s.root); s.animate(0.016);
        Sound.portal(); game.flash('rgba(120,255,120,0.35)');
        FX.burst(new CV3(s.pos.x, 1, s.pos.z), 50, { speed: [1, 4], life: [0.5, 1], size: [0.1, 0.25], colors: ['#9fdf8a', '#e0e0d0', '#7aff6a'], glow: true, drag: 2 });
        FX.ring(s.pos, '#7aff6a', 4);
      }
      // raio verde dos olhos dela até ele
      const b = sstep(4.6, 5, t) * (1 - sstep(5.4, 6, t));
      const a = new CV3(g.pos.x, 1.9, g.pos.z + 0.3), c = new CV3(s.pos.x, 1.6, s.pos.z);
      st.beam.position.copy(a).lerp(c, 0.5); st.beam.scale.set(1, a.distanceTo(c), 1);
      st.beam.quaternion.setFromUnitVectors(new CV3(0, 1, 0), c.clone().sub(a).normalize());
      st.beam.material.opacity = b;
      if (Math.random() < 0.3) C.drift('#c8f0a0', 1, [-8, 16, 0.3, 2, -8, 14], [0.1, 0.3, 0], true);
      // câmera: baixa, o soldado vindo na direção dela; depois gira em volta da estátua nova
      const k = sstep(5.5, 12, t);
      C.cam(new CV3(lerp(1.5, 4.5, k), lerp(1.2, 2.6, k), s.pos.z + lerp(4.5, 3, k)), new CV3(lerp(0, s.pos.x, k), 1.4, lerp(s.pos.z - 4, s.pos.z, k)), 44);
    },
  }),

  // IV — O Gigante Acorrentado: Brontes puxa as correntes na caverna
  chap(3, {
    dur: 13, exp: 1.8, fog: ['#1a120c', 0.018],
    setup(C, st) {
      const T = cineBase(C, 'cave', { hemi: 2.0, sun: 1.6 });
      const rockM = mat(T.wall, { map: Tex.make(T.wall, T.wallSpots, { blobs: 12, seed: 4 }) });
      for (const [x, z, w, d] of [[-9, -4, 4, 14], [9, -4, 4, 14], [0, -11, 22, 4]]) { const m = new THREE.Mesh(boxGeo(w, 12, d), rockM); m.position.set(x, 6, z); m.receiveShadow = true; C.group.add(m); }
      for (let i = 0; i < 9; i++) C.builder.stalagmite(rand(-7, 7), 9, rand(-9, 2), rand(1.5, 3.5), rockM, true);
      for (const [x, z] of [[-6.9, -2], [6.9, -2], [-6.9, 4], [6.9, 4]]) C.builder.torch(x, 2.6, z);
      st.lights = [C.plight('#ff9a3a', 4, 16, new CV3(-5, 3, 0)), C.plight('#ff9a3a', 4, 16, new CV3(5, 3, 0)), C.plight('#ffcf9a', 3, 14, new CV3(0, 6, 4))];
      st.cy = C.foe(Cyclops, 0, 0, -5, 0);
      st.anchors = [new CV3(-7, 7, -8), new CV3(7, 7, -8), new CV3(-7, 0.5, -3), new CV3(7, 0.5, -3)];
      st.chains = st.anchors.map(() => C.chainMesh(36));
      for (const c of st.chains) { c.material = new THREE.MeshStandardMaterial({ color: '#a8a8b2', metalness: 0.8, roughness: 0.35, emissive: '#ff6a1a', emissiveIntensity: 0.35 }); c.scale.setScalar(1); }
      C.heroAt(1.5, 9, Math.PI, true);
      C.hero.root.visible = false;
    },
    update(C, st, t, dt) {
      const cy = st.cy;
      const pull = Math.sin(t * 2.2) > 0.2;
      cy.state = t < 2 ? 'idle' : (pull ? 'intro' : 'smashWind');
      cy.root.rotation.z = Math.sin(t * 2.2) * 0.06;
      C.tickFoe(cy, dt);
      st.lights.forEach((l, i) => { l.intensity = (i === 2 ? 3 : 3.8) + Math.sin(t * 13 + i * 3) * 0.4; });
      const R = cy.rig;
      const hands = R ? [R.bone('hand.l'), R.bone('hand.r')].map(b => b.getWorldPosition(new CV3())) : [cy.armL.sh, cy.armR.sh].map(s => s.localToWorld(new CV3(0, -2.4, 0)));
      const feet = R ? [R.bone('foot.l'), R.bone('foot.r')].map(b => b.getWorldPosition(new CV3())) : [cy.legL.hip, cy.legR.hip].map(s => s.localToWorld(new CV3(0, -1.8, 0)));
      const ends = [hands[0], hands[1], feet[0], feet[1]];
      st.chains.forEach((c, i) => C.layChain(c, st.anchors[i], ends[i], 1, pull ? 0.1 : -0.8, 0));
      if (t > 4 && !st.roar) { st.roar = true; Sound.roar(1); st.shake = 0.35; for (const a of st.anchors) FX.sparks(a, 20); }
      if (pull && Math.random() < 0.15) { FX.sparks(choose(st.anchors), 6); Sound.chain(); }
      if (Math.random() < 0.08) FX.dust(new CV3(rand(-4, 4), 0, rand(-6, 0)), 3);
      // Teron aparece na entrada (de costas) no fim
      if (t > 8.5) { C.hero.root.visible = true; C.heroWalk(dt, 1.5, 5, 1.6); }
      C.tickHero(dt, 0);
      const k = sstep(0, 12, t), sh = shake(st, dt);
      C.cam(jitter(new CV3(lerp(0.6, 3.5, k), lerp(5.2, 3.2, k), lerp(-1, 13, k)), sh), new CV3(0, lerp(5.6, 3, k), -5), lerp(36, 46, k));
    },
  }),

  // V — O Altar da Guerra: ponte estreita, vento, raios, o altar vermelho
  chap(4, {
    dur: 13, fog: ['#e8a070', 0.012],
    setup(C, st) {
      const T = cineBase(C, 'canyon', { floor: false });
      const rockM = mat(T.wall, { map: Tex.make(T.wall, T.wallSpots, { blobs: 12, bricks: false, seed: 9 }) });
      for (let i = 0; i < 12; i++) for (const s of [-1, 1]) { const h = rand(10, 26), m = new THREE.Mesh(boxGeo(rand(5, 9), h, rand(6, 10)), rockM); m.position.set(s * rand(9, 16), h / 2 - 14, -40 + i * 7); m.rotation.y = rand(-0.3, 0.3); m.castShadow = m.receiveShadow = true; C.group.add(m); }
      const plank = mat('#6a4a2a', { map: Tex.make('#6a4a2a', ['#4a3420', '#7a5a38'], { blobs: 6, seed: 2 }) });
      const bridge = new THREE.Mesh(boxGeo(2.4, 0.4, 44), plank); bridge.position.set(0, -0.2, -12); bridge.receiveShadow = true; C.group.add(bridge);
      const end = new THREE.Mesh(boxGeo(9, 6, 9), rockM); end.position.set(0, -3, -36); end.receiveShadow = true; C.group.add(end);
      C.builder.shrine(0, 0, -36, 1);
      for (let z = 8; z > -32; z -= 4) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 5), plank); p.position.set(s * 1.15, 0.5, z); C.group.add(p); }
      st.harpies = [0, 1, 2].map(i => C.foe(Harpy, 0, 5, -10, 0));
      C.heroAt(0, 6, Math.PI, true);
      st.bolt = new THREE.Mesh(new THREE.BoxGeometry(0.25, 40, 0.25), C.glowMat('#cfe0ff', 8)); st.bolt.visible = false; C.group.add(st.bolt);
    },
    update(C, st, t, dt) {
      C.heroWalk(dt, 0, -30, 2.6);
      C.tickHero(dt, 0);
      st.harpies.forEach((e, i) => { const a = t * 0.8 + i * 2.1; e.pos.set(Math.sin(a) * 8, 5 + Math.sin(t * 2 + i) * 1.5, C.hero.pos.z - 8 + Math.cos(a) * 6); e.yaw = a + Math.PI / 2; C.tickFoe(e, dt); });
      if (Math.random() < 0.9) C.drift('#ffe0c0', 2, [-10, 20, 0, 6, C.hero.pos.z - 20, 30], [-14, 0, 0], false);
      // raios
      if (t > (st.nextBolt || 3)) { st.nextBolt = t + rand(2, 3.5); st.boltT = t; st.bolt.position.set(rand(-14, 14), 6, C.hero.pos.z - rand(10, 25)); st.bolt.visible = true; Sound.thunder(); game.flash('rgba(220,230,255,0.4)'); }
      if (st.bolt.visible && t - st.boltT > 0.15) st.bolt.visible = false;
      // câmera: de lado e longe (mostra o abismo), depois atrás de Teron olhando o altar
      const k = sstep(4, 12, t), h = C.hero.pos;
      C.cam(new CV3(lerp(16, 2, k), lerp(4, 3, k), h.z + lerp(4, 7, k)), new CV3(0, lerp(0, 1.8, k), h.z - lerp(3, 14, k)), 44);
    },
  }),

  // VI — O Touro de Creta: o Minotauro atravessa a parede correndo
  chap(5, {
    dur: 12, fog: ['#241e2c', 0.02],
    setup(C, st) {
      const T = cineBase(C, 'labyrinth', { hemi: 1.3 });
      const wallM = mat(T.wall, { map: Tex.make(T.wall, T.wallSpots, { blobs: 12, bricks: true, seed: 6 }) });
      for (const s of [-1, 1]) { const w = new THREE.Mesh(boxGeo(1, 6, 50), wallM); w.position.set(s * 3.5, 3, -10); w.castShadow = w.receiveShadow = true; C.group.add(w); }
      st.wall = new THREE.Mesh(boxGeo(6, 6, 1), wallM); st.wall.position.set(0, 3, -6); st.wall.castShadow = true; C.group.add(st.wall);
      for (let z = 6; z > -30; z -= 6) for (const s of [-1, 1]) C.builder.torch(s * 2.95, 2.8, z);
      st.lights = [C.plight('#ff9a3a', 2, 12, new CV3(0, 3, 2)), C.plight('#ff9a3a', 2, 12, new CV3(0, 3, -14))];
      st.mino = C.foe(Minotaur, 0, 0, -22, 0);
      C.heroAt(0, 6, Math.PI, true);
    },
    update(C, st, t, dt) {
      const m = st.mino;
      if (t < 2) m.state = 'idle';
      else if (m.pos.z < -2.5 && !st.stop) { m.state = 'charge'; m.walk.set(8, 0, 0); m.pos.z += 9 * dt; if (Math.random() < 0.6) FX.dust(m.pos, 2); }
      else if (!st.stop) { st.stop = t; m.state = 'slamWind'; }
      if (st.stop && t - st.stop > 0.6) m.state = 'slam';
      if (t > 2 && t < 2.1 && !st.r1) { st.r1 = true; Sound.roar(1.1); }
      // parede explode quando ele passa
      if (st.wall.visible && m.pos.z > -7.2) {
        st.wall.visible = false; Sound.crash(); st.shake = 0.5;
        FX.shards(new CV3(0, 2.5, -6), 50, ['#6a6278', '#4a4256', '#8a8296']); FX.dust(new CV3(0, 0, -6), 20);
      }
      if (st.stop && t - st.stop > 0.65 && !st.slam) { st.slam = true; Sound.explode(); st.shake = 0.5; FX.ring(new CV3(m.pos.x, 0.1, m.pos.z + 1.5), '#ffcf4a', 5); FX.dust(new CV3(m.pos.x, 0, m.pos.z + 1.5), 20); }
      const keep = m.state === 'charge' ? 'charge' : m.state;
      C.tickFoe(m, dt); m.state = keep;
      C.tickHero(dt, 0);
      st.lights.forEach((l, i) => { l.intensity = 1.8 + Math.sin(t * 11 + i * 2) * 0.3; });
      const sh = shake(st, dt);
      C.cam(jitter(new CV3(1.1, lerp(1.6, 2.4, sstep(6, 12, t)), lerp(9.5, 10.5, sstep(6, 12, t))), sh), new CV3(0, 2, lerp(-14, -2, sstep(2, 6, t))), 44);
    },
  }),

  // VII — A Margem dos Mortos: no rio Estige, Teron encontra a alma de Ione
  chap(6, {
    dur: 14, fog: ['#122026', 0.025],
    setup(C, st) {
      cineBase(C, 'styx', { floorOpts: { z: 22, d: 40, w: 120 }, hemi: 1.3 });
      st.wave = C.sea('#0a2a2c', -0.45, -40);
      for (let i = 0; i < 5; i++) C.builder.deadTree(rand(-14, 14), 0, rand(5, 14), rand(0.9, 1.3));
      // almas presas por correntes, passando pelo rio
      st.souls = [];
      for (let i = 0; i < 12; i++) {
        const s = C.ghost(rand(1.1, 1.4), '#7ad8d0'); s.g.position.set(rand(-30, 30), -0.3, rand(-16, -4)); s.setFade(0.6); C.group.add(s.g);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 4, 16), new THREE.MeshStandardMaterial({ color: '#444', metalness: 0.9, roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; s.g.add(ring);
        s.v = rand(0.4, 0.9); st.souls.push(s);
      }
      st.ione = C.ghost(1, '#cff4ff'); st.ione.g.position.set(0.5, -0.2, -2.5); st.ione.g.rotation.y = Math.PI; C.group.add(st.ione.g); st.ione.setFade(0);
      st.ioneLight = C.plight('#bff0ff', 0, 8, new CV3(0.5, 1.4, -2));
      C.heroAt(-2, 10, Math.PI, true);
    },
    update(C, st, t, dt) {
      st.wave(t);
      for (const s of st.souls) { s.g.position.x += s.v * dt; if (s.g.position.x > 30) s.g.position.x = -30; s.g.position.y = -0.3 + Math.sin(t + s.v * 10) * 0.08; }
      const I = st.ione;
      I.setFade(sstep(2, 4, t));
      st.ioneLight.intensity = sstep(2, 4, t) * 2.5;
      I.g.position.y = -0.2 + Math.sin(t * 1.5) * 0.06;
      I.g.rotation.y = lerp(Math.PI, 0, sstep(5, 7, t)); // ela se vira para o pai
      I.arms[1].rotation.x = -1.6 * sstep(7.5, 8.5, t);  // e estende a mão
      if (t > 2 && !st.c) { st.c = true; Sound.orb(); }
      if (Math.random() < 0.5) C.drift('#9ff0e8', 1, [-12, 24, 0, 3, -14, 12], [0, 0.4, 0], true);
      // Teron vai até a margem e estende a mão
      const there = C.heroWalk(dt, 0, 0.6, 2.4);
      if (there) { C.hero.yaw = Math.PI; C.hero.castT = 0.3; C.hero.castKind = 'zeus'; }
      C.tickHero(dt, 0);
      const k = sstep(0, 9, t), h = C.hero.pos;
      C.cam(new CV3(lerp(4, 2.4, k), lerp(4, 2.2, k), h.z + lerp(7, 3.6, k)), new CV3(lerp(0, 0.4, k), lerp(1, 1.3, k), lerp(-2, -2.5, k)), 42);
    },
  }),

  // VIII — O Coração do Vulcão: autômatos de bronze nascem da lava
  chap(7, {
    dur: 13, fog: ['#3a1008', 0.02],
    setup(C, st) {
      const T = cineBase(C, 'forge', { floorOpts: { z: 16, d: 20, w: 60 } });
      st.lava = C.sea('#ff4a0a', -0.8, -40, '#ff2a04');
      const wallM = mat(T.wall, { map: Tex.make(T.wall, T.wallSpots, { blobs: 12, bricks: true, seed: 8 }) });
      // pistões-martelo gigantes
      st.hammers = [-8, 0, 8].map((x, i) => { const h = new THREE.Mesh(boxGeo(2.4, 3, 2.4), mat('#3a2a22', { metalness: 0.7, roughness: 0.4 })); h.position.set(x, 8, -14); h.castShadow = true; C.group.add(h); const an = new THREE.Mesh(boxGeo(3, 1.5, 3), wallM); an.position.set(x, 0, -14); C.group.add(an); return { h, x, ph: i * 0.9 }; });
      st.bots = [];
      for (let i = 0; i < 5; i++) { const e = C.foe(HeavyWarrior, -8 + i * 4, -4, -6 - (i % 2) * 3, 0, 'automaton'); e.riseT = 2 + i * 1.2; st.bots.push(e); }
      st.light = C.plight('#ff6a1a', 4, 30, new CV3(0, 3, -6));
      st.talos = C.foe(Talos, 0, 0, -22, 0);
      C.heroAt(0, 9, Math.PI, true);
    },
    update(C, st, t, dt) {
      st.lava(t * 0.4);
      for (const H of st.hammers) {
        const c = ((t + H.ph) % 2.2) / 2.2;
        const y = c < 0.15 ? lerp(8, 2.25, c / 0.15) : lerp(2.25, 8, (c - 0.15) / 0.85);
        if (c < 0.15 && H.h.position.y > 2.6 && y <= 2.6) { FX.sparks(new CV3(H.x, 0.9, -14), 24); Sound.clank(); }
        H.h.position.y = y;
      }
      for (const e of st.bots) {
        const k = sstep(e.riseT, e.riseT + 2, t);
        e.pos.y = lerp(-4, 0, k);
        if (k > 0 && k < 1 && Math.random() < 0.5) FX.fire(new CV3(e.pos.x, -0.6, e.pos.z), 2);
        if (k >= 1 && !e.up) { e.up = true; Sound.roar(1.3); }
        e.state = k >= 1 && t > e.riseT + 2.5 ? 'slamWind' : 'idle';
        C.tickFoe(e, dt);
      }
      st.light.intensity = 4 + Math.sin(t * 7) * 0.6;
      const T2 = st.talos, cyc = t % 2.4;
      T2.state = cyc < 1.6 ? 'hammerWind' : 'strike';
      if (cyc >= 1.6 && !T2.hitThis) { T2.hitThis = true; FX.sparks(new CV3(0, 0.5, -18.5), 40); FX.ring(new CV3(0, 0.1, -18.5), '#ffb04a', 4); Sound.clank(); }
      if (cyc < 1.6) T2.hitThis = false;
      C.tickFoe(T2, dt);
      if (Math.random() < 0.8) C.drift('#ff8a2a', 1, [-14, 28, -0.5, 2, -16, 14], [0, 1.4, 0], true);
      C.tickHero(dt, 0);
      const k = sstep(0, 13, t);
      C.cam(new CV3(lerp(-10, 6, k), lerp(9, 3.2, k), lerp(4, 14, k)), new CV3(0, lerp(0, 1.6, k), -6), 44);
    },
  }),

  // IX — Mil Degraus: Teron sobe a escadaria do Olimpo
  chap(8, {
    dur: 13, fog: ['#e8eef8', 0.012],
    setup(C, st) {
      const T = cineBase(C, 'olympus', { floor: false, sunDir: new CV3(0.2, 0.5, -1).normalize() });
      const marble = mat(T.ground, { map: Tex.make(T.ground, T.spots, { blobs: 10, bricks: true, seed: 5 }) });
      marble.normalMap = Tex.normal(marble.map, 2);
      for (let i = 0; i < 70; i++) { const s = new THREE.Mesh(boxGeo(7, 0.5, 1.2), marble); s.position.set(0, i * 0.5 - 0.25, -i * 1.2); s.receiveShadow = s.castShadow = true; C.group.add(s); }
      for (let i = 2; i < 70; i += 8) for (const sx of [-1, 1]) { C.builder.groundY = i * 0.5; C.builder.statue(sx * 4.6, i * 0.5, -i * 1.2, marble, -sx * Math.PI / 2); }
      const cloudM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e0', emissiveIntensity: 0.25, roughness: 1, flatShading: true });
      for (let i = 0; i < 40; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(3, 8), 1), cloudM); c.position.set(rand(-40, 40), rand(-6, 4) + i * 0.5, rand(-80, 10)); c.scale.y = 0.45; if (Math.abs(c.position.x) > 9) C.group.add(c); }
      C.heroAt(0, 2, Math.PI, true);
    },
    update(C, st, t, dt) {
      const h = C.hero;
      C.heroWalk(dt, 0, -60, 3);
      h.pos.y = Math.max(0, Math.floor(-h.pos.z / 1.2 + 0.5)) * 0.5;
      C.tickHero(dt, 0);
      const k = sstep(0, 13, t);
      C.cam(new CV3(lerp(3, -2, k), h.pos.y + lerp(1.5, 4.5, k), h.pos.z + lerp(5, 8, k)), new CV3(0, h.pos.y + lerp(1.8, 2.6, k), h.pos.z - 6), 46);
    },
  }),

  // X — A Dívida Inteira: Ares se levanta do trono de armas quebradas
  chap(9, {
    dur: 14, fog: ['#2a0806', 0.02],
    setup(C, st) {
      const T = cineBase(C, 'throne', { hemi: 1.2 });
      // trono de armas quebradas
      const iron = mat('#5a5a62', { metalness: 0.85, roughness: 0.35 }), bronze = mat('#8a6a2a', { metalness: 0.8, roughness: 0.4 });
      const dais = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 1, 24), mat(T.wall)); dais.position.set(0, 0.5, -9); dais.receiveShadow = true; C.group.add(dais);
      const rng = makeRng(77);
      for (let i = 0; i < 70; i++) {
        const sword = rng() < 0.6;
        const m = new THREE.Mesh(sword ? new THREE.BoxGeometry(0.1, rand(1.5, 3.5), 0.03) : new THREE.CylinderGeometry(0.45, 0.45, 0.06, 10), rng() < 0.5 ? iron : bronze);
        const a = rng() * Math.PI - Math.PI, r = 1.2 + rng() * 1.4;
        m.position.set(Math.cos(a) * r, 1 + rng() * (sword ? 3.5 : 2), -10.2 + Math.sin(a) * r * 0.6);
        m.rotation.set(rng() - 0.5, rng() * 3, rng() - 0.5); m.castShadow = true; C.group.add(m);
      }
      const seat = new THREE.Mesh(boxGeo(2, 1.2, 1.6), mat('#3a2222')); seat.position.set(0, 1.6, -9.4); C.group.add(seat);
      for (let z = 6; z > -6; z -= 4) for (const s of [-1, 1]) C.builder.brazier(s * 6, 0, z);
      st.braz = [C.plight('#ff7a2a', 2.5, 18, new CV3(-6, 2, 0)), C.plight('#ff7a2a', 2.5, 18, new CV3(6, 2, 0))];
      st.ares = C.foe(Ares, 0, 1.05, -9.3, 0);
      C.heroAt(0, 14, Math.PI, true);
    },
    update(C, st, t, dt) {
      const A = st.ares;
      // sentado → levanta (t 5..7) → anda até a frente do estrado
      const up = sstep(5, 7, t);
      A.state = t > 7.5 && t < 10 ? 'fireWind' : 'idle';
      if (A.rig) A.forceClip = t < 5 ? { name: 'Sit_Chair_Idle' } : t < 7 ? { name: 'Sit_Chair_StandUp', at: (t - 5) / 2 } : null;
      C.tickFoe(A, dt);
      A.legL.hip.rotation.x = A.legR.hip.rotation.x = -1.5 * (1 - up);
      A.legL.knee.rotation.x = A.legR.knee.rotation.x = 1.5 * (1 - up);
      A.model.position.y = -0.75 * (1 - up);
      if (t > 7) A.pos.z = Math.min(-6, A.pos.z + dt * 1.6);
      A.bladeMat.emissiveIntensity = 1 + sstep(7.5, 8.5, t) * 3;
      if (t > 7.6 && !st.roar) { st.roar = true; Sound.roar(0.8); st.shake = 0.3; FX.ring(new CV3(0, 1.05, A.pos.z), '#ff4a1a', 8); }
      if (t > 7.5 && Math.random() < 0.7) FX.fire(A.sword.localToWorld(new CV3(0, 0, 1)), 2);
      st.braz.forEach((l, i) => { l.intensity = 2.3 + Math.sin(t * 12 + i) * 0.4; });
      C.heroWalk(dt, 0, 4, 2.2);
      C.tickHero(dt, 0);
      const k = sstep(0, 6, t), k2 = sstep(9, 14, t), sh = shake(st, dt);
      const pos = new CV3(lerp(0, 3, k2), lerp(9, 2.4, k), lerp(-2, 10, k) + k2 * 2);
      C.cam(jitter(pos, sh), new CV3(0, lerp(2, 2.6, k), lerp(-9, -6, k2)), 44);
    },
  }),
];

// =============================================================
// EPÍLOGO
// =============================================================
const EPILOGUE_SHOTS = [
  // 1. A dívida paga: as correntes das almas se partem e elas atravessam o rio
  epi(0, {
    dur: 13, grade: 'styx', exp: 1.45, fog: ['#122026', 0.02],
    setup(C, st) {
      cineBase(C, 'styx', { floorOpts: { z: 22, d: 40, w: 120 }, hemi: 1.4, sky: ['#0a1a2a', '#3a6a7a'] });
      st.wave = C.sea('#0a2a2c', -0.45, -40);
      st.souls = [];
      for (let i = 0; i < 26; i++) {
        const s = C.ghost(rand(1, 1.4), '#8ae8e0'); s.g.position.set(rand(-16, 16), -0.3, rand(-6, 1)); s.setFade(0.6); C.group.add(s.g);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 4, 16), new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.9, roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; s.g.add(ring);
        s.ring = ring; s.d = rand(0, 1.5); st.souls.push(s);
      }
      st.far = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 80, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#dff8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      st.far.position.set(0, 30, -30); C.group.add(st.far);
      C.hero.root.visible = false; C.heroBlades(false);
    },
    update(C, st, t, dt) {
      st.wave(t);
      st.far.material.opacity = sstep(4, 7, t) * 0.5;
      for (const s of st.souls) {
        if (t > 2.5 + s.d && s.ring.visible) { s.ring.visible = false; FX.sparks(s.g.position.clone().setY(0.4), 10, ['#cfe8ff', '#ffffff']); Sound.chain(); }
        if (!s.ring.visible) {
          const k = sstep(3 + s.d, 12 + s.d, t);
          s.g.position.z -= dt * 2.2; s.g.position.y = -0.3 + k * 6;
          s.setFade(0.6 + 0.4 * Math.sin(t * 3 + s.d) * (1 - k));
        }
      }
      if (t > 2.5 && !st.s) { st.s = true; Sound.portal(); game.flash('rgba(200,240,255,0.4)'); }
      if (Math.random() < 0.6) C.drift('#cff8ff', 2, [-16, 32, 0, 6, -20, 20], [0, 1, -1], true);
      const k = sstep(0, 13, t);
      C.cam(new CV3(lerp(6, -4, k), lerp(2, 5, k), lerp(12, 14, k)), new CV3(0, lerp(1, 4, k), -6), 44);
    },
  }),

  // 2. Do outro lado: Ione se vira, sorri (acena) e some na luz
  epi(1, {
    dur: 11, grade: 'styx', exp: 1.6, fog: ['#1a3038', 0.018],
    setup(C, st) {
      cineBase(C, 'styx', { floorOpts: { z: 22, d: 40, w: 120 }, hemi: 1.5, sky: ['#1a3a5a', '#bfe8f0'] });
      st.wave = C.sea('#1a4a4c', -0.45, -40);
      st.ione = C.ghost(1, '#e8fbff'); st.ione.g.position.set(0, -0.1, -7); C.group.add(st.ione.g); st.ione.setFade(1);
      st.light = C.plight('#e8fbff', 3, 10, new CV3(0, 1.5, -6.5));
      st.col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      st.col.position.set(0, 30, -7); C.group.add(st.col);
      C.heroAt(1.2, 1.5, Math.PI, true);
    },
    update(C, st, t, dt) {
      st.wave(t);
      const I = st.ione;
      I.g.rotation.y = lerp(Math.PI, 0, sstep(1.5, 3.5, t));
      I.arms[1].rotation.x = -2.6 * sstep(4, 5, t) * (1 - sstep(7.5, 8.5, t));
      I.arms[1].rotation.z = -0.25 + Math.sin(t * 6) * 0.3 * sstep(4.5, 5, t) * (1 - sstep(7, 7.5, t));
      st.col.material.opacity = sstep(7.5, 9, t) * 0.7;
      I.g.position.y = -0.1 + sstep(8, 11, t) * 4;
      I.setFade(1 - sstep(8.5, 10.5, t));
      st.light.intensity = 3 * (1 - sstep(9, 11, t)) + sstep(7.5, 9, t) * 3;
      if (t > 7.8 && !st.s) { st.s = true; Sound.win(); }
      if (Math.random() < 0.5) C.drift('#ffffff', 1, [-2, 4, 0, 4, -8, 2], [0, 1.2, 0], true);
      C.tickHero(dt, 0);
      const k = sstep(0, 11, t);
      C.cam(new CV3(lerp(2.6, 3.2, k), lerp(1.9, 2.4, k), lerp(5, 4, k)), new CV3(0, lerp(1, 2.2, k), -7), lerp(40, 34, k));
    },
  }),

  // 3. A última palavra da deusa: Nêmesis diante de Teron, no alto do Olimpo
  epi(2, {
    dur: 12, grade: 'olympus', exp: 0.95, fog: ['#f4e8d0', 0.012],
    setup(C, st) {
      cineBase(C, 'olympus', { sky: ['#5a7ad0', '#ffc890'], sunDir: new CV3(-0.5, 0.25, -0.8).normalize(), sunColor: '#ffd8a0' });
      const iron = mat('#5a5a62', { metalness: 0.85, roughness: 0.35 });
      for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, rand(1, 2.5), 0.03), iron); m.position.set(rand(-5, 5), 0.05, rand(-12, -6)); m.rotation.set(Math.PI / 2, rand(0, 3), 0); C.group.add(m); }
      st.sword = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 1.3), C.glowMat('#ff9a3a', 0.6)); st.sword.position.set(-2, 0.05, -2); st.sword.rotation.y = 0.7; C.group.add(st.sword);
      for (let i = 0; i < 6; i++) { C.builder.groundY = 0; C.builder.column((i % 2 ? -1 : 1) * 8, -4 - i * 3, 5, mat('#efe6d6'), i % 3 === 1); }
      const N = C.buildNemesis(); N.g.position.set(0, 0.4, -4.5); C.group.add(N.g); N.setFade(0); st.N = N;
      C.heroAt(0, 1.5, Math.PI, true);
    },
    update(C, st, t, dt) {
      const N = st.N;
      N.setFade(sstep(1, 3.5, t));
      N.g.position.y = 0.4 + Math.sin(t * 1.3) * 0.1;
      N.rings.forEach((r, i) => { r.rotation.z += dt * (0.5 + i * 0.3) * (i % 2 ? -1 : 1); });
      N.halo.rotation.z += dt * 0.3;
      if (t > 1 && !st.c) { st.c = true; Sound.chain(); }
      if (N.g.visible && Math.random() < 0.5) FX.add({ x: rand(-1, 1), y: rand(0.5, 3), z: -4.5 + rand(-1, 1), vy: rand(0.3, 1), life: 1.5, size: 0.12, color: '#8ac8ff', glow: true });
      C.tickHero(dt, 0);
      const a = lerp(0.8, -0.6, sstep(0, 12, t));
      orbit(C, new CV3(0, 0, -1.5), a, 8, 2.4, 1.8);
    },
  }),

  // 4. Um homem comum: Teron devolve as correntes e desce o Olimpo a pé
  epi(3, {
    dur: 12, grade: 'olympus', exp: 0.95, same: true,
    setup(C, st) { st.back = [C.chainMesh(40), C.chainMesh(40)]; },
    update(C, st, t, dt) {
      const N = st.N, h = C.hero;
      N.rings.forEach((r, i) => { r.rotation.z += dt * (0.5 + i * 0.3) * (i % 2 ? -1 : 1); });
      for (const a of N.arms) a.sh.rotation.x = -1.2 * sstep(0.3, 1.2, t) * (1 - sstep(5, 6, t));
      h.castT = t > 0.5 && t < 2.6 ? 0.2 : 0; h.castKind = 'ares';
      // as correntes saem dos pulsos dele e voltam para as mãos dela
      const u = sstep(1.5, 3.5, t), gone = sstep(4, 4.6, t);
      for (let i = 0; i < 2; i++) {
        const from = (i ? h.j.armR : h.j.armL).hand.getWorldPosition(new CV3());
        const to = N.arms[i].hand.getWorldPosition(new CV3());
        st.back[i].visible = u > 0 && gone < 1;
        C.layChain(st.back[i], from.clone().lerp(to, u * 0.98), to, 1 - u * 0.98, 0.4, t);
      }
      if (t > 1.6 && !st.off) { st.off = true; C.heroBlades(false); Sound.portal(); game.flash('rgba(160,200,255,0.5)'); for (const s of ['L', 'R']) FX.burst(h.blades[s].g.position, 30, { speed: [1, 4], life: [0.4, 0.9], size: [0.1, 0.25], colors: ['#cfe8ff', '#8ac8ff'], glow: true, drag: 2 }); }
      // ela sobe e some
      N.setFade(1 - sstep(5.5, 8, t));
      N.g.position.y = 0.4 + sstep(5.5, 8, t) * 5;
      // ele se vira e vai embora (em direção à câmera)
      if (t > 6.5) C.heroWalk(dt, 0, 14, 1.6);
      C.tickHero(dt, 0);
      const k = sstep(5, 12, t);
      C.cam(new CV3(lerp(4, 2, k), lerp(2.4, 3.5, k), lerp(5, 18, k)), new CV3(0, lerp(1.8, 1.4, k), lerp(-2, h.pos.z, k)), 42);
    },
  }),

  // 5. Fim: Argos reconstruída ao nascer do sol
  epi(4, {
    dur: 15, grade: 'beach', exp: 1.0, fog: ['#f2c9a0', 0.01],
    setup(C, st) {
      cineBase(C, 'beach', { sky: ['#4a6ab0', '#ffb070'], sunDir: new CV3(0, 0.12, -1).normalize(), sunColor: '#ffd890', floorOpts: { z: 20, d: 60, w: 140 } });
      st.wave = C.sea('#2a6a98', -0.6, -60);
      const wall = mat('#efe6d6', { map: Tex.make('#efe6d6', ['#d8cebc', '#fffaf0'], { blobs: 10, seed: 5 }) }), roof = mat('#b8642a');
      const rng = makeRng(41);
      for (let i = 0; i < 18; i++) {
        const w = 3 + rng() * 2, h = 2.5 + rng() * 2, x = -30 + i * 3.6, z = 18 + rng() * 10;
        const house = new THREE.Mesh(boxGeo(w, h, 3.5), wall); house.position.set(x, h / 2, z); house.castShadow = house.receiveShadow = true; C.group.add(house);
        const rf = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, 1.3, 4), roof); rf.position.set(x, h + 0.65, z); rf.rotation.y = Math.PI / 4; C.group.add(rf);
      }
      for (let i = 0; i < 6; i++) C.builder.olive(rand(-20, 20), 0, rand(4, 14), rand(0.9, 1.2));
      // uma pedra nova sendo colocada: o muro em construção
      for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(boxGeo(1, 0.6, 0.8), wall); b.position.set(-2 + i * 1.02, 0.3, 3); b.castShadow = true; C.group.add(b); }
      const h = C.heroAt(6, 3, -Math.PI / 2, false);
      for (const o of C.soldierGear) o.visible = false;
      st.birds = [];
      for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 3), mat('#2a2a2a')); b.rotation.z = Math.PI / 2; C.group.add(b); st.birds.push({ b, ph: rng() * 6 }); }
    },
    update(C, st, t, dt) {
      st.wave(t);
      st.birds.forEach((o, i) => { o.b.position.set(-20 + ((t * 3 + o.ph * 10) % 50), 9 + Math.sin(t * 2 + o.ph) * 0.6, -6 - i); o.b.scale.y = 0.6 + Math.abs(Math.sin(t * 8 + o.ph)) * 0.8; });
      // ele termina o muro e olha o mar
      if (t < 4) C.heroWalk(dt, 6.2, 3, 1.4); else { C.hero.vel.set(0, 0, 0); C.hero.yaw = lerp(C.hero.yaw, Math.PI, 0.03); }
      C.tickHero(dt, 0);
      if (t > 9.5 && !st.t) { st.t = true; Cine.title('AS CORRENTES DE NÊMESIS', 'FIM DA PARTE I'); Sound.win(); }
      const k = sstep(0, 14, t);
      // começa no mar e no nascer do sol; depois vira para a cidade reconstruída, com Teron na frente
      const kc = sstep(5, 13, t);
      C.cam(new CV3(lerp(9, 4, kc), lerp(2.2, 4.5, kc), lerp(8, -9, kc)), new CV3(lerp(6, 2, kc), lerp(1.4, 2.6, kc), lerp(-20, 18, kc)), 44);
    },
  }),

  // 6. PÓS-CRÉDITOS (gancho para a PARTE II): uma sombra do Tártaro pega a espada de Ares
  epi(5, {
    dur: 16, grade: 'throne', exp: 1.25, fog: ['#1a0406', 0.025],
    setup(C, st) {
      const T = cineBase(C, 'throne', { hemi: 1.1, sky: ['#05000a', '#2a0610'] });
      const iron = mat('#4a4a52', { metalness: 0.85, roughness: 0.35 });
      const dais = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 1, 24), mat(T.wall)); dais.position.set(0, 0.5, -9); dais.receiveShadow = true; C.group.add(dais);
      const rng = makeRng(13);
      for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, rand(1, 3), 0.03), iron); const a = rng() * Math.PI - Math.PI; m.position.set(Math.cos(a) * 2, 1 + rng() * 1.2, -10 + Math.sin(a) * 1.2); m.rotation.set(rng() - 0.5 + 0.8, rng() * 3, rng() - 0.5); C.group.add(m); }
      // a espada de Ares caída nos degraus, ainda com brasas
      st.sword = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 1.6), C.glowMat('#ff7a2a', 0.5)); st.sword.position.set(0.4, 1.03, -6.6); st.sword.rotation.y = 0.5; C.group.add(st.sword);
      st.red = C.plight('#ff2a1a', 0.6, 14, new CV3(0.4, 1.8, -6));
      // a SOMBRA: figura encapuzada negra
      if (Models.has('Rogue_Hooded')) {
        const rig = new Rig('Rogue_Hooded', { height: 2.3, solid: { color: '#141016', metalness: 0.3, roughness: 0.6, emissive: '#3a0008', emissiveIntensity: 0.15 }, weapons: [['Knight', '1H_Sword']], meshes: { '1H_Sword': { color: '#ff9a3a', emissive: '#ff3a0a', emissiveIntensity: 2.2 } } });
        st.held = rig.weapon('1H_Sword'); if (st.held) st.held.visible = false;
        const hb = rig.bone('head');
        st.eyes = [-1, 1].map(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), C.glowMat('#ff2a1a', 0)); e.position.set(sx * 0.14, 0.42, 0.42); hb.add(e); return e; });
        st.shadow = new THREE.Group(); st.shadow.add(rig.obj); st.shadow.position.set(0, 1.0, 4); st.shadow.rotation.y = Math.PI; C.group.add(st.shadow);
        st.rig = rig;
      }
      C.hero.root.visible = false; C.heroBlades(false);
    },
    update(C, st, t, dt) {
      const r = st.rig;
      if (r) {
        const S = st.shadow;
        // anda até a espada…
        if (t < 6) { S.position.z = lerp(4, -5.2, sstep(0.5, 6, t)); S.position.y = 1.0 + (S.position.z < -4 ? 0.03 : 0); r.play('Walking_B', { speed: 0.6 }); }
        // …abaixa e pega…
        else if (t < 8) { r.play('PickUp', { loop: false }); if (t > 7 && st.sword.visible) { st.sword.visible = false; if (st.held) st.held.visible = true; Sound.chain(); } }
        // …e ergue a espada, que volta a arder
        else { r.play('Spellcast_Raise', { loop: false, fade: 0.3 }); }
        S.rotation.y = lerp(Math.PI, 0, sstep(8, 9.2, t)); // vira para nós
        if (t > 8.3 && !st.boom) { st.boom = true; Sound.roar(0.6); game.flash('rgba(255,60,30,0.45)'); FX.ring(new CV3(0, 1.05, -5.2), '#ff3a1a', 7); }
        const k = sstep(8, 9.5, t);
        st.eyes.forEach(e => { e.material.emissiveIntensity = k * 6; });
        st.red.intensity = 0.6 + k * 5 + Math.sin(t * 9) * 0.4 * k;
        if (st.held && st.held.visible && Math.random() < 0.8) FX.fire(st.held.getWorldPosition(new CV3()).add(new CV3(0, 0.6, 0)), 2);
        r.update(dt);
      }
      if (t > 10.5 && !st.title) { st.title = true; Cine.title('AS CORRENTES DE NÊMESIS', 'CONTINUA…'); }
      // câmera baixa atrás da sombra, depois de frente para os olhos acesos
      const k1 = sstep(0, 6, t), k2 = sstep(7.5, 11, t);
      const pos = new CV3(lerp(2.5, 1.2, k2), lerp(1.6, 2.4, k2), lerp(lerp(9, 1.5, k1), -1.6, k2));
      C.cam(pos, new CV3(0, lerp(2, 2.6, k2), lerp(lerp(-2, -5, k1), -5.2, k2)), lerp(44, 38, k2));
    },
  }),
];
