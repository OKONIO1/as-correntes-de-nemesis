// =============================================================
// models.js — ROSTOS e detalhes para os personagens.
//
// Face.human(head, {...}) põe num grupo "cabeça":
//   crânio liso, queixo, orelhas, OLHOS (branco + íris + pupila),
//   sobrancelhas, nariz, lábios, e se quiser barba e cabelo.
// Tudo olha para +Z (a frente do personagem).
// =============================================================

// pele lisa (sem facetas) — fica bem menos "geométrico"
function smooth(color, o) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.62, metalness: 0 }, o || {})); }
function glowM(color, k) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k || 2.5, roughness: 0.4 }); }

const Face = {
  /*
   o = {
     r: raio da cabeça, y: altura do centro,
     skin: cor da pele, eye: cor da íris, glow: true = olhos brilhando (cor eye),
     brow: cor da sobrancelha, angry: 0..1 (sobrancelhas franzidas),
     lip: cor dos lábios, beard: cor da barba (ou null), hair: cor do cabelo (ou null),
     longHair: true (cabelo comprido), ears: false (sem orelhas), mouthOpen: 0..1, fangs: true
   }
   devolve { eyes: [malhas das íris], skinMat, mouth }
  */
  human(head, o) {
    const r = o.r, y = o.y || 0;
    const skin = o.skinMat || smooth(o.skin || '#c9925e');
    const add = (geo, m, x, yy, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, yy, z); me.castShadow = true; head.add(me); return me; };
    // crânio + maxilar
    const skull = add(new THREE.SphereGeometry(r, 20, 16), skin, 0, y, 0); skull.scale.set(0.9, 1.04, 0.98);
    const jaw = add(new THREE.SphereGeometry(r * 0.74, 16, 12), skin, 0, y - r * 0.42, r * 0.16); jaw.scale.set(0.92, 0.78, 0.92);
    // bochechas
    for (const sx of [-1, 1]) { const c = add(new THREE.SphereGeometry(r * 0.26, 10, 8), skin, sx * r * 0.42, y - r * 0.14, r * 0.56); c.scale.set(1, 0.8, 0.8); }
    // orelhas
    if (o.ears !== false) for (const sx of [-1, 1]) { const e = add(new THREE.SphereGeometry(r * 0.22, 10, 8), skin, sx * r * 0.9, y - r * 0.02, -r * 0.05); e.scale.set(0.45, 1, 0.75); }
    // olhos: branco, íris, pupila (ou brilhando)
    const white = smooth('#f4efe6', { roughness: 0.3 });
    const iris = o.glow ? glowM(o.eye || '#ff6a1a', 3) : smooth(o.eye || '#4a3020', { roughness: 0.2 });
    const pupil = smooth('#080606', { roughness: 0.1 });
    const eyes = [];
    for (const sx of [-1, 1]) {
      const ex = sx * r * 0.36, ey = y + r * 0.1, ez = r * 0.78;
      // cavidade (sombra em volta do olho)
      const sock = add(new THREE.SphereGeometry(r * 0.22, 10, 8), smooth(o.socket || '#5a3a2a'), ex, ey, ez - r * 0.06); sock.scale.set(1.1, 0.75, 0.5);
      const w = add(new THREE.SphereGeometry(r * 0.16, 12, 10), white, ex, ey, ez); w.scale.set(1.1, 0.72, 0.6);
      const ir = add(new THREE.SphereGeometry(r * 0.085, 10, 8), iris, ex, ey, ez + r * 0.075); ir.scale.z = 0.5;
      if (!o.glow) { const pu = add(new THREE.SphereGeometry(r * 0.04, 8, 6), pupil, ex, ey, ez + r * 0.11); pu.scale.z = 0.4; }
      eyes.push(ir);
      // pálpebra de cima (dá expressão)
      const lid = add(new THREE.SphereGeometry(r * 0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), skin, ex, ey + r * 0.01, ez - r * 0.02);
      lid.scale.set(1.12, 0.8, 0.65); lid.rotation.x = 0.12 + (o.angry || 0) * 0.22;
    }
    // sobrancelhas
    const browM = smooth(o.brow || '#2a1a10', { roughness: 0.9 });
    for (const sx of [-1, 1]) {
      const b = add(new THREE.BoxGeometry(r * 0.42, r * 0.09, r * 0.1), browM, sx * r * 0.36, y + r * 0.3, r * 0.84);
      b.rotation.z = sx * (0.06 + (o.angry || 0) * 0.32); b.rotation.y = sx * 0.25;
    }
    // nariz
    const nose = add(new THREE.ConeGeometry(r * 0.13, r * 0.42, 4), skin, 0, y - r * 0.08, r * 0.98);
    nose.rotation.x = 0.35; nose.scale.z = 0.8;
    add(new THREE.SphereGeometry(r * 0.1, 8, 6), skin, 0, y - r * 0.24, r * 1.0);
    // boca: lábios + linha escura (aberta = mostra o escuro e os dentes)
    const lipM = smooth(o.lip || '#8a4a3a');
    const open = o.mouthOpen || 0;
    const mouth = new THREE.Group(); mouth.position.set(0, y - r * 0.44, r * 0.86); head.add(mouth);
    const dark = new THREE.Mesh(new THREE.BoxGeometry(r * 0.4, r * (0.03 + open * 0.18), r * 0.06), smooth('#1a0806')); mouth.add(dark);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.04, r * 0.32, 4, 8), lipM); up.rotation.z = Math.PI / 2; up.position.y = r * (0.035 + open * 0.09); mouth.add(up);
    const lo = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.05, r * 0.28, 4, 8), lipM); lo.rotation.z = Math.PI / 2; lo.position.y = -r * (0.04 + open * 0.09); mouth.add(lo);
    if (o.fangs || open > 0.3) {
      const toothM = smooth('#f2ead8', { roughness: 0.3 });
      for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(r * 0.025, r * (o.fangs && (i === 0 || i === 5) ? 0.16 : 0.07), 4), toothM); t.rotation.x = Math.PI; t.position.set((i - 2.5) * r * 0.06, r * (0.01 + open * 0.06), r * 0.02); mouth.add(t); }
    }
    // barba e bigode
    if (o.beard) {
      const bm = smooth(o.beard, { roughness: 0.95 });
      const bd = add(new THREE.SphereGeometry(r * 0.78, 16, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), bm, 0, y - r * 0.36, r * 0.12); bd.scale.set(1.0, 1.25, 1.08); // barba só no queixo
      for (const sx of [-1, 1]) { const sb = add(new THREE.BoxGeometry(r * 0.12, r * 0.5, r * 0.5), bm, sx * r * 0.74, y - r * 0.15, r * 0.25); sb.rotation.z = sx * 0.12; } // costeletas
      const mu = add(new THREE.CapsuleGeometry(r * 0.045, r * 0.3, 4, 8), bm, 0, y - r * 0.33, r * 0.93); mu.rotation.z = Math.PI / 2;
      mouth.position.set(0, y - r * 0.47, r * 0.95);
    }
    // cabelo
    if (o.hair) {
      const hm = smooth(o.hair, { roughness: 0.95 });
      const cap = add(new THREE.SphereGeometry(r * 1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, 0, y + r * 0.02, -r * 0.06); cap.rotation.x = -0.25;
      if (o.longHair) { const back = add(new THREE.CylinderGeometry(r * 0.85, r * 0.7, r * 2.0, 14, 1, true), hm, 0, y - r * 0.75, -r * 0.3); back.material = hm.clone(); back.material.side = THREE.DoubleSide; }
    }
    return { eyes, skinMat: skin, mouth };
  },
};

// prega de pano (saiote/túnica): cilindro aberto com dobras
function pleatedSkirt(rTop, rBot, h, color, folds) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, (folds || 14) * 2, 1, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * (folds || 14)) * 0.06;
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  geo.translate(0, -h / 2, 0);
  return new THREE.Mesh(geo, smooth(color, { roughness: 0.85, side: THREE.DoubleSide }));
}
