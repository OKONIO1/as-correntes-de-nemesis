// =============================================================
// main.js — o "maestro": cria a cena 3D (renderizador, câmera, luzes,
// neblina), lê teclado/mouse, roda o laço do jogo e segue o herói
// com a câmera isométrica inclinada.
// =============================================================

// -------------------------------------------------------------
// ENTRADA
// -------------------------------------------------------------
const KEYMAP = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], dash: ['ShiftLeft', 'ShiftRight'],
  attack: ['KeyJ'], heavy: ['KeyK'], interact: ['KeyE'],
};
const GAME_KEYS = new Set([].concat(...Object.values(KEYMAP)));
const Input = {
  held: new Set(), just: new Set(),
  down(a) { return KEYMAP[a].some(k => this.held.has(k)); },
  pressed(a) { return KEYMAP[a].some(k => this.just.has(k)) || this.just.has('mouse:' + a); },
  endFrame() { this.just.clear(); },
};
addEventListener('keydown', (e) => {
  if (GAME_KEYS.has(e.code) && game.state === 'playing') e.preventDefault();
  if (!e.repeat) Input.just.add(e.code);
  Input.held.add(e.code);
  if (e.code === 'KeyM') { Sound.init(); Sound.toggleMute(); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
    if (!document.getElementById('options').classList.contains('hidden')) { Menus.closeOptions(); return; }
    if (game.state === 'playing') pauseGame(); else if (game.state === 'paused') resumeGame();
  }
});
addEventListener('keyup', (e) => Input.held.delete(e.code));
addEventListener('blur', () => { Input.held.clear(); if (game.state === 'playing') pauseGame(); });
addEventListener('mousedown', (e) => {
  if (game.state !== 'playing' || Touch.enabled) return; // no celular os botões de toque fazem isso
  if (e.button === 0) Input.just.add('mouse:attack');
  if (e.button === 2) Input.just.add('mouse:heavy');
});
addEventListener('contextmenu', (e) => e.preventDefault());

// -------------------------------------------------------------
// CENA 3D
// -------------------------------------------------------------
THREE.ColorManagement.legacyMode = false; // cores certinhas (sRGB)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // telas muito densas: limita para manter o FPS
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);
Post.init(renderer); // pós-processamento (brilho, cor de cinema) — graphics.js

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 900);

// luzes: céu/chão (ambiente) + sol com sombras
const hemi = new THREE.HemisphereLight('#ffe8cc', '#6a4a30', 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d6', 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  const db = renderer.getDrawingBufferSize(new THREE.Vector2());
  Post.setSize(db.x, db.y);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  FX.setScale(h * renderer.getPixelRatio());
}

// -------------------------------------------------------------
// ESTADO DO JOGO
// -------------------------------------------------------------
const game = {
  state: 'start',
  scene, camera,
  level: null, player: null,
  camYaw: -0.35,      // ângulo da câmera em volta do herói
  camPitch: 0.74,     // inclinação (≈ 42°)
  camDist: 15,
  camTarget: new THREE.Vector3(),
  shakeMag: 0,
  combo: 0, comboT: 0,
  time: 0,
  shake(m) { if (Options.data.shake) this.shakeMag = Math.max(this.shakeMag, m); },
  slowT: 0,
  slowMo(sec) { this.slowT = sec; },
  flash(color) { UI.flash(color); },
  onFoeKilled(e) {
    this.kills++;
    this.player.fury = Math.min(HERO.maxFury, this.player.fury + (this.player.rage > 0 ? 0 : 10));
  },
  // chegou ao portal ou derrotou o chefe
  completeLevel() {
    if (this.state !== 'playing') return;
    this.state = 'complete';
    const i = this.levelKey;
    Save.data.unlocked = Math.max(Save.data.unlocked, Math.min(PHASES.length, i + 2));
    Save.write();
    Sound.stopMusic(); Sound.win();
    UI.flash('rgba(255,240,200,0.5)');
    const t = Math.floor(this.levelTime), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const last = i === PHASES.length - 1;
    document.getElementById('completeTitle').textContent = last ? 'VITÓRIA!' : 'FASE ' + (i + 1) + ' CONCLUÍDA';
    document.getElementById('completeText').textContent = last
      ? 'Ares caiu. As correntes de Nêmesis cobraram a dívida dos deuses, e Teron de Argos volta para casa como lenda. Mas a espada de Ares voltou a arder… A história continua na PARTE II.'
      : PHASES[i].name;
    document.getElementById('completeStats').innerHTML =
      `<div><span>Tempo</span><b>${mm}:${ss}</b></div><div><span>Inimigos derrotados</span><b>${this.kills}</b></div><div><span>Mortes</span><b>${this.deaths}</b></div>`;
    const next = document.getElementById('btnNext');
    next.classList.toggle('hidden', last);
    document.getElementById('btnCredits').classList.toggle('hidden', !last);
    if (!last) next.textContent = 'Próxima: ' + PHASES[i + 1].name;
    if (last) {
      // última fase: o EPÍLOGO da história antes da tela de vitória
      const st = this;
      const startEpilogue = () => {
        if (!Story.idle()) { setTimeout(startEpilogue, 300); return; } // deixa as últimas falas terminarem
        st.state = 'story'; UI.show('hud', false);
        Cine.play(EPILOGUE_SHOTS, () => { st.state = 'complete'; UI.show('complete', true); Sound.stopMusic(); }, { music: { tempo: 70, root: 50, seed: 3, mood: 'calm' } });
      };
      setTimeout(startEpilogue, 1500);
    } else UI.show('complete', true);
  },
};

