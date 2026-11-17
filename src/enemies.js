// =============================================================
// enemies.js — inimigos 3D
//
// Foe = a "classe base" de todo inimigo: vida, dano, empurrão,
// gravidade, efeitos de status dos poderes e a MÁQUINA DE ESTADOS:
//   patrol (patrulha) → chase (persegue) → ...Wind (AVISO do golpe)
//   → golpe → recover (recuperação, hora de contra-atacar)
//   Paralisado/petrificado/atordoado = o estado fica congelado.
//
// Tele  = avisos vermelhos no chão (onde o golpe forte vai cair)
// Shots = projéteis inimigos (flecha, magia, pedra, meteoro, onda de choque)
//
// Inimigos comuns: Esqueleto espadachim (escudo), Arqueiro (linha de mira),
// Guerreiro pesado (machado), Harpia (voa e empurra), Górgona (petrifica).
// Os chefes ficam em bosses.js.
// =============================================================

const STONE_MAT = new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.95, flatShading: true });
const _tv = new THREE.Vector3();

// Altura do chão embaixo de (x, z), sem passar muito acima de y
function groundAt(x, z, y, solids, r) {
  r = r || 0;
  let best = -Infinity;
  for (const s of solids) {
    if (x + r > s.min.x && x - r < s.max.x && z + r > s.min.z && z - r < s.max.z && s.max.y <= y + 0.4 && s.max.y > best) best = s.max.y;
  }
  return best;
}
function pointInSolids(p, solids) {
  for (const s of solids) if (p.x > s.min.x && p.x < s.max.x && p.y > s.min.y && p.y < s.max.y && p.z > s.min.z && p.z < s.max.z) return true;
  return false;
}
// diferença entre dois ângulos (-π..π)
function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }

// -------------------------------------------------------------
// AVISOS NO CHÃO
// -------------------------------------------------------------
const Tele = {
  list: [],
  init(scene) {
    this.scene = scene;
    this.circleGeo = new THREE.CircleGeometry(1, 40); this.circleGeo.rotateX(-Math.PI / 2);
    this.ringGeo = new THREE.RingGeometry(0.86, 1, 48); this.ringGeo.rotateX(-Math.PI / 2);
    this.rectGeo = new THREE.PlaneGeometry(1, 1); this.rectGeo.rotateX(-Math.PI / 2); this.rectGeo.translate(0, 0, 0.5);
  },
  // forma: 'circle' | 'rect' ; o = {x,y,z,r | w,len,yaw, dur, color}
  add(shape, o) {
    const mat = new THREE.MeshBasicMaterial({ color: o.color || '#ff2a1a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = new THREE.Group();
    if (shape === 'circle') {
      const fill = new THREE.Mesh(this.circleGeo, mat); g.add(fill);
      const edge = new THREE.Mesh(this.ringGeo, mat); g.add(edge);
      g.scale.set(o.r, 1, o.r);
    } else {
      const fill = new THREE.Mesh(this.rectGeo, mat); g.add(fill);
      g.scale.set(o.w, 1, o.len);
      g.rotation.y = o.yaw;
    }
    g.position.set(o.x, o.y + 0.04, o.z);
    this.scene.add(g);
    const t = { g, mat, t: 0, dur: o.dur || 1, done: false, remove() { this.done = true; } };
    this.list.push(t);
    return t;
  },
  update(dt) {
    for (const t of this.list) {
      t.t += dt;
      const k = clamp(t.t / t.dur, 0, 1);
      t.mat.opacity = (0.18 + 0.32 * k) * (0.75 + 0.25 * Math.sin(t.t * 22));
      if (t.t > t.dur + 1.5) t.done = true; // segurança
      if (t.done) { this.scene.remove(t.g); t.mat.dispose(); }
    }
    this.list = this.list.filter(t => !t.done);
  },
  clear() { for (const t of this.list) t.done = true; this.update(0); },
};

// -------------------------------------------------------------
// PROJÉTEIS INIMIGOS
// -------------------------------------------------------------
const Shots = {
  list: [],
  init(scene) {
    this.scene = scene;
    const arrowGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5); arrowGeo.rotateX(Math.PI / 2);
    this.arrowGeo = arrowGeo;
    this.headGeo = new THREE.ConeGeometry(0.06, 0.18, 5); this.headGeo.rotateX(Math.PI / 2); this.headGeo.translate(0, 0, 0.5);
    this.ballGeo = new THREE.IcosahedronGeometry(1, 1);
    this.waveGeo = new THREE.TorusGeometry(1, 0.12, 6, 48); this.waveGeo.rotateX(Math.PI / 2);
  },
  add(o) {
    o.t = 0; o.dead = false; o.vel = o.vel || new THREE.Vector3();
    const g = new THREE.Group();
    if (o.type === 'arrow') {
      g.add(new THREE.Mesh(this.arrowGeo, mat('#6b4a2a')));
      g.add(new THREE.Mesh(this.headGeo, mat('#c8ccd8', { metalness: 0.8 })));
      const tr = new THREE.Mesh(this.arrowGeo, new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
      tr.scale.set(3, 3, 1.4); g.add(tr);
    } else if (o.type === 'wave') {
      const m = new THREE.Mesh(this.waveGeo, new THREE.MeshBasicMaterial({ color: o.color || '#ffb060', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      g.add(m); o.ringMesh = m;
    } else { // bola (magia, pedra, meteoro)
      const m = o.type === 'rock'
        ? new THREE.Mesh(this.ballGeo, mat('#6d5a48'))
        : new THREE.Mesh(this.ballGeo, new THREE.MeshBasicMaterial({ color: o.color || '#7aff6a' }));
      m.scale.setScalar(o.r || 0.3); g.add(m);
      if (o.type !== 'rock') {
        const halo = new THREE.Mesh(this.ballGeo, new THREE.MeshBasicMaterial({ color: o.color || '#7aff6a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
        halo.scale.setScalar((o.r || 0.3) * 2.2); g.add(halo);
      }
    }
    g.position.copy(o.pos);
    this.scene.add(g);
    o.g = g;
    if (o.target && (o.type === 'rock' || o.type === 'meteor')) {
      o.marker = Tele.add('circle', { x: o.target.x, y: o.target.y, z: o.target.z, r: o.aoe, dur: o.flight });
    }
    this.list.push(o);
    return o;
  },

  update(dt, game) {
    const p = game.player, solids = game.level.builder.solids;
    for (const s of this.list) {
      s.t += dt;
      switch (s.type) {
        case 'arrow':
        case 'bolt': {
          if (s.homing && !p.dead) {
            const want = new THREE.Vector3(p.pos.x, p.pos.y + 1, p.pos.z).sub(s.pos).normalize().multiplyScalar(s.vel.length());
            s.vel.lerp(want, Math.min(1, s.homing * dt));
          }
          s.pos.addScaledVector(s.vel, dt);
          if (s.type === 'arrow') s.g.lookAt(_tv.copy(s.pos).add(s.vel));
          else if (Math.random() < 0.6) FX.add({ x: s.pos.x, y: s.pos.y, z: s.pos.z, life: 0.3, size: 0.25, color: s.color, glow: true });
          if (pointInSolids(s.pos, solids) || s.t > 4) { s.dead = true; FX.sparks(s.pos, 6, [s.color || '#c8b89a', '#ffffff']); }
          if (!s.dead && this.hitsPlayer(s.pos, 0.45, p)) {
            if (p.hurt(s.dmg, s.pos, game, 5)) { if (s.slow) { p.slowT = 2.5; UI.toast('Petrificando… você está LENTO'); } }
            s.dead = true;
          }
          break;
        }
        case 'rock':
        case 'meteor': {
          // voa em arco até o alvo em "flight" segundos
          const k = Math.min(1, s.t / s.flight);
          s.g.position.lerpVectors(s.pos, s.target, k);
          s.g.position.y += Math.sin(k * Math.PI) * (s.type === 'rock' ? s.arc : 0);
          s.g.rotation.x += dt * 6;
          if (s.type === 'meteor' && Math.random() < 0.8) FX.fire(s.g.position, 2);
          if (k >= 1) {
            s.dead = true;
            game.shake(s.type === 'meteor' ? 0.45 : 0.35);
            Sound.explode();
            FX.burst(s.target, 26, { speed: [3, 8], up: 4, life: [0.5, 1], size: [0.12, 0.3], colors: s.type === 'meteor' ? ['#ffdf6b', '#ff7a1a', '#3a2020'] : ['#6d5a48', '#4a3a2c', '#9a8670'], glow: s.type === 'meteor', gravity: -18, drag: 0.6 });
            FX.dust(s.target, 10);
            FX.ring(s.target, s.type === 'meteor' ? '#ff7a1a' : '#d8c098', s.aoe * 1.4);
            const d = Math.hypot(p.pos.x - s.target.x, p.pos.z - s.target.z);
            if (d < s.aoe + 0.3 && Math.abs(p.pos.y - s.target.y) < 2) p.hurt(s.dmg, s.target, game, 9);
          }
          break;
        }
        case 'wave': {
          // anel que se espalha pelo chão: PULE por cima
          s.r = (s.r || 0.5) + s.speed * dt;
          s.g.scale.set(s.r, 1 + s.r * 0.05, s.r);
          s.ringMesh.material.opacity = 0.85 * (1 - s.r / s.max);
          if (Math.random() < 0.8) { const a = Math.random() * Math.PI * 2; FX.add({ x: s.pos.x + Math.cos(a) * s.r, y: s.pos.y + 0.2, z: s.pos.z + Math.sin(a) * s.r, vy: 2, life: 0.4, size: 0.4, color: s.color || '#ffb060', glow: true }); }
          const d = Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z);
          if (!s.hitDone && Math.abs(d - s.r) < 0.55 && p.pos.y - s.pos.y < 0.7 && p.pos.y - s.pos.y > -1) {
            if (p.hurt(s.dmg, s.pos, game, 7)) s.hitDone = true;
          }
          if (s.r >= s.max) s.dead = true;
          break;
        }
      }
      if (s.type !== 'rock' && s.type !== 'meteor') s.g.position.copy(s.pos);
      if (s.dead) { this.scene.remove(s.g); if (s.marker) s.marker.remove(); }
    }
    this.list = this.list.filter(s => !s.dead);
  },
  hitsPlayer(pt, r, p) {
    if (p.dead) return false;
    const dx = pt.x - p.pos.x, dz = pt.z - p.pos.z;
    return dx * dx + dz * dz < (r + 0.4) * (r + 0.4) && pt.y > p.pos.y - r && pt.y < p.pos.y + 1.9 + r;
  },
  clear() { for (const s of this.list) { this.scene.remove(s.g); if (s.marker) s.marker.remove(); } this.list = []; },
  // o giro de Fúria e os poderes podem destruir projéteis
  destroyNear(c, r) {
    for (const s of this.list) if ((s.type === 'arrow' || s.type === 'bolt') && s.pos.distanceTo(c) < r) { s.dead = true; FX.sparks(s.pos, 6); }
  },
};

// -------------------------------------------------------------
// CLASSE BASE
// -------------------------------------------------------------
class Foe {
  constructor(scene, pos, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.name = cfg.name || 'Inimigo';
    this.pos = pos.clone();
    this.home = pos.clone();
    this.vel = new THREE.Vector3();     // empurrões
    this.walk = new THREE.Vector3();    // o quanto ele QUER andar
    this.hp = this.maxHp = cfg.hp;
    this.radius = cfg.radius || 0.6;
    this.height = cfg.height || 1.8;
    this.weight = cfg.weight || 1;      // quanto mais pesado, menos é empurrado
    this.superArmor = !!cfg.superArmor; // não é interrompido por golpes
    this.flying = !!cfg.flying;
    this.boss = !!cfg.boss;
    this.yaw = cfg.yaw || 0;
    this.dead = false; this.deadT = 0;
    this.stun = 0; this.burn = 0; this.burnDps = 0; this.petrify = 0;
    this.flashT = 0;
    this.hitMemo = { id: -1, t: 0 };
    this.onGround = true;
    this.state = 'patrol'; this.st = 0; this.cd = rand(0.4, 1.4); this.struck = false;
    this.slot = Math.random() * Math.PI * 2; // de que lado ele prefere cercar o herói
    this.animT = Math.random() * 10;
    this.tele = null;
    this.root = new THREE.Group();
    this.build(cfg);
    attachRigToFoe(this); // personagem 3D animado (rig.js), se houver modelo para ele
    this.meshes = [];
    this.root.traverse(o => {
      if (!o.isMesh) return;
      if (!o.userData.rigMesh) o.material = o.material.clone();
      o.material.flatShading = false; // personagens com sombreamento liso (menos "geométrico")
      o.castShadow = true;
      this.meshes.push({ m: o, mat: o.material, em: o.material.emissive ? o.material.emissive.clone() : null });
    });
    scene.add(this.root);
    this.sync();
  }

  build() {}
  think() {}

  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + this.height / 2, this.pos.z); }
  get busy() { return this.stun > 0 || this.petrify > 0; }
  get fwd() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  setState(s) { this.state = s; this.st = 0; this.struck = false; if (this.tele) { this.tele.remove(); this.tele = null; } }
  toPlayer(game) {
    const p = game.player;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    return { dx, dz, dist: Math.hypot(dx, dz), dy: p.pos.y - this.pos.y, ang: Math.atan2(dx, dz) };
  }
  face(ang, dt, k) { this.yaw = angleDamp(this.yaw, ang, k || 0.0005, dt); }
  // anda até (x, z); não pula de beiradas
  walkTo(x, z, speed, game) {
    const dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.15) { this.walk.set(0, 0, 0); return d; }
    this.walk.set(dx / d * speed, 0, dz / d * speed);
    if (!this.flying) {
      const ax = this.pos.x + dx / d * 0.8, az = this.pos.z + dz / d * 0.8;
      if (groundAt(ax, az, this.pos.y, game.level.builder.solids) < this.pos.y - 0.8) this.walk.set(0, 0, 0);
    }
    return d;
  }
  // golpe corpo a corpo: acerta se o herói estiver no alcance e no arco da frente
  melee(game, range, arcDeg, dmg, kb) {
    const p = game.player, t = this.toPlayer(game);
    if (t.dist > range + 0.4 || Math.abs(t.dy) > 1.8) return false;
    if (Math.abs(angDiff(t.ang, this.yaw)) > arcDeg * Math.PI / 360) return false;
    return p.hurt(dmg, this.pos, game, kb);
  }
  // patrulha: passeia perto de onde nasceu; vê o herói a "sight" metros
  patrol(game, dt, sight) {
    const t = this.toPlayer(game);
    if (!this.wp || this.st > 3.5 || Math.hypot(this.wp.x - this.pos.x, this.wp.z - this.pos.z) < 0.4) {
      this.wp = { x: this.home.x + rand(-3.5, 3.5), z: this.home.z + rand(-3.5, 3.5) };
      this.st = rand(-1.5, 0);
    }
    this.walkTo(this.wp.x, this.wp.z, 1.1, game);
    this.face(Math.atan2(this.walk.x, this.walk.z), dt, 0.05);
    if (t.dist < (sight || 13) && Math.abs(t.dy) < 5 && !game.player.dead) { this.alert(game); return true; }
    return false;
  }
  alert(game) {
    this.setState('chase');
    if (!this.alerted && this.weight >= 3) Sound.roar(1.7); // os pesados rugem ao ver você
    if (!this.alerted) { this.alerted = true; UI.damage(new THREE.Vector3(this.pos.x, this.pos.y + this.height + 0.5, this.pos.z), '!', '#ff5a3a', 1.4); }
  }

  // Recebe dano. o = { dir, kb, up, kind, color }  → devolve o dano (ou -1 = bloqueado)
  hurt(dmg, o, game) {
    if (this.dead) return 0;
    o = o || {};
    if (this.state === 'patrol' && game) this.alert(game);
    let crit = false;
    if (this.petrify > 0) { dmg *= 2; crit = true; }
    dmg = Math.round(dmg);
    this.hp -= dmg;
    this.flashT = 0.12;
    if (o.dir && !this.petrify) {
      const kb = (o.kb || 0) / this.weight;
      this.vel.x += o.dir.x * kb; this.vel.z += o.dir.z * kb;
      if (o.up && !this.boss) { this.vel.y = o.up / this.weight; this.onGround = false; }
    }
    // inimigos leves se encolhem e perdem o golpe que estavam preparando
    if (!this.superArmor && o.kind && this.state.endsWith('Wind')) { this.setState('recover'); this.st = -0.2; }
    if (!this.superArmor && o.kind === 'heavy') this.stun = Math.max(this.stun, 0.5);
    const c = this.center; c.y += this.height * 0.45;
    UI.damage(c, crit ? dmg + ' CRÍTICO!' : String(dmg), crit ? '#e08aff' : o.color || '#ffffff', crit || o.kind === 'heavy' ? 1.35 : 1);
    if (crit) FX.shards(this.center, 14, ['#9a948a', '#c8c2b8', '#6a665e']);
    if (this.hp <= 0) this.die(game);
    return dmg;
  }

  die(game) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
    this.hp = 0;
    this.stun = this.burn = this.petrify = 0;
    this.walk.set(0, 0, 0);
    if (this.tele) { this.tele.remove(); this.tele = null; }
    this.onDeath(game);
  }
  onDeath(game) {
    // padrão: tomba e some, soltando cacos
    FX.shards(this.center, 26, this.cfg.bits || ['#e8e2cf', '#bdb59c', '#8a8270']);
    Sound.enemyDie();
    this.flying = false;
    if (game) game.onFoeKilled(this);
  }
  whileDead(dt) {
    if (this.rig) { // modelo: a animação de morte faz a queda; depois afunda
      if (this.deadT > 1.6) this.root.position.y -= dt * 1.0;
      if (this.deadT > 2.8) { this.root.visible = false; this.gone = true; }
      return;
    }
    // cai de lado e afunda
    this.root.rotation.z = Math.min(Math.PI / 2, this.root.rotation.z + dt * 4);
    if (this.deadT > 1) this.root.position.y -= dt * 1.2;
    if (this.deadT > 2.2) { this.root.visible = false; this.gone = true; }
  }

  update(dt, game) {
    if (this.dead) { this.deadT += dt; if (this.rig) animateFoeRig(this, dt); this.whileDead(dt, game); return; }
    this.animT += dt; this.st += dt; this.cd -= dt;
    this.flashT -= dt;
    this.stun = Math.max(0, this.stun - dt);
    this.petrify = Math.max(0, this.petrify - dt);

    if (this.burn > 0) {
      this.burn -= dt;
      this.burnTick = (this.burnTick || 0) - dt;
      if (Math.random() < 0.5) FX.fire(new THREE.Vector3(this.pos.x + rand(-0.3, 0.3), this.pos.y + rand(0.3, this.height), this.pos.z + rand(-0.3, 0.3)), 1);
      if (this.burnTick <= 0) { this.burnTick = 0.5; this.hurt(this.burnDps * 0.5, { color: '#ff9a2e' }, game); if (this.dead) return; }
    }
    if (this.stun > 0 && Math.random() < 0.35) {
      FX.sparks(new THREE.Vector3(this.pos.x + rand(-0.4, 0.4), this.pos.y + rand(0.2, this.height), this.pos.z + rand(-0.4, 0.4)), 2, ['#ffffff', '#9fd3ff', '#5ab0ff']);
    }

    if (!this.busy) this.think(dt, game);
    else { this.walk.set(0, 0, 0); if (this.tele) { this.tele.remove(); this.tele = null; } }

    const solids = game.level.builder.solids;
    if (this.flying) {
      // voadores: sem gravidade, a IA controla a altura
      this.vel.multiplyScalar(Math.max(0, 1 - 4 * dt));
      this.pos.addScaledVector(this.walk, dt).addScaledVector(this.vel, dt);
      const g = groundAt(this.pos.x, this.pos.z, this.pos.y, solids);
      if (this.pos.y < g + 0.2) this.pos.y = g + 0.2;
    } else {
      this.vel.y -= 30 * dt;
      const fr = this.onGround ? 7 : 0.8;
      this.vel.x = approach(this.vel.x, 0, fr * Math.abs(this.vel.x) * dt + (this.onGround ? 1.5 * dt : 0));
      this.vel.z = approach(this.vel.z, 0, fr * Math.abs(this.vel.z) * dt + (this.onGround ? 1.5 * dt : 0));
      if (this.petrify > 0) { this.vel.x = 0; this.vel.z = 0; }
      const vx = this.vel.x + this.walk.x, vz = this.vel.z + this.walk.z;
      const nx = this.pos.x + vx * dt, nz = this.pos.z + vz * dt;
      const rr = this.radius * 0.6;
      const wall = solids.find(s => nx > s.min.x - rr && nx < s.max.x + rr && nz > s.min.z - rr && nz < s.max.z + rr && s.min.y < this.pos.y + this.height && s.max.y > this.pos.y + 0.45);
      if (!wall) { this.pos.x = nx; this.pos.z = nz; }
      else { this.hitWall = wall; this.vel.x *= -0.3; this.vel.z *= -0.3; }
      this.pos.y += this.vel.y * dt;
      const g = groundAt(this.pos.x, this.pos.z, this.pos.y, solids, 0);
      if (this.pos.y <= g) { if (!this.onGround && this.vel.y < -6) FX.dust(this.pos, 6); this.pos.y = g; this.vel.y = 0; this.onGround = true; }
      else this.onGround = false;
    }
    if (this.pos.y < game.level.killY) { FX.splash(new THREE.Vector3(this.pos.x, -1.3, this.pos.z)); this.die(game); return; }

    this.sync();
    if (this.rig) animateFoeRig(this, dt);
    this.animate(dt, game);
    this.applyLook();
  }

  sync() {
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
  }
  animate() {}

  applyLook() {
    const stone = this.petrify > 0;
    const f = this.flashT > 0 ? 1 : 0;
    const warn = this.state.endsWith('Wind') ? 0.35 + Math.sin(this.st * 30) * 0.15 : 0; // brilho vermelho no aviso
    for (const e of this.meshes) {
      const want = stone ? STONE_MAT : e.mat;
      if (e.m.material !== want) e.m.material = want;
      if (!stone && e.em) { e.mat.emissive.copy(e.em).addScalar(f * 0.8); e.mat.emissive.r += warn; }
    }
  }

  remove() { this.scene.remove(this.root); if (this.tele) this.tele.remove(); }
}

// -------------------------------------------------------------
// Modelo de ESQUELETO (usado pelo espadachim e pelo arqueiro)
// -------------------------------------------------------------
function buildSkeleton(root) {
  const bone = mat('#e8e2cf', { roughness: 0.75 }), dark = mat('#6a6252'), rag = mat('#7a1f1a');
  const eye = new THREE.MeshStandardMaterial({ color: '#ff3a1a', emissive: '#ff2a0a', emissiveIntensity: 2 });
  const limbGeo = (r, len) => { const g = new THREE.CylinderGeometry(r, r * 0.85, len, 5); g.translate(0, -len / 2, 0); return g; };
  const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  hips.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.2), bone));
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.3, 7, 1, true), rag); skirt.position.y = -0.12; hips.add(skirt);
  const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 5), bone); spine.position.y = 0.28; torso.add(spine);
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.17 - i * 0.015, 0.025, 4, 10, Math.PI * 1.4), bone);
    rib.rotation.x = Math.PI / 2; rib.rotation.z = -Math.PI * 0.2; rib.position.set(0, 0.25 + i * 0.09, 0.02); torso.add(rib);
  }
  const head = new THREE.Group(); head.position.y = 0.68; torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), bone); skull.scale.set(0.9, 1, 1); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.12), bone); jaw.position.set(0, -0.12, 0.04); head.add(jaw);
  const hole = mat('#120c08');
  for (const sx of [-0.055, 0.055]) {
    const so = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), hole); so.scale.set(1, 0.85, 0.5); so.position.set(sx, 0.01, 0.12); head.add(so);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), eye); e.position.set(sx, 0.01, 0.135); head.add(e);
  }
  const nasal = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 3), hole); nasal.position.set(0, -0.045, 0.14); nasal.rotation.x = Math.PI; head.add(nasal);
  for (let i = 0; i < 6; i++) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.03, 0.012), bone); tooth.position.set(-0.04 + i * 0.016, -0.085, 0.13); head.add(tooth); }
  for (const sx of [-1, 1]) { const cb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), bone); cb.position.set(sx * 0.085, -0.04, 0.1); head.add(cb); }
  const mk = (sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.22, 0.55, 0); torso.add(sh);
    sh.add(new THREE.Mesh(limbGeo(0.035, 0.3), bone));
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    el.add(new THREE.Mesh(limbGeo(0.03, 0.28), bone));
    const hand = new THREE.Group(); hand.position.y = -0.3; el.add(hand);
    return { sh, el, hand };
  };
  const armR = mk(-1), armL = mk(1);
  const leg = (sx) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.1, -0.05, 0); hips.add(hip);
    hip.add(new THREE.Mesh(limbGeo(0.045, 0.45), bone));
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    knee.add(new THREE.Mesh(limbGeo(0.04, 0.44), dark));
    return { hip, knee };
  };
  return { hips, torso, head, armR, armL, legR: leg(-1), legL: leg(1) };
}
// caminhada genérica para os esqueletos
function walkCycle(j, speed, t, dt) {
  const a = Math.min(1, speed / 3);
  const s = Math.sin(t * 9) * a;
  j.legL.hip.rotation.x = -s * 0.7; j.legR.hip.rotation.x = s * 0.7;
  j.legL.knee.rotation.x = Math.max(0, Math.cos(t * 9)) * a; j.legR.knee.rotation.x = Math.max(0, -Math.cos(t * 9)) * a;
  j.hips.position.y = 0.95 + Math.abs(Math.cos(t * 9)) * 0.04 * a;
}

