// =============================================================
// bosses.js — os CHEFES
//
//  BRONTES, o Ciclope       (Fase 4)  — clava, pedras e ondas de choque
//  ASTÉRION, o Minotauro    (Fase 6)  — investida: faça ele bater na PAREDE
//  ARES, Deus da Guerra     (Fase 10) — 2 estágios: no 2º, meteoros,
//                                        espada gigante e teletransporte
//
// Todos avisam os golpes fortes com VERMELHO no chão e ficam mais
// rápidos com metade da vida (enfurecidos). Chefes não são empurrados
// nem interrompidos (super-armadura).
// =============================================================

class Boss extends Foe {
  constructor(scene, pos, cfg) {
    super(scene, pos, Object.assign({ boss: true, superArmor: true, weight: 12 }, cfg));
    this.title = cfg.title || '';
    this.state = 'intro';
    this.dmgMult = 1;
  }
  get enraged() { return this.hp < this.maxHp / 2; }
  get sp() { return this.enraged ? 1.3 : 1; }
  // ainda vivo E ainda na fase atual (para ataques atrasados)
  get alive() { return !this.dead && Enemies.list.includes(this) && game.state === 'playing'; }
  hurt(dmg, o, game) {
    if (this.state === 'intro' || this.invulnerable) return 0;
    return super.hurt(dmg * this.dmgMult, o, game);
  }
  // onda de choque pelo chão (pule por cima!)
  wave(game, at, o) {
    Shots.add(Object.assign({ type: 'wave', pos: new THREE.Vector3(at.x, this.pos.y, at.z), speed: 10, max: 15, dmg: 14 }, o || {}));
  }
  inArena(game, x, z) {
    const a = game.level.arena;
    return { x: clamp(x, a.minX + 1.5, a.maxX - 1.5), z: clamp(z, a.minZ + 1.5, a.maxZ - 1.5) };
  }
  onDeath(game) {
    Combat.hitStop = 0.45;
    if (game) game.slowMo(1.6); // câmera lenta no golpe final
    game.shake(0.9);
    Sound.explode(); Sound.roar(0.7);
    for (let i = 0; i < 4; i++) FX.ring(this.pos, i % 2 ? '#ffcf4a' : '#ffffff', 6 + i * 3);
    FX.burst(this.center, 90, { speed: [3, 12], up: 3, life: [0.6, 1.4], size: [0.2, 0.5], colors: ['#ffdf6b', '#ff9a2e', '#ffffff'], glow: true, drag: 1.5 });
    UI.banner(this.name + ' CAIU', this.cfg.deathLine || 'Vitória!');
    Story.event('bossDeath');
    Shots.clear(); Tele.clear();
    if (game) game.onFoeKilled(this);
  }
  whileDead(dt) {
    if (this.rig) { if (this.deadT > 3) this.root.position.y -= dt * 0.8; if (this.deadT > 6) { this.root.visible = false; this.gone = true; } return; }
    this.root.rotation.x = Math.max(-Math.PI / 2, this.root.rotation.x - dt * 1.2);
    if (this.deadT > 2.5) this.root.position.y -= dt * 0.8;
    if (this.deadT > 6) { this.root.visible = false; this.gone = true; }
  }
  limb(r, len, m, seg) { const g = new THREE.CylinderGeometry(r, r * 0.85, len, seg || 8); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, m); }
}

