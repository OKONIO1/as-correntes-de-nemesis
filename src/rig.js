// =============================================================
// rig.js — PERSONAGENS 3D DE VERDADE (modelos animados).
//
// Os modelos vêm dos pacotes gratuitos KayKit (Kay Lousberg,
// licença CC0), guardados em assets/*.js como texto (base64),
// para o jogo abrir até sem servidor.
//
//   Models.load()        → lê todos os modelos (uma vez, no começo)
//   new Rig('Knight', {...}) → uma cópia animada do modelo
//   rig.play('Running_A')    → troca de animação com transição suave
//   rig.bone('handslot.r')   → osso da mão (para prender armas)
// =============================================================

const Models = {
  ready: false,
  src: {},   // nome → { scene, clips: {nome: AnimationClip}, height }
  WEAPONS: {
    Knight: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword'],
    Barbarian: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug'],
    Rogue_Hooded: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable'],
    Skeleton_Warrior: [], Skeleton_Rogue: [],
  },

  load() {
    const data = window.MODEL_B64 || {};
    const names = Object.keys(data);
    if (!THREE.GLTFLoader || !names.length) { console.warn('Modelos 3D indisponíveis: usando os bonecos antigos'); return Promise.resolve(); }
    const loader = new THREE.GLTFLoader();
    return Promise.all(names.map(name => new Promise((res) => {
      const bin = atob(data[name]), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      loader.parse(buf.buffer, '', (gltf) => {
        const clips = {};
        for (const c of gltf.animations) clips[c.name] = c;
        gltf.scene.updateMatrixWorld(true);
        // altura do modelo (sem as armas)
        const box = new THREE.Box3();
        gltf.scene.traverse(o => { if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox); } });
        this.src[name] = { scene: gltf.scene, clips, height: Math.max(0.5, box.max.y - Math.min(0, box.min.y)) };
        res();
      }, (err) => { console.warn('Falha ao ler o modelo', name, err); res(); });
    }))).then(() => { this.ready = Object.keys(this.src).length > 0; delete window.MODEL_B64; });
  },
  has(name) { return this.ready && !!this.src[name]; },
};

class Rig {
  /*
    opts = {
      height: altura em metros,
      weapons: ['1H_Sword', ['Knight', 'Round_Shield']]  (do próprio modelo ou de outro),
      hide: ['Barbarian_Hat'], tint: '#hex' (multiplica as cores),
      solid: { color, metalness, roughness, emissive, emissiveIntensity }  (pinta tudo de uma cor: estátua),
      meshes: { 'Barbarian_Cape': { color: '#3a5ad8' } }  (ajuste por peça),
      ghost: { color, opacity }  (translúcido)
    }
  */
  constructor(name, opts) {
    opts = opts || {};
    const S = Models.src[name];
    this.name = name;
    this.obj = THREE.SkeletonUtils.clone(S.scene);
    this.inner = this.obj;
    const k = (opts.height || 1.8) / S.height;
    this.obj.scale.setScalar(k);
    this.clips = S.clips;
    this.mixer = new THREE.AnimationMixer(this.obj);
    this.actions = {};
    this.cur = null;
    this.bones = {};
    const myWeapons = Models.WEAPONS[name] || [];
    const keep = new Set((opts.weapons || []).filter(w => typeof w === 'string'));
    const hide = new Set(opts.hide || []);
    this.mats = [];
    this.obj.traverse(o => {
      if (o.isBone) this.bones[o.name] = o;
      if (!o.isMesh) return;
      if ((myWeapons.includes(o.name) && !keep.has(o.name)) || hide.has(o.name)) { o.visible = false; return; }
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; o.userData.rigMesh = true;
      o.material = this.recolor(o.material.clone(), opts, o.name);
      this.mats.push(o.material);
    });
    // armas emprestadas de outro modelo (mesmo esqueleto padrão KayKit)
    for (const w of opts.weapons || []) if (Array.isArray(w)) this.borrow(w[0], w[1], opts);
  }
  recolor(m, opts, meshName) {
    if (opts.solid) {
      m.map = null;
      Object.assign(m, { metalness: 0, roughness: 0.6 });
      m.color.set(opts.solid.color);
      if (opts.solid.metalness !== undefined) m.metalness = opts.solid.metalness;
      if (opts.solid.roughness !== undefined) m.roughness = opts.solid.roughness;
      if (opts.solid.emissive) { m.emissive.set(opts.solid.emissive); m.emissiveIntensity = opts.solid.emissiveIntensity || 0.3; }
    } else if (opts.tint) m.color.set(opts.tint);
    const per = opts.meshes && opts.meshes[meshName];
    if (per) {
      if (per.color) m.color.set(per.color);
      if (per.map === null) m.map = null;
      if (per.emissive) { m.emissive.set(per.emissive); m.emissiveIntensity = per.emissiveIntensity || 1; }
      if (per.metalness !== undefined) m.metalness = per.metalness;
      if (per.roughness !== undefined) m.roughness = per.roughness;
    }
    if (opts.ghost) { m.transparent = true; m.opacity = opts.ghost.opacity || 0.6; m.depthWrite = false; m.color.set(opts.ghost.color); m.emissive.set(opts.ghost.color); m.emissiveIntensity = 0.9; m.map = null; }
    m.needsUpdate = true;
    return m;
  }
  borrow(model, meshName, opts) {
    const S = Models.src[model]; if (!S) return null;
    let src = null; S.scene.traverse(o => { if (o.name === meshName) src = o; });
    if (!src || !src.parent) return null;
    const b = this.bones[src.parent.name]; if (!b) return null;
    const c = src.clone(true);
    c.visible = true;
    c.traverse(o => { if (o.isMesh) { o.material = this.recolor(o.material.clone(), opts, meshName); o.castShadow = true; o.frustumCulled = false; o.userData.rigMesh = true; this.mats.push(o.material); } });
    b.add(c);
    return c;
  }
  node(n) { let r = null; this.obj.traverse(o => { if (o.name === n) r = o; }); return r; }
  weapon(meshName) { let r = null; this.obj.traverse(o => { if (o.name === meshName && o.visible) r = o; }); return r; }
  bone(n) { return this.bones[n] || this.bones[n.replace(/[.\s]/g, '')] || this.bones[n.replace(/\./g, '_')]; } // o leitor tira os pontos dos nomes

