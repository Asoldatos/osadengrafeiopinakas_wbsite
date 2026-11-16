// Χαρακτήρες και αντικείμενα: παιδιά, ο Κιμωλάκης-Άγιος Βασίλης, τάρανδοι, έλκηθρο, δώρα, χιονάνθρωπος.
import { THREE, glowTex, rand } from './engine.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.8, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, flatShading: !!o.flat });
const mesh = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...(typeof scale === 'number' ? [scale, scale, scale] : scale)); m.castShadow = true; return m; };
const pivot = (x, y, z, ...kids) => { const g = new THREE.Group(); g.position.set(x, y, z); if (kids.length) g.add(...kids); return g; };

export { makeKid, makeKimolakis, makeReindeer } from './chars.js';

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