// -------------------------------------------------------------
// ESQUELETO ESPADACHIM — escudo levantado BLOQUEIA golpes rápidos
// pela frente. Use o golpe pesado (quebra a guarda), os poderes,
// ou esquive e ataque pelas costas.
// -------------------------------------------------------------
class SkeletonSword extends Foe {
  constructor(scene, pos, yaw, elite) {
    super(scene, pos, { name: elite ? 'Espadachim de elite' : 'Esqueleto espadachim', hp: elite ? 95 : 60, radius: 0.5, height: 1.85, yaw, elite });
    this.speed = elite ? 4.2 : 3.2;
    this.dmg = elite ? 14 : 10;
  }
  build(cfg) {
    this.j = buildSkeleton(this.root);
    if (cfg.elite) { // faixa vermelha e penacho: mais forte e mais rápido
      const red = mat('#b3121b');
      const sash = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 4, 10), red); sash.rotation.x = Math.PI / 2; sash.position.y = 0.2; this.j.torso.add(sash);
      const plume = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 4, 10, Math.PI), red); plume.rotation.y = Math.PI / 2; plume.position.y = 0.14; this.j.head.add(plume);
      this.j.head.children.forEach(c => { if (c.material && c.material.emissive && c.material.emissiveIntensity > 1) { c.material = c.material.clone(); c.material.color.set('#ffd21a'); c.material.emissive.set('#ffb000'); } });
    }
    const bronze = mat('#b8802f', { metalness: 0.75, roughness: 0.35 }), iron = mat('#9aa0a6', { metalness: 0.8, roughness: 0.3 });
    const sword = new THREE.Group(); this.j.armR.hand.add(sword);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.02), iron); blade.position.y = -0.42; sword.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.05), bronze); guard.position.y = -0.04; sword.add(guard);
    sword.rotation.x = -Math.PI / 2;
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), bronze);
    shield.rotation.x = Math.PI / 2; shield.position.set(0, -0.1, 0.12);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat('#7a1f1a')); boss.position.set(0, -0.1, 0.16);
    this.j.armL.hand.add(shield, boss);
    this.shield = shield;
  }
  get guarding() { return this.state === 'chase' && this.stun <= 0 && this.petrify <= 0; }
  hurt(dmg, o, game) {
    o = o || {};
    // golpe rápido pela frente com o escudo erguido = BLOQUEADO
    if (o.kind === 'light' && o.dir && this.guarding && o.dir.dot(this.fwd) < -0.25) {
      Sound.block();
      FX.sparks(new THREE.Vector3(this.pos.x, this.pos.y + 1.2, this.pos.z).addScaledVector(this.fwd, 0.5), 14, ['#ffffff', '#ffe08a']);
      UI.damage(new THREE.Vector3(this.pos.x, this.pos.y + 2.3, this.pos.z), 'BLOQUEOU!', '#9fd3ff', 0.9);
      this.vel.addScaledVector(o.dir, 2);
      this.blocks = (this.blocks || 0) + 1;
      if (this.blocks >= 3) { this.blocks = 0; this.setState('bashWind'); } // contra-ataca com o escudo
      return -1;
    }
    if (o.kind === 'heavy' && this.guarding) {
      this.stun = Math.max(this.stun, 1.3);
      UI.damage(new THREE.Vector3(this.pos.x, this.pos.y + 2.5, this.pos.z), 'GUARDA QUEBRADA', '#ffcf4a', 0.9);
    }
    return super.hurt(dmg, o, game);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player;
    switch (this.state) {
      case 'patrol': this.patrol(game, dt, 13); break;
      case 'chase': {
        this.face(t.ang, dt, 0.001);
        // cerca o herói pelo seu "lado" preferido (não ficam todos em fila)
        const ox = p.pos.x - Math.sin(this.slot) * 1.9, oz = p.pos.z - Math.cos(this.slot) * 1.9;
        if (t.dist > 2.2) this.walkTo(t.dist > 5 ? p.pos.x : ox, t.dist > 5 ? p.pos.z : oz, this.speed, game); else this.walk.set(0, 0, 0);
        if (t.dist < 2.7 && this.cd <= 0 && !p.dead) this.setState('swingWind');
        if (t.dist > 24 || p.dead) this.setState('patrol');
        break;
      }
      case 'swingWind':
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.0005);
        if (this.st > 0.55) { this.setState('swing'); Sound.enemySwing(); }
        break;
      case 'swing':
        this.walk.copy(this.fwd).multiplyScalar(this.st < 0.15 ? 5 : 0);
        if (!this.struck && this.st > 0.06) { this.struck = true; this.melee(game, 2.4, 110, this.dmg, 6); }
        if (this.st > 0.3) { this.setState('recover'); }
        break;
      case 'bashWind':
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.0005);
        if (this.st > 0.35) { this.setState('bash'); Sound.block(); }
        break;
      case 'bash':
        this.walk.copy(this.fwd).multiplyScalar(this.st < 0.2 ? 7 : 0);
        if (!this.struck && this.melee(game, 1.8, 90, 6, 11)) this.struck = true;
        if (this.st > 0.35) this.setState('recover');
        break;
      case 'recover':
        this.walk.set(0, 0, 0);
        if (this.st > 0.6) { this.setState('chase'); this.cd = rand(0.7, 1.5); }
        break;
    }
  }
  animate(dt) {
    const j = this.j, sp = this.walk.length();
    walkCycle(j, sp, this.animT, dt);
    let rx = -0.3, rz = -0.2, lx = -1.2, lz = 0.3;
    if (this.state === 'swingWind') { rx = lerp(-0.3, -2.8, Math.min(1, this.st / 0.3)); rz = -0.4; }
    else if (this.state === 'swing') { rx = lerp(-2.8, -0.6, Math.min(1, this.st / 0.08)); rz = 0.3; }
    else if (this.state === 'patrol' || this.state === 'recover') { lx = -0.4; lz = 0.25; }
    if (this.state === 'bash' || this.state === 'bashWind') { lx = -1.6; lz = 0; }
    j.armR.sh.rotation.x = damp(j.armR.sh.rotation.x, rx, 0.0001, dt); j.armR.sh.rotation.z = rz;
    j.armL.sh.rotation.x = damp(j.armL.sh.rotation.x, lx, 0.001, dt); j.armL.sh.rotation.z = lz;
    j.armL.el.rotation.x = -0.9;
    j.torso.rotation.x = this.state === 'swing' ? 0.3 : 0.05;
  }
}

