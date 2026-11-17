// =============================================================
// monsters.js — MONSTROS montados sobre os modelos animados.
//
// Não existem modelos grátis de ciclope, minotauro, harpia e
// górgona; então usamos os corpos animados do KayKit (Barbarian
// e Rogue) e trocamos a CABEÇA (e pomos asas, cobras, cauda),
// presas aos ossos do modelo. Assim eles andam, atacam e morrem
// com animações de verdade.
//
// Medidas das cabeças: em "unidades do osso da cabeça" do KayKit
// (a cabeça tem raio ≈ 0,5 e centro ≈ 0,45 acima do osso).
// =============================================================

const HeadKit = {
  M(geo, m, x, y, z) { const me = new THREE.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; return me; },

  // cabeça de TOURO (Minotauro e guardiões)
  bull(o) {
    o = o || {};
    const g = new THREE.Group(), M = this.M;
    const fur = smooth(o.fur || '#5a3624', { roughness: 0.95 }), muzzle = smooth(o.muzzle || '#8a5a40'), horn = smooth('#efe2c0', { roughness: 0.4 }), dark = smooth('#140806');
    const skull = M(new THREE.SphereGeometry(0.46, 24, 18), fur, 0, 0.5, 0); skull.scale.set(1, 0.95, 1.05); g.add(skull);
    const snout = M(new THREE.SphereGeometry(0.3, 20, 14), muzzle, 0, 0.3, 0.38); snout.scale.set(1.15, 0.78, 0.9); g.add(snout);
    for (const sx of [-1, 1]) {
      const ns = M(new THREE.SphereGeometry(0.06, 10, 8), dark, sx * 0.11, 0.33, 0.64); ns.scale.set(1, 0.6, 0.5); g.add(ns);
      const ew = M(new THREE.SphereGeometry(0.09, 14, 10), smooth('#f0e8d8', { roughness: 0.3 }), sx * 0.24, 0.58, 0.33); g.add(ew);
      const iris = M(new THREE.SphereGeometry(0.05, 10, 8), glowM(o.eye || '#ff2a1a', 2.5), sx * 0.25, 0.58, 0.41); iris.scale.z = 0.5; g.add(iris);
      const pu = M(new THREE.SphereGeometry(0.022, 8, 6), smooth('#080404'), sx * 0.252, 0.58, 0.44); pu.scale.z = 0.4; g.add(pu);
      const lid = M(new THREE.SphereGeometry(0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), fur, sx * 0.24, 0.6, 0.32); lid.rotation.set(0.35, 0, -sx * 0.3); g.add(lid); // pálpebra brava
      const brow = M(new THREE.BoxGeometry(0.2, 0.06, 0.08), smooth('#2a160c'), sx * 0.24, 0.7, 0.36); brow.rotation.z = sx * 0.45; g.add(brow);
      const ear = M(new THREE.ConeGeometry(0.1, 0.32, 10), fur, sx * 0.5, 0.58, -0.02); ear.rotation.z = -sx * 1.75; ear.scale.z = 0.45; g.add(ear);
      // chifre curvo: arco de toro afinando
      const hornG = new THREE.Group(); hornG.position.set(sx * 0.36, 0.82, 0); hornG.rotation.z = sx * 0.2; g.add(hornG);
      const h1 = M(new THREE.CylinderGeometry(0.06, 0.1, 0.4, 12), horn, sx * 0.16, 0.08, 0); h1.rotation.z = -sx * 1.2; hornG.add(h1);
      const h2 = M(new THREE.ConeGeometry(0.06, 0.42, 12), horn, sx * 0.38, 0.34, 0); h2.rotation.z = -sx * 0.25; hornG.add(h2);
    }
    const ring = M(new THREE.TorusGeometry(0.1, 0.022, 8, 20), smooth('#d4a73a', { metalness: 0.9, roughness: 0.25 }), 0, 0.2, 0.62); g.add(ring);
    const mouth = M(new THREE.BoxGeometry(0.3, 0.02, 0.04), dark, 0, 0.16, 0.6); g.add(mouth);
    const tuft = M(new THREE.SphereGeometry(0.22, 14, 10), smooth('#2a1a10', { roughness: 1 }), 0, 0.9, 0.08); tuft.scale.set(1.3, 0.5, 0.9); g.add(tuft);
    return { g };
  },

  // cabeça de CICLOPE: olho único enorme, sobrancelha grossa, boca de dentes
  cyclops() {
    const g = new THREE.Group(), M = this.M;
    const skin = smooth('#7d9f6a'), dark = smooth('#2a0a06'), tooth = smooth('#efe6c8', { roughness: 0.3 });
    const skull = M(new THREE.SphereGeometry(0.5, 24, 18), skin, 0, 0.48, 0); skull.scale.set(1.05, 1, 1); g.add(skull);
    const jaw = M(new THREE.SphereGeometry(0.4, 20, 14), skin, 0, 0.2, 0.1); jaw.scale.set(1.15, 0.7, 1); g.add(jaw);
    const white = M(new THREE.SphereGeometry(0.22, 20, 16), smooth('#f4efe0', { roughness: 0.25 }), 0, 0.58, 0.34); g.add(white);
    const eye = M(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: '#ff3a1a', emissive: '#ff2a0a', emissiveIntensity: 2.5 }), 0, 0.58, 0.52); eye.scale.z = 0.5; g.add(eye);
    const pupil = M(new THREE.SphereGeometry(0.045, 10, 8), smooth('#080404'), 0, 0.58, 0.57); pupil.scale.z = 0.4; g.add(pupil);
    const lid = M(new THREE.SphereGeometry(0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.38), skin, 0, 0.6, 0.33); lid.rotation.x = 0.25; g.add(lid);
    const brow = M(new THREE.CapsuleGeometry(0.07, 0.42, 4, 12), smooth('#2e3a22'), 0, 0.84, 0.36); brow.rotation.z = Math.PI / 2; brow.rotation.x = -0.35; g.add(brow);
    const nose = M(new THREE.SphereGeometry(0.11, 14, 10), skin, 0, 0.36, 0.5); nose.scale.set(1.3, 0.8, 1); g.add(nose);
    for (const sx of [-1, 1]) {
      g.add(M(new THREE.SphereGeometry(0.03, 8, 6), dark, sx * 0.05, 0.32, 0.6));
      const ear = M(new THREE.SphereGeometry(0.15, 14, 10), skin, sx * 0.52, 0.5, 0); ear.scale.set(0.35, 1, 0.7); ear.rotation.z = sx * 0.4; g.add(ear);
      const tusk = M(new THREE.ConeGeometry(0.045, 0.2, 10), tooth, sx * 0.17, 0.2, 0.46); g.add(tusk);
    }
    const mouth = M(new THREE.BoxGeometry(0.48, 0.1, 0.08), dark, 0, 0.14, 0.44); g.add(mouth);
    for (let i = 0; i < 8; i++) { const t = M(new THREE.ConeGeometry(0.025, 0.08, 6), tooth, -0.19 + i * 0.054, 0.17, 0.48); t.rotation.x = Math.PI; g.add(t); }
    const horn = M(new THREE.ConeGeometry(0.08, 0.36, 12), smooth('#c9b88a'), 0, 1.05, 0.05); g.add(horn);
    for (let i = 0; i < 7; i++) { const tf = M(new THREE.ConeGeometry(0.06, 0.2, 6), smooth('#2a2418'), Math.cos(i) * 0.2, 0.92, -0.15 + Math.sin(i) * 0.12); tf.rotation.set(rand(-0.5, 0.5), 0, rand(-0.5, 0.5)); g.add(tf); }
    return { g, eye };
  },

  // cabeça humana (harpia, górgona) com o rosto do models.js
  face(o) {
    const g = new THREE.Group();
    const f = Face.human(g, Object.assign({ r: 0.42, y: 0.42 }, o));
    return { g, f };
  },

  // asas de penas (harpia): dois "pivôs" que batem
  wings(color) {
    const m = smooth(color, { side: THREE.DoubleSide, roughness: 0.9 });
    const wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * 0.18, 0.35, -0.25);
      const shp = new THREE.Shape();
      shp.moveTo(0, 0); shp.lineTo(1.4, 0.45); shp.lineTo(1.25, 0.15); shp.lineTo(1.5, 0.0); shp.lineTo(1.2, -0.15); shp.lineTo(1.35, -0.35); shp.lineTo(1.0, -0.38); shp.lineTo(1.05, -0.6); shp.lineTo(0.6, -0.45); shp.lineTo(0.15, -0.3);
      const w = new THREE.Mesh(new THREE.ShapeGeometry(shp), m); w.scale.x = sx; w.rotation.y = -sx * 0.3; w.castShadow = true;
      pivot.add(w); wings.push({ pivot, sx });
    }
    return wings;
  },

  // cabelo de cobras (górgona)
  snakes() {
    const g = new THREE.Group(), list = [];
    const scale = smooth('#3f6b3a'), belly = smooth('#9ac46a'), eye = glowM('#ffd21a', 2);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const sn = new THREE.Group(); sn.position.set(Math.sin(a) * 0.36, 0.72, Math.cos(a) * 0.3 - 0.05); sn.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.5, 8), i % 2 ? scale : belly); body.position.y = 0.25; sn.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), scale); head.scale.set(1, 0.7, 1.4); head.position.set(0, 0.52, 0.03); sn.add(head);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), eye); e.position.set(sx * 0.04, 0.55, 0.08); sn.add(e); }
      g.add(sn); list.push(sn);
    }
    return { g, list };
  },
};