// Monta uma fase (e desmonta a anterior). i = 0..9
function loadLevel(i) {
  if (game.level) scene.remove(game.level.builder.group);
  Enemies.clear(); Shots.clear(); Tele.clear(); Powers.clear();
  game.levelKey = i;
  const L = game.level = buildPhase(i, scene);
  game.checkpoint = null;
  game.kills = 0; game.deaths = 0; game.levelTime = 0;
  Sound.setBossMusic(false);
  scene.fog = new THREE.FogExp2(L.fog.color, L.fog.density);
  scene.userData.fogBase = L.fog.density;
  const lt = L.light || {};
  hemi.intensity = lt.hemi !== undefined ? lt.hemi : 0.85;
  hemi.color.set(lt.hemiSky || '#ffe8cc'); hemi.groundColor.set(lt.hemiGround || '#6a4a30');
  sun.intensity = lt.sun !== undefined ? lt.sun : 2.2;
  sun.color.set(lt.sunColor || '#fff0d6');
  // reflexos do céu (mapa de ambiente) + filtro de cor da fase
  scene.environment = Env.build(renderer, L.theme, L.sunDir);
  hemi.intensity *= 0.8; // o ambiente já ilumina um pouco: a luz do céu fica mais fraca
  Post.setTheme(L.theme);
  if (!game.player) game.player = new Player(scene, L.spawn);
  else game.player.respawn(L.spawn);
  game.player.yaw = game.player.targetYaw = Math.PI / 2;
  game.camTarget.copy(game.player.pos);
  for (const [type, x, y, z, yaw] of L.foes || []) Enemies.make(type, scene, new THREE.Vector3(x, y, z), yaw);
  game.boss = null;
  // altares já usados (progresso salvo) ficam apagados
  for (const it of L.builder.interactables) if (it.type === 'shrine' && Save.data.powers[it.power]) markShrineUsed(it);
  game.combo = 0;
  game.bossWon = false;
  Story.reset(i);
  document.getElementById('phase').textContent = L.name;
  updateCamera(1);
}

// herói morreu → tela de morte; "Tentar de novo" recarrega a fase
function showDead() {
  game.state = 'dead';
  Sound.stopMusic();
  const quotes = ['Até os heróis caem. Levante-se, Teron.', 'As Moiras ainda não cortaram o seu fio.', 'O Hades terá de esperar.', 'Observe o vermelho no chão antes do golpe.'];
  document.getElementById('deadQuote').textContent = choose(quotes);
  UI.show('dead', true);
}
function retryLevel() {
  if (game.state !== 'dead') return;
  game.state = 'retrying';
  UI.fade(() => {
    UI.show('dead', false);
    game.deaths++;
    // com ponto de controle aceso, volta para ele; senão recomeça a fase
    if (game.checkpoint) Phase.respawnAtCheckpoint(game);
    else { const d = game.deaths; loadLevel(game.levelKey); game.deaths = d; }
    game.state = 'playing';
    Sound.startMusic(game.level.music || { tempo: 90, root: 50, seed: 3 });
    last = performance.now();
  });
}