// -------------------------------------------------------------
// ARQUEIRO — fica longe, MIRA com uma linha vermelha e atira
// (a linha pisca quando a mira trava: hora de esquivar!)
// -------------------------------------------------------------
class SkeletonArcher extends Foe {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'Arqueiro morto-vivo', hp: 40, radius: 0.45, height: 1.85, yaw });
    // linha de mira (fica fora do grupo para não piscar com o resto)
    const lg = new THREE.CylinderGeometry(0.02, 0.02, 1, 4); lg.rotateX(Math.PI / 2); lg.translate(0, 0, 0.5);
    this.laser = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ color: '#ff2a1a', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.laser.visible = false;
    scene.add(this.laser);
  }
  build() {
    this.j = buildSkeleton(this.root);
    const wood = mat('#6b4a2a');
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 4, 14, Math.PI), wood);
    bow.rotation.z = Math.PI / 2; bow.position.set(0, -0.05, 0.05);
    this.j.armL.hand.add(bow);
    this.bow = bow;
    // aljava nas costas
    const q = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.55, 6), mat('#5a3a20'));
    q.position.set(0.1, 0.4, -0.16); q.rotation.z = 0.4; this.j.torso.add(q);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player;
    this.laser.visible = false;
    switch (this.state) {
      case 'patrol': this.patrol(game, dt, 18); break;
      case 'chase': {
        this.face(t.ang, dt, 0.001);
        if (t.dist < 6) this.walkTo(this.pos.x - t.dx, this.pos.z - t.dz, 3, game);       // recua
        else if (t.dist > 15) this.walkTo(p.pos.x, p.pos.z, 2.6, game);                   // aproxima
        else { const s = Math.sin(this.animT * 0.7 + this.slot); this.walk.set(Math.cos(t.ang) * s * 1.2, 0, -Math.sin(t.ang) * s * 1.2); } // anda de lado
        if (this.cd <= 0 && t.dist < 19 && !p.dead) this.setState('aimWind');
        if (t.dist > 28 || p.dead) this.setState('patrol');
        break;
      }
      case 'aimWind': {
        this.walk.set(0, 0, 0);
        const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.45, this.pos.z).addScaledVector(this.fwd, 0.4);
        if (this.st < 0.8) { // acompanha o herói…
          this.face(t.ang, dt, 0.00001);
          this.aimAt = new THREE.Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z);
        }                    // …e nos últimos 0,35 s a mira TRAVA
        const dir = this.aimAt.clone().sub(from);
        this.laser.visible = this.st < 0.8 || Math.floor(this.st * 20) % 2 === 0;
        this.laser.position.copy(from);
        this.laser.lookAt(this.aimAt);
        this.laser.scale.set(1, 1, Math.min(30, dir.length() + 4));
        this.laser.material.opacity = this.st < 0.8 ? 0.45 : 1;
        if (this.st > 1.15) {
          Shots.add({ type: 'arrow', pos: from, vel: dir.normalize().multiplyScalar(30), dmg: 12 });
          Sound.arrow();
          this.setState('recover');
        }
        break;
      }
      case 'recover':
        this.walk.set(0, 0, 0);
        if (this.st > 0.5) { this.setState('chase'); this.cd = rand(1.6, 2.4); }
        break;
    }
  }
  animate(dt) {
    const j = this.j;
    walkCycle(j, this.walk.length(), this.animT, dt);
    const aiming = this.state === 'aimWind';
    j.armL.sh.rotation.x = damp(j.armL.sh.rotation.x, aiming ? -1.55 : -0.3, 0.001, dt);
    j.armR.sh.rotation.x = damp(j.armR.sh.rotation.x, aiming ? -1.5 : -0.2, 0.001, dt);
    j.armR.el.rotation.x = aiming ? -1.4 * Math.min(1, this.st / 0.6) : -0.3;
    j.armR.sh.rotation.z = aiming ? 0.3 : -0.15;
  }
  die(game) { this.laser.visible = false; super.die(game); }
  remove() { super.remove(); this.scene.remove(this.laser); }
}

