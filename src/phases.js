// =============================================================
// phases.js — as 10 FASES e as mecânicas que acontecem nelas.
//
// Cada fase é um PERCURSO ao longo do eixo X, montado em trechos:
//   floor  = chão (pode ter paredes, divisória, espinhos, inimigos…)
//   gap    = abismo/lava/rio, atravessado pulando, por pedras,
//            ponte estreita ou plataformas móveis
//   stairs = escadaria (subir/descer)
//   court  = PÁTIO DE BATALHA: o portão fecha atrás de você e só
//            abre o da frente depois de derrotar todas as ondas
//   boss   = sala do chefe (o fim das fases 4, 6 e 10)
//   portal = saída das outras fases
//
// Também: pontos de controle (altar azul), baús escondidos em
// desvios, alavancas que abrem portões, espinhos que sobem do chão,
// tempestade de raios e dicas que aparecem na tela.
// =============================================================

const THEMES3D = {
  beach: {
    ground: '#e3c48d', spots: ['#c8a46a', '#f4dcae', '#b8945a'], wall: '#a89a86', wallSpots: ['#8a7c68', '#c8bca8'], accent: '#efe6d6',
    sky: ['#f39a5f', '#ffe3b0'], sunColor: '#fff3c4', fog: { color: '#f2c9a0', density: 0.012 },
    light: { hemi: 0.85, hemiSky: '#ffe8cc', hemiGround: '#6a4a30', sun: 2.2, sunColor: '#fff0d6' },
    hazard: 'sea', hazardY: -1.3, killY: -2.2, deco: ['column', 'brokenColumn', 'olive', 'rock', 'rock'],
  },
  temple: {
    ground: '#d8cebc', spots: ['#b8ae9c', '#efe6d6', '#a89e8c'], bricks: true, wall: '#8a7a8f', wallSpots: ['#5d5068', '#a89aa8'], accent: '#e8e0d0',
    sky: ['#2e2240', '#c96f53'], sunColor: '#ffb38a', fog: { color: '#7a5060', density: 0.016 },
    light: { hemi: 0.7, hemiSky: '#ffc8b0', hemiGround: '#3a2a40', sun: 1.6, sunColor: '#ffb08a' },
    hazard: 'void', killY: -9, deco: ['column', 'brokenColumn', 'statue', 'rock'],
  },
  swamp: {
    ground: '#4a5a34', spots: ['#3b4a2b', '#5f7d3a', '#2a3a20'], wall: '#3a4a30', wallSpots: ['#2a3a20', '#5a6a40'], accent: '#7a8a6a',
    sky: ['#11261d', '#5f8a5c'], sunColor: null, fog: { color: '#4a6a4a', density: 0.034 },
    light: { hemi: 0.65, hemiSky: '#c8f0c0', hemiGround: '#1a2a14', sun: 0.9, sunColor: '#d8ffb0' },
    hazard: 'swamp', hazardY: -1.0, killY: -2.0, deco: ['deadTree', 'reeds', 'reeds', 'rock', 'brokenColumn'],
  },
  cave: {
    ground: '#5a4a3a', spots: ['#4a3a2c', '#6d5640', '#3a2a1c'], wall: '#3a2e24', wallSpots: ['#2a2018', '#4a3a2c'], accent: '#6d5a48',
    sky: ['#0d0a08', '#1a120c'], sunColor: null, fog: { color: '#120c08', density: 0.03 },
    light: { hemi: 0.62, hemiSky: '#ffb878', hemiGround: '#2a1a10', sun: 0.8, sunColor: '#ffcf9a' },
    hazard: 'void', killY: -9, deco: ['stalagmite', 'rock', 'stalagmite'], ceiling: true,
  },
  canyon: {
    ground: '#b8683a', spots: ['#9a5a30', '#d88a52', '#7a4422'], wall: '#8a4a2a', wallSpots: ['#6a3420', '#a8603a'], accent: '#c88a5a',
    sky: ['#d9622e', '#f7c27a'], sunColor: '#ffe0a0', fog: { color: '#e8a070', density: 0.014 },
    light: { hemi: 0.8, hemiSky: '#ffd8a8', hemiGround: '#5a2a14', sun: 2.0, sunColor: '#ffd0a0' },
    hazard: 'void', killY: -9, deco: ['rock', 'rock', 'brokenColumn'],
  },
  labyrinth: {
    ground: '#6a6278', spots: ['#4a4256', '#8a8296'], bricks: true, wall: '#4a4256', wallSpots: ['#332c3d', '#6a6278'], accent: '#8a8296',
    sky: ['#141019', '#3d3346'], sunColor: null, fog: { color: '#241e2c', density: 0.024 },
    light: { hemi: 0.55, hemiSky: '#d0c0ff', hemiGround: '#302838', sun: 1.0, sunColor: '#ffe0c0' },
    hazard: 'void', killY: -9, deco: ['column', 'rock'],
  },
  styx: {
    ground: '#3d4a4a', spots: ['#262a30', '#4a5a5a', '#1a2226'], wall: '#262a30', wallSpots: ['#1a1e22', '#3a4444'], accent: '#5a6a6a',
    sky: ['#04070b', '#1c2b33'], sunColor: '#c8e8f0', fog: { color: '#122026', density: 0.028 },
    light: { hemi: 0.55, hemiSky: '#9af0e0', hemiGround: '#0a1416', sun: 0.9, sunColor: '#c8f0f0' },
    hazard: 'styx', hazardY: -1.2, killY: -2.1, deco: ['deadTree', 'rock', 'brokenColumn'],
  },
  forge: {
    ground: '#3a2e2a', spots: ['#2e2422', '#4a3a32', '#6b3a22'], bricks: true, wall: '#2a201c', wallSpots: ['#1a1410', '#3a2a22'], accent: '#6b4a2a',
    sky: ['#140403', '#5a1a0a'], sunColor: null, fog: { color: '#3a1008', density: 0.022 },
    light: { hemi: 0.6, hemiSky: '#ff9a5a', hemiGround: '#5a1a08', sun: 1.0, sunColor: '#ffa070' },
    hazard: 'lava', hazardY: -1.4, killY: -1.9, hazardDmg: 25, deco: ['rock', 'column'],
  },
  olympus: {
    ground: '#efe6d6', spots: ['#d8cebc', '#fffaf0', '#e8d8a8'], bricks: true, wall: '#d6c8a2', wallSpots: ['#b8aa88', '#efe2c0'], accent: '#f4ecd6',
    sky: ['#5a9ae0', '#f5efd8'], sunColor: '#fff6c8', fog: { color: '#e8eef8', density: 0.012 },
    light: { hemi: 0.95, hemiSky: '#ffffff', hemiGround: '#8a8270', sun: 2.2, sunColor: '#fff8e0' },
    hazard: 'void', killY: -9, deco: ['column', 'statue', 'column'],
  },
  throne: {
    ground: '#3a2222', spots: ['#2a1414', '#5a2a20', '#7a2a20'], bricks: true, wall: '#2a1416', wallSpots: ['#1a0a0a', '#3a1a1a'], accent: '#5a2a2a',
    sky: ['#0e0004', '#5a0a0a'], sunColor: '#ff3a2a', fog: { color: '#2a0806', density: 0.02 },
    light: { hemi: 0.6, hemiSky: '#ff8a5a', hemiGround: '#3a0a06', sun: 1.3, sunColor: '#ff9a6a' },
    hazard: 'lava', hazardY: -1.4, killY: -1.9, hazardDmg: 25, deco: ['column', 'statue', 'rock'],
  },
};