// prende um objeto num osso, escondendo as malhas antigas da cabeça
function swapHead(rig, hideNames, headObj) {
  rig.obj.traverse(o => { if (o.isMesh && hideNames.includes(o.name)) o.visible = false; });
  const hb = rig.bone('head');
  headObj.traverse(o => { if (o.isMesh) { o.userData.rigMesh = true; o.castShadow = true; } });
  hb.add(headObj);
}
// leva um objeto antigo (pedra, orbe) para a mão do modelo
function toHand(rig, obj, side) { if (!obj) return; const b = rig.bone(side === 'l' ? 'handslot.l' : 'handslot.r'); obj.position.set(0, 0, 0); obj.traverse(o => { o.userData.rigMesh = true; }); b.add(obj); }

const bullPick = (e, r) => {
  switch (e.state) {
    case 'axeWind': case 'axe': return once('2H_Melee_Attack_Chop', 0.9, r);
    case 'slamWind': case 'slam': return once('2H_Melee_Attack_Spin', 1.2, r);
    case 'chargeWind': return ['2H_Melee_Idle'];
    case 'charge': return ['Running_A', { speed: 1.7 }];
    case 'dazed': return ['Hit_B', { loop: true, speed: 0.5 }];
    case 'intro': return ['Cheer'];
    case 'recover': return ['2H_Melee_Idle'];
    default: return move(e, 'Walking_A', 'Running_A', '2H_Melee_Idle');
  }
};