// -------------------------------------------------------------
// GUERREIRO PESADO — lento, enorme, não é interrompido. Os golpes
// são devastadores, mas o lugar onde vão cair aparece EM VERMELHO.
// -------------------------------------------------------------
// variant: undefined = Guerreiro pesado | 'automaton' = Autômato de Bronze | 'minoguard' = Guardião Minotauro
const HEAVY_VARIANTS = {
  normal: { name: 'Guerreiro pesado', hp: 220 },
  automaton: { name: 'Autômato de Bronze', hp: 280 },
  minoguard: { name: 'Guardião Minotauro', hp: 250 },
};
class HeavyWarrior extends Foe {
  constructor(scene, pos, yaw, variant) {
    const V = HEAVY_VARIANTS[variant || 'normal'];
    super(scene, pos, { name: V.name, hp: V.hp, radius: 0.85, height: 2.6, weight: 3.5, superArmor: true, yaw, variant, bits: ['#7a5220', '#b8802f', '#3a2a1a'] });
  }
  build(cfg) {
    const v = cfg.variant;
    const bronze = mat(v === 'automaton' ? '#c08a3a' : '#9a6a2a', { metalness: 0.75, roughness: 0.4 });
    const skin = v === 'automaton' ? mat('#8a5a22', { metalness: 0.8, roughness: 0.35 }) : v === 'minoguard' ? mat('#4a2e1e') : mat('#8a5a3a');
    const leather = mat('#4a2e1a'), iron = mat('#a8a8b4', { metalness: 0.85, roughness: 0.3 });
    const body = new THREE.Group(); this.root.add(body); this.body = body;
    const limb = (r, len, m) => { const g = new THREE.CylinderGeometry(r, r * 0.85, len, 7); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, m); };
    const hips = new THREE.Group(); hips.position.y = 1.25; body.add(hips); this.hips = hips;
    hips.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.45, 16), leather));
    // saiote pregueado + cinto com fivela
    const skirt = pleatedSkirt(0.46, 0.62, 0.7, v === 'automaton' ? '#6a4a1a' : '#6a1414', 14); skirt.position.y = 0.1; hips.add(skirt);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.1, 18), leather); belt.position.y = 0.2; hips.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), smooth('#d4a73a', { metalness: 0.9, roughness: 0.25 })); buckle.position.set(0, 0.2, 0.46); hips.add(buckle);
    const torso = new THREE.Group(); torso.position.y = 0.2; hips.add(torso); this.torso = torso;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.9, 18), bronze); chest.position.y = 0.45; chest.scale.z = 0.75; torso.add(chest);
    const head = new THREE.Group(); head.position.y = 1.08; head.scale.setScalar(1.35); torso.add(head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: v === 'automaton' ? '#ffb030' : '#ff3a1a', emissive: v === 'automaton' ? '#ff8a0a' : '#ff2a0a', emissiveIntensity: 2.2 });
    if (v === 'minoguard') { // cabeça de touro
      const sk = new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 14), skin); sk.scale.set(0.95, 0.9, 1.05); head.add(sk);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), smooth('#6e4a36')); snout.scale.set(1, 0.75, 0.9); snout.position.set(0, -0.1, 0.24); head.add(snout);
      for (const sx of [-1, 1]) {
        const ns = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), smooth('#120806')); ns.scale.set(1, 0.6, 0.5); ns.position.set(sx * 0.065, -0.09, 0.39); head.add(ns);
        const ew = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), smooth('#f0e8d8')); ew.position.set(sx * 0.14, 0.06, 0.2); head.add(ew);
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat); e.position.set(sx * 0.145, 0.06, 0.24); head.add(e);
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), skin); ear.position.set(sx * 0.27, 0.08, -0.02); ear.rotation.z = -sx * 1.7; ear.scale.z = 0.5; head.add(ear);
      }
    } else {
      if (v === 'automaton') { // rosto de estátua de bronze, olhos de forno
        Face.human(head, { r: 0.24, y: 0, skinMat: bronze, glow: true, eye: '#ffb030', brow: '#5a3a10', angry: 0.8, lip: '#6a4a1a', socket: '#3a2008', ears: false });
        const grill = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.03), eyeMat); grill.position.set(0, -0.11, 0.24); head.add(grill);
      } else { // soldado de Ares: rosto marcado, barba e elmo
        Face.human(head, { r: 0.24, y: -0.02, skin: '#9a6a4a', glow: true, eye: '#ff3a1a', brow: '#100806', beard: '#1a0e08', angry: 1, lip: '#5a2a20', socket: '#3a1a10' });
      }
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), bronze); helm.scale.set(1, 1.05, 1.1); helm.position.y = 0.04; head.add(helm);
    }
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(v === 'minoguard' ? 0.09 : 0.07, v === 'minoguard' ? 0.7 : 0.5, 6), mat('#efe2c0'));
      horn.position.set(sx * 0.3, 0.2, 0); horn.rotation.z = -sx * 0.9; head.add(horn);
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze); pad.position.set(sx * 0.62, 0.82, 0); torso.add(pad);
    }
    const mkArm = (sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.68, 0.78, 0); torso.add(sh);
      sh.add(limb(0.15, 0.55, skin));
      const el = new THREE.Group(); el.position.y = -0.55; sh.add(el);
      el.add(limb(0.13, 0.5, bronze));
      return { sh, el };
    };
    this.armR = mkArm(-1); this.armL = mkArm(1);
    // machado duplo (lábris) seguro com as duas mãos
    const axe = new THREE.Group(); this.armR.el.add(axe); axe.position.y = -0.5; this.axe = axe;
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6), leather); haft.rotation.x = Math.PI / 2; haft.position.z = 0.6; axe.add(haft);
    for (const sy of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.55 * sy, 0.1, 0.62 * sy, 0.5); sh.quadraticCurveTo(0.3 * sy, 0.3, 0, 0.42);
      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }), iron);
      blade.rotation.x = -Math.PI / 2; blade.position.set(0, 0, 1.25); axe.add(blade);
    }
    const leg = (sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.25, -0.15, 0); hips.add(hip);
      hip.add(limb(0.17, 0.6, skin));
      const knee = new THREE.Group(); knee.position.y = -0.6; hip.add(knee);
      knee.add(limb(0.15, 0.55, bronze));
      return { hip, knee };
    };
    this.legR = leg(-1); this.legL = leg(1);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player;
    switch (this.state) {
      case 'patrol': this.patrol(game, dt, 12); break;
      case 'chase':
        this.face(t.ang, dt, 0.01);
        if (t.dist > 2.6) this.walkTo(p.pos.x, p.pos.z, 2.2, game); else this.walk.set(0, 0, 0);
        if (t.dist < 4 && this.cd <= 0 && !p.dead) {
          this.setState(Math.random() < 0.55 ? 'slamWind' : 'sweepWind');
          if (this.state === 'slamWind') {
            const c = this.pos.clone().addScaledVector(this.fwd, 2.6);
            this.slamAt = c;
            this.tele = Tele.add('circle', { x: c.x, y: this.pos.y, z: c.z, r: 2.1, dur: 1.0 });
          } else this.tele = Tele.add('circle', { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 3.5, dur: 0.85 });
          Sound.roar(1.6);
        }
        if (t.dist > 24 || p.dead) this.setState('patrol');
        break;
      case 'slamWind':
        this.walk.set(0, 0, 0);
        if (this.st > 1.0) {
          this.setState('slam');
          const c = this.slamAt;
          game.shake(0.55); Sound.crash();
          FX.dust(c, 18); FX.ring(c, '#ffcf8a', 3);
          FX.burst(c, 20, { speed: [2, 7], up: 4, life: [0.5, 0.9], size: [0.1, 0.25], colors: ['#8a7660', '#6d5a48'], gravity: -18 });
          if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 2.4 && p.pos.y - this.pos.y < 1.5) p.hurt(26, c, game, 11);
          Shots.add({ type: 'wave', pos: new THREE.Vector3(c.x, this.pos.y, c.z), speed: 9, max: 7, dmg: 10, color: '#d8b080' });
        }
        break;
      case 'sweepWind':
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.05);
        if (this.st > 0.85) { this.setState('sweep'); Sound.enemySwing(); }
        break;
      case 'sweep':
        this.yaw += dt * 16;
        if (!this.struck && this.st > 0.1) {
          this.struck = true;
          if (t.dist < 3.6 && Math.abs(t.dy) < 1.6) p.hurt(18, this.pos, game, 12);
          FX.ring(this.pos, '#ffcf8a', 3.6);
        }
        if (this.st > 0.4) { this.setState('recover'); }
        break;
      case 'recover': // momento vulnerável
        this.walk.set(0, 0, 0);
        if (this.st > 1.1) { this.setState('chase'); this.cd = rand(0.8, 1.6); }
        break;
    }
  }
  animate(dt) {
    const sp = this.walk.length(), s = Math.sin(this.animT * 5) * Math.min(1, sp / 2);
    this.legL.hip.rotation.x = -s * 0.5; this.legR.hip.rotation.x = s * 0.5;
    let ax = -0.6, tx = 0.05;
    if (this.state === 'slamWind') { ax = lerp(-0.6, -3.0, Math.min(1, this.st / 0.6)); tx = -0.25; }
    else if (this.state === 'slam') { ax = -0.4; tx = 0.4; }
    else if (this.state === 'sweepWind') { ax = -1.4; tx = 0; }
    else if (this.state === 'sweep') { ax = -1.5; }
    this.armR.sh.rotation.x = damp(this.armR.sh.rotation.x, ax, this.state === 'slam' ? 1e-8 : 0.001, dt);
    this.armL.sh.rotation.x = this.armR.sh.rotation.x;
    this.armR.sh.rotation.z = -0.3; this.armL.sh.rotation.z = 0.3;
    this.torso.rotation.x = damp(this.torso.rotation.x, tx, 0.001, dt);
    this.axe.rotation.x = -0.6;
  }
}