// =============================================================
// BRONTES, O CICLOPE
// =============================================================
class Cyclops extends Boss {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'BRONTES', title: 'o Ciclope das Cavernas', hp: 900, radius: 1.5, height: 5, yaw, bits: ['#7d8f6a', '#5a6a4c', '#6b4a2a'], deathLine: 'A caverna fica em silêncio…' });
  }
  build() {
    const skin = smooth('#7d8f6a'), dk = smooth('#5a6a4c'), hide = mat('#6b4a2a'), wood = mat('#5a3a1e'), horn = mat('#c9b88a');
    const S = 2.4; const g = new THREE.Group(); g.scale.setScalar(S); this.root.add(g);
    const hips = new THREE.Group(); hips.position.y = 0.85; g.add(hips); this.hips = hips;
    hips.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.35, 8), hide));
    const torso = new THREE.Group(); torso.position.y = 0.15; hips.add(torso); this.torso = torso;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), skin); belly.scale.set(1, 0.95, 0.8); belly.position.y = 0.45; torso.add(belly);
    const head = new THREE.Group(); head.position.y = 1.08; torso.add(head); this.head = head;
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), skin));
    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), smooth('#f2efe0')); eyeW.position.set(0, 0.05, 0.22); head.add(eyeW);
    // rosto do gigante: sobrancelha única, nariz largo, boca cheia de dentes, orelhas de abano
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 4, 10), smooth('#3a4a2c')); brow.rotation.z = Math.PI / 2; brow.position.set(0, 0.2, 0.25); brow.rotation.x = -0.3; head.add(brow);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), skin); lid.position.set(0, 0.07, 0.22); lid.rotation.x = 0.15; head.add(lid);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), skin); nose.scale.set(1.3, 0.8, 1); nose.position.set(0, -0.09, 0.3); head.add(nose);
    for (const sx of [-1, 1]) { const ns = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), smooth('#1a1a10')); ns.position.set(sx * 0.04, -0.12, 0.37); head.add(ns); }
    const mouthC = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.06), smooth('#2a0a06')); mouthC.position.set(0, -0.19, 0.25); head.add(mouthC);
    for (let i = 0; i < 7; i++) { const tth = new THREE.Mesh(new THREE.ConeGeometry(0.018, i % 3 === 0 ? 0.08 : 0.05, 4), smooth('#e8e0c0')); tth.position.set(-0.13 + i * 0.043, -0.165, 0.28); tth.rotation.x = Math.PI; head.add(tth); }
    for (let i = 0; i < 2; i++) { const tk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), smooth('#e8e0c0')); tk.position.set(i ? 0.1 : -0.1, -0.2, 0.28); head.add(tk); }
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), skin); ear.scale.set(0.4, 1, 0.8); ear.position.set(sx * 0.3, 0.02, 0); ear.rotation.z = sx * 0.4; head.add(ear); }
    for (let i = 0; i < 6; i++) { const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 5), smooth('#2a2418')); tuft.position.set(Math.cos(i) * 0.12, 0.27, -0.08 + Math.sin(i) * 0.08); tuft.rotation.set(rand(-0.5, 0.5), 0, rand(-0.5, 0.5)); head.add(tuft); }
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff3a1a', emissive: '#ff2a0a', emissiveIntensity: 2.5 }));
    this.eye.position.set(0, 0.05, 0.33); head.add(this.eye);
    const hornM = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), horn); hornM.position.set(0, 0.32, 0.05); head.add(hornM);
    const mk = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.55, 0.85, 0); torso.add(sh);
      sh.add(this.limb(0.16, 0.55, skin));
      const el = new THREE.Group(); el.position.y = -0.55; sh.add(el);
      el.add(this.limb(0.14, 0.5, dk));
      return { sh, el };
    };
    this.armR = mk(-1); this.armL = mk(1);
    const club = new THREE.Group(); this.armR.el.add(club); club.position.y = -0.5; this.club = club;
    const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.2, 1.3, 7), wood); c1.rotation.x = Math.PI / 2; c1.position.z = 0.6; club.add(c1);
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), horn); sp.position.set(Math.cos(i * 1.3) * 0.18, Math.sin(i * 1.3) * 0.18, 1.0 + (i % 2) * 0.15); sp.lookAt(sp.position.x * 4, sp.position.y * 4, sp.position.z); club.add(sp); }
    this.rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), mat('#6d5a48')); this.rock.position.y = -0.5; this.rock.visible = false; this.armL.el.add(this.rock);
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.25, -0.1, 0); hips.add(hip);
      hip.add(this.limb(0.17, 0.4, skin));
      const knee = new THREE.Group(); knee.position.y = -0.4; hip.add(knee);
      knee.add(this.limb(0.15, 0.35, dk));
      return { hip, knee };
    };
    this.legR = leg(-1); this.legL = leg(1);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player, sp = this.sp;
    switch (this.state) {
      case 'intro': if (this.st > 1.8) this.setState('chase'); break;
      case 'chase':
        this.face(t.ang, dt, 0.02);
        if (t.dist > 4) this.walkTo(p.pos.x, p.pos.z, 2.3 * sp, game); else this.walk.set(0, 0, 0);
        if (this.cd <= 0 && !p.dead) {
          if (t.dist < 3.5) this.startAttack('stompWind', game);
          else if (t.dist < 7 && Math.random() < 0.6) this.startAttack('smashWind', game);
          else this.startAttack('rockWind', game);
        }
        break;
      case 'smashWind':
        this.walk.set(0, 0, 0);
        if (this.st > 1.1 / sp) {
          this.setState('smash');
          const c = this.smashAt;
          game.shake(0.7); Sound.crash();
          FX.dust(c, 20); FX.ring(c, '#ffcf8a', 4);
          if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 3 && p.pos.y - this.pos.y < 2) p.hurt(28, c, game, 12);
          this.wave(game, c, { dmg: 14, color: '#d8b080' });
          if (this.enraged) setTimeout(() => this.alive && this.wave(game, c, { dmg: 14, color: '#d8b080' }), 450);
        }
        break;
      case 'stompWind':
        this.walk.set(0, 0, 0);
        if (this.st > 0.65 / sp) {
          this.setState('smash');
          game.shake(0.5); Sound.crash(); FX.dust(this.pos, 18);
          if (t.dist < 3.8) p.hurt(16, this.pos, game, 13);
          this.wave(game, this.pos, { dmg: 12, color: '#d8b080', speed: 8, max: 10 });
        }
        break;
      case 'smash':
        if (this.st > 1.3) this.setState('recover');
        break;
      case 'rockWind':
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.001);
        if (this.st > 0.9 / sp) {
          const n = this.enraged ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const off = i === 0 ? 0 : (i === 1 ? -3.5 : 3.5);
            const tg = new THREE.Vector3(p.pos.x + Math.cos(t.ang) * off + p.vel.x * 0.5, p.pos.y, p.pos.z - Math.sin(t.ang) * off + p.vel.z * 0.5);
            Shots.add({ type: 'rock', pos: new THREE.Vector3(this.pos.x, this.pos.y + 5, this.pos.z).addScaledVector(this.fwd, 1), target: tg, flight: 1.1 + i * 0.15, arc: 6, aoe: 2.2, dmg: 20, r: 0.6 });
          }
          Sound.enemySwing();
          this.setState('recover');
        }
        break;
      case 'recover': // hora de bater!
        this.walk.set(0, 0, 0);
        if (this.st > 1.2 / sp) { this.setState('chase'); this.cd = rand(0.3, 0.9) / sp; }
        break;
    }
  }
  startAttack(s, game) {
    this.setState(s);
    if (s === 'smashWind') {
      this.smashAt = this.pos.clone().addScaledVector(this.fwd, 3.6);
      this.tele = Tele.add('circle', { x: this.smashAt.x, y: this.pos.y, z: this.smashAt.z, r: 2.8, dur: 1.1 / this.sp });
    } else if (s === 'stompWind') {
      this.tele = Tele.add('circle', { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 3.6, dur: 0.65 / this.sp });
    }
    Sound.roar(1.4);
  }
  animate(dt) {
    const sp = this.walk.length(), s = Math.sin(this.animT * 4) * Math.min(1, sp / 2);
    this.legL.hip.rotation.x = -s * 0.5; this.legR.hip.rotation.x = s * 0.5;
    let rx = -0.4, lx = -0.2, tx = 0.05;
    if (this.state === 'smashWind') { rx = lerp(-0.4, -3.0, Math.min(1, this.st / 0.6)); tx = -0.2; }
    else if (this.state === 'smash') { rx = -0.5; tx = 0.35; }
    else if (this.state === 'rockWind') { lx = lerp(-0.2, -2.9, Math.min(1, this.st / 0.5)); }
    else if (this.state === 'stompWind') { this.legR.hip.rotation.x = -1.0; }
    else if (this.state === 'intro') { rx = -2.8; lx = -2.8; tx = -0.3; }
    this.rock.visible = this.state === 'rockWind';
    this.armR.sh.rotation.x = damp(this.armR.sh.rotation.x, rx, this.state === 'smash' ? 1e-9 : 0.001, dt);
    this.armL.sh.rotation.x = damp(this.armL.sh.rotation.x, lx, 0.001, dt);
    this.torso.rotation.x = damp(this.torso.rotation.x, tx, 0.001, dt);
    this.club.rotation.x = -0.4;
    this.eye.material.emissiveIntensity = this.state.endsWith('Wind') ? 5 : 2.5;
  }
}