// -------------------------------------------------------------
// CONSTRUTOR DE PERCURSOS
// -------------------------------------------------------------
class Course {
  constructor(scene, theme, seed) {
    this.T = theme;
    this.L = new LevelBuilder(scene);
    this.x = 0; this.y = 0;
    this.rng = makeRng(seed || 1);
    this.gm = mat(theme.ground, { map: Tex.make(theme.ground, theme.spots, { blobs: 26, bricks: !!theme.bricks, seed: seed }) });
    this.wm = mat(theme.wall, { map: Tex.make(theme.wall, theme.wallSpots, { blobs: 12, bricks: true, seed: seed + 1 }) });
    this.am = mat(theme.accent, { roughness: 0.6 });
    // relevo (normal map) e reflexo mais forte nas pedras
    this.gm.normalMap = Tex.normal(this.gm.map, 2.2); this.gm.normalScale.set(0.7, 0.7);
    this.wm.normalMap = Tex.normal(this.wm.map, 3.0); this.wm.normalScale.set(0.9, 0.9);
    this.patches = []; // pedaços de chão (para espalhar grama e pedrinhas)
    this.foes = []; this.courts = []; this.cps = []; this.gates = {}; this.storms = []; this.hints = [];
    this.bossRoom = null; this.exit = null; this.arena = null;
    this.braziers = 0;
    this.sunDir = new THREE.Vector3(0.6, 0.9, -0.5).normalize();
    this.L.sky(theme.sky[0], theme.sky[1], this.sunDir, theme.sunColor, theme);
    if (theme.hazard === 'swamp') this.L.hazardPlane('styx', theme.hazardY).material.color.set('#3a5a2a');
    else if (theme.hazard !== 'void') this.L.hazardPlane(theme.hazard, theme.hazardY);
  }
  r(a, b) { return a + this.rng() * (b - a); }

  // enfeites nas bordas
  decorate(x0, len, w, o) {
    const L = this.L, y = this.y, T = this.T;
    L.groundY = y;
    for (let x = x0 + 2; x < x0 + len - 2; x += this.r(4, 8)) {
      if (o.secret && Math.abs(x - (x0 + o.secret.dx)) < 3) continue;
      for (const side of [-1, 1]) {
        if (this.rng() < 0.35) continue;
        const z = side * (w / 2 - this.r(0.6, 1.2));
        const kind = T.deco[Math.floor(this.rng() * T.deco.length)];
        switch (kind) {
          case 'column': L.column(x, z, this.r(4.5, 6.5), this.am, false); break;
          case 'brokenColumn': L.column(x, z, this.r(1.5, 3.5), this.am, true); break;
          case 'olive': if (side < 0) L.olive(x, y, z, this.r(0.8, 1.1)); break;
          case 'rock': L.rock(x, y, z, this.r(0.4, 1.0), this.wm); break;
          case 'deadTree': L.deadTree(x, y, z, this.r(0.9, 1.4)); break;
          case 'reeds': L.reeds(x, y, z); break;
          case 'statue': if (side < 0) L.statue(x, y, z, this.am, Math.PI / 2); break;
          case 'stalagmite': L.stalagmite(x, y, z, this.r(1.5, 3.5), this.wm); break;
        }
      }
    }
    if (T.ceiling) for (let x = x0; x < x0 + len; x += this.r(2, 5)) L.stalagmite(x, y + 9, this.r(-w / 2, w / 2), this.r(1.5, 3.5), this.wm, true);
  }

