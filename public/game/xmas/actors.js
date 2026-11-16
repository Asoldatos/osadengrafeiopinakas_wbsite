// Χαρακτήρες και αντικείμενα: παιδιά, ο Κιμωλάκης-Άγιος Βασίλης, τάρανδοι, έλκηθρο, δώρα, χιονάνθρωπος.
import { THREE, glowTex, rand } from './engine.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.8, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, flatShading: !!o.flat });
const mesh = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...(typeof scale === 'number' ? [scale, scale, scale] : scale)); m.castShadow = true; return m; };
const pivot = (x, y, z, ...kids) => { const g = new THREE.Group(); g.position.set(x, y, z); if (kids.length) g.add(...kids); return g; };

/** Πρόσωπο: μάτια (με λάμψη), μάγουλα, χαμόγελο. */
function face(parent, { r = 0.2, y = 0, z = 0, eye = 0.032, sep = 0.075, mouth = 0.055, blush = true } = {}) {
  const black = M(0x1c1410, { r: 0.3 }), white = new THREE.MeshBasicMaterial({ color: 0xffffff }), pink = M(0xff8f9a, { r: 1 });
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(eye, 12, 10), black, [sx * sep, y + r * 0.18, z + r * 0.92], [0, 0, 0], [1, 1.25, 0.7]); parent.add(e); eyes.push(e);
    const s = mesh(new THREE.SphereGeometry(eye * 0.32, 8, 6), white, [sx * sep + eye * 0.35, y + r * 0.18 + eye * 0.45, z + r * 0.92 + eye * 0.6]); s.castShadow = false; parent.add(s);
    if (blush) { const b = mesh(new THREE.SphereGeometry(eye * 1.25, 10, 8), pink, [sx * (sep + 0.05), y - r * 0.12, z + r * 0.85], [0, 0, 0], [1, 0.6, 0.3]); b.castShadow = false; parent.add(b); }
  }
  const m = mesh(new THREE.TorusGeometry(mouth, mouth * 0.24, 6, 16, Math.PI), black, [0, y - r * 0.22, z + r * 0.92], [0, 0, Math.PI]); parent.add(m);
  return { eyes, mouth: m };
}

