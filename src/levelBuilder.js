// =============================================================
// levelBuilder.js — monta as fases em BLOCOS 3D.
//
// Cada bloco sólido vira duas coisas:
//   1) uma malha (mesh) que aparece na tela
//   2) uma "caixa de colisão" (AABB = caixa alinhada aos eixos)
//      que o herói usa para pisar e bater nas paredes.
//
// Aqui ficam as PEÇAS (blocos, colunas, braseiros, baús, altares,
// portões, alavancas, plataformas móveis, espinhos, céu, mar/lava).
// As 10 fases são montadas com essas peças em phases.js.
// =============================================================

const Tex = {
  // Textura feita no código: um canvas com pintinhas/manchas, repetida pela superfície
  make(base, spots, opts) {
    opts = opts || {};
    const S = 128, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    const rng = makeRng(opts.seed || 7);
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    for (let i = 0; i < (opts.blobs || 0); i++) {
      g.fillStyle = spots[Math.floor(rng() * spots.length)];
      g.globalAlpha = 0.25 + rng() * 0.3;
      const x = rng() * S, y = rng() * S, r = 4 + rng() * 14;
      for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 900; i++) {
      g.fillStyle = spots[Math.floor(rng() * spots.length)];
      g.globalAlpha = 0.25 + rng() * 0.4;
      g.fillRect(rng() * S, rng() * S, 1 + rng() * 2, 1 + rng() * 2);
    }
    if (opts.bricks) {
      g.globalAlpha = 0.35; g.strokeStyle = '#000'; g.lineWidth = 2;
      for (let row = 0; row < 4; row++) {
        g.beginPath(); g.moveTo(0, row * 32); g.lineTo(S, row * 32); g.stroke();
        for (let x = (row % 2) * 32; x < S; x += 64) { g.beginPath(); g.moveTo(x, row * 32); g.lineTo(x, row * 32 + 32); g.stroke(); }
      }
    }
    if (opts.veins) {
      g.globalAlpha = 0.25; g.strokeStyle = '#8a8070'; g.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        g.beginPath(); let x = rng() * S, y = 0; g.moveTo(x, y);
        while (y < S) { x += (rng() - 0.5) * 20; y += 10 + rng() * 10; g.lineTo(x, y); }
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.encoding = THREE.sRGBEncoding;
    return t;
  },
};

// Material de "argila" com sombreamento facetado (estilo low-poly)
function mat(color, o) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05, flatShading: true }, o || {}));
}

// Caixa cujas coordenadas de textura acompanham o tamanho (textura não estica)
function boxGeo(w, h, d, scale) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, k = 1 / (scale || 3);
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, uv.getX(i) * dims[f][0] * k, uv.getY(i) * dims[f][1] * k);
  }
  return g;
}