  // troca de animação: o = { loop: true/false, fade, speed, restart, at (tempo fixo) }
  play(name, o) {
    o = o || {};
    if (!this.clips[name]) name = 'Idle';
    let a = this.actions[name];
    if (!a) { a = this.actions[name] = this.mixer.clipAction(this.clips[name]); }
    a.timeScale = o.speed || 1;
    if (this.cur === a && !o.restart) return a;
    a.reset();
    a.setLoop(o.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = o.loop === false;
    a.enabled = true;
    a.play();
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, o.fade === undefined ? 0.15 : o.fade, false);
    this.cur = a;
    return a;
  }
  dur(name) { return this.clips[name] ? this.clips[name].duration : 1; }
  // pose parada num instante (para cinemáticas): t = 0..1
  scrub(name, t) {
    const a = this.play(name, { loop: false, fade: 0.1 });
    a.paused = true; a.time = t * this.dur(name);
  }
  update(dt) { this.mixer.update(dt); }
}

// =============================================================
// Como cada inimigo usa um modelo: qual modelo, tamanho, cores,
// armas e QUAL ANIMAÇÃO tocar em cada estado da IA.
// =============================================================
const move = (e, walk, run, idle) => { const v = e.walk.length(); return v > 2.8 ? [run, { speed: Math.min(1.6, v / 4) }] : v > 0.3 ? [walk, { speed: Math.max(0.7, v / 2) }] : [idle]; };
const once = (name, dur, rig) => [name, { loop: false, speed: rig ? rig.dur(name) / dur : 1 }];