// ---------------------------------------------------------------- παιδί
export function makeKid({ coat = 0x2b6cb0, hat = 0xc8102e, scarf = 0xf6c453, pants = 0x2a3550, skin = 0xf2c8a8, hair = 0x5a3825, backpack = false, height = 1 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(height);
  const mC = M(coat, { r: 0.7 }), mP = M(pants), mS = M(skin, { r: 0.6 }), mB = M(0x3b2416, { r: 0.6 }), mHat = M(hat, { r: 1 }), mScarf = M(scarf, { r: 1 }), mWhite = M(0xffffff, { r: 1 });
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const leg = pivot(sx * 0.1, 0.6, 0, mesh(new THREE.CapsuleGeometry(0.085, 0.36, 4, 10), mP, [0, -0.25, 0]), mesh(new THREE.BoxGeometry(0.16, 0.13, 0.26, 2, 2, 2), mB, [0, -0.54, 0.04]));
    body.add(leg); legs.push(leg);
    const arm = pivot(sx * 0.28, 1.08, 0, mesh(new THREE.CapsuleGeometry(0.07, 0.32, 4, 10), mC, [0, -0.2, 0]), mesh(new THREE.SphereGeometry(0.075, 10, 8), mScarf, [0, -0.44, 0.01]));
    arm.rotation.z = sx * 0.12; body.add(arm); arms.push(arm);
  }
  const torso = mesh(new THREE.CapsuleGeometry(0.23, 0.3, 6, 14), mC, [0, 0.9, 0]); torso.scale.set(1, 1, 0.82); body.add(torso);
  for (const y of [0.78, 0.98]) body.add(mesh(new THREE.TorusGeometry(0.228, 0.022, 6, 22), mC, [0, y, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1]));
  body.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), M(0xdddddd, { m: 0.6, r: 0.3 }), [0, 0.88, 0.19]));       // φερμουάρ
  const head = pivot(0, 1.36, 0); body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.21, 20, 16), mS));
  head.add(mesh(new THREE.SphereGeometry(0.215, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), M(hair, { r: 0.9 }), [0, 0.0, -0.035], [-0.55, 0, 0]));
  face(head, { r: 0.21 });
  head.add(mesh(new THREE.SphereGeometry(0.225, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), mHat, [0, 0.045, 0]));
  head.add(mesh(new THREE.TorusGeometry(0.205, 0.045, 8, 22), mWhite, [0, 0.085, 0], [Math.PI / 2, 0, 0]));
  head.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), mWhite, [0, 0.27, 0]));
  body.add(mesh(new THREE.TorusGeometry(0.15, 0.06, 8, 18), mScarf, [0, 1.17, 0], [Math.PI / 2, 0, 0]));
  body.add(mesh(new THREE.BoxGeometry(0.11, 0.3, 0.05), mScarf, [0.09, 1.0, 0.2], [0.15, 0, 0.12]));
  if (backpack) { body.add(mesh(new THREE.BoxGeometry(0.34, 0.38, 0.16), M(0xe8573d), [0, 0.95, -0.24])); body.add(mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), M(0xf6c453), [0, 0.86, -0.33])); }
  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  let ph = 0, blink = 2;
  const st = { wave: 0, throw: 0, cheer: 0, air: false, talk: 0 };
  return {
    root, head, arms, legs, st,
    /** speed σε m/s, dt σε s */
    update(dt, speed = 0, t = 0) {
      const k = Math.min(1, speed / 4.5); ph += dt * (4 + speed * 2.2);
      const sw = Math.sin(ph) * 0.75 * k;
      legs[0].rotation.x = st.air ? -0.5 : sw; legs[1].rotation.x = st.air ? 0.3 : -sw;
      arms[0].rotation.x = st.air ? -0.9 : -sw * 0.9; arms[1].rotation.x = st.air ? -0.9 : sw * 0.9;
      body.position.y = Math.abs(Math.sin(ph)) * 0.05 * k + Math.sin(t * 2) * 0.006; body.rotation.x = k * 0.12;
      if (st.wave > 0) { st.wave -= dt; arms[1].rotation.x = -2.6; arms[1].rotation.z = -0.4 + Math.sin(t * 14) * 0.35; } else arms[1].rotation.z = 0.12;
      if (st.throw > 0) { st.throw -= dt; const p = 1 - st.throw / 0.35; arms[1].rotation.x = p < 0.4 ? -2.8 * (p / 0.4) : -2.8 + (p - 0.4) * 6; }
      if (st.cheer > 0) { st.cheer -= dt; arms[0].rotation.x = arms[1].rotation.x = -2.7 + Math.sin(t * 12) * 0.2; body.position.y += Math.abs(Math.sin(t * 9)) * 0.12; }
      if (st.talk > 0) { st.talk -= dt; head.rotation.x = Math.sin(t * 9) * 0.06; }
      if ((blink -= dt) < 0) { blink = rand(2, 5); head.children.forEach((c) => { if (c.geometry?.parameters?.radius === 0.032) c.scale.y = 0.15; }); setTimeout(() => head.children.forEach((c) => { if (c.geometry?.parameters?.radius === 0.032) c.scale.y = 1.25; }), 120); }
    },
  };
}