  // coloca inimigos, baús, altares, blocos, espinhos… (posições relativas ao começo do trecho)
  place(o, x0, w) {
    const L = this.L, y = this.y;
    for (const f of o.foes || []) this.foes.push([f[0], x0 + f[1], y + (f[3] || 0), f[2], -Math.PI / 2]);
    for (const b of o.blocks || []) L.block(x0 + b[0], b[1], b[2], b[3], y, y + b[4], this.wm);
    for (const s of o.spikes || []) L.spikes(x0 + s[0], y, s[1], s[2], s[3], s[4], s[5]);
    if (o.chest) L.chest(x0 + o.chest[0], y, o.chest[1], o.chest[2], o.chest[1] > 0 ? Math.PI : 0);
    if (o.shrine) L.shrine(x0 + o.shrine[0], y, o.shrine[1], o.shrine[2]);
    for (const lv of o.levers || []) L.lever(x0 + lv[0], y, lv[1], lv[2]);
    if (o.cp !== undefined) {
      const cp = L.checkpoint(x0 + o.cp, y, -(w / 2 - 1.6));
      cp.pos.set(x0 + o.cp + 1.5, y, 0);
      this.cps.push(cp);
      if (this.braziers < 5) { L.brazier(x0 + o.cp - 1.5, y, w / 2 - 1.4); this.braziers++; }
    }
    for (let i = 0; i < (o.amph || 0); i++) L.amphora(x0 + this.r(3, Math.max(4, (o.len || 10) - 3)), y, (this.rng() < 0.5 ? -1 : 1) * this.r(w / 2 - 2.5, w / 2 - 1.2));
    if (o.hint) this.hints.push({ x: x0 + o.hint[0], text: o.hint[1] });
    if (o.storm) this.storms.push({ x0, x1: x0 + (o.len || 20), t: 1.5 });
    if (o.secret) { // desvio escondido com baú
      const s = o.secret, sx = x0 + s.dx, side = s.side;
      L.block(sx, side * (w / 2 + 3.5), 2.2, 7, y - 1, y, this.gm);
      L.block(sx, side * (w / 2 + 9), 4.5, 4.5, y - 1, y, this.gm);
      L.chest(sx, y, side * (w / 2 + 9.6), s.kind, side > 0 ? Math.PI : 0);
    }
  }

  walls(x0, len, w, h, torches) {
    const L = this.L, y = this.y;
    for (const side of [-1, 1]) L.block(x0 + len / 2, side * (w / 2 + 0.5), len, 1, y - 1, y + (h || 5), this.wm);
    if (torches) for (let x = x0 + 4; x < x0 + len - 2; x += 8) for (const side of [-1, 1]) L.torch(x, y + 2.6, side * (w / 2 - 0.05));
  }

  floor(len, o) {
    o = Object.assign({ len }, o || {});
    const w = o.w || 12, x0 = this.x, L = this.L;
    L.block(x0 + len / 2, 0, len, w, this.y - 6, this.y, this.gm);
    if (o.walls) this.walls(x0, len, w, 5, true);
    if (o.split) L.block(x0 + len / 2, 0, len - 8, 0.8, this.y, this.y + 4.5, this.wm);
    if (!o.bare) this.decorate(x0, len, w, o);
    if (!o.bare) this.patches.push({ x0, len, w, y: this.y });
    this.place(o, x0, w);
    if (o.gate) this.gates[o.gate] = L.gate(x0 + len - 0.4, this.y, 0, w);
    if (o.portal) this.exit = L.portal(x0 + len - 5, this.y, 0);
    this.x += len;
    return this;
  }

  gap(len, cross, o) {
    o = Object.assign({ len }, o || {});
    const x0 = this.x, y = this.y, L = this.L;
    if (cross === 'stones') {
      const n = Math.ceil(len / 3.3);
      for (let i = 0; i < n; i++) L.block(x0 + (i + 0.5) * len / n, (i % 2 ? 1 : -1) * this.r(0.6, 1.6), 2.5, 2.5, y - 6, y, this.gm);
    } else if (cross === 'bridge') {
      L.block(x0 + len / 2, 0, len, 2.6, y - 0.8, y, this.wm);
      for (let x = x0 + 3; x < x0 + len; x += 6) for (const s of [-1, 1]) L.block(x, s * 1.15, 0.25, 0.25, y, y + 0.9, this.am);
    } else if (cross === 'movers') {
      const n = Math.max(2, Math.round(len / 5));
      for (let i = 0; i < n; i++) L.mover(x0 + (i + 0.5) * len / n, y, 0, 3.4, 3.4, 'z', 3.2, 3.6, i * 1.4, this.gm);
    } else if (cross === 'moversX') {
      L.mover(x0 + len / 2, y, 0, 4, 4, 'x', len / 2 - 2.6, len / 3.2, 0, this.gm);
    }
    // jump = nada (vão curto: pule!)
    for (const f of o.foes || []) this.foes.push([f[0], x0 + f[1], y + (f[3] || 0), f[2], -Math.PI / 2]);
    if (o.hint) this.hints.push({ x: x0 + o.hint[0], text: o.hint[1] });
    this.x += len;
    return this;
  }

  stairs(dy, o) {
    o = o || {};
    const w = o.w || 10, n = Math.ceil(Math.abs(dy) / 0.5), step = dy / n, L = this.L;
    for (let i = 0; i < n; i++) {
      const top = this.y + step * (i + 1);
      L.block(this.x + 0.6, 0, 1.2, w, top - 6, top, this.wm);
      this.x += 1.2;
    }
    this.y += dy;
    if (o.statues !== false) { L.statue(this.x - 1, this.y, -(w / 2 + 0.8), this.am, Math.PI / 2); }
    return this;
  }

  // PÁTIO DE BATALHA
  court(len, waves, o) {
    o = Object.assign({ len }, o || {});
    const w = o.w || 20, x0 = this.x, L = this.L, y = this.y;
    L.block(x0 + len / 2, 0, len, w, y - 6, y, this.gm);
    this.walls(x0, len, w, 6, !!o.torches || this.T.ceiling);
    this.patches.push({ x0, len, w, y });
    for (const x of [x0 + 4, x0 + len - 4]) for (const side of [-1, 1]) { L.groundY = y; L.column(x, side * (w / 2 - 1.2), 6, this.am, false); }
    this.place(o, x0, w);
    const entry = L.gate(x0 + 0.4, y, 0, w); entry.setOpen(true, true);
    const exit = L.gate(x0 + len - 0.4, y, 0, w);
    this.courts.push({ x0, x1: x0 + len, w, y, entry, exit, state: 'idle', wave: 0, delay: 0, spawned: [],
      waves: waves.map(wv => wv.map(f => [f[0], x0 + f[1], y + (f[3] || 0), f[2], -Math.PI / 2])) });
    this.x += len;
    return this;
  }

