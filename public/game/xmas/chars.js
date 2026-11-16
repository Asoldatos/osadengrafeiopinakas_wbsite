// Χαρακτήρες με περισσότερη λεπτομέρεια: παιδιά (μπουφάν με καπιτονέ, πλεχτός σκούφος, γάντια, μπότες με γούνα),
// ο Κιμωλάκης ως Άγιος Βασίλης (κιμωλία με στολή, γένια, γυαλιά) και τάρανδοι (απαλό σώμα, κέρατα με διακλαδώσεις).
import { THREE, glowTex, rand } from './engine.js';

// ---------------------------------------------------------------- υλικά
const cache = new Map();
const mat = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const std = (color, r = 0.8, m = 0) => mat(`s${color}${r}${m}`, () => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m }));
/** Ύφασμα (μαλλί/φλις) με «sheen» για πιο μαλακή όψη. */
const cloth = (color, sheen = 0.8) => mat(`c${color}${sheen}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.85, sheen, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5) }));
const puffer = (color) => mat(`p${color}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4 }));
const skinM = (color) => mat(`k${color}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0xffd6c8) }));
const basic = (color) => mat(`b${color}`, () => new THREE.MeshBasicMaterial({ color }));

const add = (parent, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale) => { const m = new THREE.Mesh(geo, material); m.position.set(...pos); m.rotation.set(...rot); if (scale != null) m.scale.set(...(typeof scale === 'number' ? [scale, scale, scale] : scale)); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent?.add(g); return g; };
const S = (r, w = 24, h = 18, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
/** Σχήμα «από περιστροφή» (σαν τόρνος): πίνακας [ακτίνα, ύψος]. */
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const tube = (pts, r = 0.02, seg = 20) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 8, false);

/** Μάτια με λευκό, κόρη, ίριδα και δύο λάμψεις + φρύδια + μύτη + στόμα + μάγουλα. Επιστρέφει τα «βλέφαρα» για ανοιγοκλείσιμο. */
function face(head, { r, y = 0, eye = 0.045, sep = 0.085, iris = 0x3b2a1a, brow = 0x4a2e1c, nose = 0xf0a59a, cheeks = true, mouthW = 0.05, lid = 0xf2c8a8 }) {
  const lids = [], fz = (yy, xx) => Math.sqrt(Math.max(0, r * r - yy * yy - xx * xx));
  for (const sx of [-1, 1]) {
    const ex = sx * sep, ey = y + r * 0.08, ez = fz(ey, ex) - eye * 0.35;
    const e = group(head, ex, ey, ez);
    add(e, S(eye, 20, 16), basic(0xffffff), [0, 0, 0], [0, 0, 0], [1, 1.15, 0.6]);
    add(e, S(eye * 0.68, 18, 14), std(iris, 0.35), [0, -eye * 0.08, eye * 0.33], [0, 0, 0], [1, 1.12, 0.5]);
    add(e, S(eye * 0.4, 14, 10), basic(0x0b0705), [0, -eye * 0.08, eye * 0.47], [0, 0, 0], [1, 1.1, 0.45]);
    add(e, S(eye * 0.18, 10, 8), basic(0xffffff), [eye * 0.25, eye * 0.32, eye * 0.6]);
    add(e, S(eye * 0.09, 8, 6), basic(0xffffff), [-eye * 0.2, -eye * 0.28, eye * 0.6]);
    const lidM = add(e, S(eye * 1.08, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), skinM(lid), [0, 0, 0.002], [0, 0, 0], [1, 0.02, 0.66]); lids.push(lidM);
    add(head, new THREE.CapsuleGeometry(0.009, eye * 1.1, 4, 8), std(brow, 0.9), [ex, ey + eye * 1.65, ez + eye * 0.25], [0, 0, Math.PI / 2 + sx * 0.18]);
    if (cheeks) add(head, S(eye * 1.05, 14, 10), mat('cheek', () => new THREE.MeshStandardMaterial({ color: 0xff8f9a, roughness: 1, transparent: true, opacity: 0.55 })), [sx * (sep + 0.055), y - r * 0.18, fz(y - r * 0.18, sx * (sep + 0.055)) - 0.01], [0, sx * 0.4, 0], [1, 0.6, 0.25]);
  }
  add(head, S(r * 0.11, 14, 10), skinM(nose), [0, y - r * 0.08, fz(y - r * 0.08, 0) + r * 0.03]);
  const mouth = add(head, new THREE.TorusGeometry(mouthW, 0.012, 8, 20, Math.PI), std(0x6a2a24, 0.5), [0, y - r * 0.36, fz(y - r * 0.36, 0) - 0.004], [0.25, 0, Math.PI]);
  return { lids, mouth };
}
/** Πλεχτός σκούφος με ρίγες, γυρισμένο ρεβέρ και αφράτο πομ-πομ. */
function beanie(head, r, color, stripe) {
  const h = group(head, 0, 0.075, -0.02); h.rotation.x = -0.12;
  add(h, S(r * 1.06, 30, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), cloth(color), [0, r * 0.05, 0], [-0.12, 0, 0]);
  for (let i = 0; i < 3; i++) add(h, new THREE.TorusGeometry(r * (1.0 - i * 0.18), 0.012, 6, 30), cloth(stripe), [0, r * (0.32 + i * 0.22), -0.03 - i * 0.025], [Math.PI / 2 - 0.12, 0, 0]);
  add(h, new THREE.TorusGeometry(r * 1.0, r * 0.17, 12, 36), cloth(stripe), [0, r * 0.12, 0], [Math.PI / 2 - 0.12, 0, 0]);
  const pom = group(h, 0, r * 1.12, -r * 0.18);
  for (let i = 0; i < 9; i++) add(pom, S(r * 0.17, 12, 10), cloth(0xffffff, 1), [rand(-1, 1) * r * 0.1, rand(-1, 1) * r * 0.1, rand(-1, 1) * r * 0.1]);
  return { h, pom };
}

// =================================================================== παιδί
export function makeKid({ coat = 0x2b6cb0, hat = 0xc8102e, scarf = 0xf6c453, pants = 0x2a3550, skin = 0xf2c8a8, hair = 0x5a3825, backpack = false, height = 1, girl = false } = {}) {
  const root = new THREE.Group(), body = group(root); body.scale.setScalar(height);
  const legs = [], arms = [];
  // πόδια: παντελόνι + μπότες με γούνινο ρεβέρ και σόλα
  for (const sx of [-1, 1]) {
    const leg = group(body, sx * 0.1, 0.58, 0);
    add(leg, lathe([[0.001, -0.4], [0.07, -0.4], [0.085, -0.25], [0.09, -0.05], [0.08, 0.02], [0.001, 0.03]], 16), cloth(pants, 0.5));
    add(leg, new THREE.CapsuleGeometry(0.08, 0.1, 6, 14), std(0x5a3520, 0.55), [0, -0.46, 0.035], [Math.PI / 2, 0, 0], [1, 1.2, 0.85]);
    add(leg, new THREE.BoxGeometry(0.16, 0.035, 0.28, 2, 1, 2), std(0x2a1a10, 0.7), [0, -0.535, 0.04]);
    add(leg, new THREE.TorusGeometry(0.075, 0.03, 8, 18), cloth(0xf3ead8, 1), [0, -0.38, 0], [Math.PI / 2, 0, 0]);
    legs.push(leg);
  }
  // μπουφάν με καπιτονέ (lathe) + φερμουάρ + τσέπες
  const jacket = add(body, lathe([[0.001, 0.6], [0.19, 0.6], [0.235, 0.66], [0.25, 0.78], [0.245, 0.92], [0.22, 1.04], [0.17, 1.12], [0.09, 1.16], [0.001, 1.17]], 32), puffer(coat), [0, 0, 0], [0, 0, 0], [1, 1, 0.84]);
  for (const y of [0.7, 0.82, 0.94, 1.04]) add(body, new THREE.TorusGeometry(y > 1 ? 0.2 : 0.243, 0.016, 8, 36), puffer(coat), [0, y, 0], [Math.PI / 2, 0, 0], [1, 0.84, 1]);
  add(body, new THREE.BoxGeometry(0.018, 0.5, 0.02), std(0xd8d8d8, 0.3, 0.8), [0, 0.86, 0.212]);
  add(body, S(0.022, 10, 8), std(0xd8d8d8, 0.3, 0.8), [0, 1.08, 0.19]);
  for (const sx of [-1, 1]) add(body, new THREE.BoxGeometry(0.11, 0.07, 0.03), puffer(new THREE.Color(coat).multiplyScalar(0.8).getHex()), [sx * 0.12, 0.72, 0.2], [0, sx * 0.35, 0]);
  add(body, new THREE.TorusGeometry(0.15, 0.05, 10, 24), cloth(0xf3ead8, 1), [0, 1.14, -0.04], [Math.PI / 2 + 0.3, 0, 0]);       // γούνα κουκούλας
  // κασκόλ: δαχτυλίδι + ουρά με κρόσσια
  add(body, new THREE.TorusGeometry(0.135, 0.058, 12, 28), cloth(scarf), [0, 1.155, 0.01], [Math.PI / 2 + 0.08, 0, 0]);
  const tail = group(body, 0.085, 1.1, 0.16); tail.rotation.set(0.12, 0, 0.18);
  add(tail, new THREE.BoxGeometry(0.1, 0.32, 0.035, 1, 4, 1), cloth(scarf), [0, -0.14, 0]);
  for (let i = 0; i < 4; i++) add(tail, new THREE.CylinderGeometry(0.006, 0.006, 0.05, 4), cloth(scarf), [-0.04 + i * 0.027, -0.32, 0]);
  for (const y of [-0.06, -0.2]) add(tail, new THREE.BoxGeometry(0.102, 0.025, 0.037), cloth(0xffffff), [0, y, 0]);
  // χέρια: «φουσκωτά» μανίκια + γάντια με αντίχειρα
  for (const sx of [-1, 1]) {
    const arm = group(body, sx * 0.25, 1.06, 0); arm.rotation.z = sx * 0.14;
    add(arm, lathe([[0.001, 0.02], [0.072, 0.0], [0.075, -0.12], [0.068, -0.2], [0.071, -0.28], [0.062, -0.34], [0.001, -0.35]], 18), puffer(coat));
    add(arm, new THREE.TorusGeometry(0.058, 0.02, 8, 18), cloth(0xf3ead8, 1), [0, -0.34, 0], [Math.PI / 2, 0, 0]);
    const mit = group(arm, 0, -0.42, 0.01);
    add(mit, S(0.068, 16, 12), cloth(scarf), [0, 0, 0], [0, 0, 0], [0.9, 1.1, 0.75]);
    add(mit, new THREE.CapsuleGeometry(0.022, 0.04, 4, 8), cloth(scarf), [-sx * 0.055, 0.02, 0.02], [0, 0, sx * 0.6]);
    arms.push(arm);
  }
  if (backpack) {
    const bp = group(body, 0, 0.92, -0.25);
    add(bp, new THREE.CapsuleGeometry(0.13, 0.16, 6, 14), puffer(0xe8573d), [0, 0, 0], [0, 0, 0], [1.2, 1, 0.6]);
    add(bp, new THREE.CapsuleGeometry(0.07, 0.06, 4, 10), puffer(0xf6c453), [0, -0.08, -0.07], [0, 0, Math.PI / 2], [1, 1, 0.6]);
    for (const sx of [-1, 1]) add(body, new THREE.TorusGeometry(0.12, 0.014, 6, 16, Math.PI), std(0x2a2a2a), [sx * 0.13, 0.98, -0.03], [0, Math.PI / 2, 0], [1, 1.3, 1]);
  }
  // κεφάλι (μεγάλο, «chibi»), αυτιά, μαλλιά, πρόσωπο, σκούφος
  const head = group(body, 0, 1.4, 0), R = 0.25;
  add(head, S(R, 36, 28), skinM(skin), [0, 0, 0], [0, 0, 0], [1, 0.97, 0.95]);
  for (const sx of [-1, 1]) add(head, S(0.05, 12, 10), skinM(skin), [sx * R * 0.98, -0.01, -0.01], [0, 0, 0], [0.5, 1, 0.8]);
  const hairM = std(hair, 0.65);
  add(head, S(R * 1.03, 30, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM, [0, 0.01, -0.03], [-0.62, 0, 0]);
  for (let i = -2; i <= 2; i++) add(head, S(0.06, 12, 10), hairM, [i * 0.065, R * 0.6, R * 0.68 - Math.abs(i) * 0.03], [0.4, 0, i * 0.2], [1, 0.7, 0.7]);   // αφέλειες
  if (girl) for (const sx of [-1, 1]) { const b = group(head, sx * R * 0.92, -0.08, -0.1); add(b, new THREE.CapsuleGeometry(0.05, 0.16, 6, 12), hairM, [0, -0.08, 0]); add(b, S(0.03, 10, 8), cloth(hat), [0, 0.03, 0]); }
  const f = face(head, { r: R * 0.95, y: -0.015, eye: 0.042, sep: 0.088, lid: skin });
  const bean = beanie(head, R, hat, 0xffffff);
  let ph = 0, blink = 2, blinkT = 0;
  const st = { wave: 0, throw: 0, cheer: 0, air: false, talk: 0 };
  return {
    root, head, arms, legs, st,
    update(dt, speed = 0, t = 0) {
      const k = Math.min(1, speed / 4.5); ph += dt * (4 + speed * 2.2);
      const sw = Math.sin(ph) * 0.75 * k;
      legs[0].rotation.x = st.air ? -0.6 : sw; legs[1].rotation.x = st.air ? 0.3 : -sw;
      arms[0].rotation.x = st.air ? -1.0 : -sw * 0.9; arms[1].rotation.x = st.air ? -1.0 : sw * 0.9;
      body.position.y = Math.abs(Math.sin(ph)) * 0.05 * k + Math.sin(t * 2.1) * 0.006; body.rotation.x = k * 0.1; jacket.scale.y = 1 + Math.sin(t * 2.1) * 0.006;
      head.rotation.z = Math.sin(ph) * 0.04 * k; bean.pom.position.x = -Math.sin(ph) * 0.02 * k;
      if (st.wave > 0) { st.wave -= dt; arms[1].rotation.x = -2.7; arms[1].rotation.z = -0.4 + Math.sin(t * 14) * 0.35; } else arms[1].rotation.z = 0.14;
      if (st.throw > 0) { st.throw -= dt; const p = 1 - st.throw / 0.35; arms[1].rotation.x = p < 0.4 ? -2.8 * (p / 0.4) : -2.8 + (p - 0.4) * 6; }
      if (st.cheer > 0) { st.cheer -= dt; arms[0].rotation.x = arms[1].rotation.x = -2.8 + Math.sin(t * 12) * 0.2; arms[0].rotation.z = -0.3; body.position.y += Math.abs(Math.sin(t * 9)) * 0.12; } else arms[0].rotation.z = -0.14;
      if (st.talk > 0) { st.talk -= dt; f.mouth.scale.y = 1 + Math.abs(Math.sin(t * 16)) * 0.8; } else f.mouth.scale.y = 1;
      // ανοιγοκλείσιμο ματιών
      if ((blink -= dt) < 0) { blink = rand(2.2, 5); blinkT = 0.14; }
      if (blinkT > 0) { blinkT -= dt; const c = blinkT > 0.07 ? (0.14 - blinkT) / 0.07 : blinkT / 0.07; for (const l of f.lids) l.scale.y = 0.02 + c * 1.05; }
    },
  };
}

// =================================================================== Κιμωλάκης ως Άγιος Βασίλης
function chalkTex() {
  return mat('chalkTex', () => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fbf8f0'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) { const v = 205 + Math.random() * 45; x.fillStyle = `rgba(${v},${v},${v - 6},.35)`; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (let i = 0; i < 18; i++) { x.strokeStyle = 'rgba(190,185,175,.35)'; x.lineWidth = 1; x.beginPath(); const y = Math.random() * 256; x.moveTo(0, y); x.lineTo(256, y + rand(-6, 6)); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });
}
export function makeKimolakis() {
  const root = new THREE.Group(), body = group(root);
  const chalk = mat('chalk', () => new THREE.MeshStandardMaterial({ color: 0xfbf8f0, roughness: 0.97, map: chalkTex(), bumpMap: chalkTex(), bumpScale: 0.6 }));
  const red = cloth(0xc8102e, 0.6), fur = cloth(0xffffff, 1), black = std(0x1d1a1a, 0.45), gold = std(0xf6c453, 0.25, 0.9);
  // σώμα-κιμωλία (στρογγεμένος κύλινδρος)
  add(body, new THREE.CapsuleGeometry(0.33, 1.05, 10, 32), chalk, [0, 1.17, 0]);
  // στολή: παλτό (lathe) με γούνινη ποδιά & κουμπιά, ζώνη με χρυσή αγκράφα
  add(body, lathe([[0.001, 0.45], [0.43, 0.45], [0.405, 0.6], [0.36, 0.9], [0.348, 1.25], [0.35, 1.36], [0.001, 1.37]], 36), red);
  add(body, new THREE.TorusGeometry(0.425, 0.065, 12, 40), fur, [0, 0.47, 0], [Math.PI / 2, 0, 0]);
  add(body, new THREE.BoxGeometry(0.13, 0.84, 0.08, 1, 6, 1), fur, [0, 0.9, 0.36]);
  for (const y of [0.68, 1.1, 1.24]) add(body, S(0.03, 10, 8), gold, [0, y, 0.41]);
  add(body, new THREE.TorusGeometry(0.365, 0.055, 10, 40), black, [0, 0.93, 0], [Math.PI / 2, 0, 0], [1, 1, 1.2]);
  const buckle = group(body, 0, 0.93, 0.41); add(buckle, new THREE.BoxGeometry(0.2, 0.16, 0.03), gold); add(buckle, new THREE.BoxGeometry(0.12, 0.08, 0.035), black);
  add(body, new THREE.TorusGeometry(0.33, 0.06, 10, 36), fur, [0, 1.36, 0], [Math.PI / 2, 0, 0]);
  // πόδια & μπότες
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const leg = group(body, sx * 0.16, 0.48, 0);
    add(leg, new THREE.CapsuleGeometry(0.075, 0.24, 6, 14), red, [0, -0.17, 0]);
    add(leg, new THREE.CapsuleGeometry(0.09, 0.14, 6, 14), black, [0, -0.37, 0.05], [Math.PI / 2, 0, 0], [1, 1.25, 0.9]);
    add(leg, new THREE.TorusGeometry(0.085, 0.03, 8, 16), fur, [0, -0.27, 0], [Math.PI / 2, 0, 0]);
    legs.push(leg);
    const arm = group(body, sx * 0.4, 1.3, 0); arm.rotation.z = sx * 0.28;
    add(arm, lathe([[0.001, 0.03], [0.085, 0], [0.09, -0.2], [0.08, -0.38], [0.001, -0.39]], 18), red);
    add(arm, new THREE.TorusGeometry(0.075, 0.035, 8, 18), fur, [0, -0.39, 0], [Math.PI / 2, 0, 0]);
    const glove = group(arm, 0, -0.48, 0); add(glove, S(0.085, 16, 12), black, [0, 0, 0], [0, 0, 0], [0.95, 1.1, 0.8]); add(glove, new THREE.CapsuleGeometry(0.025, 0.05, 4, 8), black, [-sx * 0.07, 0.02, 0.03], [0, 0, sx * 0.6]);
    arms.push(arm);
  }
  // πρόσωπο στην κορυφή της κιμωλίας
  const head = group(body, 0, 1.68, 0.02);
  const f = face(head, { r: 0.335, y: 0.04, eye: 0.058, sep: 0.12, iris: 0x2b4a7a, brow: 0xe8e8e8, nose: 0xf28b8b, mouthW: 0.06, lid: 0xf3efe6 });
  // γυαλιά «μισοφέγγαρα»
  for (const sx of [-1, 1]) add(head, new THREE.TorusGeometry(0.062, 0.008, 6, 20, Math.PI), gold, [sx * 0.12, 0.02, 0.33], [0, 0, Math.PI]);
  add(head, new THREE.TorusGeometry(0.03, 0.007, 6, 10, Math.PI), gold, [0, 0.03, 0.335]);
  // γένια: πυκνό «σύννεφο» + μουστάκι
  const beard = group(head, 0, -0.12, 0.12), pts = [];
  for (let i = 0; i < 26; i++) { const a = rand(-1.45, 1.45), d = rand(0, 1); pts.push([Math.sin(a) * 0.3 * (1 - d * 0.35), -Math.cos(a) * 0.12 - d * 0.2, Math.cos(a) * 0.2 + 0.03]); }
  for (const p of pts) add(beard, S(rand(0.07, 0.1), 12, 10), fur, p);
  for (const sx of [-1, 1]) { const mu = group(head, sx * 0.075, -0.1, 0.3); add(mu, new THREE.CapsuleGeometry(0.04, 0.1, 6, 12), fur, [sx * 0.03, 0, 0], [0, 0, sx * 1.25]); add(mu, S(0.045, 10, 8), fur, [sx * 0.09, -0.03, -0.01]); }
  // σκούφος Άη Βασίλη που γέρνει
  const hat = group(head, 0, 0.3, -0.02);
  add(hat, new THREE.TorusGeometry(0.315, 0.075, 14, 40), fur, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const tip = group(hat, 0, 0.02, 0); tip.rotation.z = -0.3;
  add(tip, lathe([[0.3, 0], [0.27, 0.15], [0.2, 0.35], [0.12, 0.55], [0.05, 0.72], [0.001, 0.78]], 30), red);
  const pom = group(tip, 0.02, 0.78, 0); for (let i = 0; i < 8; i++) add(pom, S(0.06, 12, 10), fur, [rand(-0.04, 0.04), rand(-0.04, 0.04), rand(-0.04, 0.04)]);
  // σάκος
  const sack = add(body, lathe([[0.001, -0.35], [0.28, -0.3], [0.4, -0.05], [0.36, 0.22], [0.2, 0.36], [0.07, 0.4], [0.001, 0.42]], 24), cloth(0x8b5a2b, 0.4), [0, 1.18, -0.58], [0.2, 0, 0]);
  add(body, new THREE.TorusGeometry(0.08, 0.025, 6, 14), std(0xf6c453, 0.5), [0, 1.58, -0.66], [Math.PI / 2, 0, 0]);
  let ph = 0, blink = 2, blinkT = 0; const st = { wave: 0, talk: 0, cheer: 0 };
  return {
    root, head, st, arms, sack,
    update(dt, speed = 0, t = 0) {
      const k = Math.min(1, speed / 3); ph += dt * (3 + speed * 2);
      const sw = Math.sin(ph) * 0.6 * k; legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
      body.position.y = Math.abs(Math.sin(ph)) * 0.05 * k; body.rotation.z = Math.sin(t * 1.3) * 0.025;
      arms[0].rotation.x = -sw; arms[1].rotation.x = sw; tip.rotation.z = -0.3 + Math.sin(t * 2.4) * 0.05 - k * 0.1; pom.position.x = 0.02 + Math.sin(t * 3) * 0.015;
      if (st.wave > 0) { st.wave -= dt; arms[1].rotation.x = -2.7; arms[1].rotation.z = -0.3 + Math.sin(t * 12) * 0.35; } else arms[1].rotation.z = 0.28;
      if (st.cheer > 0) { st.cheer -= dt; arms[0].rotation.x = arms[1].rotation.x = -2.6 + Math.sin(t * 10) * 0.2; body.position.y += Math.abs(Math.sin(t * 8)) * 0.1; }
      if (st.talk > 0) { st.talk -= dt; head.rotation.z = Math.sin(t * 7) * 0.05; beard.position.y = -0.12 - Math.abs(Math.sin(t * 14)) * 0.015; f.mouth.scale.y = 1 + Math.abs(Math.sin(t * 14)) * 0.6; } else f.mouth.scale.y = 1;
      if ((blink -= dt) < 0) { blink = rand(2.5, 5); blinkT = 0.14; }
      if (blinkT > 0) { blinkT -= dt; const c = blinkT > 0.07 ? (0.14 - blinkT) / 0.07 : blinkT / 0.07; for (const l of f.lids) l.scale.y = 0.02 + c * 1.05; }
    },
  };
}

// =================================================================== τάρανδος
export function makeReindeer({ rudolph = false, collar = 0xc8102e } = {}) {
  const root = new THREE.Group(), body = group(root);
  const furM = cloth(0x8a5a35, 0.5), light = cloth(0xe2c49c, 0.8), dark = std(0x2e1f14, 0.6), horn = std(0xd9c7a4, 0.65), white = cloth(0xffffff, 1);
  // κορμός: ελλειψοειδή που «δένουν» μεταξύ τους
  add(body, S(0.38, 28, 20), furM, [0, 1.12, -0.18], [0, 0, 0], [0.95, 0.92, 1.3]);
  add(body, S(0.36, 28, 20), furM, [0, 1.15, 0.3], [0, 0, 0], [0.92, 0.95, 1.05]);
  add(body, S(0.3, 20, 16), light, [0, 1.0, 0.32], [0, 0, 0], [0.85, 0.75, 0.9]);
  for (let i = 0; i < 7; i++) add(body, S(0.09, 10, 8), white, [rand(-0.12, 0.12), 1.1 + rand(-0.1, 0.1), 0.58 + rand(0, 0.06)]);          // αφράτο στήθος
  add(body, S(0.08, 12, 10), white, [0, 1.25, -0.66]);
  const legs = [];
  for (const [x, z, back] of [[-0.18, 0.4, 0], [0.18, 0.4, 0], [-0.18, -0.38, 1], [0.18, -0.38, 1]]) {
    const l = group(body, x, 0.98, z);
    add(l, lathe([[0.001, 0.08], [0.085, 0.04], [0.075, -0.25], [0.045, -0.5], [0.04, -0.82], [0.001, -0.83]], 12), furM, [0, 0, 0], [back ? 0.12 : 0, 0, 0]);
    add(l, new THREE.CylinderGeometry(0.048, 0.06, 0.1, 10), dark, [0, -0.86, 0.01]);
    add(l, new THREE.TorusGeometry(0.048, 0.02, 6, 12), white, [0, -0.78, 0], [Math.PI / 2, 0, 0]);
    legs.push(l);
  }
  const neck = group(body, 0, 1.35, 0.5);
  add(neck, lathe([[0.001, -0.05], [0.2, 0], [0.16, 0.3], [0.13, 0.5], [0.001, 0.52]], 16), furM, [0, 0, 0], [0.45, 0, 0]);
  const head = group(neck, 0, 0.5, 0.24);
  add(head, S(0.18, 24, 18), furM, [0, 0, 0], [0, 0, 0], [0.9, 0.95, 1.1]);
  add(head, S(0.13, 20, 16), light, [0, -0.06, 0.18], [0.3, 0, 0], [0.85, 0.75, 1.15]);
  const noseM = rudolph ? new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 2.4, roughness: 0.25 }) : std(0x221510, 0.35);
  add(head, S(rudolph ? 0.07 : 0.05, 16, 12), noseM, [0, -0.06, 0.33]);
  if (rudolph) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,40,40,1)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); gl.position.set(0, -0.06, 0.37); gl.scale.set(0.42, 0.42, 1); head.add(gl); }
  for (const sx of [-1, 1]) {
    const e = group(head, sx * 0.09, 0.05, 0.13); add(e, S(0.032, 12, 10), basic(0x120c08)); add(e, S(0.01, 6, 5), basic(0xffffff), [0.008, 0.012, 0.025]);
    add(e, new THREE.CapsuleGeometry(0.006, 0.03, 3, 6), dark, [0, 0.03, 0.01], [0, 0, Math.PI / 2 + sx * 0.3]);           // βλεφαρίδες
    const ear = group(head, sx * 0.15, 0.1, -0.02); ear.rotation.z = sx * -1.0; add(ear, S(0.05, 12, 10), furM, [0, 0.06, 0], [0, 0, 0], [0.55, 1.4, 0.35]); add(ear, S(0.032, 10, 8), light, [0, 0.06, 0.012], [0, 0, 0], [0.5, 1.2, 0.3]);
    // κέρατα: καμπύλοι σωλήνες με διακλαδώσεις
    const a = group(head, sx * 0.07, 0.15, -0.04);
    add(a, tube([[0, 0, 0], [sx * 0.06, 0.15, -0.03], [sx * 0.16, 0.3, -0.06], [sx * 0.22, 0.46, -0.02]], 0.022), horn);
    add(a, tube([[sx * 0.05, 0.12, -0.03], [sx * 0.02, 0.22, 0.06], [sx * 0.04, 0.3, 0.12]], 0.015, 10), horn);
    add(a, tube([[sx * 0.14, 0.27, -0.05], [sx * 0.12, 0.38, 0.03], [sx * 0.14, 0.45, 0.08]], 0.013, 10), horn);
    add(a, tube([[sx * 0.19, 0.38, -0.04], [sx * 0.28, 0.43, -0.08], [sx * 0.33, 0.5, -0.06]], 0.012, 10), horn);
  }
  // χαλινάρι με κουδουνάκια
  add(body, new THREE.TorusGeometry(0.2, 0.035, 10, 26), cloth(collar, 0.5), [0, 1.42, 0.62], [1.05, 0, 0]);
  const bell = group(body, 0, 1.28, 0.78); add(bell, S(0.06, 14, 12), std(0xf6c453, 0.2, 0.95)); add(bell, new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6), std(0xf6c453, 0.2, 0.95), [0, 0.06, 0]);
  for (const sx of [-1, 1]) add(body, S(0.03, 10, 8), std(0xf6c453, 0.2, 0.95), [sx * 0.17, 1.37, 0.6]);
  let ph = 0, blink = 3; const st = { graze: 0 };
  return {
    root, head, st,
    update(dt, speed = 0, t = 0) {
      const k = Math.min(1, speed / 3.5); ph += dt * (3 + speed * 2.4);
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.55 * k; });
      body.position.y = Math.abs(Math.sin(ph * 2)) * 0.04 * k; body.rotation.x = Math.sin(t * 1.6) * 0.008;
      const g = speed < 0.2 ? (Math.sin(t * 0.4 + ph) > 0.4 ? 1 : 0) : 0; st.graze += (g - st.graze) * dt * 2;
      neck.rotation.x = st.graze * 1.1 + Math.sin(t * 2) * 0.04; head.rotation.y = Math.sin(t * 0.7) * 0.2 * (1 - st.graze); head.rotation.z = Math.sin(t * 1.1) * 0.05;
      bell.rotation.z = Math.sin(t * 9) * 0.3 * (k + 0.25);
    },
  };
}