// ---------------------------------------------------------------- Κιμωλάκης ως Άγιος Βασίλης
export function makeKimolakis() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const chalk = new THREE.MeshStandardMaterial({ color: 0xfbf8f0, roughness: 0.95, map: chalkTex() }), red = M(0xc8102e, { r: 0.75 }), white = M(0xffffff, { r: 1 }), black = M(0x1a1a1a, { r: 0.5 }), gold = M(0xf6c453, { r: 0.3, m: 0.8 });
  const stick = mesh(new THREE.CapsuleGeometry(0.34, 1.0, 8, 20), chalk, [0, 1.15, 0]); body.add(stick);
  const coat = mesh(new THREE.CylinderGeometry(0.37, 0.42, 0.72, 24, 1, true), red, [0, 0.83, 0]); coat.material.side = THREE.DoubleSide; body.add(coat);
  body.add(mesh(new THREE.TorusGeometry(0.41, 0.06, 8, 26), white, [0, 0.48, 0], [Math.PI / 2, 0, 0]));
  body.add(mesh(new THREE.TorusGeometry(0.37, 0.05, 8, 26), black, [0, 0.95, 0], [Math.PI / 2, 0, 0]));
  body.add(mesh(new THREE.BoxGeometry(0.17, 0.13, 0.05), gold, [0, 0.95, 0.4]));
  for (const y of [0.7, 1.1]) body.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), black, [0, y, 0.37]));
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const leg = pivot(sx * 0.15, 0.48, 0, mesh(new THREE.CapsuleGeometry(0.07, 0.26, 4, 8), black, [0, -0.2, 0]), mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), black, [0, -0.4, 0.06]));
    body.add(leg); legs.push(leg);
    const arm = pivot(sx * 0.38, 1.28, 0, mesh(new THREE.CapsuleGeometry(0.075, 0.38, 4, 10), red, [0, -0.24, 0]), mesh(new THREE.TorusGeometry(0.075, 0.035, 6, 14), white, [0, -0.46, 0], [Math.PI / 2, 0, 0]), mesh(new THREE.SphereGeometry(0.08, 10, 8), black, [0, -0.54, 0]));
    arm.rotation.z = sx * 0.25; body.add(arm); arms.push(arm);
  }
  const head = pivot(0, 1.62, 0.02); body.add(head);
  face(head, { r: 0.34, y: 0.02, z: 0.0, eye: 0.05, sep: 0.12, mouth: 0.07 });
  // γένια
  const beard = new THREE.Group(); head.add(beard);
  for (let i = 0; i < 14; i++) { const a = -1.25 + (i / 13) * 2.5, rr = 0.33; beard.add(mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.03, 10, 8), white, [Math.sin(a) * rr, -0.17 - Math.cos(a) * 0.1, Math.cos(a) * rr * 0.75])); }
  for (let i = 0; i < 5; i++) beard.add(mesh(new THREE.SphereGeometry(0.11, 10, 8), white, [(i - 2) * 0.09, -0.33 - Math.abs(i - 2) * -0.03, 0.27]));
  for (const sx of [-1, 1]) head.add(mesh(new THREE.CapsuleGeometry(0.045, 0.12, 4, 8), white, [sx * 0.07, -0.08, 0.33], [0, 0, sx * 1.2]));     // μουστάκι
  // σκούφος
  const hat = new THREE.Group(); hat.position.set(0, 0.36, 0); head.add(hat);
  hat.add(mesh(new THREE.TorusGeometry(0.33, 0.08, 10, 28), white, [0, 0, 0], [Math.PI / 2, 0, 0]));
  const cone = mesh(new THREE.ConeGeometry(0.31, 0.72, 24, 1), M(0xc8102e, { r: 0.9 }), [0.05, 0.32, -0.02], [0, 0, -0.35]); hat.add(cone);
  const pom = mesh(new THREE.SphereGeometry(0.1, 12, 10), white, [0.28, 0.55, -0.02]); hat.add(pom);
  // σάκος στην πλάτη
  const sack = mesh(new THREE.SphereGeometry(0.42, 16, 12), M(0x8b5a2b, { r: 1 }), [0, 1.15, -0.55], [0, 0, 0], [0.9, 1.1, 0.75]); body.add(sack);
  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  let ph = 0; const st = { wave: 0, talk: 0, cheer: 0 };
  return {
    root, head, st, arms, sack,
    update(dt, speed = 0, t = 0) {
      const k = Math.min(1, speed / 3); ph += dt * (3 + speed * 2);
      const sw = Math.sin(ph) * 0.6 * k; legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
      body.position.y = Math.abs(Math.sin(ph)) * 0.05 * k; body.rotation.z = Math.sin(t * 1.3) * 0.025;
      arms[0].rotation.x = -sw; arms[1].rotation.x = sw; pom.position.y = 0.55 + Math.sin(t * 3) * 0.03;
      if (st.wave > 0) { st.wave -= dt; arms[1].rotation.x = -2.7; arms[1].rotation.z = -0.3 + Math.sin(t * 12) * 0.35; } else arms[1].rotation.z = 0.25;
      if (st.cheer > 0) { st.cheer -= dt; arms[0].rotation.x = arms[1].rotation.x = -2.6 + Math.sin(t * 10) * 0.2; body.position.y += Math.abs(Math.sin(t * 8)) * 0.1; }
      if (st.talk > 0) { st.talk -= dt; head.rotation.z = Math.sin(t * 7) * 0.05; beard.position.y = Math.abs(Math.sin(t * 14)) * -0.015; }
    },
  };
}
function chalkTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fbf8f0'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(${200 + Math.random() * 40},${200 + Math.random() * 40},${200 + Math.random() * 40},.35)`; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- τάρανδος
export function makeReindeer({ rudolph = false, collar = 0xc8102e } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const fur = M(0x8a5a35, { r: 0.95 }), belly = M(0xd8b48a, { r: 1 }), dark = M(0x3a2618, { r: 0.8 }), antler = M(0xd9c7a4, { r: 0.7 });
  body.add(mesh(new THREE.CapsuleGeometry(0.33, 0.85, 6, 14), fur, [0, 1.1, 0], [Math.PI / 2, 0, 0]));
  body.add(mesh(new THREE.SphereGeometry(0.28, 12, 10), belly, [0, 0.98, 0.1], [0, 0, 0], [1, 0.7, 1.6]));
  const legs = [];
  for (const [x, z] of [[-0.2, 0.42], [0.2, 0.42], [-0.2, -0.42], [0.2, -0.42]]) { const l = pivot(x, 0.95, z, mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.85, 8), fur, [0, -0.42, 0]), mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.1, 8), dark, [0, -0.88, 0])); body.add(l); legs.push(l); }
  const neck = pivot(0, 1.3, 0.55); body.add(neck);
  neck.add(mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.6, 10), fur, [0, 0.22, 0.08], [0.55, 0, 0]));
  const head = pivot(0, 0.52, 0.25); neck.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.2, 14, 12), fur, [0, 0, 0], [0, 0, 0], [0.85, 0.85, 1.25]));
  head.add(mesh(new THREE.SphereGeometry(0.13, 12, 10), belly, [0, -0.05, 0.2], [0, 0, 0], [0.9, 0.75, 1]));
  const noseMat = rudolph ? new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 2.2, roughness: 0.3 }) : dark;
  head.add(mesh(new THREE.SphereGeometry(rudolph ? 0.07 : 0.05, 12, 10), noseMat, [0, -0.02, 0.33]));
  if (rudolph) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,40,40,1)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.position.set(0, -0.02, 0.36); gl.scale.set(0.9, 0.9, 1); head.add(gl); }
  for (const sx of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), M(0x111111, { r: 0.3 }), [sx * 0.1, 0.06, 0.15]));
    head.add(mesh(new THREE.ConeGeometry(0.06, 0.18, 8), fur, [sx * 0.16, 0.12, -0.05], [0, 0, sx * -1.1]));
    const a = pivot(sx * 0.07, 0.17, -0.04); head.add(a);
    a.add(mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.45, 6), antler, [sx * 0.08, 0.2, 0], [0, 0, sx * -0.45]));
    for (const [h, ang, len] of [[0.12, 0.7, 0.18], [0.24, 0.5, 0.2], [0.34, -0.2, 0.16]]) a.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, len, 5), antler, [sx * (0.08 + h * 0.35), 0.06 + h, ang > 0 ? 0.05 : -0.05], [ang, 0, sx * -0.9]));
  }
  body.add(mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 18), M(collar), [0, 1.5, 0.66], [1.0, 0, 0]));
  const bell = mesh(new THREE.SphereGeometry(0.06, 10, 8), M(0xf6c453, { m: 0.9, r: 0.2 }), [0, 1.38, 0.78]); body.add(bell);
  body.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), M(0xffffff, { r: 1 }), [0, 1.18, -0.75]));
  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  let ph = 0; const st = { graze: 0 };
  return {
    root, head, st,
    update(dt, speed = 0, t = 0) {
      const k = Math.min(1, speed / 3.5); ph += dt * (3 + speed * 2.4);
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.55 * k; });
      body.position.y = Math.abs(Math.sin(ph * 2)) * 0.04 * k;
      const g = speed < 0.2 ? (Math.sin(t * 0.4 + ph) > 0.4 ? 1 : 0) : 0; st.graze += (g - st.graze) * dt * 2;
      neck.rotation.x = st.graze * 1.1 + Math.sin(t * 2) * 0.04; head.rotation.y = Math.sin(t * 0.7) * 0.2 * (1 - st.graze);
      bell.position.y = 1.38 + Math.sin(t * 9) * 0.01 * (k + 0.2);
    },
  };
}