// -------------------------------------------------------------
// HARPIA — voa em volta e MERGULHA em você, empurrando (cuidado
// nas pontes!). Bata nela quando descer, ou use o raio de Zeus.
// -------------------------------------------------------------
class Harpy extends Foe {
  constructor(scene, pos, yaw) {
    super(scene, new THREE.Vector3(pos.x, pos.y + 2.6, pos.z), { name: 'Harpia', hp: 34, radius: 0.55, height: 1.1, flying: true, yaw, bits: ['#6d4a6b', '#4a2f4f', '#d9c2a8'] });
    this.orbit = Math.random() * Math.PI * 2;
  }
  build() {
    const body = mat('#6d4a6b'), skin = mat('#d9c2a8'), wingM = mat('#4a2f4f', { side: THREE.DoubleSide }), claw = mat('#e09a3a');
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), body); torso.scale.set(0.8, 1.1, 0.8); torso.position.y = 0.55; this.root.add(torso);
    const head = new THREE.Group(); head.position.set(0, 0.98, 0.08); this.root.add(head);
    Face.human(head, { r: 0.16, y: 0, skin: '#d9c2a8', glow: true, eye: '#ffd21a', brow: '#1e1420', angry: 1, lip: '#6a2a3a', fangs: true, mouthOpen: 0.5, socket: '#6a4a5a' });
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 6), mat('#1e1420')); hair.position.set(0, 0.92, -0.18); hair.rotation.x = -1.2; this.root.add(hair);
    const eye = new THREE.MeshStandardMaterial({ color: '#ffd21a', emissive: '#ffb000', emissiveIntensity: 2 });
    for (const sx of [-0.1, 0.1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), claw); c.position.set(sx, 0.12, 0.05); c.rotation.x = Math.PI; this.root.add(c); }
    this.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * 0.18, 0.7, -0.05); this.root.add(pivot);
      const shp = new THREE.Shape(); shp.moveTo(0, 0); shp.lineTo(1.0, 0.25); shp.lineTo(0.85, 0.05); shp.lineTo(1.05, -0.1); shp.lineTo(0.8, -0.2); shp.lineTo(0.9, -0.38); shp.lineTo(0.2, -0.3);
      const w = new THREE.Mesh(new THREE.ShapeGeometry(shp), wingM); w.scale.x = sx; w.rotation.x = -Math.PI / 2 + 0.2;
      pivot.add(w); this.wings.push({ pivot, sx });
    }
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player;
    const gY = Math.max(p.pos.y, groundAt(this.pos.x, this.pos.z, this.pos.y, game.level.builder.solids));
    switch (this.state) {
      case 'patrol': {
        this.walk.set(Math.sin(this.animT * 0.6) * 1.5, (this.home.y - this.pos.y) * 2, Math.cos(this.animT * 0.5) * 1.5);
        this.face(Math.atan2(this.walk.x, this.walk.z), dt, 0.05);
        if (t.dist < 14 && !p.dead) this.alert(game);
        break;
      }
      case 'chase': {
        // voa em círculo em volta do herói
        this.orbit += dt * 0.7;
        const tx = p.pos.x + Math.sin(this.orbit) * 6, tz = p.pos.z + Math.cos(this.orbit) * 6, ty = gY + 2.6;
        this.walk.set(clamp((tx - this.pos.x) * 2, -7, 7), clamp((ty - this.pos.y) * 3, -6, 6), clamp((tz - this.pos.z) * 2, -7, 7));
        this.face(t.ang, dt, 0.005);
        if (this.cd <= 0 && t.dist < 12 && !p.dead) { this.setState('diveWind'); Sound.tone({ freq: 1400, freq2: 900, dur: 0.3, type: 'sawtooth', vol: 0.05 }); }
        if (t.dist > 30 || p.dead) this.setState('patrol');
        break;
      }
      case 'diveWind':
        this.walk.set(0, 2, 0); this.face(t.ang, dt, 0.0005);
        if (this.st > 0.6) {
          this.target = new THREE.Vector3(p.pos.x, p.pos.y + 0.8, p.pos.z);
          const d = this.target.clone().sub(this.pos).normalize();
          this.diveDir = d;
          this.setState('dive');
        }
        break;
      case 'dive':
        this.walk.copy(this.diveDir).multiplyScalar(17);
        if (!this.struck && Shots.hitsPlayer(new THREE.Vector3(this.pos.x, this.pos.y + 0.5, this.pos.z), 0.7, p)) {
          this.struck = true;
          // empurra forte na direção do mergulho
          if (p.hurt(10, this.pos.clone().addScaledVector(this.diveDir, -2), game, 11)) Sound.hit(false);
        }
        if (this.st > 0.75 || this.pos.y < gY + 0.4) this.setState('rise');
        break;
      case 'rise':
        this.walk.set(this.walk.x * 0.9, 4, this.walk.z * 0.9);
        if (this.st > 0.9) { this.setState('chase'); this.cd = rand(2, 3); }
        break;
    }
  }
  animate() {
    const dive = this.state === 'dive';
    const flap = dive ? -0.9 : Math.sin(this.animT * 13) * 0.7;
    for (const w of this.wings) w.pivot.rotation.z = w.sx * flap;
    this.root.rotation.x = dive ? 0.8 : 0;
  }
  onDeath(game) { this.flying = false; super.onDeath(game); }
}