const RIG_SPECS = {
  SkeletonSword: (e) => ({
    model: 'Skeleton_Warrior', height: 1.85,
    weapons: [['Knight', '1H_Sword'], ['Knight', 'Round_Shield']],
    tint: e.cfg.elite ? '#ffb0a0' : null,
    pick(e, r) {
      switch (e.state) {
        case 'swingWind': case 'swing': return once('1H_Melee_Attack_Chop', 0.85, r);
        case 'bashWind': case 'bash': return once('Block_Attack', 0.7, r);
        case 'recover': return ['Idle_Combat'];
        case 'chase': return e.walk.length() > 0.3 ? ['Running_C', { speed: 1.1 }] : ['Blocking'];
        default: return move(e, 'Walking_D_Skeletons', 'Running_C', 'Idle');
      }
    },
    death: 'Death_C_Skeletons',
  }),
  SkeletonArcher: (e) => ({
    model: 'Skeleton_Rogue', height: 1.8,
    weapons: [['Rogue_Hooded', '2H_Crossbow']],
    pick(e, r) {
      if (e.state === 'aimWind') return ['2H_Ranged_Aiming'];
      if (e.state === 'recover') return once('2H_Ranged_Shoot', 0.6, r);
      return move(e, 'Walking_D_Skeletons', 'Running_C', 'Idle_Combat');
    },
    death: 'Death_C_Skeletons',
  }),
  HeavyWarrior: (e) => e.cfg.variant === 'minoguard' ? null : ({
    model: 'Knight', height: 2.6,
    weapons: [['Barbarian', '2H_Axe']],
    hide: [],
    tint: e.cfg.variant === 'automaton' ? null : '#c87a6a',
    solid: e.cfg.variant === 'automaton' ? { color: '#c08a3a', metalness: 0.85, roughness: 0.32, emissive: '#ff6a0a', emissiveIntensity: 0.08 } : null,
    pick(e, r) {
      switch (e.state) {
        case 'slamWind': case 'slam': return once('2H_Melee_Attack_Chop', 1.0, r);
        case 'sweepWind': case 'sweep': return once('2H_Melee_Attack_Slice', 0.9, r);
        case 'recover': return ['2H_Melee_Idle'];
        default: return move(e, 'Walking_A', 'Running_A', '2H_Melee_Idle');
      }
    },
    death: 'Death_A',
  }),
  Ares: (e) => ({
    model: 'Knight', height: 3.3,
    weapons: ['1H_Sword', 'Spike_Shield'],
    tint: '#8a4a48',
    meshes: { Knight_Cape: { color: '#a01010', map: null }, Knight_Helmet: { color: '#2a2a30', map: null, metalness: 0.9, roughness: 0.3 }, '1H_Sword': { color: '#ff9a3a', emissive: '#ff4a0a', emissiveIntensity: 1.6 } },
    pick(e, r) {
      switch (e.state) {
        case 'slashWind': case 'slash': return once('1H_Melee_Attack_Slice_Diagonal', 0.9, r);
        case 'fireWind': case 'meteorWind': case 'transform': return ['Spellcast_Raise', { loop: false }];
        case 'giantWind': case 'giant': return once('2H_Melee_Attack_Chop', 1.4, r);
        case 'dash': case 'dashWind': return ['Running_A', { speed: 1.4 }];
        case 'intro': return ['Taunt'];
        default: return move(e, 'Walking_A', 'Running_A', 'Idle');
      }
    },
    death: 'Death_A',
  }),
  Sentinel: (e) => ({
    model: 'Knight', height: 4.4,
    weapons: ['2H_Sword', 'Badge_Shield'],
    solid: { color: '#e6dfd0', roughness: 0.55, emissive: '#ff3a1a', emissiveIntensity: 0.03 },
    pick(e, r) {
      switch (e.state) {
        case 'spearWind': return once('1H_Melee_Attack_Stab', 1.2, r);
        case 'shieldWind': return once('Block_Attack', 0.9, r);
        case 'javelinWind': return once('Throw', 0.9, r);
        case 'strike': return ['Idle_Combat'];
        case 'intro': return ['Idle'];
        default: return move(e, 'Walking_A', 'Running_A', 'Idle');
      }
    },
    death: 'Death_B',
  }),
  Talos: (e) => ({
    model: 'Barbarian', height: 5.4,
    weapons: ['2H_Axe'],
    hide: ['Mug'],
    solid: { color: '#c08a3a', metalness: 0.85, roughness: 0.32, emissive: '#ff5a0a', emissiveIntensity: 0.06 },
    pick(e, r) {
      switch (e.state) {
        case 'hammerWind': return once('2H_Melee_Attack_Chop', 1.3, r);
        case 'breathWind': return ['Spellcasting'];
        case 'emberWind': case 'intro': return ['Spellcast_Raise', { loop: false }];
        case 'strike': return ['2H_Melee_Idle'];
        default: return move(e, 'Walking_A', 'Running_A', '2H_Melee_Idle');
      }
    },
    death: 'Death_A',
  }),
};

// ---------- integração com os inimigos (classe Foe) ----------
// chamado no construtor de Foe, depois do build(): troca o boneco antigo pelo modelo
function attachRigToFoe(e) {
  const make = RIG_SPECS[e.constructor.name] || RIG_SPECS[Object.getPrototypeOf(e.constructor).name];
  if (!make) return;
  const spec = make(e);
  if (!spec || !Models.has(spec.model)) return;
  for (const c of e.root.children) c.visible = false; // esconde o boneco feito de formas
  // mantém visíveis peças "de efeito" (luzes, espada gigante, pedestal)
  for (const keep of [e.giant, e.base, e.light]) if (keep) keep.visible = keep === e.giant ? false : true;
  const rig = new Rig(spec.model, spec);
  e.root.add(rig.obj);
  e.rig = rig; e.rigSpec = spec;
  if (spec.decorate) spec.decorate(e, rig); // cabeças, asas, cobras… (monsters.js)
  // compatibilidade com o código antigo
  const sw = rig.weapon('1H_Sword');
  if (sw && e.constructor.name === 'Ares') {
    e.sword = sw; sw.traverse(o => { if (o.isMesh) e.bladeMat = o.material; });
  }
  rig.play('Idle');
}
function animateFoeRig(e, dt) {
  const r = e.rig, spec = e.rigSpec;
  if (e.forceClip) { const f = e.forceClip; if (f.at !== undefined) r.scrub(f.name, f.at); else r.play(f.name, f.o); r.update(dt); return; }
  if (e.dead) { r.play(spec.death || 'Death_A', { loop: false, fade: 0.1 }); }
  else if (e.petrify > 0) { r.mixer.timeScale = 0; return; }
  else if (e.stun > 0) r.play('Hit_B', { loop: false });
  else { const [n, o] = spec.pick(e, r); r.play(n, o); }
  r.mixer.timeScale = 1;
  r.update(dt);
}