  // SALA DO CHEFE
  boss(len, type, o) {
    o = Object.assign({ len }, o || {});
    const w = o.w || 36, x0 = this.x, L = this.L, y = this.y;
    L.block(x0 + len / 2, 0, len, w, y - 6, y, this.gm);
    this.walls(x0, len, w, 9, true);
    this.patches.push({ x0, len, w, y });
    L.block(x0 + len + 0.5, 0, 1, w + 2, y - 1, y + 9, this.wm);  // parede do fundo
    for (const [dx, s] of [[5, -1], [5, 1], [len - 5, -1], [len - 5, 1]]) {
      if (this.braziers < 7) { L.brazier(x0 + dx, y, s * (w / 2 - 2)); this.braziers++; }
    }
    if (type === 'ares') {
      const lava = new THREE.MeshBasicMaterial({ color: '#ff4a12' });
      for (let i = 0; i < 16; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(this.r(1.5, 4), 0.02, 0.12), lava); c.position.set(x0 + this.r(3, len - 3), y + 0.02, this.r(-w / 2 + 2, w / 2 - 2)); c.rotation.y = this.r(0, 3); L.group.add(c); }
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { L.groundY = y; L.column(x0 + 6 + i * (len - 12) / 4, s * (w / 2 - 1), 8, this.am, false); }
    }
    const entry = L.gate(x0 + 0.4, y, 0, w); entry.setOpen(true, true);
    this.arena = { minX: x0 + 0.5, maxX: x0 + len - 0.5, minZ: -w / 2 + 0.5, maxZ: w / 2 - 0.5 };
    this.bossRoom = { x0, x1: x0 + len, type, y, entry, state: 'idle', spawn: [type, x0 + len * 0.72, y, 0, -Math.PI / 2] };
    this.x += len;
    return this;
  }

  build(def) {
    Decor.ground(this);
    Decor.motes(this);
    return {
      theme: this.T,
      builder: this.L,
      name: def.name, index: def.index,
      spawn: new THREE.Vector3(3, 0, 0),
      killY: this.T.killY, hazardDmg: this.T.hazardDmg || 10,
      fog: this.T.fog, light: this.T.light, music: def.music,
      sunDir: this.sunDir,
      foes: this.foes, courts: this.courts, checkpoints: this.cps, gates: this.gates, storms: this.storms, hints: this.hints,
      bossRoom: this.bossRoom, exit: this.exit, arena: this.arena,
      length: this.x,
    };
  }
}