// -------------------------------------------------------------
// GÓRGONA — corpo de serpente; mantém distância e lança magia verde
// que persegue e te deixa LENTO (petrificando).
// -------------------------------------------------------------
class Gorgon extends Foe {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'Górgona', hp: 55, radius: 0.55, height: 1.9, yaw, bits: ['#4fb34a', '#2a7a2e', '#9adf6a'] });
  }
  build() {
    const scale = mat('#3f6b3a'), skin = mat('#7da06a'), belly = mat('#b9c47a');
    this.tail = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.28 - i * 0.03, 8, 6), i % 2 ? scale : belly);
      s.scale.y = 0.7; this.root.add(s); this.tail.push(s);
    }
    const torso = new THREE.Group(); torso.position.y = 0.75; this.root.add(torso); this.torso = torso;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.6, 7), skin); chest.position.y = 0.3; torso.add(chest);
    const head = new THREE.Group(); head.position.y = 0.78; torso.add(head);
    Face.human(head, { r: 0.16, y: 0, skin: '#7da06a', glow: true, eye: '#b8ff4a', brow: '#2a4a20', angry: 0.9, lip: '#2a4a2a', fangs: true, mouthOpen: 0.35, socket: '#3a5a2a', ears: false });
    this.snakes = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const sn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.35, 4), scale);
      sn.position.set(Math.sin(a) * 0.13, 0.9, Math.cos(a) * 0.13); sn.rotation.set(Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8);
      torso.add(sn); this.snakes.push(sn);
    }
    const eye = new THREE.MeshStandardMaterial({ color: '#b8ff4a', emissive: '#8aff2a', emissiveIntensity: 2.5 });
    const arm = new THREE.Group(); arm.position.set(-0.24, 0.5, 0); torso.add(arm); this.arm = arm;
    const a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 5), skin); a1.position.y = -0.25; arm.add(a1);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshStandardMaterial({ color: '#7aff6a', emissive: '#4aff3a', emissiveIntensity: 2 }));
    orb.position.y = -0.52; arm.add(orb);
  }
  think(dt, game) {
    const t = this.toPlayer(game), p = game.player;
    switch (this.state) {
      case 'patrol': this.patrol(game, dt, 15); break;
      case 'chase':
        this.face(t.ang, dt, 0.002);
        if (t.dist < 6.5) this.walkTo(this.pos.x - t.dx, this.pos.z - t.dz, 2.4, game);
        else if (t.dist > 11) this.walkTo(p.pos.x, p.pos.z, 2.2, game);
        else this.walk.set(0, 0, 0);
        if (this.cd <= 0 && t.dist < 15 && !p.dead) this.setState('castWind');
        if (t.dist > 28 || p.dead) this.setState('patrol');
        break;
      case 'castWind':
        this.walk.set(0, 0, 0); this.face(t.ang, dt, 0.0005);
        if (Math.random() < 0.5) FX.add({ x: this.pos.x + rand(-0.3, 0.3), y: this.pos.y + 1.6, z: this.pos.z + rand(-0.3, 0.3), vy: 1, life: 0.4, size: 0.15, color: '#b8ff7a', glow: true });
        if (this.st > 0.8) {
          const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.4, this.pos.z).addScaledVector(this.fwd, 0.5);
          const dir = new THREE.Vector3(p.pos.x, p.pos.y + 1, p.pos.z).sub(from).normalize();
          Shots.add({ type: 'bolt', pos: from, vel: dir.multiplyScalar(9), homing: 1.4, dmg: 8, slow: true, color: '#7aff6a', r: 0.22 });
          Sound.shoot();
          this.setState('recover');
        }
        break;
      case 'recover':
        if (this.st > 0.5) { this.setState('chase'); this.cd = rand(2.2, 3); }
        break;
    }
  }
  animate(dt) {
    // cauda ondulando
    for (let i = 0; i < this.tail.length; i++) {
      const s = this.tail[i];
      s.position.set(Math.sin(this.animT * 3 + i * 0.9) * 0.15 * i * 0.4, 0.22 + (i === 0 ? 0.25 : 0), -i * 0.32);
    }
    for (let i = 0; i < this.snakes.length; i++) this.snakes[i].rotation.y = Math.sin(this.animT * 6 + i) * 0.4;
    this.arm.rotation.x = damp(this.arm.rotation.x, this.state === 'castWind' ? -1.6 : -0.2, 0.001, dt);
    this.torso.position.y = 0.75 + Math.sin(this.animT * 2) * 0.04;
  }
}