// Clima: música mais tensa com inimigos por perto e coração batendo com pouca vida
let heartT = 0;
function updateAtmosphere(dt) {
  const p = game.player;
  let n = 0;
  for (const e of Enemies.list) {
    if (e.dead || e.state === 'patrol' || e.state === 'idle') continue;
    if (Math.abs(e.pos.x - p.pos.x) < 25) n++;
  }
  Sound.setIntensity(n / 4);
  if (!p.dead && p.hp < HERO.maxHp * 0.25) {
    heartT -= dt;
    if (heartT <= 0) { heartT = 0.9; Sound.heartbeat(); }
  }
}

// -------------------------------------------------------------
// INTERAGIR (tecla E): altares de poder e baús
// -------------------------------------------------------------
function markShrineUsed(it) {
  it.used = true;
  it.orb.visible = false; it.halo.visible = false;
  it.light.on = false;
}

// -------------------------------------------------------------
// LUZES DO CENÁRIO: só 2 luzes de verdade, que vão para os braseiros/
// altares mais perto do herói. Cada luz pontual a mais deixa o desenho
// de TODOS os pixels mais caro, então economizar aqui ajuda muito.
// -------------------------------------------------------------
const EnvLights = {
  lights: [],
  init() {
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight('#ff9a3a', 0, 10, 1.6); scene.add(l); this.lights.push(l); }
  },
  update(t) {
    const c = game.camTarget;
    const spots = game.level.builder.lightSpots.filter(s => s.on)
      .map(s => ({ s, d: s.pos.distanceToSquared(c) }))
      .sort((a, b) => a.d - b.d);
    this.lights.forEach((l, i) => {
      const e = spots[i];
      if (!e || e.d > 30 * 30) { l.intensity = 0; return; }
      const s = e.s;
      l.position.copy(s.pos); l.color.copy(s.color); l.distance = s.dist;
      const f = s.flicker ? 1 + Math.sin(t * 13 + s.pos.x) * 0.12 + Math.sin(t * 29 + s.pos.z) * 0.06 : 1;
      l.intensity = s.intensity * f;
    });
  },
};
function updateInteract(game) {
  const p = game.player;
  let near = null, best = 2.4;
  for (const it of game.level.builder.interactables) {
    if (it.used) continue;
    const d = Math.hypot(p.pos.x - it.pos.x, p.pos.z - it.pos.z);
    if (d < best && Math.abs(p.pos.y - it.pos.y) < 1.5) { near = it; best = d; }
  }
  UI.prompt(near ? 'E — ' + near.label : null);
  if (!near || !Input.pressed('interact')) return;

  if (near.type === 'shrine') {
    const P = POWERS[near.power];
    Powers.unlock(near.power);
    markShrineUsed(near);
    const c = new THREE.Vector3(near.pos.x, near.pos.y + 2.3, near.pos.z);
    FX.burst(c, 60, { speed: [2, 8], life: [0.5, 1.1], size: [0.15, 0.35], colors: ['#ffffff', '#ffe58a', near.orb.material.color.getStyle()], glow: true, drag: 2 });
    FX.ring(near.pos, '#ffe58a', 4);
    Sound.portal(); Sound.win();
    p.mana = HERO.maxMana;
    UI.flash('rgba(255,240,200,0.4)');
    Story.shrine(near.power);
    UI.banner('PODER DESBLOQUEADO: ' + P.name.toUpperCase(), 'Tecla ' + P.key + (P.fury ? ' (com a Fúria cheia)' : ' · custa ' + P.cost + ' de mana') + ' — ' + P.desc);
  } else if (near.type === 'chest') {
    near.used = true;
    const c = new THREE.Vector3(near.pos.x, near.pos.y + 0.8, near.pos.z);
    const hp = near.kind === 'hp';
    FX.burst(c, 40, { speed: [1, 5], up: 4, life: [0.6, 1.2], size: [0.15, 0.3], colors: hp ? ['#7aff8a', '#2fd14a', '#ffffff'] : ['#8ad0ff', '#3a8aff', '#ffffff'], glow: true, gravity: -4, drag: 1.5 });
    Sound.chest();
    if (hp) p.heal(40, game);
    else { p.mana = HERO.maxMana; UI.damage(new THREE.Vector3(p.pos.x, p.pos.y + 2.2, p.pos.z), '+MANA', '#8ad0ff', 1); }
    UI.toast(hp ? 'Baú de vida: +40 de vida' : 'Baú de mana: mana cheia');
  } else if (near.type === 'lever') {
    near.used = true;
    Sound.chain(); Sound.block();
    const all = game.level.builder.interactables.filter(o => o.type === 'lever' && o.id === near.id);
    const left = all.filter(o => !o.used).length;
    if (left === 0) {
      game.level.gates[near.id].setOpen(true);
      UI.banner('O PORTÃO SE ABRIU', 'As alavancas destravaram o mecanismo');
    } else UI.toast('Falta ' + left + ' alavanca' + (left > 1 ? 's' : ''));
  }
}