// =============================================================
// ASTÉRION, O MINOTAURO
// =============================================================
class Minotaur extends Boss {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'ASTÉRION', title: 'o Minotauro do Labirinto', hp: 1100, radius: 1.1, height: 3.3, yaw, bits: ['#4a2e1e', '#8a5a3a', '#efe2c0'], deathLine: 'O Labirinto está livre.' });
  }
  build() {
    const fur = mat('#4a2e1e'), skin = mat('#8a5a3a'), hornM = mat('#efe2c0'), iron = mat('#a8a8b4', { metalness: 0.85, roughness: 0.3 }), red = mat('#7a1f1a');
    const g = new THREE.Group(); g.scale.setScalar(1.6); this.root.add(g);
    const hips = new THREE.Group(); hips.position.y = 1.0; g.add(hips); this.hips = hips;
    hips.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.3, 16), red));
    const mskirt = pleatedSkirt(0.3, 0.42, 0.42, '#7a1f1a', 12); mskirt.position.y = 0.05; hips.add(mskirt);
    const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso); this.torso = torso;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.75, 8), skin); chest.position.y = 0.38; chest.scale.z = 0.75; torso.add(chest);
    const head = new THREE.Group(); head.position.set(0, 0.9, 0.08); torso.add(head); this.head = head;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), smooth('#4a2e1e', { roughness: 0.95 })); skull.scale.set(0.95, 0.9, 1.05); head.add(skull);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), smooth('#6e4a36')); snout.scale.set(1.0, 0.75, 0.9); snout.position.set(0, -0.08, 0.2); head.add(snout);
    for (const sx of [-1, 1]) {
      const ns = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), smooth('#120806')); ns.scale.set(1, 0.6, 0.5); ns.position.set(sx * 0.055, -0.07, 0.33); head.add(ns);
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), smooth('#f0e8d8')); ew.position.set(sx * 0.12, 0.05, 0.16); head.add(ew);
      const brw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), smooth('#2a180e')); brw.position.set(sx * 0.12, 0.11, 0.17); brw.rotation.z = sx * 0.4; head.add(brw);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), smooth('#5a3a26')); ear.position.set(sx * 0.22, 0.06, -0.02); ear.rotation.z = -sx * 1.7; ear.scale.z = 0.5; head.add(ear);
    }
    const mouthM = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.02), smooth('#1a0806')); mouthM.position.set(0, -0.15, 0.3); head.add(mouthM);
    const tuftM = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), smooth('#2a1a10', { roughness: 1 })); tuftM.scale.set(1.2, 0.5, 0.8); tuftM.position.set(0, 0.17, 0.04); head.add(tuftM);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 10), mat('#d4a73a', { metalness: 0.9 })); ring.position.set(0, -0.15, 0.36); head.add(ring);
    for (const sx of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.55, 6), hornM); h.position.set(sx * 0.32, 0.18, 0); h.rotation.z = -sx * 1.1; head.add(h);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff1a1a', emissive: '#ff0000', emissiveIntensity: 2.5 }));
      eye.position.set(sx * 0.125, 0.05, 0.2); head.add(eye);
    }
    const mk = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.48, 0.65, 0); torso.add(sh);
      sh.add(this.limb(0.12, 0.45, skin));
      const el = new THREE.Group(); el.position.y = -0.45; sh.add(el);
      el.add(this.limb(0.1, 0.42, fur));
      return { sh, el };
    };
    this.armR = mk(-1); this.armL = mk(1);
    const axe = new THREE.Group(); this.armR.el.add(axe); axe.position.y = -0.42; this.axe = axe;
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), mat('#4a3020')); haft.rotation.x = Math.PI / 2; haft.position.z = 0.4; axe.add(haft);
    for (const sy of [-1, 1]) {
      const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.quadraticCurveTo(0.45 * sy, 0.08, 0.5 * sy, 0.4); shp.quadraticCurveTo(0.25 * sy, 0.25, 0, 0.35);
      const b = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.04, bevelEnabled: false }), iron); b.rotation.x = -Math.PI / 2; b.position.set(0, 0, 0.95); axe.add(b);
    }
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.2, -0.1, 0); hips.add(hip);
      hip.add(this.limb(0.13, 0.48, fur));
      const knee = new THREE.Group(); knee.position.y = -0.48; hip.add(knee);
      knee.add(this.limb(0.1, 0.42, fur));
      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.22), mat('#151010')); hoof.position.y = -0.44; knee.add(hoof);
      return { hip, knee };
    };
    this.legR = leg(-1); this.legL = leg(1);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player, sp = this.sp;
    this.dmgMult = this.state === 'dazed' ? 1.5 : 1;
    switch (this.state) {
      case 'intro': if (this.st > 1.8) this.setState('chase'); break;
      case 'chase':
        this.face(t.ang, dt, 0.005);
        if (t.dist > 3) this.walkTo(p.pos.x, p.pos.z, 3.4 * sp, game); else this.walk.set(0, 0, 0);
        if (this.cd <= 0 && !p.dead) {
          if (t.dist < 3.6) this.setState(Math.random() < 0.6 ? 'axeWind' : 'slamWind');
          else this.setState('chargeWind');
          if (this.state === 'slamWind') this.tele = Tele.add('circle', { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 4.2, dur: 0.9 / sp });
          Sound.roar(1.2);
        }
        break;
      case 'chargeWind': {
        // raspa o pé no chão; a faixa vermelha mostra o caminho da investida
        this.walk.set(0, 0, 0);
        if (this.st < 0.6) this.face(t.ang, dt, 0.0001);
        if (!this.tele || this.st < 0.6) {
          if (this.tele) this.tele.remove();
          this.tele = Tele.add('rect', { x: this.pos.x, y: this.pos.y, z: this.pos.z, w: 2.4, len: 22, yaw: this.yaw, dur: 0.95 / sp });
          this.tele.t = this.st;
        }
        if (Math.random() < 0.5) FX.dust(this.pos.clone().addScaledVector(this.fwd, -0.8), 2);
        if (this.st > 0.95 / sp) { this.setState('charge'); Sound.roar(1.5); this.hitWall = null; }
        break;
      }
      case 'charge':
        this.walk.copy(this.fwd).multiplyScalar(this.enraged ? 17 : 15);
        if (Math.random() < 0.6) FX.dust(this.pos, 2);
        if (!this.struck && t.dist < 2.2 && Math.abs(angDiff(t.ang, this.yaw)) < 1.2 && Math.abs(t.dy) < 2) {
          if (p.hurt(22, this.pos, game, 15)) this.struck = true;
        }
        if (this.hitWall) {
          // BATEU NA PAREDE → atordoado
          this.setState('dazed');
          this.vel.copy(this.fwd).multiplyScalar(-6);
          game.shake(0.8); Combat.hitStop = 0.12; Sound.crash();
          FX.burst(this.pos.clone().addScaledVector(this.fwd, 1.2).setY(this.pos.y + 2), 30, { speed: [3, 8], life: [0.5, 1.1], size: [0.15, 0.3], colors: ['#7a7286', '#5a5266', '#9a92a6'], gravity: -18 });
          UI.damage(new THREE.Vector3(this.pos.x, this.pos.y + 4, this.pos.z), 'ATORDOADO!', '#ffcf4a', 1.3);
        } else if (this.st > 1.8) this.setState('recover');
        break;
      case 'dazed':
        this.walk.set(0, 0, 0);
        if (Math.random() < 0.3) FX.add({ x: this.pos.x + Math.cos(this.st * 6) * 0.8, y: this.pos.y + 3.6, z: this.pos.z + Math.sin(this.st * 6) * 0.8, life: 0.3, size: 0.2, color: '#ffe14a', glow: true });
        if (this.st > (this.enraged ? 2.0 : 2.6)) { this.setState('chase'); this.cd = 0.5; }
        break;
      case 'axeWind':
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.001);
        if (this.st > 0.6 / sp) { this.setState('axe'); this.swings = 0; Sound.enemySwing(); }
        break;
      case 'axe':
        this.walk.copy(this.fwd).multiplyScalar(this.st < 0.15 ? 4 : 0);
        if (!this.struck && this.st > 0.08) { this.struck = true; this.melee(game, 3.4, 150, 16, 8); }
        if (this.st > 0.45) {
          this.swings++;
          if (this.swings < 2) { this.st = 0; this.struck = false; this.face(t.ang, 1, 0.5); Sound.enemySwing(); }
          else this.setState('recover');
        }
        break;
      case 'slamWind':
        this.walk.set(0, 0, 0);
        if (this.st > 0.9 / sp) {
          this.setState('slam');
          game.shake(0.6); Sound.crash(); FX.dust(this.pos, 18);
          if (t.dist < 4.2 && p.pos.y - this.pos.y < 1.5) p.hurt(20, this.pos, game, 12);
          this.wave(game, this.pos, { dmg: 13, color: '#c8a070' });
        }
        break;
      case 'slam': if (this.st > 1) this.setState('recover'); break;
      case 'recover':
        this.walk.set(0, 0, 0);
        if (this.st > 1.0 / sp) { this.setState('chase'); this.cd = rand(0.4, 1.0) / sp; }
        break;
    }
  }
  animate(dt) {
    const sp = this.walk.length(), fast = this.state === 'charge';
    const s = Math.sin(this.animT * (fast ? 14 : 6)) * Math.min(1, sp / 2);
    this.legL.hip.rotation.x = -s * 0.7; this.legR.hip.rotation.x = s * 0.7;
    let ax = -0.5, lean = 0;
    if (this.state === 'axeWind') ax = -2.6;
    else if (this.state === 'axe') ax = this.st < 0.1 ? lerp(-2.6, -0.3, this.st / 0.1) : -0.3;
    else if (this.state === 'slamWind') { ax = -3; lean = -0.2; }
    else if (this.state === 'slam') { ax = -0.4; lean = 0.4; }
    else if (fast || this.state === 'chargeWind') { lean = 0.55; ax = 0.3; }
    else if (this.state === 'dazed') { lean = -0.25; this.head.rotation.z = Math.sin(this.st * 5) * 0.3; }
    this.armR.sh.rotation.x = damp(this.armR.sh.rotation.x, ax, this.state === 'axe' ? 1e-9 : 0.001, dt);
    this.armL.sh.rotation.x = damp(this.armL.sh.rotation.x, ax * 0.6, 0.001, dt);
    this.hips.rotation.x = damp(this.hips.rotation.x, lean, 0.002, dt);
  }
}

