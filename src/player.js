// =============================================================
// player.js — TERON DE ARGOS em 3D
//
// O corpo é uma HIERARQUIA de grupos (como um boneco articulado):
//   raiz → quadril → tronco → cabeça / ombros → cotovelos → mãos
//                  → coxas → joelhos → pés
// Girar um grupo gira tudo o que está "pendurado" nele. As animações
// (correr, pular, golpear) são só rotações desses grupos a cada quadro.
//
// As GARRAS DE NÊMESIS ficam soltas na cena: na mão quando paradas,
// e voando presas às correntes durante os golpes.
// =============================================================

const HERO = {
  speed: 7.5, accel: 60, airAccel: 28,
  jump: 11.5, doubleJump: 10, gravity: 32, maxFall: 30,
  dashSpeed: 22, dashTime: 0.18, dashCd: 0.45,
  coyote: 0.1, buffer: 0.13,
  hw: 0.38, h: 1.85,           // meia-largura e altura da caixa de colisão
  maxHp: 100, maxMana: 100, maxFury: 100,
};

// Combo de 4 golpes. kind: h = horizontal | v = por cima | spin = giro
// a0/a1 = ângulo inicial/final (0 = frente, + = esquerda do herói)
const COMBO4 = [
  { dur: 0.36, hitFrom: 0.15, hitTo: 0.6, blades: ['R'], kind: 'h', a0: -1.7, a1: 1.3, reach: 3.2, dmg: 10 },
  { dur: 0.36, hitFrom: 0.15, hitTo: 0.6, blades: ['L'], kind: 'h', a0: 1.7, a1: -1.3, reach: 3.2, dmg: 11 },
  { dur: 0.5, hitFrom: 0.3, hitTo: 0.62, blades: ['L', 'R'], kind: 'v', p0: 2.5, p1: -0.55, reach: 3.5, dmg: 16 },
  { dur: 0.62, hitFrom: 0.12, hitTo: 0.85, blades: ['L', 'R'], kind: 'spin', a0: -1.6, turns: 1.25, reach: 3.7, dmg: 22 },
];
const HEAVY = { dur: 0.75, hitFrom: 0.15, hitTo: 0.9, blades: ['L', 'R'], kind: 'spin', a0: 0, turns: 1.6, reach: 4.4, dmg: 30, heavy: true };

const V3 = THREE.Vector3;
const _v = new V3(), _v2 = new V3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const UP = new V3(0, 1, 0), AXIS_Y = new V3(0, 1, 0);

class Player {
  constructor(scene, spawn) {
    this.scene = scene;
    this.pos = spawn.clone();
    this.vel = new V3();
    this.yaw = Math.PI / 2;  // começa olhando para +X (o caminho)
    this.onGround = false; this.ground = null; this.wasOnGround = false;
    this.coyoteT = 0; this.bufferT = 0; this.canDouble = false;
    this.dashT = 0; this.dashCd = 0; this.dashDir = new V3(); this.ghostT = 0; this.airDash = false;
    this.invuln = 0;
    this.hp = HERO.maxHp; this.hpGhost = HERO.maxHp; this.mana = 60; this.fury = 0;
    this.attack = null; this.queued = false; this.comboStep = -1; this.comboT = 0; this.heavyCd = 0;
    this.attackId = 0;
    this.rage = 0;            // tempo restante da Ira de Nêmesis
    this.dead = false; this.deadT = 0; this.slowT = 0;
    this.castT = 0;           // pose de "soltando poder"
    this.hitSpheres = [];
    this.lastSafe = spawn.clone();
    this.runPhase = 0; this.lastStepSign = 1;
    this.ghosts = [];
    this.buildModel();
    this.buildBlades();
  }

  // ---------------------------------------------------------
  // MODELO 3D (só primitivas: cilindros, esferas, caixas)
  // ---------------------------------------------------------
  buildModel() {
    const skin = smooth('#c9925e');                      // pele lisa
    const bronze = smooth('#b8802f', { metalness: 0.75, roughness: 0.42 });
    const darkBronze = mat('#7a5220', { metalness: 0.7, roughness: 0.45 });
    const leather = mat('#5a3a20', { roughness: 0.9 });
    const blue = mat('#1f3d8a', { roughness: 0.8, side: THREE.DoubleSide });
    const crest = mat('#2a4fb0', { roughness: 0.9 });
    const dark = mat('#1a1410');

    // cilindro com a origem no topo (para girar pela "junta")
    const limbGeo = (rTop, rBot, len) => { const g = new THREE.CylinderGeometry(rTop, rBot, len, 14); g.translate(0, -len / 2, 0); return g; };
    const M = (geo, material, x, y, z) => { const m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; };

    const root = new THREE.Group();
    const body = new THREE.Group();           // sobe/desce (balanço da corrida)
    root.add(body);
    const hips = new THREE.Group(); hips.position.y = 0.98; body.add(hips);

    // quadril, túnica vermelha (quíton) e saiote de couro (pteruges)
    hips.add(M(new THREE.BoxGeometry(0.42, 0.2, 0.28), leather, 0, 0.02, 0));
    const tunic = pleatedSkirt(0.21, 0.29, 0.44, '#9a1f1a', 12); tunic.position.y = 0.06; tunic.scale.z = 0.8; hips.add(tunic);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const strip = M(new THREE.BoxGeometry(0.1, 0.28, 0.025), i % 2 ? leather : darkBronze, Math.sin(a) * 0.22, -0.16, Math.cos(a) * 0.15);
      strip.rotation.y = a;
      hips.add(strip);
    }