// -------------------------------------------------------------
// AS 10 FASES
// Inimigos: [tipo, distância no trecho, lado (z), altura extra]
// -------------------------------------------------------------
const PHASES = [
  // 1 ------------------------------------------------------------
  { name: 'Praias de Atenas', sub: 'A invasão começa na costa', theme: 'beach', seed: 11, music: { tempo: 90, root: 50, seed: 3, mood: 'calm' }, build(c) {
    c.floor(28, { amph: 3, hint: [3, 'WASD anda · ESPAÇO pula (aperte de novo no ar = PULO DUPLO) · SHIFT esquiva'] });
    c.floor(24, { foes: [['sword', 14, 2], ['sword', 18, -2]], blocks: [[8, 3, 2.5, 2.5, 1.1]], hint: [2, 'J ou clique: combo de 4 golpes · K ou clique direito: giro pesado'] });
    c.gap(4.5, 'jump', { hint: [-6, 'Pule o vão! Cair no mar custa vida.'] });
    c.floor(26, { foes: [['sword', 8, 3], ['sword', 12, -3], ['archer', 20, 4, 1.8]], blocks: [[20, 4, 3, 3, 1.8]], cp: 2, hint: [6, 'Escudo erguido BLOQUEIA de frente: ataque por trás ou use o giro pesado. Arqueiro: quando a linha vermelha PISCAR, esquive!'] });
    c.floor(18, { shrine: [9, -4, 0], hint: [3, 'Um altar dos deuses! Chegue perto e aperte E.'] });
    c.gap(9, 'stones');
    c.floor(22, { foes: [['sword', 6, 2], ['sword', 6, -2], ['sword', 12, 0], ['archer', 18, -4]], amph: 2, secret: { dx: 12, side: -1, kind: 'mana' } });
    c.court(30, [
      [['sword', 15, 3], ['sword', 15, -3], ['sword', 22, 0]],
      [['sword', 10, 4], ['archer', 25, 5], ['archer', 25, -5], ['sword', 18, 0]],
    ], { hint: [2, 'Pátio de batalha: o portão só abre quando todos caírem.'] });
    c.floor(16, { cp: 3, chest: [8, 4, 'hp'] });
    c.gap(18, 'bridge');
    c.floor(20, { foes: [['sword', 6, 2], ['sword', 10, -2], ['archer', 15, 0]] });
    c.floor(16, { portal: true, hint: [2, 'O portal leva à próxima fase.'] });
  } },
  // 2 ------------------------------------------------------------
  { name: 'Templo de Atena em Ruínas', sub: 'Onde a deusa da sabedoria foi esquecida', theme: 'temple', seed: 22, music: { tempo: 96, root: 48, seed: 7, mood: 'epic' }, build(c) {
    c.floor(20, { hint: [3, 'O Templo de Atena. Arqueiros espreitam do alto.'] });
    c.stairs(2);
    c.floor(24, { foes: [['archer', 10, 5, 2.5], ['archer', 16, -5, 2.5], ['sword', 12, 0], ['sword', 18, 2]], blocks: [[10, 5, 3, 3, 2.5], [16, -5, 3, 3, 2.5]] });
    c.gap(10, 'stones');
    c.floor(26, { levers: [[6, 5, 'A'], [20, -5, 'A']], gate: 'A', foes: [['sword', 10, 3], ['sword', 14, -3], ['archer', 22, 0]], cp: 2, hint: [4, 'Portão trancado! Puxe as DUAS alavancas (E) para abri-lo.'] });
    c.floor(18, { chest: [10, -4, 'mana'], amph: 2 });
    c.gap(12, 'movers', { hint: [-4, 'Plataformas móveis: espere a hora certa.'] });
    c.floor(22, { foes: [['heavy', 14, 0], ['sword', 8, 3]], hint: [2, 'Guerreiro pesado: fuja do VERMELHO no chão e bata quando ele se recuperar.'] });
    c.court(30, [
      [['sword', 12, 4], ['sword', 12, -4], ['archer', 24, 6], ['archer', 24, -6]],
      [['heavy', 18, 0], ['sword', 10, 0], ['archer', 26, 0]],
    ], { w: 22 });
    c.floor(16, { cp: 3 });
    c.gap(5, 'jump');
    c.floor(24, { levers: [[5, 5, 'B'], [17, -5, 'B']], gate: 'B', foes: [['archer', 10, 0], ['sword', 14, 4], ['sword', 14, -4]], secret: { dx: 8, side: 1, kind: 'hp' } });
    c.floor(14, { cp: 4, hint: [3, 'O chão treme… a estátua de Atena despertou. Escudo no chão = onda de choque: PULE!'] });
    c.boss(36, 'sentinel', { w: 30 });
  } },
  // 3 ------------------------------------------------------------
  { name: 'Pântano das Górgonas', sub: 'Não encare os olhos delas', theme: 'swamp', seed: 33, music: { tempo: 84, root: 47, seed: 13, mood: 'dark' }, build(c) {
    c.floor(24, { foes: [['gorgon', 18, 3]], hint: [3, 'Pântano das Górgonas: a magia verde te deixa LENTO. Use as colunas para se proteger.'] });
    c.gap(10, 'stones');
    c.floor(30, { blocks: [[8, 2, 1.2, 1.2, 3.5], [14, -3, 1.2, 1.2, 3.5], [20, 1, 1.2, 1.2, 3.5]], foes: [['gorgon', 24, 4], ['gorgon', 26, -4], ['archer', 28, 0], ['sword', 12, 0]] });
    c.floor(14, { cp: 2 });
    c.gap(14, 'bridge', { foes: [['sword', 8, 0]] });
    c.floor(26, { shrine: [10, 4, 2], foes: [['sword', 16, 2], ['sword', 16, -2], ['gorgon', 22, 0]], hint: [4, 'Altar de Medusa! Petrifique e bata: dano CRÍTICO.'] });
    c.court(32, [
      [['gorgon', 20, 5], ['gorgon', 20, -5], ['sword', 10, 0], ['sword', 14, 3]],
      [['gorgon', 26, 0], ['archer', 24, 6], ['archer', 24, -6], ['sword', 12, 3], ['sword', 12, -3]],
    ], { w: 22, blocks: [[10, 4, 1.2, 1.2, 3.5], [10, -4, 1.2, 1.2, 3.5], [20, 0, 1.2, 1.2, 3.5]] });
    c.floor(16, { cp: 3, chest: [8, -4, 'hp'] });
    c.gap(10, 'movers');
    c.floor(24, { foes: [['heavy', 12, 0], ['gorgon', 20, 4], ['gorgon', 20, -4]], secret: { dx: 6, side: -1, kind: 'mana' } });
    c.floor(14, { portal: true });
  } },
  // 4 ------------------------------------------------------------
  { name: 'Cavernas dos Ciclopes', sub: 'Algo enorme respira na escuridão', theme: 'cave', seed: 44, music: { tempo: 100, root: 45, seed: 21, mood: 'dark' }, build(c) {
    c.floor(26, { w: 10, walls: true, foes: [['sword', 12, 2], ['sword', 16, -2]], hint: [3, 'Cavernas dos Ciclopes. As tochas mostram o caminho.'] });
    c.gap(5, 'jump');
    c.floor(28, { w: 10, walls: true, foes: [['archer', 22, 0], ['sword', 10, 0], ['heavy', 18, 0]], amph: 2 });
    c.stairs(1.5, { w: 10 });
    c.floor(20, { w: 10, walls: true, cp: 2, chest: [12, 3, 'mana'] });
    c.gap(12, 'stones');
    c.court(30, [
      [['sword', 10, 3], ['sword', 10, -3], ['sword', 16, 0], ['archer', 24, 4]],
      [['heavy', 18, 0], ['archer', 24, -4], ['sword', 12, 0]],
    ], { torches: true });
    c.floor(18, { w: 10, walls: true, cp: 4, hint: [3, 'Um rugido ecoa no fundo da caverna… Ondas de choque: PULE por cima.'] });
    c.boss(40, 'cyclops', { w: 34 });
  } },
  // 5 ------------------------------------------------------------
  { name: 'Desfiladeiro dos Ventos', sub: 'Pontes estreitas e céu em fúria', theme: 'canyon', seed: 55, music: { tempo: 104, root: 49, seed: 34, mood: 'epic' }, build(c) {
    c.floor(22, { foes: [['harpy', 16, 0]], hint: [3, 'Desfiladeiro dos Ventos: pontes estreitas e HARPIAS que empurram. Use o raio de Zeus!'] });
    c.gap(22, 'bridge', { foes: [['harpy', 10, 0]] });
    c.floor(18, { cp: 2, foes: [['sword', 10, 2], ['archer', 14, -3]] });
    c.gap(20, 'bridge', { foes: [['harpy', 8, 3], ['harpy', 14, -3]] });
    c.floor(26, { storm: true, foes: [['sword', 8, 0], ['sword', 14, 2], ['archer', 20, -4]], hint: [2, 'Tempestade! Saia do círculo antes do raio cair.'] });
    c.floor(16, { shrine: [8, -3, 1], hint: [3, 'Altar de Ares! Ímpeto de Ares: explosão de fogo em volta (tecla 2).'] });
    c.gap(14, 'movers');
    c.floor(24, { storm: true, foes: [['harpy', 10, 0], ['harpy', 16, 3], ['gorgon', 20, 0]] });
    c.court(30, [
      [['harpy', 15, 3], ['harpy', 15, -3], ['sword', 10, 0], ['sword', 20, 0]],
      [['heavy', 18, 0], ['harpy', 10, 0], ['archer', 25, 4], ['archer', 25, -4]],
    ], { storm: true });
    c.floor(14, { cp: 3, secret: { dx: 8, side: 1, kind: 'hp' } });
    c.gap(24, 'bridge', { foes: [['harpy', 12, 0]] });
    c.floor(14, { portal: true });
  } },
  // 6 ------------------------------------------------------------
  { name: 'O Labirinto de Creta', sub: 'Ninguém sai daqui sem enfrentar o touro', theme: 'labyrinth', seed: 66, music: { tempo: 98, root: 46, seed: 55, mood: 'dark' }, build(c) {
    c.floor(20, { w: 14, walls: true, hint: [3, 'O Labirinto de Creta. Escolha um caminho: ESPINHOS ou inimigos.'] });
    c.floor(36, { w: 14, walls: true, split: true,
      spikes: [[8, 3.7, 4, 5.6, 2.2, 0], [18, 3.7, 4, 5.6, 2.2, 0.7], [28, 3.7, 4, 5.6, 2.2, 1.4]],
      foes: [['sword', 10, -3.7], ['sword', 20, -3.7], ['archer', 30, -3.7]] });
    c.floor(16, { w: 14, walls: true, cp: 2, chest: [10, 4, 'mana'] });
    c.floor(36, { w: 14, walls: true, split: true,
      spikes: [[8, -3.7, 4, 5.6, 2, 0], [18, -3.7, 4, 5.6, 2, 0.5], [28, -3.7, 4, 5.6, 2, 1.0]],
      foes: [['heavy', 18, 3.7], ['sword', 26, 3.7]] });
    c.court(28, [
      [['sword', 10, 4], ['sword', 10, -4], ['sword', 18, 0], ['archer', 24, 6]],
      [['minoguard', 16, 0], ['sword', 10, 4], ['archer', 24, -6]],
    ], { w: 20, torches: true });
    c.floor(30, { w: 14, walls: true, spikes: [[5, 0, 3, 13, 2, 0], [11, 0, 3, 13, 2, 0.66], [17, 0, 3, 13, 2, 1.33], [23, 0, 3, 13, 2, 0.33]],
      hint: [1, 'Corredor de espinhos: observe o ritmo antes de correr.'] });
    c.floor(16, { w: 14, walls: true, cp: 2, hint: [4, 'Dica: faça o Minotauro bater na PAREDE. Atordoado, ele leva mais dano.'] });
    c.boss(42, 'minotaur', { w: 34 });
  } },
  // 7 ------------------------------------------------------------
  { name: 'Margens do Rio Estige', sub: 'A fronteira do mundo dos mortos', theme: 'styx', seed: 77, music: { tempo: 80, root: 44, seed: 89, mood: 'dark' }, build(c) {
    c.floor(24, { foes: [['sword', 10, 2], ['sword', 12, -2], ['sword', 16, 0]], hint: [3, 'As margens do Estige. Hordas de mortos-vivos… e o rio rouba a vida de quem cai.'] });
    c.gap(16, 'movers');
    c.floor(26, { foes: [['sword', 6, 3], ['sword', 8, -3], ['archer', 18, 4], ['archer', 18, -4], ['sword', 22, 0]], cp: 2 });
    c.gap(20, 'moversX', { hint: [-4, 'A plataforma vai e volta: suba quando ela chegar.'] });
    c.floor(20, { shrine: [10, 4, 3], hint: [3, 'Altar de Nêmesis! Encha a Fúria batendo e aperte 4.'] });
    c.court(34, [
      [['sword', 8, 4], ['sword', 8, -4], ['sword', 14, 0], ['sword', 20, 5], ['sword', 20, -5]],
      [['sword', 10, 0], ['sword', 12, 4], ['sword', 12, -4], ['archer', 26, 6], ['archer', 26, -6], ['gorgon', 22, 0]],
      [['heavy', 18, 0], ['sword', 10, 3], ['sword', 10, -3], ['sword', 24, 0]],
    ], { w: 22 });
    c.floor(14, { cp: 3 });
    c.gap(18, 'stones');
    c.floor(26, { foes: [['heavy', 14, 0], ['gorgon', 20, 4], ['sword', 8, 2], ['sword', 8, -2]], secret: { dx: 10, side: -1, kind: 'hp' } });
    c.gap(16, 'movers');
    c.floor(14, { portal: true });
  } },
  // 8 ------------------------------------------------------------
  { name: 'Forjas do Monte Etna', sub: 'Onde o bronze ganha vida', theme: 'forge', seed: 88, music: { tempo: 108, root: 45, seed: 144, mood: 'epic' }, build(c) {
    c.floor(22, { foes: [['automaton', 16, 0]], hint: [3, 'Forjas do Etna: rios de lava e Autômatos de Bronze. Poderes e Fúria ajudam muito!'] });
    c.gap(18, 'movers');
    c.floor(24, { foes: [['automaton', 12, 2], ['sword', 8, -3], ['archer', 20, 0]], cp: 2 });
    c.gap(22, 'moversX');
    c.floor(20, { foes: [['automaton', 10, 0], ['automaton', 16, 3]], amph: 2 });
    c.gap(14, 'stones');
    c.court(32, [
      [['automaton', 18, 0], ['sword', 10, 4], ['sword', 10, -4]],
      [['automaton', 14, 4], ['automaton', 14, -4], ['archer', 26, 0]],
    ], { w: 22 });
    c.floor(14, { cp: 3, chest: [8, 4, 'mana'] });
    c.gap(24, 'movers');
    c.floor(26, { foes: [['automaton', 10, 0], ['heavy', 18, 2], ['gorgon', 22, -4]], secret: { dx: 6, side: 1, kind: 'hp' } });
    c.floor(14, { cp: 4, hint: [3, 'Calor insuportável à frente… TALOS desperta. Fuja da chuva de brasas!'] });
    c.boss(42, 'talos', { w: 34 });
  } },
  // 9 ------------------------------------------------------------
  { name: 'Escadaria do Olimpo', sub: 'Mil degraus até os deuses', theme: 'olympus', seed: 99, music: { tempo: 112, root: 50, seed: 233, mood: 'epic' }, build(c) {
    c.floor(18, { hint: [3, 'A Escadaria do Olimpo. Suba até os portões dos deuses.'] });
    c.stairs(3);
    c.court(28, [
      [['elite', 12, 3], ['elite', 12, -3], ['archer', 22, 0]],
      [['minoguard', 16, 0], ['elite', 10, 0]],
    ]);
    c.stairs(3);
    c.floor(16, { cp: 2, chest: [10, -4, 'mana'] });
    c.stairs(3);
    c.court(30, [
      [['elite', 10, 4], ['elite', 10, -4], ['archer', 22, 5], ['archer', 22, -5]],
      [['minoguard', 14, 3], ['minoguard', 14, -3]],
      [['elite', 8, 0], ['elite', 12, 3], ['elite', 12, -3], ['gorgon', 24, 0], ['harpy', 18, 0]],
    ], { w: 22 });
    c.stairs(3);
    c.floor(16, { cp: 3 });
    c.gap(12, 'bridge', { foes: [['harpy', 6, 0]] });
    c.stairs(3);
    c.court(32, [
      [['minoguard', 12, 0], ['elite', 18, 3], ['elite', 18, -3]],
      [['elite', 10, 4], ['elite', 10, -4], ['archer', 24, 6], ['archer', 24, -6], ['minoguard', 20, 0]],
    ], { w: 24 });
    c.floor(16, { cp: 3, chest: [8, 4, 'hp'] });
    c.stairs(2);
    c.floor(16, { portal: true });
  } },
  // 10 -----------------------------------------------------------
  { name: 'O Trono de Ares', sub: 'O Deus da Guerra aguarda', theme: 'throne', seed: 1010, music: { tempo: 110, root: 43, seed: 377, mood: 'epic' }, build(c) {
    c.floor(22, { foes: [['elite', 14, 2], ['elite', 14, -2]], hint: [3, 'O Trono de Ares. Não há volta.'] });
    c.gap(14, 'stones');
    c.floor(20, { foes: [['minoguard', 12, 0], ['archer', 18, 4]], cp: 2 });
    c.stairs(2);
    c.court(30, [
      [['elite', 10, 3], ['elite', 10, -3], ['automaton', 20, 0]],
      [['minoguard', 14, 0], ['archer', 24, 5], ['archer', 24, -5], ['elite', 12, 0]],
    ], { w: 22 });
    c.floor(16, { cp: 3, chest: [8, -4, 'hp'] });
    c.gap(10, 'movers');
    c.floor(14, { cp: 4, chest: [8, 4, 'mana'], hint: [3, 'Além deste portão está o Deus da Guerra. Ele tem DOIS estágios.'] });
    c.boss(48, 'ares', { w: 40 });
  } },
];