// =============================================================
// ARES, DEUS DA GUERRA — 2 estágios
// =============================================================
class Ares extends Boss {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'ARES', title: 'Deus da Guerra', hp: 1000, radius: 0.9, height: 3.2, yaw, bits: ['#2b2b33', '#d4a73a', '#8a0f14'], deathLine: 'O Olimpo treme… a dívida dos deuses foi cobrada.' });
    this.stage = 1;
  }
  build() {
    const iron = mat('#2b2b33', { metalness: 0.8, roughness: 0.35 }), gold = mat('#d4a73a', { metalness: 0.9, roughness: 0.25 }), cape = mat('#8a0f14', { side: THREE.DoubleSide }), skin = mat('#b07a5a');
    const g = new THREE.Group(); g.scale.setScalar(1.7); this.root.add(g); this.model = g;
    const hips = new THREE.Group(); hips.position.y = 0.98; g.add(hips); this.hips = hips;
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.025), i % 2 ? cape : iron); st.position.set(Math.sin(a) * 0.22, -0.15, Math.cos(a) * 0.16); st.rotation.y = a; hips.add(st); }
    const askirt = pleatedSkirt(0.2, 0.3, 0.4, '#5a0a0e', 14); askirt.position.y = 0.04; hips.add(askirt);
    const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso); this.torso = torso;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.62, 20), iron);
    for (const sx of [-1, 1]) { const pec = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), iron); pec.scale.set(1.2, 0.55, 0.15); pec.position.set(sx * 0.1, 0.46, 0.2); torso.add(pec); } chest.position.y = 0.32; chest.scale.z = 0.72; torso.add(chest);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 4, 12), gold); trim.rotation.x = Math.PI / 2; trim.position.y = 0.58; trim.scale.y = 0.72; torso.add(trim);
    const capeG = new THREE.Group(); capeG.position.set(0, 0.6, -0.18); torso.add(capeG); this.cape = capeG;
    const cg = new THREE.PlaneGeometry(0.7, 1.4, 2, 4); cg.translate(0, -0.7, 0); capeG.add(new THREE.Mesh(cg, cape));
    const head = new THREE.Group(); head.position.y = 0.72; torso.add(head);
    // ROSTO de Ares: pele queimada de sol, olhos em brasa, barba negra, cara de poucos amigos
    const fc = Face.human(head, { r: 0.13, y: 0.07, skin: '#a8684a', glow: true, eye: '#ff7a1a', brow: '#0e0806', beard: '#120a08', angry: 1, lip: '#5a2a20', socket: '#4a1a10', mouthOpen: 0.15 });
    const eyeMeshes = fc.eyes;
    this.eyes = { material: { set emissiveIntensity(v) { for (const e of eyeMeshes) e.material.emissiveIntensity = v; } } };
    // elmo de ferro aberto
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), iron); helm.scale.set(1, 1.1, 1.1); helm.position.y = 0.11; head.add(helm);
    for (const sx of [-1, 1]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.12), iron); ch.position.set(sx * 0.13, 0.04, 0.03); ch.rotation.z = sx * 0.1; head.add(ch); }
    const brimA = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.014, 6, 28), gold); brimA.rotation.x = Math.PI / 2; brimA.position.y = 0.11; head.add(brimA);
    const crestM = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 5, 12, Math.PI), mat('#b3121b')); crestM.rotation.y = Math.PI / 2; crestM.position.y = 0.27; crestM.scale.z = 0.6; head.add(crestM);
    for (const sx of [-1, 1]) { const pad = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold); pad.position.set(sx * 0.33, 0.55, 0); pad.scale.set(1.2, 0.8, 1); torso.add(pad); }
    const mk = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.34, 0.5, 0); torso.add(sh);
      sh.add(this.limb(0.075, 0.3, skin));
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      el.add(this.limb(0.07, 0.28, iron));
      return { sh, el };
    };
    this.armR = mk(-1); this.armL = mk(1);
    // espada flamejante
    const sword = new THREE.Group(); this.armR.el.add(sword); sword.position.y = -0.3; this.sword = sword;
    this.bladeMat = new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff4a0a', emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.3 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 1.3), this.bladeMat); blade.position.z = 0.75; sword.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), gold); guard.position.z = 0.08; sword.add(guard);
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.12, -0.05, 0); hips.add(hip);
      hip.add(this.limb(0.09, 0.46, iron));
      const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
      knee.add(this.limb(0.075, 0.44, gold));
      return { hip, knee };
    };
    this.legR = leg(-1); this.legL = leg(1);
    // espada gigante (estágio 2), escondida
    this.giant = new THREE.Group();
    const gb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 14), new THREE.MeshStandardMaterial({ color: '#ffb060', emissive: '#ff5a1a', emissiveIntensity: 2.2, transparent: true, opacity: 0.85 }));
    gb.position.z = 7.5; this.giant.add(gb);
    this.giant.visible = false;
    this.root.add(this.giant);
  }
  die(game) {
    if (this.stage === 1) {
      // não morre: entra no ESTÁGIO 2
      this.stage = 2;
      this.hp = this.maxHp = 1300;
      this.setState('transform');
      this.invulnerable = true;
      game.shake(0.8); Combat.hitStop = 0.3; Sound.roar(0.8);
      UI.banner('ARES DESPERTA SUA IRA', 'Estágio 2');
      return;
    }
    super.die(game);
  }
  get sp() { return this.stage === 2 ? 1.3 : this.enraged ? 1.12 : 1; }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player, sp = this.sp, s2 = this.stage === 2;
    if (s2 && Math.random() < 0.4) FX.fire(new THREE.Vector3(this.pos.x + rand(-0.6, 0.6), this.pos.y + rand(0.5, 3), this.pos.z + rand(-0.6, 0.6)), 1);
    switch (this.state) {
      case 'intro': if (this.st > 2) this.setState('chase'); break;
      case 'transform': {
        this.walk.set(0, 0, 0);
        const k = Math.min(1, this.st / 2.2);
        this.model.scale.setScalar(1.7 + 0.45 * easeOut(k));
        this.height = 3.2 + 0.85 * k;
        if (Math.random() < 0.8) FX.fire(new THREE.Vector3(this.pos.x + rand(-1, 1), this.pos.y + rand(0, 3.5), this.pos.z + rand(-1, 1)), 3);
        if (this.st > 2.5) { this.invulnerable = false; this.setState('chase'); this.cd = 0.3; }
        break;
      }
      case 'chase': {
        this.face(t.ang, dt, 0.002);
        if (t.dist > 2.8) this.walkTo(p.pos.x, p.pos.z, 4 * sp, game); else this.walk.set(0, 0, 0);
        if (this.cd <= 0 && !p.dead) {
          const opts = [];
          if (t.dist < 4) opts.push('slashWind', 'slashWind');
          opts.push('fireWind');
          if (t.dist > 6) opts.push('dashWind', 'dashWind');
          if (s2) opts.push('meteorWind', 'giantWind', 'giantWind', 'teleport');
          this.combo = 0;
          this.begin(choose(opts), game);
        }
        break;
      }
      case 'slashWind':
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.0005);
        if (this.st > (this.combo ? 0.28 : 0.5) / sp) { this.setState('slash'); Sound.enemySwing(); }
        break;
      case 'slash':
        this.walk.copy(this.fwd).multiplyScalar(this.st < 0.15 ? 7 : 0);
        if (!this.struck && this.st > 0.06) { this.struck = true; this.melee(game, 3.6, 150, this.combo === 2 ? 18 : 14, 8); FX.ring(this.pos.clone().addScaledVector(this.fwd, 1.8).setY(this.pos.y + 1.5), '#ff9a3a', 2); }
        if (this.st > 0.3) {
          this.combo++;
          if (this.combo < (s2 ? 4 : 3)) this.setState('slashWind'); else this.setState('recover');
        }
        break;
      case 'fireWind':
        this.walk.set(0, 0, 0);
        if (Math.random() < 0.6) FX.fire(this.pos.clone().setY(this.pos.y + 3), 2);
        if (this.st > 0.8 / sp) {
          const w = () => { if (this.alive) { this.wave(game, this.pos, { dmg: 15, color: '#ff7a1a', speed: 11, max: 17 }); game.shake(0.3); Sound.fireball(); } };
          w(); if (s2) setTimeout(w, 600);
          this.setState('recover');
        }
        break;
      case 'dashWind':
        this.walk.set(0, 0, 0);
        if (this.st < 0.45) {
          this.face(t.ang, dt, 0.0001);
          if (this.tele) this.tele.remove();
          this.tele = Tele.add('rect', { x: this.pos.x, y: this.pos.y, z: this.pos.z, w: 2, len: 14, yaw: this.yaw, dur: 0.6 / sp });
          this.tele.t = this.st;
        }
        if (this.st > 0.6 / sp) { this.setState('dash'); Sound.dash(); }
        break;
      case 'dash':
        this.walk.copy(this.fwd).multiplyScalar(22);
        FX.fire(this.pos.clone().setY(this.pos.y + 1), 1);
        if (!this.struck && t.dist < 2.2 && Math.abs(t.dy) < 2) { if (p.hurt(18, this.pos, game, 12)) this.struck = true; }
        if (this.st > 0.6 || this.hitWall) { this.hitWall = null; this.setState('recover'); }
        break;
      case 'meteorWind':
        this.walk.set(0, 0, 0);
        if (this.st > 1.0) {
          const a = game.level.arena;
          const pts = [new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z)];
          for (let i = 0; i < 7; i++) pts.push(new THREE.Vector3(rand(a.minX + 2, a.maxX - 2), this.pos.y, rand(a.minZ + 2, a.maxZ - 2)));
          pts.forEach((tg, i) => Shots.add({ type: 'meteor', pos: tg.clone().add(new THREE.Vector3(8, 26, -8)), target: tg, flight: 1.2 + i * 0.22, aoe: 2.4, dmg: 20, r: 0.7, color: '#ff7a1a' }));
          Sound.roar(1.1);
          this.setState('recover'); this.st = -0.6;
        }
        break;
      case 'giantWind':
        // a espada gigante aparece; a faixa vermelha mostra onde vai cair
        this.walk.set(0, 0, 0);
        if (this.st < 0.7) this.face(t.ang, dt, 0.0005);
        if (!this.tele || this.st < 0.7) {
          if (this.tele) this.tele.remove();
          this.tele = Tele.add('rect', { x: this.pos.x, y: this.pos.y, z: this.pos.z, w: 3.2, len: 22, yaw: this.yaw, dur: 1.3 });
          this.tele.t = this.st;
        }
        this.giant.visible = true;
        this.giant.rotation.x = -lerp(0.1, 1.45, Math.min(1, this.st / 1.0));
        this.giant.position.y = 2.5;
        if (this.st > 1.3) {
          this.setState('giant');
          game.shake(0.9); Sound.crash(); Combat.hitStop = 0.06;
          const f = this.fwd;
          // dano em toda a faixa da espada
          const rel = new THREE.Vector3(p.pos.x - this.pos.x, 0, p.pos.z - this.pos.z);
          const along = rel.dot(f), side = Math.abs(rel.x * f.z - rel.z * f.x);
          if (along > 0 && along < 22 && side < 1.9 && p.pos.y - this.pos.y < 2) p.hurt(30, this.pos, game, 13);
          for (let d = 2; d < 22; d += 2) { const q = this.pos.clone().addScaledVector(f, d); FX.fire(q, 4); }
          this.wave(game, this.pos.clone().addScaledVector(f, 12), { dmg: 12, color: '#ff7a1a', max: 9 });
        }
        break;
      case 'giant':
        this.giant.rotation.x = 0;
        this.giant.position.y = 0.3;
        if (this.st > 0.8) { this.giant.visible = false; this.setState('recover'); }
        break;
      case 'teleport':
        this.walk.set(0, 0, 0);
        if (this.st < 0.35) this.model.scale.setScalar(2.15 * (1 - this.st / 0.35 * 0.9));
        else if (!this.struck) {
          this.struck = true;
          FX.fire(this.center, 25);
          const q = this.inArena(game, p.pos.x - Math.sin(p.yaw) * 2.5, p.pos.z - Math.cos(p.yaw) * 2.5);
          this.pos.x = q.x; this.pos.z = q.z;
          this.yaw = Math.atan2(p.pos.x - q.x, p.pos.z - q.z);
          FX.fire(this.center, 25); Sound.fireball();
        } else {
          this.model.scale.setScalar(2.15 * Math.min(1, 0.1 + (this.st - 0.35) / 0.2));
          if (this.st > 0.6) { this.model.scale.setScalar(2.15); this.combo = 1; this.setState('slashWind'); }
        }
        break;
      case 'recover':
        this.walk.set(0, 0, 0);
        if (this.st > 0.75 / sp) { this.setState('chase'); this.cd = rand(0.3, 0.8) / sp; }
        break;
    }
  }
  begin(s, game) {
    this.setState(s);
    if (s === 'fireWind') this.tele = Tele.add('circle', { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 2, dur: 0.8 / this.sp, color: '#ff6a1a' });
  }
  animate(dt) {
    const sp = this.walk.length(), s = Math.sin(this.animT * 9) * Math.min(1, sp / 3);
    this.legL.hip.rotation.x = -s * 0.7; this.legR.hip.rotation.x = s * 0.7;
    let ax = -0.4, az = -0.2, lean = 0;
    if (this.state === 'slashWind') { ax = -2.5; az = -0.6; }
    else if (this.state === 'slash') { ax = this.st < 0.08 ? lerp(-2.5, -1.2, this.st / 0.08) : -1.2; az = 0.6; lean = 0.25; }
    else if (this.state === 'fireWind' || this.state === 'meteorWind' || this.state === 'transform') { ax = -3; az = 0; }
    else if (this.state === 'dash' || this.state === 'dashWind') { ax = -1.4; lean = 0.5; }
    else if (this.state === 'giantWind') { ax = -3; az = 0; lean = -0.2; }
    else if (this.state === 'giant') { ax = -1.2; lean = 0.45; }
    this.armR.sh.rotation.x = damp(this.armR.sh.rotation.x, ax, this.state === 'slash' ? 1e-9 : 0.0005, dt);
    this.armR.sh.rotation.z = az;
    this.armL.sh.rotation.x = damp(this.armL.sh.rotation.x, this.state === 'meteorWind' || this.state === 'giantWind' ? -3 : -0.3, 0.001, dt);
    this.hips.rotation.x = damp(this.hips.rotation.x, lean, 0.002, dt);
    this.sword.rotation.x = -0.3;
    this.cape.rotation.x = 0.25 + Math.min(1, sp / 6) * 0.7 + Math.sin(this.animT * 3) * 0.05;
    const s2 = this.stage === 2;
    this.bladeMat.emissiveIntensity = (s2 ? 3 : 1.6) + Math.sin(this.animT * 12) * 0.3;
    this.eyes.material.emissiveIntensity = s2 ? 6 : 3;
  }
}

Object.assign(FOE_TYPES, { cyclops: Cyclops, minotaur: Minotaur, ares: Ares });
