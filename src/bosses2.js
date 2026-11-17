// =============================================================
// bosses2.js — os 2 chefes novos (os chefes agora são 5,
// intercalados: fases 2, 4, 6, 8 e 10).
//
//   A SENTINELA (Fase 2) — o colosso de mármore de Atena,
//     corrompido por Ares. Lança, escudo e dardos de pedra.
//   TALOS (Fase 8) — o gigante de bronze das forjas, com uma
//     fornalha no peito. Martelo, sopro de fogo e chuva de brasas.
// =============================================================

// =============================================================
// A SENTINELA DE MÁRMORE
// =============================================================
class Sentinel extends Boss {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'A SENTINELA', title: 'o Colosso de Mármore de Atena', hp: 750, radius: 1.2, height: 4.4, yaw, bits: ['#e8e0d0', '#c8c0b0', '#ff4a2a'], deathLine: 'O mármore se parte… e a estátua descansa.' });
  }
  build() {
    const marble = smooth('#e6dfd0', { roughness: 0.55 }), vein = smooth('#c8bea8'), bronze = smooth('#b8802f', { metalness: 0.8, roughness: 0.35 });
    const crack = glowM('#ff4a1a', 2.2);
    const g = new THREE.Group(); g.scale.setScalar(2.1); this.root.add(g); this.model = g;
    const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips); this.hips = hips;
    // vestido longo de pedra (peplos) com pregas
    const dress = pleatedSkirt(0.26, 0.42, 0.9, '#ddd6c6', 16); dress.position.y = 0.08; hips.add(dress);
    const torso = new THREE.Group(); torso.position.y = 0.08; hips.add(torso); this.torso = torso;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.6, 20), marble); chest.position.y = 0.3; chest.scale.z = 0.75; torso.add(chest);
    // égide (peitoral de escamas) com um rosto de górgona no centro
    const aegis = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), vein); aegis.position.set(0, 0.48, 0.02); aegis.scale.set(1.3, 0.9, 1); torso.add(aegis);
    const gface = new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), crack); gface.position.set(0, 0.42, 0.21); torso.add(gface);
    // rachaduras brilhando (a corrupção de Ares)
    for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.012, rand(0.12, 0.3), 0.01), crack); c.position.set(rand(-0.18, 0.18), rand(0.1, 0.5), 0.2); c.rotation.z = rand(-0.8, 0.8); torso.add(c); }
    const head = new THREE.Group(); head.position.y = 0.72; torso.add(head); this.head = head;
    // rosto de estátua: mármore, olhos acesos em vermelho
    const fc = Face.human(head, { r: 0.13, y: 0.06, skinMat: marble, glow: true, eye: '#ff3a1a', brow: '#bab09a', angry: 0.7, lip: '#c8bca8', socket: '#a89e88', ears: true });
    this.eyeMeshes = fc.eyes;
    // elmo coríntio de Atena (levantado na testa) com crista alta
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), bronze); helm.position.y = 0.12; helm.scale.set(1, 1.1, 1.15); head.add(helm);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.05), bronze); visor.position.set(0, 0.2, 0.14); visor.rotation.x = -0.5; head.add(visor);
    const crest = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20, Math.PI), smooth('#7a1a14')); crest.rotation.y = Math.PI / 2; crest.position.y = 0.26; crest.scale.z = 0.6; head.add(crest);
    const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.26, 14), vein); hair.position.set(0, -0.05, -0.1); head.add(hair);
    const mk = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.33, 0.5, 0); torso.add(sh);
      sh.add(this.limb(0.07, 0.3, marble, 14));
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      el.add(this.limb(0.065, 0.28, marble, 14));
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), vein); pad.position.y = 0.02; sh.add(pad);
      return { sh, el };
    };
    this.armR = mk(-1); this.armL = mk(1);
    // lança
    const spear = new THREE.Group(); spear.position.y = -0.28; this.armR.el.add(spear); this.spear = spear;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.4, 8), vein); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.5; spear.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 8), bronze); tip.rotation.x = Math.PI / 2; tip.position.z = 1.8; spear.add(tip);
    // escudo redondo
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 28), bronze); shield.rotation.x = Math.PI / 2; shield.position.set(0, -0.26, 0.12); this.armL.el.add(shield);
    const owl = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), crack); owl.position.set(0, -0.26, 0.152); this.armL.el.add(owl);
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.12, -0.05, 0); hips.add(hip);
      hip.add(this.limb(0.09, 0.46, marble, 14));
      const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
      knee.add(this.limb(0.075, 0.44, marble, 14));
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.24), vein); foot.position.set(0, -0.46, 0.05); knee.add(foot);
      return { hip, knee };
    };
    this.legR = leg(-1); this.legL = leg(1);
    // pedestal de onde ela "desce"
    this.base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.6, 24), vein); this.base.position.y = 0.3; this.root.add(this.base);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player, sp = this.sp;
    switch (this.state) {
      case 'intro': if (this.st > 2) { this.setState('chase'); this.base.visible = false; FX.dust(this.pos, 30); Sound.crash(); } break;
      case 'chase':
        this.face(t.ang, dt, 0.01);
        if (t.dist > 4) this.walkTo(p.pos.x, p.pos.z, 2.6 * sp, game); else this.walk.set(0, 0, 0);
        if (this.cd <= 0 && !p.dead) {
          if (t.dist < 3.6) this.begin('shieldWind', game);
          else if (t.dist < 7.5 && Math.random() < 0.55) this.begin('spearWind', game);
          else this.begin('javelinWind', game);
        }
        break;
      case 'spearWind': // estocada: avança e acerta o círculo à frente
        this.walk.set(0, 0, 0);
        if (this.st > 0.9 / sp) {
          this.setState('strike');
          const c = this.hitAt;
          Sound.enemySwing(); Sound.crash(); game.shake(0.5);
          FX.dust(c, 14); FX.ring(c, '#ffd8a0', 3);
          if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 2.4 && p.pos.y - this.pos.y < 2) p.hurt(24, c, game, 11);
          this.pos.addScaledVector(this.fwd, 1.2);
        }
        break;
      case 'shieldWind': // pancada de escudo no chão: onda de choque (pule!)
        this.walk.set(0, 0, 0);
        if (this.st > 0.7 / sp) {
          this.setState('strike');
          Sound.crash(); game.shake(0.55); FX.dust(this.pos, 20);
          if (t.dist < 3.4) p.hurt(14, this.pos, game, 12);
          this.wave(game, this.pos, { dmg: 12, color: '#ffe0b0', speed: 9, max: 12 });
          if (this.enraged) setTimeout(() => this.alive && this.wave(game, this.pos, { dmg: 12, color: '#ff6a3a', speed: 7, max: 12 }), 500);
        }
        break;
      case 'javelinWind': // arremessa dardos de pedra
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.001);
        if (this.st > 0.8 / sp) {
          const n = this.enraged ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const a = t.ang + (i - (n - 1) / 2) * 0.28;
            const from = new THREE.Vector3(this.pos.x, this.pos.y + 3.4, this.pos.z).addScaledVector(this.fwd, 1);
            const to = new THREE.Vector3(this.pos.x + Math.sin(a) * t.dist, p.pos.y + 1, this.pos.z + Math.cos(a) * t.dist);
            const vel = to.sub(from).normalize().multiplyScalar(17);
            Shots.add({ type: 'bolt', pos: from, vel, dmg: 16, color: '#ffd8a0' });
          }
          Sound.shoot(); this.setState('strike');
        }
        break;
      case 'strike': if (this.st > 0.5) this.setState('recover'); break;
      case 'recover':
        this.walk.set(0, 0, 0);
        if (this.st > 1.1 / sp) { this.setState('chase'); this.cd = rand(0.4, 1.0) / sp; }
        break;
    }
  }
  begin(s, game) {
    this.setState(s);
    if (s === 'spearWind') {
      this.hitAt = this.pos.clone().addScaledVector(this.fwd, 4);
      this.tele = Tele.add('circle', { x: this.hitAt.x, y: this.pos.y, z: this.hitAt.z, r: 2.2, dur: 0.9 / this.sp });
    } else if (s === 'shieldWind') {
      this.tele = Tele.add('circle', { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 3.4, dur: 0.7 / this.sp });
    }
  }
  animate(dt) {
    const sp = this.walk.length(), s = Math.sin(this.animT * 5) * Math.min(1, sp / 2);
    this.legL.hip.rotation.x = -s * 0.6; this.legR.hip.rotation.x = s * 0.6;
    let rx = -0.5, lx = -1.0, lean = 0;
    if (this.state === 'spearWind') { rx = -2.6; lean = -0.15; }
    else if (this.state === 'strike') { rx = -1.3; lean = 0.3; }
    else if (this.state === 'shieldWind') { lx = -2.7; }
    else if (this.state === 'javelinWind') { rx = -2.9; lean = -0.2; }
    else if (this.state === 'intro') { rx = -0.3; lx = -0.6; }
    this.armR.sh.rotation.x = damp(this.armR.sh.rotation.x, rx, this.state === 'strike' ? 1e-8 : 0.001, dt);
    this.armL.sh.rotation.x = damp(this.armL.sh.rotation.x, lx, 0.001, dt);
    this.armL.sh.rotation.z = 0.3;
    this.hips.rotation.x = damp(this.hips.rotation.x, lean, 0.002, dt);
    this.spear.rotation.x = -0.2;
    const k = this.state.endsWith('Wind') ? 5 : this.enraged ? 3.5 : 2.2;
    for (const e of this.eyeMeshes) e.material.emissiveIntensity = k;
  }
}