// ---------------------------------------------------------------- έλκηθρο
export function makeSleigh() {
  const g = new THREE.Group(), red = M(0xb3121f, { r: 0.45, m: 0.2 }), gold = M(0xf6c453, { r: 0.25, m: 0.9 }), wood = M(0x5a3520), seat = M(0x1d5a35, { r: 0.9 });
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.5, 2.8), red, [0, 0.75, 0]));
  for (const sx of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(0.12, 0.75, 2.9), red, [sx * 0.85, 1.05, 0])); g.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 2.95), gold, [sx * 0.86, 1.44, 0])); }
  g.add(mesh(new THREE.BoxGeometry(1.75, 1.3, 0.14), red, [0, 1.25, -1.4])); g.add(mesh(new THREE.BoxGeometry(1.8, 0.08, 0.18), gold, [0, 1.92, -1.4]));
  g.add(mesh(new THREE.TorusGeometry(0.5, 0.09, 10, 20, Math.PI), red, [0, 1.05, 1.42], [0, Math.PI / 2, 0]));
  g.add(mesh(new THREE.BoxGeometry(1.5, 0.22, 1.1), seat, [0, 1.1, -0.7])); g.add(mesh(new THREE.BoxGeometry(1.5, 0.7, 0.2), seat, [0, 1.4, -1.25]));
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 3.4), gold, [sx * 0.7, 0.08, 0.1]));
    g.add(mesh(new THREE.TorusGeometry(0.35, 0.045, 8, 14, Math.PI), gold, [sx * 0.7, 0.43, 1.8], [0, Math.PI / 2, -Math.PI / 2]));
    for (const z of [-0.9, 0.9]) g.add(mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), gold, [sx * 0.7, 0.4, z]));
  }
  const sack = mesh(new THREE.SphereGeometry(0.55, 16, 12), M(0x8b5a2b, { r: 1 }), [0, 1.35, 0.6], [0, 0, 0], [1.1, 0.9, 0.9]); g.add(sack);
  // φαναράκια μπροστά + ζεστό φως (για να φαίνεται το έλκηθρο τη νύχτα)
  for (const sx of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), gold, [sx * 0.8, 1.7, 1.35])); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd99a })); lamp.position.set(sx * 0.8, 1.98, 1.35); g.add(lamp); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,200,120,1)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.position.copy(lamp.position); gl.scale.set(1.3, 1.3, 1); g.add(gl); }
  const pl = new THREE.PointLight(0xffc98a, 14, 14, 1.4); pl.position.set(0, 2.4, 0.6); g.add(pl);
  for (let i = 0; i < 5; i++) { const b = makeGift(i); b.position.set(rand(-0.5, 0.5), 1.25 + (i % 2) * 0.3, rand(0.7, 1.2)); b.rotation.y = rand(0, 3); g.add(b); }
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return g;
}