// -------------------------------------------------------------
// BONECO DE TREINO — palha e madeira. Não ataca. Levanta de novo.
// -------------------------------------------------------------
class TrainingDummy extends Foe {
  constructor(scene, pos, yaw) {
    super(scene, pos, { name: 'Boneco de treino', hp: 140, radius: 0.55, height: 1.9, weight: 1, yaw: yaw || 0 });
    this.wobble = 0; this.wobbleV = 0;
    this.state = 'idle';
  }
  build() {
    const wood = mat('#7a5a34'), straw = mat('#d8b860'), rope = mat('#8a6a3a'), bronze = mat('#9a7a3a', { metalness: 0.6, roughness: 0.45 });
    const body = new THREE.Group(); this.root.add(body); this.body = body;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.18, 10), wood); base.position.y = 0.09; this.root.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 6), wood); post.position.y = 0.6; body.add(post);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.75, 9), straw); torso.position.y = 1.2; body.add(torso);
    for (const yy of [0.98, 1.42]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 4, 12), rope); r.rotation.x = Math.PI / 2; r.position.y = yy; body.add(r); }
    const arms = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), wood); arms.rotation.z = Math.PI / 2; arms.position.y = 1.4; body.add(arms);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), straw); head.position.y = 1.72; body.add(head);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze); helm.position.y = 1.76; body.add(helm);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 12), bronze); shield.rotation.x = Math.PI / 2; shield.position.set(0.5, 1.25, 0.12); body.add(shield);
  }
  hurt(dmg, o, game) {
    const d = super.hurt(dmg, o, game);
    this.state = 'idle';
    if (o && o.dir && !this.petrify) this.wobbleV += (o.kind === 'heavy' ? 9 : 5) * (Math.random() < 0.5 ? 1 : -1);
    return d;
  }
  animate(dt) {
    this.wobbleV += -this.wobble * 60 * dt - this.wobbleV * 6 * dt;
    this.wobble += this.wobbleV * dt;
    if (this.petrify > 0) { this.wobble = 0; this.wobbleV = 0; }
    this.body.rotation.z = this.wobble * 0.12;
    this.body.rotation.x = this.wobble * 0.05;
  }
  onDeath(game) {
    FX.shards(this.center, 30, ['#d8b860', '#b89840', '#7a5a34']);
    FX.burst(this.center, 20, { speed: [1, 4], up: 2, life: [0.6, 1.2], size: [0.2, 0.4], colors: ['#e8d080'], alpha: 0.7, drag: 2, gravity: -6 });
    Sound.bones();
    this.root.visible = false;
    if (game) game.onFoeKilled(this);
  }
  whileDead() {
    if (this.deadT > 4) {
      this.dead = false;
      this.hp = this.maxHp;
      this.pos.copy(this.home); this.vel.set(0, 0, 0);
      this.root.visible = true;
      this.sync();
      FX.dust(this.pos, 12);
    }
  }
}

// -------------------------------------------------------------
// LISTA DE INIMIGOS
// -------------------------------------------------------------
const FOE_TYPES = {
  dummy: TrainingDummy, sword: SkeletonSword, archer: SkeletonArcher, heavy: HeavyWarrior, harpy: Harpy, gorgon: Gorgon,
  elite: class extends SkeletonSword { constructor(s, p, y) { super(s, p, y, true); } },
  automaton: class extends HeavyWarrior { constructor(s, p, y) { super(s, p, y, 'automaton'); } },
  minoguard: class extends HeavyWarrior { constructor(s, p, y) { super(s, p, y, 'minoguard'); } },
};

const Enemies = {
  list: [],
  spawn(foe) { this.list.push(foe); return foe; },
  make(type, scene, pos, yaw) { return this.spawn(new FOE_TYPES[type](scene, pos, yaw)); },
  update(dt, game) {
    const p = game.player;
    for (const e of this.list) {
      // inimigos longe e calmos "dormem" (economiza o computador em fases longas)
      if (!e.boss && !e.dead && e.state === 'patrol' && Math.abs(e.pos.x - p.pos.x) > 55) continue;
      e.update(dt, game);
    }
    // ninguém fica um dentro do outro (nem dentro do herói)
    const alive = this.list.filter(e => !e.dead && !e.flying && Math.abs(e.pos.x - p.pos.x) < 40);
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      for (let k = i + 1; k < alive.length; k++) {
        const b = alive[k], dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
        if (d < min && d > 1e-4 && Math.abs(a.pos.y - b.pos.y) < 1.5) {
          const push = (min - d) / 2, wa = b.weight / (a.weight + b.weight);
          a.pos.x -= dx / d * push * wa * 2; a.pos.z -= dz / d * push * wa * 2;
          b.pos.x += dx / d * push * (1 - wa) * 2; b.pos.z += dz / d * push * (1 - wa) * 2;
        }
      }
      if (!p.dead && p.dashT <= 0) {
        const dx = p.pos.x - a.pos.x, dz = p.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = a.radius + 0.38;
        if (d < min && d > 1e-4 && p.pos.y < a.pos.y + a.height && p.pos.y + 1.8 > a.pos.y) {
          p.pos.x += dx / d * (min - d); p.pos.z += dz / d * (min - d);
        }
      }
    }
    // tira da cena quem já sumiu
    for (const e of this.list) if (e.gone) e.remove();
    this.list = this.list.filter(e => !e.gone);
  },
  alive() { return this.list.filter(e => !e.dead); },
  clear() { for (const e of this.list) e.remove(); this.list = []; },
};