class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.solids = [];       // caixas de colisão {min, max, mesh}
    this.breakables = [];   // ânforas que quebram
    this.lights = [];
    this.updaters = [];     // coisas animadas (mar, fogo...)
    this.interactables = []; // altares, baús e alavancas (tecla E)
    this.movers = [];        // plataformas móveis
    this.lightSpots = [];    // lugares que "pedem" luz (braseiros, altares)
    this.traps = [];         // espinhos
    this.occluders = [];     // colunas que ficam transparentes se taparem o herói
  }

  // ALTAR DE PODER: estátua com uma esfera brilhante. Tecla E = recebe o poder.
  shrine(x, y, z, power) {
    const colors = ['#7ac8ff', '#ff8a2e', '#7aff6a', '#ff4a2a'];
    const col = colors[power];
    const g = new THREE.Group();
    const stone = mat('#cfc6b4');
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.4, 8), stone); base.position.y = 0.2; g.add(base);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8), stone); ped.position.y = 1.0; g.add(ped);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.25, 10), mat('#b8802f', { metalness: 0.8, roughness: 0.3 })); bowl.position.y = 1.7; g.add(bowl);
    const orbMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2, roughness: 0.2 });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), orbMat); orb.position.y = 2.35; g.add(orb);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.y = 2.35; g.add(halo);
    // "ponto de luz": uma das luzes compartilhadas vem para cá quando o herói chega perto
    const light = { pos: new THREE.Vector3(x, y + 2.4, z), color: new THREE.Color(col), intensity: 1.6, dist: 8, on: true };
    this.lightSpots.push(light);
    g.traverse(o => { if (o.isMesh && o !== orb && o !== halo) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, y, z);
    this.group.add(g);
    this.solids.push({ min: new THREE.Vector3(x - 0.5, y, z - 0.5), max: new THREE.Vector3(x + 0.5, y + 1.6, z + 0.5), mesh: g });
    const it = { type: 'shrine', power, pos: new THREE.Vector3(x, y, z), used: false, orb, halo, light, label: 'Altar: ' + POWERS[power].name };
    this.interactables.push(it);
    this.updaters.push((t) => {
      orb.position.y = 2.35 + Math.sin(t * 2 + x) * 0.12;
      orb.rotation.y = t; halo.rotation.x = t * 1.3; halo.rotation.y = t * 0.7;
      halo.position.y = orb.position.y;
    });
    return it;
  }

  // BAÚ: abre com E e solta vida ou mana
  chest(x, y, z, kind, yaw) {
    const g = new THREE.Group();
    const wood = mat('#6b4422'), metal = mat(kind === 'hp' ? '#3a9a4a' : '#3a6ad8', { metalness: 0.7, roughness: 0.35 });
    const box = new THREE.Mesh(boxGeo(1.2, 0.6, 0.8, 1), wood); box.position.y = 0.3; g.add(box);
    for (const sx of [-0.45, 0.45]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.82), metal); band.position.set(sx, 0.3, 0); g.add(band); }
    const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4); g.add(lid);
    const lidM = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 10, 1, false, 0, Math.PI), wood);
    lidM.rotation.z = Math.PI / 2; lidM.rotation.y = 0; lidM.position.z = 0.4; lid.add(lidM);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.06), metal); lock.position.set(0, 0.5, 0.42); g.add(lock);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, y, z); g.rotation.y = yaw || 0;
    this.group.add(g);
    this.solids.push({ min: new THREE.Vector3(x - 0.6, y, z - 0.6), max: new THREE.Vector3(x + 0.6, y + 0.6, z + 0.6), mesh: g });
    const it = { type: 'chest', kind, pos: new THREE.Vector3(x, y, z), used: false, lid, openT: 0, label: kind === 'hp' ? 'Baú de vida' : 'Baú de mana' };
    this.interactables.push(it);
    this.updaters.push(() => { if (it.used) { it.openT = Math.min(1, it.openT + 0.05); lid.rotation.x = -easeOut(it.openT) * 1.9; } });
    return it;
  }

  // Bloco sólido: centro x/z, base em y0, topo em y1
  block(x, z, w, d, y0, y1, material) {
    const h = y1 - y0;
    const m = new THREE.Mesh(boxGeo(w, h, d), material);
    m.position.set(x, y0 + h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    this.solids.push({ min: new THREE.Vector3(x - w / 2, y0, z - d / 2), max: new THREE.Vector3(x + w / 2, y1, z + d / 2), mesh: m });
    return m;
  }

  // Coluna grega (canelada) — sólida
  column(x, z, h, material, broken) {
    const g = new THREE.Group();
    const r = 0.45;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, h, 14, 1), material);
    shaft.position.y = h / 2;
    g.add(shaft);
    const base = new THREE.Mesh(new THREE.BoxGeometry(r * 2.6, 0.25, r * 2.6), material);
    base.position.y = 0.12; g.add(base);
    if (!broken) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(r * 2.6, 0.3, r * 2.6), material);
      cap.position.y = h + 0.15; g.add(cap);
    } else {
      const top = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, 0.5, 7), material);
      top.position.y = h + 0.1; top.rotation.z = 0.5; g.add(top);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, this.groundY || 0, z);
    this.group.add(g);
    // material próprio (para poder ficar transparente sozinha)
    const own = material.clone(); g.traverse(o => { if (o.isMesh) o.material = own; });
    this.occluders.push({ x, z, mat: own, op: 1 });
    const y0 = this.groundY || 0;
    this.solids.push({ min: new THREE.Vector3(x - r, y0, z - r), max: new THREE.Vector3(x + r, y0 + h + (broken ? 0 : 0.3), z + r), mesh: g });
    return g;
  }

  rock(x, y, z, s, material) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), material);
    m.position.set(x, y, z);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    m.scale.y = 0.6;
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  olive(x, y, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 2.2 * s, 6), mat('#6a5034'));
    trunk.position.y = 1.1 * s; trunk.rotation.z = 0.15; g.add(trunk);
    const leaf = mat('#7a8a4a');
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 * s, 0), leaf);
      c.position.set(Math.cos(i * 1.7) * 0.7 * s, 2.4 * s + (i % 2) * 0.3 * s, Math.sin(i * 1.7) * 0.6 * s);
      g.add(c);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, y, z);
    this.group.add(g);
  }

  // Braseiro com fogo (a luz vem das luzes compartilhadas — ver EnvLights em main.js)
  brazier(x, y, z) {
    const g = new THREE.Group();
    const stone = mat('#7a7266');
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.1, 8), stone);
    foot.position.y = 0.55; g.add(foot);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 0.3, 10), mat('#6b4a2a', { metalness: 0.6, roughness: 0.4 }));
    bowl.position.y = 1.2; g.add(bowl);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 7), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }));
    fire.position.y = 1.6; g.add(fire);
    const light = { pos: new THREE.Vector3(x, y + 1.9, z), color: new THREE.Color('#ff9a3a'), intensity: 1.4, dist: 10, on: true, flicker: true };
    this.lightSpots.push(light);
    g.traverse(o => { if (o.isMesh && o !== fire) o.castShadow = true; });
    g.position.set(x, y, z);
    this.group.add(g);
    this.updaters.push((t) => {
      const f = 1 + Math.sin(t * 13 + x) * 0.12 + Math.sin(t * 29 + z) * 0.06;
      fire.scale.set(f, f * 1.1, f);
    });
  }

  // Ânfora (vaso grego) que quebra com um golpe
  amphora(x, y, z) {
    const pts = [];
    const prof = [[0, 0], [0.14, 0.02], [0.24, 0.2], [0.27, 0.42], [0.2, 0.62], [0.09, 0.72], [0.08, 0.86], [0.14, 0.9]];
    for (const [r, h] of prof) pts.push(new THREE.Vector2(r, h));
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 10), mat('#b8642a', { roughness: 0.6 }));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.08, 10, 1, true), mat('#1a1410'));
    band.position.y = 0.42;
    const g = new THREE.Group();
    g.add(body, band);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, y, z);
    g.scale.setScalar(1.3);
    this.group.add(g);
    this.breakables.push({ obj: g, pos: new THREE.Vector3(x, y + 0.55, z), r: 0.45, broken: false });
  }

  // Templo ao fundo (só enfeite)
  temple(x, y, z, marble) {
    const g = new THREE.Group();
    const w = 14, d = 7;
    const base = new THREE.Mesh(boxGeo(w + 1, 0.8, d + 1), marble); base.position.y = 0.4; g.add(base);
    for (let i = 0; i < 7; i++) for (const zz of [-d / 2 + 0.6, d / 2 - 0.6]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 6, 12), marble);
      c.position.set(-w / 2 + 0.8 + i * (w - 1.6) / 6, 3.8, zz); g.add(c);
    }
    const ent = new THREE.Mesh(boxGeo(w + 0.6, 0.8, d + 0.6), marble); ent.position.y = 7.2; g.add(ent);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - 0.3, 0); shape.lineTo(w / 2 + 0.3, 0); shape.lineTo(0, 2.2); shape.closePath();
    const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false }), marble);
    ped.position.set(0, 7.6, -(d + 0.6) / 2); g.add(ped);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, y, z);
    this.group.add(g);
  }


  // Superfície perigosa embaixo da fase (mar, rio Estige, lava). Acompanha a câmera.
  hazardPlane(kind, y) {
    const look = {
      sea: { color: '#1f74a8', opacity: 0.92, emissive: '#000000' },
      styx: { color: '#1f5a50', opacity: 0.9, emissive: '#0a3a30' },
      lava: { color: '#ff4a0a', opacity: 1, emissive: '#ff2a04' },
    }[kind];
    const geo = new THREE.PlaneGeometry(260, 260, 52, 52);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: look.color, emissive: look.emissive, emissiveIntensity: kind === 'lava' ? 1.25 : 0.25, roughness: kind === 'lava' ? 0.5 : 0.2, metalness: kind === 'lava' ? 0.1 : 0.2, flatShading: true, transparent: look.opacity < 1, opacity: look.opacity }));
    m.material.envMapIntensity = 0.15; // reflete só um pouco do céu (senão a água fica pálida)
    m.position.y = y;
    m.receiveShadow = kind !== 'lava';
    this.group.add(m);
    const pos = geo.attributes.position, base = Float32Array.from(pos.array);
    const amp = kind === 'lava' ? 0.12 : 0.18;
    this.updaters.push((t) => {
      // a superfície segue a câmera "em passos" (as ondas não escorregam)
      m.position.x = Math.round(camera.position.x / 10) * 10;
      m.position.z = Math.round(camera.position.z / 10) * 10;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3] + m.position.x, z = base[i * 3 + 2] + m.position.z;
        pos.array[i * 3 + 1] = Math.sin(x * 0.18 + t * (kind === 'lava' ? 0.6 : 1.3)) * amp + Math.cos(z * 0.23 + t * 1.1) * amp * 0.8;
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      if (kind === 'lava' && Math.random() < 0.3) FX.fire(new THREE.Vector3(camera.position.x + rand(-25, 25), y + 0.2, camera.position.z - rand(8, 40)), 1);
    });
    return m;
  }

  // Céu: esfera gigante com degradê que acompanha a câmera (não é afetada pela neblina)
  sky(top, bottom, sunDir, sunColor) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(400, 24, 16);
    const cols = [];
    const ct = new THREE.Color(top), cb = new THREE.Color(bottom), c = new THREE.Color();
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = clamp(p.getY(i) / 400 * 1.6 + 0.2, 0, 1);
      c.copy(cb).lerp(ct, k);
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
    if (sunColor !== null) {
      const sun = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: sunColor || '#fff3c4', fog: false, transparent: true, opacity: 0.95 }));
      sun.position.copy(sunDir).multiplyScalar(360);
      sun.lookAt(0, 0, 0);
      g.add(sun);
    }
    this.group.add(g);
    this.updaters.push(() => g.position.copy(camera.position));
    return g;
  }

  // ---------- peças extras de cenário ----------
  stalagmite(x, y, z, h, material, ceiling) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(h * 0.22, h, 6), material);
    m.position.set(x, ceiling ? y - h / 2 : y + h / 2, z);
    if (ceiling) m.rotation.x = Math.PI;
    m.castShadow = true; this.group.add(m);
  }
  deadTree(x, y, z, s) {
    const g = new THREE.Group(), wood = mat('#2a2622');
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.25 * s, 3 * s, 5), wood); trunk.position.y = 1.5 * s; g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.09 * s, 1.4 * s, 4), wood);
      b.position.set(Math.cos(i * 1.9) * 0.4 * s, (1.6 + i * 0.35) * s, Math.sin(i * 1.9) * 0.4 * s);
      b.rotation.set(Math.sin(i) * 0.9, i, Math.cos(i * 2) * 0.9); g.add(b);
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(x, y, z); this.group.add(g);
  }
  reeds(x, y, z) {
    const m = mat('#5a7a3a');
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(new THREE.ConeGeometry(0.05, rand(0.8, 1.6), 3), m);
      r.position.set(x + rand(-0.5, 0.5), y + 0.5, z + rand(-0.5, 0.5)); r.rotation.z = rand(-0.2, 0.2);
      this.group.add(r);
    }
  }
  statue(x, y, z, material, yaw) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(boxGeo(1.4, 0.8, 1.4), material); base.position.y = 0.4; g.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.6, 7), material); body.position.y = 1.6; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), material); head.position.y = 2.6; g.add(head);
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 5), material); spear.position.set(0.45, 2.1, 0); g.add(spear);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 10), material); shield.rotation.z = Math.PI / 2; shield.position.set(-0.4, 1.7, 0.1); g.add(shield);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, y, z); g.rotation.y = yaw || 0; this.group.add(g);
  }
  // tocha (só brilho, sem luz de verdade = leve para o computador)
  torch(x, y, z) {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 5), mat('#3a2a1a')); g.add(stick);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 6), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
    fire.position.y = 0.5; g.add(fire);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 0.5; g.add(glow);
    g.position.set(x, y, z); this.group.add(g);
    this.updaters.push((t) => { const f = 1 + Math.sin(t * 14 + x * 3) * 0.15; fire.scale.set(f, f, f); glow.scale.setScalar(f); });
  }

  // ---------- peças com mecânica ----------
  // Portão de bronze: sólido quando fechado; desce para dentro do chão ao abrir
  gate(x, y, z, width) {
    const g = new THREE.Group();
    const bronze = mat('#7a5a2a', { metalness: 0.7, roughness: 0.4 });
    const bars = Math.max(2, Math.round(width / 0.6));
    for (let i = 0; i < bars; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.4, 0.14), bronze);
      b.position.set(0, 2.2, -width / 2 + 0.3 + i * (width - 0.6) / (bars - 1));
      g.add(b);
    }
    for (const yy of [0.6, 2.4, 4.2]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, width), bronze); r.position.y = yy; g.add(r); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(x, y, z);
    this.group.add(g);
    const top = y + 6;
    const solid = { min: new THREE.Vector3(x - 0.3, y, z - width / 2), max: new THREE.Vector3(x + 0.3, top, z + width / 2), mesh: g };
    this.solids.push(solid);
    const gate = { g, solid, y, open: false };
    gate.setOpen = (open, quiet) => {
      if (gate.open === open) return;
      gate.open = open;
      solid.max.y = open ? -500 : top;   // aberto = a caixa some
      if (quiet) return;
      if (open) { Sound.crash(); FX.dust(new THREE.Vector3(x, y, z), 14); }
      else Sound.block();
    };
    this.updaters.push(() => { g.position.y = damp(g.position.y, gate.open ? y - 4.6 : y, 0.02, 1 / 60); });
    return gate;
  }

  // Alavanca: tecla E puxa
  lever(x, y, z, id) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(boxGeo(0.8, 0.5, 0.6, 1), mat('#6a6258')); base.position.y = 0.25; g.add(base);
    const arm = new THREE.Group(); arm.position.y = 0.5; g.add(arm);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), mat('#7a5a2a', { metalness: 0.7 })); stick.position.y = 0.55; arm.add(stick);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffcf4a', emissive: '#ff9a1a', emissiveIntensity: 1.2 })); knob.position.y = 1.1; arm.add(knob);
    arm.rotation.z = 0.6;
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.position.set(x, y, z); this.group.add(g);
    const it = { type: 'lever', id, pos: new THREE.Vector3(x, y, z), used: false, arm, label: 'Puxar a alavanca' };
    this.interactables.push(it);
    this.updaters.push(() => { arm.rotation.z = damp(arm.rotation.z, it.used ? -0.6 : 0.6, 0.01, 1 / 60); });
    return it;
  }

  // Altar de ponto de controle (chama azul quando aceso)
  checkpoint(x, y, z) {
    const g = new THREE.Group();
    const stone = mat('#9a9284');
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.3, 8), stone); base.position.y = 0.15; g.add(base);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.0, 8), stone); ped.position.y = 0.8; g.add(ped);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.22, 10), mat('#5a5248')); bowl.position.y = 1.4; g.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 7), new THREE.MeshBasicMaterial({ color: '#7ac8ff' })); flame.position.y = 1.9; flame.visible = false; g.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 1.9; glow.visible = false; g.add(glow);
    g.traverse(o => { if (o.isMesh && o !== flame && o !== glow) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, y, z); this.group.add(g);
    const cp = { pos: new THREE.Vector3(x + 1.5, y, z), at: new THREE.Vector3(x, y, z), lit: false, flame, glow };
    this.updaters.push((t) => { if (cp.lit) { const f = 1 + Math.sin(t * 12 + x) * 0.12; flame.scale.set(f, f * 1.15, f); glow.scale.setScalar(f); } });
    return cp;
  }

  // Portal de saída (fim das fases sem chefe)
  portal(x, y, z) {
    const g = new THREE.Group();
    const stone = mat('#d8cebc');
    for (const sz of [-1.6, 1.6]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 4.5, 10), stone); c.position.set(0, 2.25, sz); c.castShadow = true; g.add(c); }
    const top = new THREE.Mesh(boxGeo(1, 0.6, 4.4), stone); top.position.y = 4.7; top.castShadow = true; g.add(top);
    const swirlMat = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), swirlMat);
    swirl.rotation.y = Math.PI / 2; swirl.position.y = 2.3; swirl.scale.y = 1.4; g.add(swirl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 32), swirlMat); ring.rotation.y = Math.PI / 2; ring.position.y = 2.3; ring.scale.y = 1.4; g.add(ring);
    g.position.set(x, y, z); this.group.add(g);
    this.updaters.push((t) => { ring.rotation.x = t * 2; swirlMat.opacity = 0.6 + Math.sin(t * 4) * 0.15; });
    return { pos: new THREE.Vector3(x, y, z) };
  }

  // Plataforma móvel (vai e volta em X, Y ou Z). Quem está em cima vai junto.
  mover(x, y, z, w, d, axis, amp, period, phase, material) {
    const h = 0.6;
    const m = new THREE.Mesh(boxGeo(w, h, d), material);
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    const solid = { min: new THREE.Vector3(), max: new THREE.Vector3(), mesh: m, moving: true, delta: new THREE.Vector3() };
    this.solids.push(solid);
    const place = (t) => {
      const o = Math.sin(t * Math.PI * 2 / period + (phase || 0)) * amp;
      const cx = x + (axis === 'x' ? o : 0), cy = y + (axis === 'y' ? o : 0), cz = z + (axis === 'z' ? o : 0);
      solid.delta.set(cx - (solid.min.x + w / 2), cy - solid.max.y, cz - (solid.min.z + d / 2));
      solid.min.set(cx - w / 2, cy - h, cz - d / 2); solid.max.set(cx + w / 2, cy, cz + d / 2);
      m.position.set(cx, cy - h / 2, cz);
    };
    place(0); solid.delta.set(0, 0, 0);
    this.movers.push({ solid, place });
    return solid;
  }

  // Espinhos que sobem do chão de tempos em tempos (tremem antes = aviso)
  spikes(x, y, z, w, d, period, offset) {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(boxGeo(w, 0.06, d, 1), mat('#3a3a42')); plate.position.y = 0.03; g.add(plate);
    const spk = new THREE.Group(); g.add(spk);
    const sm = mat('#c8ccd8', { metalness: 0.8, roughness: 0.3 });
    const cone = new THREE.ConeGeometry(0.1, 0.8, 4);
    for (let i = 0.4; i < w; i += 0.6) for (let k = 0.4; k < d; k += 0.6) {
      const c = new THREE.Mesh(cone, sm); c.position.set(i - w / 2, 0.4, k - d / 2); spk.add(c);
    }
    spk.position.y = -0.85;
    g.position.set(x, y, z); this.group.add(g);
    const trap = { x, y, z, w, d, period, offset: offset || 0, spk, up: false };
    this.traps.push(trap);
    return trap;
  }
}