function pauseGame() {
  game.state = 'paused';
  document.getElementById('btnCheckpoint').disabled = !game.checkpoint;
  UI.show('pause', true);
  if (Sound.ctx) Sound.ctx.suspend();
}
function resumeGame() {
  game.state = 'playing';
  UI.show('pause', false);
  if (Sound.ctx) Sound.ctx.resume();
  last = performance.now();
}

// -------------------------------------------------------------
// CÂMERA isométrica inclinada que segue o herói
// -------------------------------------------------------------
const _off = new THREE.Vector3();
function updateCamera(dt) {
  const p = game.player;
  // olha um pouco à frente de onde o herói está virado
  const ahead = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)).multiplyScalar(1.8);
  const tx = p.pos.x + ahead.x, ty = Math.max(p.pos.y, 0) + 1.2, tz = p.pos.z + ahead.z;
  game.camTarget.x = damp(game.camTarget.x, tx, 0.02, dt);
  game.camTarget.y = damp(game.camTarget.y, ty, 0.05, dt);
  game.camTarget.z = damp(game.camTarget.z, tz, 0.02, dt);
  const cp = Math.cos(game.camPitch), d = game.camDist;
  _off.set(Math.sin(game.camYaw) * cp * d, Math.sin(game.camPitch) * d, Math.cos(game.camYaw) * cp * d);
  camera.position.copy(game.camTarget).add(_off);
  // tremor de câmera
  if (game.shakeMag > 0) {
    camera.position.x += rand(-1, 1) * game.shakeMag;
    camera.position.y += rand(-1, 1) * game.shakeMag;
    game.shakeMag = Math.max(0, game.shakeMag - 1.6 * dt);
  }
  camera.lookAt(game.camTarget);
  // colunas entre a câmera e o herói ficam transparentes (para nunca esconder o Teron)
  const occ = game.level.builder.occluders;
  if (occ && occ.length) {
    const ax = camera.position.x, az = camera.position.z, bx = p.pos.x, bz = p.pos.z;
    const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
    for (const o of occ) {
      const t = ((o.x - ax) * dx + (o.z - az) * dz) / len2;
      const hit = t > 0.05 && t < 0.98 && Math.abs((o.x - ax) * dz - (o.z - az) * dx) / Math.sqrt(len2) < 1.3;
      o.op += ((hit ? 0.22 : 1) - o.op) * Math.min(1, dt * 8);
      const tr = o.op < 0.98;
      if (o.mat.transparent !== tr) { o.mat.transparent = tr; o.mat.depthWrite = !tr; o.mat.needsUpdate = true; }
      o.mat.opacity = o.op;
    }
  }
  // o "sol" acompanha o herói para as sombras ficarem nítidas perto dele
  sun.position.copy(game.camTarget).addScaledVector(game.level.sunDir, 40);
  sun.target.position.copy(game.camTarget);
}