// ---------------------------------------------------------------- δώρο
const GIFT = [[0xc8102e, 0xf6c453], [0x0f7b4b, 0xffffff], [0x2b6cb0, 0xff6ad5], [0xf6c453, 0xc8102e], [0x9b2cff, 0x7fd1ae], [0xffffff, 0xc8102e]];
export function makeGift(i = 0, s = 0.32) {
  const [a, b] = GIFT[i % GIFT.length], g = new THREE.Group(), ma = M(a, { r: 0.45, m: 0.1 }), mb = M(b, { r: 0.3, m: 0.3 });
  g.add(mesh(new THREE.BoxGeometry(s, s * 0.85, s), ma, [0, s * 0.425, 0]));
  g.add(mesh(new THREE.BoxGeometry(s * 1.02, s * 0.87, s * 0.18), mb, [0, s * 0.425, 0])); g.add(mesh(new THREE.BoxGeometry(s * 0.18, s * 0.87, s * 1.02), mb, [0, s * 0.425, 0]));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(s * 0.14, s * 0.05, 6, 12), mb, [sx * s * 0.12, s * 0.92, 0], [0, 0, sx * 0.6]));
  return g;
}

// ---------------------------------------------------------------- χιονάνθρωπος (κατασκευάζεται σταδιακά)
export function makeSnowman() {
  const g = new THREE.Group(), snow = M(0xf6f9ff, { r: 1 }), coal = M(0x161616, { r: 0.6 }), orange = M(0xff7b1c, { r: 0.6 }), red = M(0xc8102e, { r: 1 }), wood = M(0x5a3520);
  const parts = {
    base: mesh(new THREE.SphereGeometry(0.75, 20, 16), snow, [0, 0.62, 0]),
    mid: mesh(new THREE.SphereGeometry(0.55, 20, 16), snow, [0, 1.6, 0]),
    head: mesh(new THREE.SphereGeometry(0.38, 20, 16), snow, [0, 2.38, 0]),
    face: new THREE.Group(), hat: new THREE.Group(), arms: new THREE.Group(), scarf: mesh(new THREE.TorusGeometry(0.33, 0.09, 8, 20), red, [0, 2.06, 0], [Math.PI / 2, 0, 0]),
  };
  for (const sx of [-1, 1]) parts.face.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), coal, [sx * 0.13, 2.47, 0.33]));
  for (let i = 0; i < 5; i++) { const a = -0.6 + i * 0.3; parts.face.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), coal, [Math.sin(a) * 0.22, 2.24 - Math.cos(a) * 0.06 + 0.04, 0.32])); }
  parts.face.add(mesh(new THREE.ConeGeometry(0.06, 0.38, 10), orange, [0, 2.37, 0.5], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 3; i++) parts.face.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), coal, [0, 1.85 - i * 0.25, 0.53 - i * 0.02]));
  parts.hat.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20), coal, [0, 2.7, 0])); parts.hat.add(mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.42, 20), coal, [0, 2.92, 0])); parts.hat.add(mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.08, 20), red, [0, 2.76, 0]));
  for (const sx of [-1, 1]) parts.arms.add(mesh(new THREE.CylinderGeometry(0.025, 0.035, 1, 5), wood, [sx * 0.85, 1.85, 0], [0, 0, sx * 1.0]));
  for (const k in parts) { parts[k].visible = false; g.add(parts[k]); }
  return { g, parts, show: (...k) => k.forEach((n) => { parts[n].visible = true; }) };
}

/** Φωτεινή «στήλη» πάνω από τον στόχο. */
export function makeBeacon(color = 0xffe08a) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 60, 16, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(color) }, t: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 c; uniform float t; varying vec2 vU; void main(){ float a=(1.-vU.y)*0.5*(0.75+0.25*sin(vU.y*40.-t*4.)); a*=smoothstep(0.,0.04,vU.y); gl_FragColor=vec4(c,a*0.55); }' }));
  beam.position.y = 30; g.add(beam);
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,236,160,1)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); star.scale.set(1.6, 1.6, 1); g.add(star);
  return { g, update(t) { beam.material.uniforms.t.value = t; star.position.y = 2.6 + Math.sin(t * 2.5) * 0.25; } };
}