function buildPhase(i, scene) {
  const P = PHASES[i];
  const c = new Course(scene, THEMES3D[P.theme], P.seed);
  P.build(c);
  const L = c.build({ name: 'FASE ' + (i + 1) + ' · ' + P.name.toUpperCase(), index: i, music: P.music });
  L.title = P.name; L.sub = P.sub;
  return L;
}

// -------------------------------------------------------------
// MECÂNICAS DA FASE (rodam a cada quadro)
// -------------------------------------------------------------
const Phase = {
  // antes do herói se mexer: plataformas móveis carregam quem está em cima
  preUpdate(dt, game) {
    const B = game.level.builder, p = game.player;
    for (const m of B.movers) {
      m.place(game.time);
      if (p.ground === m.solid && p.onGround) p.pos.add(m.solid.delta);
    }
  },

  update(dt, game) {
    const L = game.level, B = L.builder, p = game.player, t = game.time;
    if (p.dead) return;

    // espinhos: escondidos → tremem (aviso) → sobem
    for (const tr of B.traps) {
      const ph = ((t + tr.offset) % tr.period + tr.period) % tr.period;
      const upT = tr.period - 0.8, warnT = upT - 0.55;
      let target = -0.85;
      if (ph > upT) target = 0;
      else if (ph > warnT) target = -0.62 + Math.sin(t * 60) * 0.04;
      tr.spk.position.y = damp(tr.spk.position.y, target, target === 0 ? 1e-9 : 0.001, dt);
      tr.up = ph > upT;
      if (tr.up && !tr.wasUp && Math.abs(p.pos.x - tr.x) < 20) Sound.tone({ freq: 500, freq2: 200, dur: 0.12, type: 'square', vol: 0.03 });
      tr.wasUp = tr.up;
      if (tr.up && Math.abs(p.pos.x - tr.x) < tr.w / 2 + 0.2 && Math.abs(p.pos.z - tr.z) < tr.d / 2 + 0.2 && p.pos.y - tr.y < 0.6 && p.pos.y >= tr.y - 0.1) {
        if (p.hurt(15, new THREE.Vector3(p.pos.x - 0.01, 0, p.pos.z), game, 0)) { p.vel.y = 9; FX.sparks(p.pos, 10, ['#ffffff', '#c8ccd8']); }
      }
    }

    // pontos de controle
    for (const cp of L.checkpoints) {
      if (cp.lit || Math.hypot(p.pos.x - cp.pos.x, p.pos.z - cp.pos.z) > 4 || Math.abs(p.pos.y - cp.pos.y) > 2) continue;
      for (const o of L.checkpoints) if (o.pos.x <= cp.pos.x) { o.lit = true; o.flame.visible = true; o.glow.visible = true; }
      game.checkpoint = cp;
      p.heal(HERO.maxHp, game);
      p.mana = Math.max(p.mana, HERO.maxMana * 0.6);
      FX.burst(new THREE.Vector3(cp.at.x, cp.at.y + 1.9, cp.at.z), 30, { speed: [1, 5], life: [0.5, 1], size: [0.15, 0.3], colors: ['#bfe6ff', '#7ac8ff', '#ffffff'], glow: true, drag: 2 });
      Sound.portal();
      UI.toast('Ponto de controle — vida restaurada');
    }

    // dicas na tela
    for (const h of L.hints) if (!h.shown && p.pos.x > h.x) { h.shown = true; UI.hint(h.text); }

    // pátios de batalha
    for (const c of L.courts) {
      if (c.state === 'idle' && p.pos.x > c.x0 + 2.5 && p.pos.x < c.x1 - 2 && Math.abs(p.pos.y - c.y) < 2) {
        c.state = 'active'; c.wave = 0; c.delay = 0.6;
        c.entry.setOpen(false);
        UI.banner('PÁTIO DE BATALHA', 'Derrote ' + (c.waves.length > 1 ? 'as ' + c.waves.length + ' ondas' : 'todos') + ' para abrir o portão');
        game.shake(0.3);
      } else if (c.state === 'active') {
        if (c.delay > 0) {
          c.delay -= dt;
          if (c.delay <= 0) {
            for (const f of c.waves[c.wave]) {
              const e = Enemies.make(f[0], game.scene, new THREE.Vector3(f[1], f[2], f[3]), f[4]);
              e.alert(game); c.spawned.push(e);
              FX.ring(e.pos, '#ffcf8a', 2); FX.burst(e.center, 16, { speed: [1, 4], life: [0.4, 0.8], size: [0.15, 0.3], colors: ['#ffe58a', '#ffffff'], glow: true, drag: 2 });
            }
            Sound.portal();
            if (c.waves.length > 1) UI.toast('Onda ' + (c.wave + 1) + ' de ' + c.waves.length);
          }
        } else if (c.spawned.every(e => e.dead)) {
          c.spawned = [];
          c.wave++;
          if (c.wave < c.waves.length) c.delay = 1.2;
          else { c.state = 'done'; c.exit.setOpen(true); c.entry.setOpen(true, true); UI.banner('O PORTÃO SE ABRIU', 'Siga em frente'); Sound.win(); }
        }
      }
    }

    // tempestade de raios (mira onde você vai estar)
    for (const s of L.storms) {
      if (p.pos.x < s.x0 || p.pos.x > s.x1) continue;
      s.t -= dt;
      if (s.t <= 0) {
        s.t = rand(1.4, 2.4);
        const at = new THREE.Vector3(p.pos.x + p.vel.x * 0.5, p.pos.y, p.pos.z + p.vel.z * 0.5);
        const mark = Tele.add('circle', { x: at.x, y: at.y, z: at.z, r: 1.9, dur: 0.95, color: '#6ab0ff' });
        (s.pending = s.pending || []).push({ at, t: 0.95, mark });
      }
    }
    for (const s of L.storms) if (s.pending) {
      for (const k of s.pending) {
        k.t -= dt;
        if (k.t <= 0) {
          k.mark.remove();
          this.bolt(game, k.at);
          if (Math.hypot(p.pos.x - k.at.x, p.pos.z - k.at.z) < 2.1 && p.pos.y - k.at.y < 1.5) p.hurt(15, k.at, game, 5);
        }
      }
      s.pending = s.pending.filter(k => k.t > 0);
    }

    // sala do chefe
    const br = L.bossRoom;
    if (br) {
      if (br.state === 'idle' && p.pos.x > br.x0 + 3) {
        br.state = 'active';
        br.entry.setOpen(false);
        const [type, x, y, z, yaw] = br.spawn;
        game.boss = Enemies.make(type, game.scene, new THREE.Vector3(x, y, z), yaw);
        UI.banner(game.boss.name, game.boss.title);
        Story.event('boss');
        Sound.roar(type === 'ares' ? 0.8 : 1);
        Sound.setBossMusic(true);
        game.shake(0.4);
      } else if (br.state === 'active' && game.boss && game.boss.dead && game.boss.deadT > 3.5) {
        br.state = 'done';
        game.completeLevel();
      }
    }

    // portal de saída
    if (L.exit && Math.hypot(p.pos.x - L.exit.pos.x, p.pos.z - L.exit.pos.z) < 2.2 && Math.abs(p.pos.y - L.exit.pos.y) < 2) game.completeLevel();
  },

  // raio da tempestade (efeito)
  bolt(game, at) {
    const scene = game.scene;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 30, 5), new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(at.x, at.y + 15, at.z);
    scene.add(m);
    const light = Powers.light('#9fd3ff', 22); light.position.set(at.x, at.y + 3, at.z); light.intensity = 6;
    FX.sparks(at, 24, ['#ffffff', '#9fd3ff', '#5ab0ff']);
    FX.ring(at, '#9fd3ff', 3);
    Sound.thunder();
    game.shake(0.3);
    Powers.effects.push({ t: 0, update: (t) => { m.material.opacity = 1 - t / 0.25; m.scale.x = m.scale.z = 1 + Math.random(); light.intensity = 6 * (1 - t / 0.3); return t < 0.3; },
      dispose: () => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); Powers.freeLight(light); } });
  },

  // morreu com ponto de controle: volta ao altar e reinicia só o pátio/chefe em andamento
  respawnAtCheckpoint(game) {
    const L = game.level, p = game.player;
    Shots.clear(); Tele.clear();
    for (const c of L.courts) if (c.state === 'active') {
      for (const e of c.spawned) e.remove();
      Enemies.list = Enemies.list.filter(e => !c.spawned.includes(e));
      c.spawned = []; c.state = 'idle'; c.wave = 0;
      c.entry.setOpen(true, true);
    }
    const br = L.bossRoom;
    if (br && br.state === 'active') {
      if (game.boss) { const b = game.boss; b.remove(); Enemies.list = Enemies.list.filter(e => e !== b); }
      game.boss = null; br.state = 'idle'; br.entry.setOpen(true, true);
      Sound.setBossMusic(false);
    }
    // inimigos que sobraram voltam para casa, curados
    for (const e of Enemies.list) if (!e.dead) { e.pos.copy(e.home); e.vel.set(0, 0, 0); e.hp = e.maxHp; e.stun = e.burn = e.petrify = 0; e.setState('patrol'); e.alerted = false; e.sync(); }
    p.respawn(game.checkpoint.pos);
    p.yaw = p.targetYaw = Math.PI / 2;
  },
};