Object.assign(RIG_SPECS, {
  // ---------- ASTÉRION, O MINOTAURO ----------
  Minotaur: (e) => ({
    model: 'Barbarian', height: 3.4,
    weapons: ['2H_Axe'], hide: ['Barbarian_Hat', 'Mug'],
    tint: '#b07a58',
    meshes: { Barbarian_Cape: { color: '#7a1f1a' } },
    decorate(e, rig) {
      const h = HeadKit.bull({ fur: '#4a2e1e', muzzle: '#7a4e36' });
      swapHead(rig, ['Barbarian_Head'], h.g);
    },
    pick: bullPick, death: 'Death_A',
  }),
  // ---------- BRONTES, O CICLOPE ----------
  Cyclops: (e) => ({
    model: 'Barbarian', height: 5.2,
    weapons: ['2H_Axe'], hide: ['Barbarian_Hat', 'Mug'],
    tint: '#9ac08a',
    meshes: { Barbarian_Cape: { color: '#6b4a2a' } },
    decorate(e, rig) {
      const h = HeadKit.cyclops();
      swapHead(rig, ['Barbarian_Head'], h.g);
      e.eye = h.eye;          // o código antigo acende este olho nos ataques
      toHand(rig, e.rock, 'l'); // a pedra que ele arremessa
      e.rock.scale.setScalar(2.2);
    },
    pick(e, r) {
      switch (e.state) {
        case 'smashWind': case 'smash': return once('2H_Melee_Attack_Chop', 1.4, r);
        case 'stompWind': return once('Unarmed_Melee_Attack_Kick', 0.8, r);
        case 'rockWind': return once('Throw', 1.0, r);
        case 'intro': return ['Cheer'];
        case 'recover': return ['2H_Melee_Idle'];
        default: return move(e, 'Walking_A', 'Running_A', '2H_Melee_Idle');
      }
    },
    death: 'Death_A',
  }),
  // ---------- HARPIA ----------
  Harpy: (e) => ({
    model: 'Rogue_Hooded', height: 1.5,
    tint: '#b89ac0',
    meshes: { Rogue_Cape: { color: '#3a2040' } },
    decorate(e, rig) {
      const h = HeadKit.face({ skin: '#d9c2a8', glow: true, eye: '#ffd21a', brow: '#1e1420', angry: 1, lip: '#6a2a3a', fangs: true, mouthOpen: 0.5, socket: '#6a4a5a', hair: '#1e1420', longHair: true });
      swapHead(rig, ['Rogue_Head_Hooded'], h.g);
      // asas nas costas (batem pelo código antigo da harpia)
      const chest = rig.bone('chest') || rig.bone('spine');
      const wings = HeadKit.wings('#4a2f4f');
      for (const w of wings) { chest.add(w.pivot); w.pivot.traverse(o => { o.userData.rigMesh = true; }); }
      e.wings = wings;
      rig.obj.position.y = -0.6; // corpo pendurado abaixo das asas
    },
    pick(e, r) {
      if (e.state === 'dive') return ['Dodge_Forward', { loop: true, speed: 0.7 }];
      if (e.state === 'diveWind') return ['Spellcast_Raise', { loop: false }];
      return ['Jump_Idle'];
    },
    death: 'Death_B',
  }),
  // ---------- GÓRGONA ----------
  Gorgon: (e) => ({
    model: 'Rogue_Hooded', height: 1.95,
    tint: '#9ad08a',
    hide: ['Rogue_LegLeft', 'Rogue_LegRight'],
    meshes: { Rogue_Cape: { color: '#2a4a24' } },
    decorate(e, rig) {
      const h = HeadKit.face({ skin: '#7da06a', glow: true, eye: '#b8ff4a', brow: '#2a4a20', angry: 0.9, lip: '#2a4a2a', fangs: true, mouthOpen: 0.35, socket: '#3a5a2a', ears: false });
      const sn = HeadKit.snakes(); h.g.add(sn.g);
      swapHead(rig, ['Rogue_Head_Hooded'], h.g);
      e.snakes = sn.list;
      // a cauda de serpente (bolas do modelo antigo) continua visível
      for (const s of e.tail) s.visible = true;
      rig.obj.position.y = -0.35;
      // orbe verde na mão
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glowM('#7aff6a', 2)); orb.position.set(0, 0, 0);
      toHand(rig, orb, 'r');
    },
    pick(e, r) {
      if (e.state === 'castWind') return ['Spellcasting'];
      if (e.state === 'recover') return once('Spellcast_Shoot', 0.6, r);
      return move(e, 'Walking_B', 'Running_B', 'Idle');
    },
    death: 'Death_A',
  }),
});

// guardião-minotauro (variante do guerreiro pesado): corpo de cavaleiro + cabeça de touro
const _heavySpec = RIG_SPECS.HeavyWarrior;
RIG_SPECS.HeavyWarrior = (e) => {
  if (e.cfg.variant !== 'minoguard') return _heavySpec(e);
  const s = _heavySpec(Object.assign(Object.create(e), { cfg: Object.assign({}, e.cfg, { variant: 'normal' }) }));
  s.tint = '#9a6a4a';
  s.hide = ['Knight_Helmet', 'Knight_Head'];
  s.decorate = (e, rig) => { const h = HeadKit.bull({ fur: '#5a3624', muzzle: '#8a5a40', eye: '#ff3a1a' }); swapHead(rig, ['Knight_Head', 'Knight_Helmet'], h.g); };
  return s;
};