// -------------------------------------------------------------
// LAÇO PRINCIPAL
// -------------------------------------------------------------
let last = performance.now();
// contador de FPS (tecla F ou Opções)
const fpsMeter = { on: false, frames: 0, t: 0, el: null };
function setFpsMeter(on) {
  if (!fpsMeter.el) {
    fpsMeter.el = document.createElement('div');
    Object.assign(fpsMeter.el.style, { position: 'fixed', right: '10px', bottom: '8px', font: '12px monospace', color: '#9fff9a', textShadow: '0 1px 2px #000', pointerEvents: 'none', zIndex: 50 });
    document.body.appendChild(fpsMeter.el);
  }
  fpsMeter.on = on;
  fpsMeter.el.style.display = on ? 'block' : 'none';
}
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyF' || e.repeat) return;
  Options.data.fps = !Options.data.fps; Options.save(); setFpsMeter(Options.data.fps);
  document.getElementById('optFps').checked = Options.data.fps;
});
function loop(now) {
  requestAnimationFrame(loop);
  if (fpsMeter.on) {
    fpsMeter.frames++;
    if (now - fpsMeter.t > 500) { fpsMeter.el.textContent = Math.round(fpsMeter.frames * 1000 / (now - fpsMeter.t)) + ' FPS'; fpsMeter.frames = 0; fpsMeter.t = now; }
  }
  let dt = clamp((now - last) / 1000, 0, 1 / 30); // nunca negativo (o relógio do quadro pode vir um pouco "atrasado")
  last = now;

  if (Cine.active) { // PRÓLOGO ANIMADO
    Touch.update();
    Cine.update(dt);
    FX.update(dt);
    Input.endFrame();
    if (Cine.active) { Cine.render(dt); return; }
  }

  if (game.state === 'playing') {
    if (Combat.hitStop > 0) {
      Combat.hitStop -= dt;           // HIT-STOP: tudo congela por um instante
      dt = 0;
    }
    if (game.slowT > 0) { game.slowT -= dt; dt *= 0.3; } // CÂMERA LENTA (chefe derrotado)
    updateAtmosphere(dt);
    game.time += dt;
    const p = game.player;
    if (dt > 0) {
      if (!p.dead) game.levelTime += dt;
      Phase.preUpdate(dt, game);       // plataformas móveis
      p.update(dt, Input, game);
      if (p.pos.y < game.level.killY && !p.dead) p.fell(game);
      Combat.update(dt, game);
      Combat.updateBreakables(game);
      Powers.update(dt, game);
      Enemies.update(dt, game);
      Shots.update(dt, game);
      Phase.update(dt, game);          // pátios, altares, espinhos, chefe, portal…
      updateInteract(game);
      Story.update(dt, game);
    }
    Tele.update(dt);
    if (p.dead && p.deadT > 2.2 && game.state === 'playing') showDead();
    game.comboT -= dt;
    if (game.comboT <= 0) game.combo = 0;
    for (const fn of game.level.builder.updaters) fn(game.time);
    EnvLights.update(game.time);
    FX.update(dt);
    updateCamera(Math.max(dt, 1 / 240));
    UI.update(game, dt);
    Input.endFrame();
  } else {
    if (game.state === 'complete') Story.update(dt, game); // últimas falas depois da vitória
    if (game.state === 'start' || game.state === 'story') { // tela inicial: câmera gira devagar em volta do herói
      game.time += dt;
      game.camYaw = -0.35 + Math.sin(game.time * (game.state === 'story' ? 0.08 : 0.2)) * 0.5;
      for (const fn of game.level.builder.updaters) fn(game.time);
      EnvLights.update(game.time);
      game.player.animate(dt);
      game.player.updateBlades(dt);
      updateCamera(dt);
    }
    Input.endFrame();
  }
  Touch.update();
  if (game.level) {
    const p = game.player;
    Post.rage = p && p.rage > 0 ? 1 : 0;
    Post.lowHp = p && !p.dead && game.state === 'playing' && p.hp < HERO.maxHp * 0.25 ? 1 : 0;
    Post.render(scene, camera, dt);
  }
}

// -------------------------------------------------------------
// COMEÇO
// -------------------------------------------------------------
// primeiro lê os modelos 3D; depois começa o jogo
Models.load().then(() => {
Save.load();
FX.init(scene);
Tele.init(scene);
Shots.init(scene);
Powers.init(scene);
EnvLights.init();
UI.init();
resize();
loadLevel(Math.max(0, Save.data.unlocked - 1));
// rodinha do mouse troca o poder selecionado (só entre os liberados)
addEventListener('wheel', (e) => {
  if (game.state !== 'playing') return;
  for (let k = 1; k <= 4; k++) {
    const i = (Powers.selected + (e.deltaY > 0 ? k : 4 - k)) % 4;
    if (Powers.unlocked(i)) { Powers.selected = i; break; }
  }
});
addEventListener('resize', resize);
Options.load();
Options.bind();
Options.apply();
Menus.init();
Touch.init();
requestAnimationFrame(loop);
});