    // tronco (gira para torcer o corpo)
    const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
    const chestGeo = new THREE.CylinderGeometry(0.27, 0.21, 0.58, 20); chestGeo.translate(0, 0.29, 0);
    const chest = M(chestGeo, bronze); chest.scale.z = 0.72; torso.add(chest);
    // couraça "musculosa": peitorais e abdômen esculpidos no bronze
    for (const sx of [-1, 1]) { const pec = M(new THREE.SphereGeometry(0.1, 14, 10), bronze, sx * 0.085, 0.42, 0.165); pec.scale.set(1.25, 0.55, 0.14); torso.add(pec); }
    for (let r = 0; r < 3; r++) for (const sx of [-1, 1]) { const ab = M(new THREE.SphereGeometry(0.04, 10, 8), bronze, sx * 0.045, 0.27 - r * 0.075, 0.158 - r * 0.006); ab.scale.set(1.1, 0.75, 0.22); torso.add(ab); }
    const collar = M(new THREE.TorusGeometry(0.17, 0.016, 6, 24), darkBronze, 0, 0.57, 0); collar.rotation.x = Math.PI / 2; collar.scale.set(1, 0.72, 1); torso.add(collar); // gola
    // cinto
    torso.add(M(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 16), leather, 0, 0.02, 0));
    torso.add(M(new THREE.BoxGeometry(0.07, 0.06, 0.03), smooth('#d4a73a', { metalness: 0.9, roughness: 0.25 }), 0, 0.02, 0.165)); // fivela

    // cabeça + elmo coríntio
    const head = new THREE.Group(); head.position.y = 0.66; head.scale.setScalar(1.22); torso.add(head);
    head.add(M(new THREE.CylinderGeometry(0.06, 0.075, 0.12, 12), skin, 0, -0.03, 0)); // pescoço
    // ROSTO: olhos, sobrancelhas, nariz, boca e barba
    this.face = Face.human(head, { r: 0.115, y: 0.1, skinMat: skin, eye: '#3a6a8a', brow: '#24160c', beard: '#3a2414', lip: '#8a4a3a', angry: 0.45, socket: '#b07a58' });
    // elmo aberto: cúpula, aba, protetores de bochecha, nasal e protetor de nuca
    const dome = M(new THREE.SphereGeometry(0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), bronze, 0, 0.145, -0.008); dome.scale.set(1.0, 1.08, 1.08); head.add(dome);
    const brim = M(new THREE.TorusGeometry(0.128, 0.012, 6, 28), darkBronze, 0, 0.148, -0.008); brim.rotation.x = Math.PI / 2; brim.scale.set(1, 1.08, 1); head.add(brim);
    for (const sx of [-1, 1]) { const ch = M(new THREE.BoxGeometry(0.025, 0.12, 0.1), bronze, sx * 0.112, 0.08, 0.035); ch.rotation.z = sx * 0.12; head.add(ch); }
    head.add(M(new THREE.BoxGeometry(0.018, 0.07, 0.014), bronze, 0, 0.14, 0.135));
    const nape = M(new THREE.BoxGeometry(0.2, 0.07, 0.025), bronze, 0, 0.08, -0.125); nape.rotation.x = 0.35; head.add(nape);
    // penacho (crina de cavalo) sobre um suporte
    head.add(M(new THREE.BoxGeometry(0.03, 0.05, 0.16), darkBronze, 0, 0.29, -0.01));
    const crestGeo = new THREE.TorusGeometry(0.17, 0.045, 8, 20, Math.PI);
    const crestM = M(crestGeo, crest, 0, 0.3, -0.02); crestM.rotation.y = Math.PI / 2; crestM.scale.set(1, 0.85, 0.6); head.add(crestM);

    // ombreiras
    for (const sx of [-1, 1]) {
      const pad = M(new THREE.SphereGeometry(0.13, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, sx * 0.3, 0.52, 0);
      pad.scale.set(1.2, 0.8, 1); torso.add(pad);
    }

    // braços: ombro → cotovelo → mão (direito em -X, esquerdo em +X)
    const makeArm = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.31, 0.5, 0); torso.add(sh);
      sh.add(M(limbGeo(0.075, 0.065, 0.3), skin));
      sh.add(M(limbGeo(0.09, 0.085, 0.12), smooth('#9a1f1a', { roughness: 0.85 }), 0, 0.02, 0)); // manga
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      el.add(M(limbGeo(0.07, 0.06, 0.27), darkBronze)); // bracelete de bronze
      const hand = new THREE.Group(); hand.position.y = -0.29; el.add(hand);
      hand.add(M(new THREE.SphereGeometry(0.065, 6, 5), skin));
      return { sh, el, hand };
    };
    const armR = makeArm(-1), armL = makeArm(1);

    // pernas: quadril → joelho → pé (com caneleira de bronze)
    const makeLeg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.12, -0.04, 0); hips.add(hip);
      hip.add(M(limbGeo(0.095, 0.075, 0.46), skin));
      const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
      knee.add(M(limbGeo(0.075, 0.06, 0.44), bronze));
      const foot = M(new THREE.BoxGeometry(0.11, 0.05, 0.24), leather, 0, -0.48, 0.05); knee.add(foot);
      const toes = M(new THREE.SphereGeometry(0.06, 10, 8), skin, 0, -0.46, 0.12); toes.scale.set(0.95, 0.5, 1.1); knee.add(toes);
      for (const yy of [-0.43, -0.38]) { const st = M(new THREE.TorusGeometry(0.062, 0.01, 4, 16), leather, 0, yy, 0); st.rotation.x = Math.PI / 2; knee.add(st); }
      return { hip, knee };
    };
    const legR = makeLeg(-1), legL = makeLeg(1);

    // capa azul (dobra com o movimento)
    const cape = new THREE.Group(); cape.position.set(0, 0.56, -0.17); torso.add(cape);
    const capeGeo = new THREE.PlaneGeometry(0.55, 1.05, 2, 4); capeGeo.translate(0, -0.52, 0);
    const capeM = M(capeGeo, blue); cape.add(capeM);

    root.traverse(o => { if (o.isMesh && o.material.flatShading) { o.material = o.material.clone(); o.material.flatShading = false; } }); // sombreamento liso
    this.root = root;
    this.j = { body, hips, torso, head, armR, armL, legR, legL, cape };
    // MODELO 3D ANIMADO (KayKit "Barbarian", com capa azul e sem o chapéu de chifres)
    if (Models.has('Barbarian')) {
      const rig = new Rig('Barbarian', { height: 1.95, hide: ['Barbarian_Hat'], meshes: { Barbarian_Cape: { color: '#3a5ad8' } } });
      body.visible = false;
      root.add(rig.obj);
      this.rig = rig;
      const B = (n) => rig.bone(n);
      this.j = Object.assign({}, this.j, {
        head: B('head'),
        armL: { sh: B('upperarm.l'), el: B('lowerarm.l'), hand: B('handslot.l') },
        armR: { sh: B('upperarm.r'), el: B('lowerarm.r'), hand: B('handslot.r') },
      });
      // elmo grego com penacho azul preso ao osso da cabeça
      const helm = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), bronze); dome.scale.set(1.02, 0.95, 1.08); helm.add(dome);
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 32), darkBronze); brim.rotation.x = Math.PI / 2; brim.scale.set(1.02, 1.08, 1); helm.add(brim);
      for (const sx of [-1, 1]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.28), bronze); ch.position.set(sx * 0.4, -0.13, 0.12); ch.rotation.z = sx * 0.12; helm.add(ch); }
      const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.04), bronze); nasal.position.set(0, -0.08, 0.45); helm.add(nasal);
      const crestG = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.13, 10, 24, Math.PI), crest); crestG.rotation.y = Math.PI / 2; crestG.position.set(0, 0.06, -0.04); crestG.scale.set(1, 0.95, 0.5); helm.add(crestG);
      helm.traverse(o => { if (o.isMesh) o.castShadow = true; });
      helm.position.set(0, 0.62, -0.02); helm.scale.setScalar(1.12); // cobre o topo da cabeça grande do modelo
      this.helm = helm;
      B('head').add(helm);
      this.stepT = 0;
    }
    this.scene.add(root);
  }

  // ---------------------------------------------------------
  // GARRAS DE NÊMESIS + correntes + rastro de fogo
  // ---------------------------------------------------------
  buildBlades() {
    // perfil da lâmina curva (em forma de garra)
    const s = new THREE.Shape();
    s.moveTo(-0.035, 0.1);
    s.lineTo(0.05, 0.1);
    s.quadraticCurveTo(0.17, 0.42, 0.07, 0.74);
    s.quadraticCurveTo(0.0, 0.86, -0.14, 0.8);
    s.quadraticCurveTo(-0.03, 0.7, -0.035, 0.45);
    s.lineTo(-0.035, 0.1);
    const bladeGeo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 });
    bladeGeo.translate(0, 0, -0.0175);
    bladeGeo.rotateX(Math.PI / 2); // a lâmina passa a apontar para +Z
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#d89a3a', metalness: 0.8, roughness: 0.3, emissive: '#ff5a12', emissiveIntensity: 0.55, flatShading: true });
    const gripMat = mat('#3a2414');

    this.blades = {};
    for (const side of ['L', 'R']) {
      const g = new THREE.Group();
      const blade = new THREE.Mesh(bladeGeo, bladeMat); blade.castShadow = true; g.add(blade);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), gripMat);
      grip.rotation.x = Math.PI / 2; grip.position.z = 0.02; g.add(grip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), mat('#b8802f', { metalness: 0.8, roughness: 0.3 }));
      guard.position.z = 0.1; g.add(guard);
      this.scene.add(g);
      this.blades[side] = { g, flying: false, spin: 0, trail: this.makeTrail() };
    }
    // luz alaranjada das lâminas (uma só, entre as duas)
    this.bladeLight = new THREE.PointLight('#ff7a2a', 0.9, 7, 2);
    this.scene.add(this.bladeLight);

    // correntes: elos (anéis) desenhados com InstancedMesh = muitos iguais de uma vez
    this.LINKS = 22;
    const linkGeo = new THREE.TorusGeometry(0.03, 0.009, 4, 8);
    linkGeo.scale(1, 1.7, 1);
    this.chain = new THREE.InstancedMesh(linkGeo, new THREE.MeshStandardMaterial({ color: '#8a8a94', metalness: 0.9, roughness: 0.35 }), this.LINKS * 2);
    this.chain.castShadow = true;
    this.chain.frustumCulled = false;
    this.scene.add(this.chain);
  }

  makeTrail() {
    const N = 16;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return { N, geo, mesh, pts: [], heat: 0 };
  }

  // ---------------------------------------------------------
  // ATUALIZAÇÃO
  // ---------------------------------------------------------
  update(dt, input, game) {
    const p = this;
    if (p.dead) { p.updateDeath(dt, game); return; }
    p.slowT -= dt;
    if (p.slowT > 0 && Math.random() < 0.4) FX.add({ x: p.pos.x + rand(-0.3, 0.3), y: p.pos.y + rand(0.2, 1.8), z: p.pos.z + rand(-0.3, 0.3), vy: -0.5, life: 0.5, size: 0.12, color: '#9fb59a' });
    p.invuln -= dt; p.dashCd -= dt; p.coyoteT -= dt; p.bufferT -= dt; p.comboT -= dt; p.heavyCd -= dt;
    p.hpGhost = p.hpGhost > p.hp ? Math.max(p.hp, p.hpGhost - 25 * dt) : p.hp;
    p.mana = Math.min(HERO.maxMana, p.mana + 2 * dt);

    // direção do controle relativa à câmera
    const camYaw = game.camYaw;
    const fwd = _v.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = _v2.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
    let ix = 0, iz = 0;
    if (input.down('left')) ix -= 1;
    if (input.down('right')) ix += 1;
    if (input.down('up')) iz += 1;
    if (input.down('down')) iz -= 1;
    if (input.stick) { ix += input.stick.x; iz += input.stick.y; } // analógico do celular
    const wish = new V3().addScaledVector(right, ix).addScaledVector(fwd, iz);
    if (wish.lengthSq() > 1) wish.normalize();

    const attacking = !!p.attack;
    if (p.onGround) { p.coyoteT = HERO.coyote; p.canDouble = true; p.airDash = false; }
    if (input.pressed('jump')) p.bufferT = HERO.buffer;

    if (p.dashT > 0) {
      // ESQUIVA: velocidade fixa na direção escolhida
      p.dashT -= dt;
      p.vel.x = p.dashDir.x * HERO.dashSpeed;
      p.vel.z = p.dashDir.z * HERO.dashSpeed;
      p.vel.y = Math.max(p.vel.y, 0) * 0.5;
      p.ghostT -= dt;
      if (p.ghostT <= 0) { p.ghostT = 0.035; p.spawnGhost(); }
    } else {
      // andar (com aceleração; mais lento golpeando)
      const maxSp = HERO.speed * (attacking ? 0.3 : 1) * (p.slowT > 0 ? 0.5 : 1);
      const acc = (p.onGround ? HERO.accel : HERO.airAccel) * dt;
      p.vel.x = approach(p.vel.x, wish.x * maxSp, acc);
      p.vel.z = approach(p.vel.z, wish.z * maxSp, acc);
      if (wish.lengthSq() > 0.01 && !attacking) p.targetYaw = Math.atan2(wish.x, wish.z);

      // pulo e pulo duplo
      if (p.bufferT > 0 && !attacking) {
        if (p.coyoteT > 0) {
          p.vel.y = HERO.jump; p.coyoteT = 0; p.bufferT = 0;
          Sound.jump(false); FX.dust(p.pos, 6);
        } else if (p.canDouble) {
          p.vel.y = HERO.doubleJump; p.canDouble = false; p.bufferT = 0;
          Sound.jump(true);
          FX.ring(p.pos, '#ffcf8a', 1.4);
        }
      }
      // pulo mais baixo se soltar o botão cedo
      if (!input.down('jump') && p.vel.y > 4) p.vel.y -= HERO.gravity * 1.2 * dt;

      // esquiva
      if (input.pressed('dash') && p.dashCd <= 0 && !(p.airDash && !p.onGround)) {
        const dir = wish.lengthSq() > 0.01 ? wish.clone().normalize() : new V3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
        p.dashDir.copy(dir);
        p.dashT = HERO.dashTime; p.dashCd = HERO.dashCd;
        p.invuln = Math.max(p.invuln, HERO.dashTime + 0.08);
        p.targetYaw = Math.atan2(dir.x, dir.z);
        p.attack = null; p.queued = false;
        if (!p.onGround) p.airDash = true;
        Sound.dash();
        FX.dust(p.pos, 8);
      }
    }

    // golpes
    if (input.pressed('attack') && p.dashT <= 0) {
      if (!p.attack) p.startAttack(p.comboT > 0 ? (p.comboStep + 1) % 4 : 0, wish);
      else if (!p.attack.def.heavy && p.attack.t > p.attack.def.dur * 0.35) p.queued = true;
    }
    if (input.pressed('heavy') && p.dashT <= 0 && p.heavyCd <= 0 && !(p.attack && p.attack.def.heavy)) {
      p.startAttack(-1, wish);
      p.heavyCd = 1.1;
    }

    // gravidade
    p.vel.y = Math.max(p.vel.y - HERO.gravity * dt, -HERO.maxFall);
    if (p.attack && !p.onGround && p.vel.y < -2) p.vel.y = -2; // flutua um pouco golpeando no ar

    const prevVy = p.vel.y;
    p.move(dt, game.level.builder.solids);

    if (p.onGround && !p.wasOnGround && prevVy < -12) { FX.dust(p.pos, 10); Sound.land(); game.shake(0.12); }
    p.wasOnGround = p.onGround;

    // último chão seguro (para voltar se cair no mar)
    if (p.onGround && p.ground) {
      const g = p.ground;
      if (!g.moving && g.max.x - g.min.x > 2 && g.max.z - g.min.z > 2) {
        p.lastSafe.set(clamp(p.pos.x, g.min.x + 0.8, g.max.x - 0.8), g.max.y, clamp(p.pos.z, g.min.z + 0.8, g.max.z - 0.8));
      }
    }

    p.yaw = angleDamp(p.yaw, p.targetYaw === undefined ? p.yaw : p.targetYaw, p.dashT > 0 ? 0.0001 : 0.002, dt);

    if (p.attack) p.updateAttack(dt, game);
    p.animate(dt);
    p.updateBlades(dt);
    p.updateGhosts(dt);
  }

  // Física: move eixo por eixo e resolve colisão com as caixas
  move(dt, solids) {
    const p = this, hw = HERO.hw, h = HERO.h;
    const hit = (s, x, y, z) => x + hw > s.min.x && x - hw < s.max.x && z + hw > s.min.z && z - hw < s.max.z && y + h > s.min.y && y + 0.05 < s.max.y;

    // eixo X
    p.pos.x += p.vel.x * dt;
    for (const s of solids) if (hit(s, p.pos.x, p.pos.y, p.pos.z)) {
      if (p.onGround && s.max.y - p.pos.y < 0.35) { p.pos.y = s.max.y; continue; } // sobe degrau baixo
      p.pos.x = p.vel.x > 0 ? s.min.x - hw - 0.001 : s.max.x + hw + 0.001;
      p.vel.x = 0;
    }
    // eixo Z
    p.pos.z += p.vel.z * dt;
    for (const s of solids) if (hit(s, p.pos.x, p.pos.y, p.pos.z)) {
      if (p.onGround && s.max.y - p.pos.y < 0.35) { p.pos.y = s.max.y; continue; }
      p.pos.z = p.vel.z > 0 ? s.min.z - hw - 0.001 : s.max.z + hw + 0.001;
      p.vel.z = 0;
    }
    // eixo Y
    const prevY = p.pos.y;
    p.pos.y += p.vel.y * dt;
    p.onGround = false; p.ground = null;
    for (const s of solids) {
      const inXZ = p.pos.x + hw > s.min.x && p.pos.x - hw < s.max.x && p.pos.z + hw > s.min.z && p.pos.z - hw < s.max.z;
      if (!inXZ) continue;
      if (p.vel.y <= 0 && prevY >= s.max.y - 0.02 && p.pos.y <= s.max.y) {
        p.pos.y = s.max.y; p.vel.y = 0; p.onGround = true; p.ground = s;
      } else if (p.vel.y > 0 && prevY + h <= s.min.y + 0.02 && p.pos.y + h > s.min.y) {
        p.pos.y = s.min.y - h; p.vel.y = 0; // bateu a cabeça
      }
    }
  }

  // ---------------------------------------------------------
  // GOLPES
  // ---------------------------------------------------------
  startAttack(step, wish) {
    const def = step < 0 ? HEAVY : COMBO4[step];
    if (wish && wish.lengthSq() > 0.01) { this.targetYaw = Math.atan2(wish.x, wish.z); this.yaw = this.targetYaw; }
    this.attack = { def, step, t: 0, id: ++this.attackId };
    this.queued = false;
    if (step >= 0) this.comboStep = step;
    Sound.swing(Math.min(step < 0 ? 2 : step, 2));
    Sound.chain();
    if (step === 3 || step < 0) Sound.furyCharge();
    if (step === 2 && this.onGround) this.vel.y = 4;          // pulinho no golpe por cima
    if (step >= 0 && this.onGround) {                          // passo à frente
      this.vel.x += Math.sin(this.yaw) * 3; this.vel.z += Math.cos(this.yaw) * 3;
    }
  }

  // Direção (no espaço do herói) de uma lâmina num instante t (0..1) do golpe
  bladeDir(def, side, t, out) {
    const e = easeOut(t / 0.85);
    if (def.kind === 'h') {
      const a = lerp(def.a0, def.a1, e);
      return out.set(Math.sin(a), 0.12, Math.cos(a)).normalize();
    }
    if (def.kind === 'v') {
      const pch = lerp(def.p0, def.p1, e);
      return out.set(side === 'L' ? 0.18 : -0.18, Math.sin(pch), Math.cos(pch)).normalize();
    }
    const a = def.a0 + t * def.turns * Math.PI * 2 + (side === 'L' ? Math.PI : 0);
    return out.set(Math.sin(a), 0.05, Math.cos(a));
  }
  reachAt(def, t) {
    if (t < 0.2) return lerp(0.6, def.reach, easeOut(t / 0.2));
    if (t > 0.82) return lerp(def.reach, 0.7, (t - 0.82) / 0.18);
    return def.reach;
  }

  updateAttack(dt, game) {
    const a = this.attack, def = a.def;
    a.t += dt * (this.rage > 0 ? 1.5 : 1); // Ira de Nêmesis: golpes mais rápidos
    const t = a.t / def.dur;
    this.hitSpheres.length = 0;
    if (t >= def.hitFrom && t <= def.hitTo) {
      for (const side of def.blades) {
        const b = this.blades[side].g.position;
        const sh = this.shoulderWorld(side, _v2);
        // esferas de acerto: na lâmina e no meio da corrente
        this.hitSpheres.push({ x: b.x, y: b.y, z: b.z, r: def.heavy ? 1.0 : 0.85 });
        this.hitSpheres.push({ x: (b.x + sh.x) / 2, y: (b.y + sh.y) / 2, z: (b.z + sh.z) / 2, r: 0.7 });
      }
    }
    if (t >= 1) {
      this.attack = null;
      this.hitSpheres.length = 0;
      if (def.heavy) return;
      this.comboT = 0.45;
      if (this.queued) { this.queued = false; this.startAttack((a.step + 1) % 4); }
    }
  }

  // ANIMAÇÃO com o modelo 3D: escolhe a animação pelo que o herói está fazendo
  animateRig(dt) {
    const p = this, r = this.rig;
    p.root.position.copy(p.pos);
    p.root.rotation.y = p.yaw;
    const sp = Math.hypot(p.vel.x, p.vel.z);
    if (p.forceClip) { const f = p.forceClip; if (f.at !== undefined) r.scrub(f.name, f.at); else r.play(f.name, f.o); }
    else if (p.attack) {
      const def = p.attack.def;
      const name = def.heavy ? '2H_Melee_Attack_Spin' : def.kind === 'spin' ? '2H_Melee_Attack_Spinning' : def.kind === 'v' ? 'Dualwield_Melee_Attack_Chop' : p.attack.step === 1 ? 'Dualwield_Melee_Attack_Stab' : 'Dualwield_Melee_Attack_Slice';
      if (p.attack.id !== p.rigAtk) { p.rigAtk = p.attack.id; r.play(name, { loop: false, restart: true, fade: 0.06, speed: r.dur(name) / (def.dur * 1.25) }); }
    }
    else if (p.castT > 0) { p.castT -= dt; r.play(p.castKind === 'ares' || p.castKind === 'rage' ? 'Spellcast_Raise' : 'Spellcast_Shoot', { loop: false, fade: 0.08 }); }
    else if (p.dashT > 0) r.play('Dodge_Forward', { loop: false, fade: 0.06, speed: 1.6 });
    else if (!p.onGround) r.play(p.vel.y > 0 ? 'Jump_Start' : 'Jump_Idle', { loop: p.vel.y <= 0, fade: 0.12 });
    else if (sp > 0.5) {
      r.play(sp > 4 ? 'Running_A' : 'Walking_A', { speed: sp > 4 ? sp / HERO.speed * 1.15 : Math.max(0.8, sp / 2.5) });
      p.stepT -= dt * sp; if (p.stepT <= 0) { p.stepT = 2.1; Sound.step(); }
    }
    else r.play(p.rage > 0 ? '2H_Melee_Idle' : 'Idle', { fade: 0.2 });
    r.update(dt);
    p.root.updateMatrixWorld(true);
  }

  shoulderWorld(side, out) {
    const arm = side === 'L' ? this.j.armL : this.j.armR;
    return arm.sh.getWorldPosition(out);
  }

  // ---------------------------------------------------------
  // ANIMAÇÃO (rotações das juntas)
  // ---------------------------------------------------------
  animate(dt) {
    if (this.rig) return this.animateRig(dt);
    const j = this.j, p = this;
    const sp = Math.hypot(p.vel.x, p.vel.z);
    const k = 0.0005; // rapidez da suavização
    const set = (obj, axis, val, kk) => { obj.rotation[axis] = damp(obj.rotation[axis], val, kk || k, dt); };

    p.root.position.copy(p.pos);
    p.root.rotation.y = p.yaw;

    let legLx = 0, legRx = 0, kneeL = 0.1, kneeR = 0.1;
    let armLx = 0.15, armRx = 0.15, armLz = 0.25, armRz = -0.25, elL = -0.3, elR = -0.3;
    let lean = 0, twist = 0, bob = 0, capeX = 0.15;

    if (p.dashT > 0) {
      lean = 0.6; legLx = 0.6; legRx = -0.9; kneeL = 0.9; kneeR = 0.4;
      armLx = 1.0; armRx = 1.0; armLz = 0.6; armRz = -0.6; capeX = 1.1;
    } else if (!p.onGround) {
      const rising = p.vel.y > 0;
      legLx = rising ? -0.9 : -0.3; legRx = rising ? 0.2 : 0.3; kneeL = rising ? 1.4 : 0.6; kneeR = rising ? 0.6 : 0.3;
      armLx = -0.6; armRx = -0.6; armLz = 0.7; armRz = -0.7;
      capeX = rising ? 0.2 : 0.8;
      if (!p.canDouble && rising) { lean = -0.3 + Math.sin(p.vel.y) * 0.2; } // cambalhota do pulo duplo
    } else if (sp > 0.5) {
      p.runPhase += dt * sp * 1.55;
      const s = Math.sin(p.runPhase), c = Math.cos(p.runPhase);
      const amp = Math.min(1, sp / HERO.speed);
      legLx = -s * 0.85 * amp; legRx = s * 0.85 * amp;
      kneeL = 0.15 + Math.max(0, c) * 1.2 * amp; kneeR = 0.15 + Math.max(0, -c) * 1.2 * amp;
      armLx = s * 0.7 * amp; armRx = -s * 0.7 * amp; elL = -0.6; elR = -0.6;
      lean = 0.18 * amp; twist = s * 0.18 * amp; bob = Math.abs(c) * 0.07 * amp;
      capeX = 0.3 + amp * 0.6 + Math.sin(p.runPhase * 2) * 0.08;
      // passos
      const sign = Math.sign(s);
      if (sign !== p.lastStepSign) { p.lastStepSign = sign; Sound.step(); }
    } else {
      // respirando parado
      const br = Math.sin(performance.now() / 600);
      bob = br * 0.012; armLz = 0.25 + br * 0.03; armRz = -0.25 - br * 0.03;
      capeX = 0.12 + br * 0.03;
    }

    // pose dos golpes: braço da lâmina aponta para onde ela está
    if (p.attack) {
      const def = p.attack.def, t = p.attack.t / def.dur;
      for (const side of def.blades) {
        const dir = p.bladeDir(def, side, t, _v);
        const ang = Math.atan2(dir.x, dir.z);       // para onde a lâmina vai (no espaço do herói)
        const pitch = Math.asin(clamp(dir.y, -1, 1));
        const ax = -1.35 - pitch * 0.8;              // braço erguido para a frente
        if (side === 'L') { armLx = ax; armLz = clamp(ang * 0.7, -0.4, 1.6); elL = -0.1; }
        else { armRx = ax; armRz = clamp(ang * 0.7, -1.6, 0.4); elR = -0.1; }
      }
      if (def.kind === 'h') twist = lerp(def.a0, def.a1, easeOut(t / 0.85)) * -0.35;
      if (def.kind === 'v') lean = lerp(-0.35, 0.45, easeOut(t / 0.6));
      if (def.kind === 'spin') twist = Math.sin(t * def.turns * Math.PI * 2) * 0.5;
      legLx = -0.35; legRx = 0.35; kneeL = 0.35; kneeR = 0.35; // base firme
    }

    // pose de soltar um poder divino
    if (p.castT > 0) {
      p.castT -= dt;
      if (p.castKind === 'ares' || p.castKind === 'rage') { armLx = armRx = -2.7; armLz = 0.5; armRz = -0.5; elL = elR = 0; lean = -0.2; }
      else { armRx = -1.55; armRz = -0.05; elR = 0; armLx = -0.4; armLz = 0.5; twist = -0.25; }
    }

    j.body.position.y = damp(j.body.position.y, bob, 0.0001, dt);
    set(j.hips, 'x', lean * 0.4);
    set(j.torso, 'x', lean * 0.6, 0.0002);
    set(j.torso, 'y', twist, 0.0002);
    set(j.legL.hip, 'x', legLx, 0.00005); set(j.legR.hip, 'x', legRx, 0.00005);
    set(j.legL.knee, 'x', kneeL, 0.00005); set(j.legR.knee, 'x', kneeR, 0.00005);
    const ka = p.attack || p.castT > 0 ? 0.000001 : 0.0002;
    set(j.armL.sh, 'x', armLx, ka); set(j.armR.sh, 'x', armRx, ka);
    set(j.armL.sh, 'z', armLz, ka); set(j.armR.sh, 'z', armRz, ka);
    set(j.armL.el, 'x', elL); set(j.armR.el, 'x', elR);
    set(j.cape, 'x', capeX, 0.002);
    set(j.head, 'x', -lean * 0.5);
    p.root.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------
  // LÂMINAS, CORRENTES E RASTRO
  // ---------------------------------------------------------
  updateBlades(dt) {
    const p = this, a = p.attack;
    const t = a ? a.t / a.def.dur : 0;
    let li = 0;
    // lâmina na mão: no modelo 3D o eixo "para fora da mão" é o +Y do osso handslot
    const qRest = p.rig ? (p._qRig || (p._qRig = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -Math.PI / 2))) : new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), Math.PI / 2 - 0.4);
    for (const side of ['L', 'R']) {
      const B = p.blades[side];
      const arm = side === 'L' ? p.j.armL : p.j.armR;
      const hand = arm.hand.getWorldPosition(new V3());
      const flying = a && a.def.blades.includes(side) && t < 1;
      if (flying) {
        // posição = ombro + direção girada pelo yaw do herói × alcance
        const dir = p.bladeDir(a.def, side, t, new V3()).applyAxisAngle(AXIS_Y, p.yaw);
        const sh = p.shoulderWorld(side, new V3());
        const target = sh.clone().addScaledVector(dir, p.reachAt(a.def, t));
        B.g.position.lerp(target, B.flying ? 0.85 : 0.6);
        B.spin += dt * 22;
        B.g.lookAt(_v.copy(B.g.position).add(dir));
        B.g.rotateZ(B.spin);
      } else {
        // na mão
        B.g.position.lerp(hand, B.flying ? 0.5 : 1);
        arm.hand.getWorldQuaternion(_q);
        B.g.quaternion.copy(_q).multiply(qRest);
        B.spin = 0;
      }
      B.flying = flying;

      // corrente: curva da mão até o cabo, caindo um pouco no meio
      const tip = B.g.position;
      const dist = hand.distanceTo(tip);
      const sag = flying ? 0.08 : 0.25;
      const ctrl = new V3().addVectors(hand, tip).multiplyScalar(0.5); ctrl.y -= sag + Math.max(0, 0.5 - dist) * 0.3;
      const prev = new V3().copy(hand);
      for (let i = 0; i < p.LINKS; i++) {
        const u = (i + 1) / p.LINKS;
        const pt = new V3(
          (1 - u) * (1 - u) * hand.x + 2 * (1 - u) * u * ctrl.x + u * u * tip.x,
          (1 - u) * (1 - u) * hand.y + 2 * (1 - u) * u * ctrl.y + u * u * tip.y,
          (1 - u) * (1 - u) * hand.z + 2 * (1 - u) * u * ctrl.z + u * u * tip.z);
        const tan = new V3().subVectors(pt, prev);
        if (tan.lengthSq() < 1e-8) tan.set(0, -1, 0);
        tan.normalize();
        _q.setFromUnitVectors(UP, tan);
        if (i % 2) _q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2));
        const sc = flying || dist > 0.3 ? 1 : 0.0001; // na mão, a corrente fica escondida no bracelete
        _m.compose(pt, _q, new V3(sc, sc, sc));
        p.chain.setMatrixAt(li++, _m);
        prev.copy(pt);
      }

      // rastro de fogo (pares ponta/base da lâmina)
      const T = B.trail;
      T.heat = damp(T.heat, flying ? 1 : 0, 0.001, dt);
      const fwd = new V3(0, 0, 1).applyQuaternion(B.g.quaternion);
      T.pts.unshift([tip.clone().addScaledVector(fwd, 0.75), tip.clone().addScaledVector(fwd, 0.1)]);
      if (T.pts.length > T.N) T.pts.pop();
      const pos = T.geo.attributes.position.array, col = T.geo.attributes.color.array;
      for (let i = 0; i < T.N; i++) {
        const pr = T.pts[Math.min(i, T.pts.length - 1)];
        const f = (1 - i / T.N) * T.heat;
        for (let k2 = 0; k2 < 2; k2++) {
          const o = (i * 2 + k2) * 3;
          pos[o] = pr[k2].x; pos[o + 1] = pr[k2].y; pos[o + 2] = pr[k2].z;
          col[o] = 1.0 * f; col[o + 1] = 0.45 * f * f; col[o + 2] = 0.1 * f * f * f;
        }
      }
      T.geo.attributes.position.needsUpdate = true;
      T.geo.attributes.color.needsUpdate = true;
    }
    p.chain.instanceMatrix.needsUpdate = true;
    // luz das lâminas
    p.bladeLight.position.addVectors(p.blades.L.g.position, p.blades.R.g.position).multiplyScalar(0.5);
    p.bladeLight.intensity = a ? 1.8 : 0.7 + Math.sin(performance.now() / 120) * 0.08;
  }

  // ---------------------------------------------------------
  // "Fantasmas" azuis deixados pela esquiva
  // ---------------------------------------------------------
  spawnGhost() {
    const g = this.rig ? THREE.SkeletonUtils.clone(this.root) : this.root.clone(true); // cópia parada na pose atual
    const m = new THREE.MeshBasicMaterial({ color: '#6ab8ff', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    g.traverse(o => { if (o.isMesh) { o.material = m; o.castShadow = false; } });
    this.scene.add(g);
    this.ghosts.push({ g, m, life: 0.28 });
  }
  updateGhosts(dt) {
    for (const gh of this.ghosts) {
      gh.life -= dt;
      gh.m.opacity = Math.max(0, gh.life / 0.28) * 0.45;
      if (gh.life <= 0) { this.scene.remove(gh.g); gh.m.dispose(); }
    }
    this.ghosts = this.ghosts.filter(gh => gh.life > 0);
  }

  heal(n, game) {
    const before = this.hp;
    this.hp = Math.min(HERO.maxHp, this.hp + n);
    const got = Math.round(this.hp - before);
    if (got > 0) UI.damage(new V3(this.pos.x, this.pos.y + 2.2, this.pos.z), '+' + got, '#7aff8a', 0.9);
  }

  // Levou dano (Etapa 3: golpes dos inimigos). Na Ira de Nêmesis não é empurrado.
  hurt(dmg, fromPos, game, kb) {
    if (this.dead || this.invuln > 0 || this.dashT > 0) return false;
    if (game.godMode) return false;
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) { this.die(game); return true; }
    this.invuln = 0.7;
    UI.damage(new V3(this.pos.x, this.pos.y + 2.2, this.pos.z), '-' + Math.round(dmg), '#ff5a5a', 1);
    Sound.hurt();
    game.shake(0.3);
    UI.flash('rgba(160,0,0,0.6)');
    if (typeof Post !== 'undefined') Post.hit = 1;
    if (this.rage <= 0 && fromPos) {
      const d = new V3(this.pos.x - fromPos.x, 0, this.pos.z - fromPos.z).normalize();
      this.vel.x = d.x * (kb || 6); this.vel.z = d.z * (kb || 6); this.vel.y = 4;
      this.attack = null; this.queued = false;
    }
    return true;
  }

  // ---------------------------------------------------------
  // MORTE
  // ---------------------------------------------------------
  die(game) {
    this.dead = true; this.deadT = 0;
    this.attack = null; this.dashT = 0; this.rage = 0;
    this.hitSpheres.length = 0;
    UI.setRage(false);
    Sound.playerDeath();
    game.shake(0.6);
    Combat.hitStop = 0.25;
    UI.flash('rgba(120,0,0,0.7)');
    FX.burst(new V3(this.pos.x, this.pos.y + 1, this.pos.z), 30, { speed: [2, 6], up: 2, life: [0.4, 0.9], size: [0.08, 0.16], colors: ['#b3121b', '#7a0a10'], gravity: -16 });
  }
  updateDeath(dt, game) {
    this.deadT += dt;
    this.vel.x *= 0.9; this.vel.z *= 0.9;
    this.vel.y = Math.max(this.vel.y - HERO.gravity * dt, -HERO.maxFall);
    this.move(dt, game.level.builder.solids);
    if (this.rig) { // animação de morte do modelo
      this.root.position.copy(this.pos);
      this.rig.play('Death_A', { loop: false, fade: 0.1 }); this.rig.update(dt);
      this.root.updateMatrixWorld(true); this.updateBlades(dt);
      return;
    }
    // cai de joelhos e tomba para a frente
    const k = Math.min(1, this.deadT / 0.9);
    this.root.position.copy(this.pos);
    this.j.legL.knee.rotation.x = this.j.legR.knee.rotation.x = 1.6 * k;
    this.j.legL.hip.rotation.x = this.j.legR.hip.rotation.x = -1.2 * k;
    this.j.body.position.y = -0.45 * k;
    const f = clamp((this.deadT - 0.5) / 0.6, 0, 1);
    this.j.hips.rotation.x = 1.1 * f * f;
    this.j.armL.sh.rotation.x = this.j.armR.sh.rotation.x = 0.3;
    this.root.updateMatrixWorld(true);
    this.updateBlades(dt);
  }
  respawn(pos) {
    this.dead = false; this.deadT = 0;
    this.hp = HERO.maxHp; this.hpGhost = HERO.maxHp;
    this.pos.copy(pos); this.vel.set(0, 0, 0);
    this.lastSafe.copy(pos);
    this.invuln = 1.5; this.slowT = 0; this.rage = 0;
    this.attack = null;
    this.j.body.position.y = 0; this.j.hips.rotation.x = 0;
  }

  // Caiu no mar/abismo: perde vida e volta ao último chão seguro
  fell(game) {
    FX.splash(new V3(this.pos.x, -1.3, this.pos.z));
    Sound.hurt();
    this.hp -= (game.level && game.level.hazardDmg) || 10; // lava machuca mais
    this.pos.copy(this.lastSafe);
    if (this.hp <= 0) { this.hp = 0; this.vel.set(0, 0, 0); this.die(game); return; }
    this.vel.set(0, 0, 0);
    this.invuln = 1;
    this.attack = null; this.dashT = 0;
    game.flash('#3a8ac8', 0.35);
  }
}