// =============================================================
// TALOS, O GIGANTE DE BRONZE
// =============================================================
class Talos extends Boss {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'TALOS', title: 'o Gigante de Bronze', hp: 1200, radius: 1.5, height: 5.4, yaw, bits: ['#c08a3a', '#8a5a22', '#ff7a1a'], deathLine: 'A fornalha se apaga. As forjas silenciam.' });
  }
  build() {
    const bronze = smooth('#c08a3a', { metalness: 0.85, roughness: 0.32 }), dark = smooth('#6a4a1a', { metalness: 0.8, roughness: 0.4 });
    const fire = glowM('#ff7a1a', 3);
    const g = new THREE.Group(); g.scale.setScalar(2.5); this.root.add(g);
    const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips); this.hips = hips;
    const skirt = pleatedSkirt(0.3, 0.42, 0.42, '#5a3a14', 12); skirt.material.metalness = 0.6; skirt.position.y = 0.06; hips.add(skirt);
    const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso); this.torso = torso;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.25, 0.66, 20), bronze); chest.position.y = 0.34; chest.scale.z = 0.78; torso.add(chest);
    for (const sx of [-1, 1]) { const pec = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), bronze); pec.scale.set(1.2, 0.6, 0.18); pec.position.set(sx * 0.12, 0.48, 0.24); torso.add(pec); }
    // fornalha no peito (grade + fogo)
    this.furnace = new THREE.Mesh(new THREE.CircleGeometry(0.11, 18), fire); this.furnace.position.set(0, 0.3, 0.262); torso.add(this.furnace);
    for (let i = 0; i < 4; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 0.02), dark); bar.position.set(-0.075 + i * 0.05, 0.3, 0.27); torso.add(bar); }
    // rebites
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const rv = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), dark); rv.position.set(Math.cos(a) * 0.14, 0.3 + Math.sin(a) * 0.14, 0.255); torso.add(rv); }
    const head = new THREE.Group(); head.position.y = 0.78; torso.add(head); this.head = head;
    // rosto de bronze polido com olhos de brasa e barba de metal trançada
    const fc = Face.human(head, { r: 0.14, y: 0.06, skinMat: bronze, glow: true, eye: '#ff8a1a', brow: '#5a3a10', beard: '#8a5a22', angry: 0.9, lip: '#6a4a1a', socket: '#3a2008' });
    this.eyeMeshes = fc.eyes;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 20, 1, true), dark); crown.position.y = 0.2; head.add(crown);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 5), bronze); sp.position.set(Math.cos(a) * 0.15, 0.27, Math.sin(a) * 0.15); head.add(sp); }
    const mk = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.42, 0.56, 0); torso.add(sh);
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark); pad.scale.set(1.2, 0.8, 1); sh.add(pad);
      sh.add(this.limb(0.1, 0.34, bronze, 14));
      const el = new THREE.Group(); el.position.y = -0.34; sh.add(el);
      el.add(this.limb(0.09, 0.32, bronze, 14));
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), dark); fist.position.y = -0.34; el.add(fist);
      return { sh, el };
    };
    this.armR = mk(-1); this.armL = mk(1);
    // martelo de forja
    const hammer = new THREE.Group(); hammer.position.y = -0.34; this.armR.el.add(hammer); this.hammer = hammer;
    const hh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), smooth('#3a2a1a')); hh.rotation.x = Math.PI / 2; hh.position.z = 0.45; hammer.add(hh);
    this.hamHead = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.24), dark); this.hamHead.position.z = 1.0; hammer.add(this.hamHead);
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.16, -0.06, 0); hips.add(hip);
      hip.add(this.limb(0.12, 0.46, bronze, 14));
      const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
      knee.add(this.limb(0.1, 0.44, dark, 14));
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.3), dark); foot.position.set(0, -0.46, 0.06); knee.add(foot);
      return { hip, knee };
    };
    this.legR = leg(-1); this.legL = leg(1);
    this.light = new THREE.PointLight('#ff7a2a', 2, 12, 2); this.light.position.set(0, 3, 1.5); this.root.add(this.light);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player, sp = this.sp;
    switch (this.state) {
      case 'intro': if (this.st > 2) this.setState('chase'); break;
      case 'chase':
        this.face(t.ang, dt, 0.015);
        if (t.dist > 4.5) this.walkTo(p.pos.x, p.pos.z, 2.1 * sp, game); else this.walk.set(0, 0, 0);
        if (this.cd <= 0 && !p.dead) {
          if (t.dist < 6 && Math.random() < 0.6) this.begin('hammerWind', game);
          else if (this.enraged && Math.random() < 0.5) this.begin('emberWind', game);
          else this.begin('breathWind', game);
        }
        break;
      case 'hammerWind':
        this.walk.set(0, 0, 0);
        if (this.st > 1.0 / sp) {
          this.setState('strike');
          const c = this.hitAt;
          game.shake(0.75); Sound.crash(); Sound.clank();
          FX.sparks(c, 40); FX.dust(c, 20); FX.ring(c, '#ffb04a', 4);
          if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 3 && p.pos.y - this.pos.y < 2) p.hurt(30, c, game, 13);
          this.wave(game, c, { dmg: 15, color: '#ff8a2a' });
        }
        break;
      case 'breathWind': // sopro de fogo: rajada de bolas de fogo
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.002);
        if (this.st > 0.7 / sp) {
          this.burst = (this.burst || 0) + dt;
          if (this.burst > 0.14) {
            this.burst = 0;
            const from = new THREE.Vector3(this.pos.x, this.pos.y + 4.4, this.pos.z).addScaledVector(this.fwd, 0.8);
            const to = new THREE.Vector3(p.pos.x + rand(-1.5, 1.5), p.pos.y + 0.8, p.pos.z + rand(-1.5, 1.5));
            Shots.add({ type: 'bolt', pos: from, vel: to.sub(from).normalize().multiplyScalar(13), dmg: 9, color: '#ff7a1a', r: 0.35 });
            Sound.fireball();
          }
          if (this.st > 2.2 / sp) this.setState('recover');
        }
        break;
      case 'emberWind': // chuva de brasas em volta do herói
        this.walk.set(0, 0, 0);
        if (this.st > 0.9 / sp) {
          const pts = [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2 + rand(0, 1); const r = i === 0 ? 0 : rand(2.5, 5); return new THREE.Vector3(p.pos.x + Math.cos(a) * r, this.pos.y, p.pos.z + Math.sin(a) * r); });
          pts.forEach((tg, i) => Shots.add({ type: 'meteor', pos: tg.clone().add(new THREE.Vector3(0, 22, -4)), target: tg, flight: 1.1 + i * 0.2, aoe: 2.2, dmg: 18, r: 0.6, color: '#ff7a1a' }));
          Sound.roar(1.2); this.setState('recover');
        }
        break;
      case 'strike': if (this.st > 0.6) this.setState('recover'); break;
      case 'recover':
        this.walk.set(0, 0, 0);
        if (this.st > 1.3 / sp) { this.setState('chase'); this.cd = rand(0.3, 0.9) / sp; }
        break;
    }
  }
  begin(s, game) {
    this.setState(s); this.burst = 0;
    if (s === 'hammerWind') {
      this.hitAt = this.pos.clone().addScaledVector(this.fwd, 4.2);
      this.tele = Tele.add('circle', { x: this.hitAt.x, y: this.pos.y, z: this.hitAt.z, r: 2.8, dur: 1.0 / this.sp, color: '#ff6a1a' });
    }
    if (s !== 'breathWind') Sound.roar(1.3);
  }
  animate(dt) {
    const sp = this.walk.length(), s = Math.sin(this.animT * 4) * Math.min(1, sp / 2);
    this.legL.hip.rotation.x = -s * 0.5; this.legR.hip.rotation.x = s * 0.5;
    let rx = -0.5, lx = -0.3, lean = 0;
    if (this.state === 'hammerWind') { rx = -3.0; lean = -0.2; }
    else if (this.state === 'strike') { rx = -0.6; lean = 0.35; }
    else if (this.state === 'breathWind') { lean = -0.25; }
    else if (this.state === 'emberWind' || this.state === 'intro') { rx = -2.8; lx = -2.8; lean = -0.2; }
    this.armR.sh.rotation.x = damp(this.armR.sh.rotation.x, rx, this.state === 'strike' ? 1e-8 : 0.001, dt);
    this.armL.sh.rotation.x = damp(this.armL.sh.rotation.x, lx, 0.001, dt);
    this.hips.rotation.x = damp(this.hips.rotation.x, lean, 0.002, dt);
    this.hammer.rotation.x = -0.5;
    const heat = this.state === 'breathWind' || this.state === 'emberWind' ? 6 : this.enraged ? 4 : 3;
    this.furnace.material.emissiveIntensity = heat + Math.sin(this.animT * 10) * 0.5;
    for (const e of this.eyeMeshes) e.material.emissiveIntensity = heat;
    this.light.intensity = heat * 0.25;
    if (this.state === 'breathWind' && this.st > 0.7 && Math.random() < 0.7) FX.fire(new THREE.Vector3(this.pos.x, this.pos.y + 4.4, this.pos.z).addScaledVector(this.fwd, 0.9), 2);
  }
}

Object.assign(FOE_TYPES, { sentinel: Sentinel, talos: Talos });
