// Ο κόσμος: έδαφος, ουρανός, φως ημέρας/νύχτας, χωριό, σχολείο, πάρκο, λίμνη, δάσος και το σπίτι από μέσα.
import { THREE, Merger, canvasTex, glowTex, signTex, clamp, lerp, smooth, rand, makeSnowfall } from './engine.js';

// ---------------------------------------------------------------- θόρυβος & ύψος εδάφους
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1); return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1; }
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const P = {
  home: { x: 16, z: 40 }, homeDoor: { x: 10.6, z: 40 }, interior: { x: 600, z: 0 },
  school: { x: 0, z: -88 }, gate: { x: 0, z: -62 }, yardTree: { x: 0, z: -72 },
  park: { x: 46, z: -12 }, snowman: { x: 42, z: -4 }, arena: { x: 54, z: -26 },
  lake: { x: -48, z: -12, r: 16 }, clearing: { x: 0, z: -150 }, forestEdge: { x: 0, z: -108 },
  reindeer: [{ x: -42, z: -128 }, { x: 44, z: -138 }, { x: -8, z: -172 }],
};
export const LAKE_Y = -0.62;

export function height(x, z) {
  if (x > 400) return 0;                                                  // εσωτερικό σπιτιού
  const r = Math.hypot(x, z + 10);
  let h = vnoise(x * 0.018, z * 0.018) * 2.4 + vnoise(x * 0.06 + 7, z * 0.06 - 3) * 0.55;
  const village = 1 - ss(70, 112, r);
  h = lerp(h, h * 0.18, village) + ss(112, 178, Math.hypot(x, z)) * 16;
  if (Math.abs(x) < 7 && z > -64 && z < 64) h = lerp(h * 0.1, h, ss(3.5, 7, Math.abs(x)));            // κεντρικός δρόμος
  if (Math.abs(z) < 6 && x > -60 && x < 72) h = lerp(h * 0.12, h, ss(3, 6, Math.abs(z)));             // κάθετος δρόμος
  const dl = Math.hypot(x - P.lake.x, z - P.lake.z); if (dl < P.lake.r + 7) h = lerp(LAKE_Y - 0.25, h, ss(P.lake.r - 1, P.lake.r + 7, dl));
  const dc = Math.hypot(x - P.clearing.x, z - P.clearing.z); if (dc < 26) h = lerp(h * 0.25 + 0.6, h, ss(16, 26, dc));
  const dpath = Math.abs(x - pathX(z)); if (z < -60 && z > -150 && dpath < 6) h = lerp(h * 0.4 + 0.3, h, ss(2.5, 6, dpath));      // μονοπάτι δάσους
  return h;
}
export const pathX = (z) => (z > -100 ? 22 + (z + 60) * -0.05 : 22 - ss(-100, -150, z) * 22 + Math.sin(z * 0.08) * 3 * ss(-100, -130, z));
export const inForest = (x, z) => z < -104 || Math.hypot(x, z) > 132;

// ---------------------------------------------------------------- φως ημέρας
export const TIMES = {
  morning: { top: '#8eaedb', hor: '#f5d4c4', bot: '#e8eef6', sun: '#ffd9b5', sunI: 1.7, sunDir: [-0.6, 0.35, 0.5], hemiS: '#d7e6ff', hemiG: '#9fb0c8', hemiI: 0.95, fog: '#e6e3ea', fogD: 0.0085, night: 0, stars: 0, snow: 1 },
  day: { top: '#86a3c8', hor: '#e7edf4', bot: '#eef2f7', sun: '#fff3e2', sunI: 2.1, sunDir: [-0.35, 0.75, 0.35], hemiS: '#e3edff', hemiG: '#b4c0d0', hemiI: 1.05, fog: '#e2e8ef', fogD: 0.0095, night: 0, stars: 0, snow: 1 },
  sunset: { top: '#3d3f7c', hor: '#ff9d6b', bot: '#d8a59a', sun: '#ff8f5a', sunI: 1.6, sunDir: [0.75, 0.16, -0.3], hemiS: '#ffb995', hemiG: '#6a6f94', hemiI: 0.65, fog: '#c99d98', fogD: 0.0075, night: 0.45, stars: 0.15, snow: 0.6 },
  night: { top: '#03081c', hor: '#16264d', bot: '#0d1630', sun: '#a8bdff', sunI: 0.55, sunDir: [0.3, 0.8, -0.45], hemiS: '#3f5590', hemiG: '#0e1222', hemiI: 0.42, fog: '#111b37', fogD: 0.011, night: 1, stars: 1, snow: 0.8 },
  dawn: { top: '#2f4d8a', hor: '#ffc28e', bot: '#e2c1b4', sun: '#ffc690', sunI: 1.3, sunDir: [-0.7, 0.2, 0.3], hemiS: '#ffd2b4', hemiG: '#7d86a8', hemiI: 0.75, fog: '#e2c6c0', fogD: 0.006, night: 0.3, stars: 0.25, snow: 0.25 },
};

export class World {
  constructor(game) {
    this.g = game; const s = (this.scene = new THREE.Scene()), q = game.q;
    this.uTime = { value: 0 }; this.nightness = 0; this.lamps = []; this.chimneys = []; this.windowsMats = []; this.anim = [];
    this.buildSky(); this.buildLights(); this.buildTerrain(); this.buildLake();
    this.buildVillage(); this.buildSchool(); this.buildPark(); this.buildForest(); this.buildInterior();
    this.snowfall = makeSnowfall(q.snow, 70); s.add(this.snowfall);
    this.setTime('morning', 0);
  }
  // ---------------------------------------------------------------- ουρανός
  buildSky() {
    const u = (this.skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, night: { value: 0 }, uTime: this.uTime, aurora: { value: 0 } });
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: u,
      vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position=p.xyww; }`,
      fragmentShader: `uniform vec3 top,hor,bot,sunDir,sunCol; uniform float night,uTime,aurora; varying vec3 vD;
        float h1(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }
        void main(){ float y=vD.y; vec3 c= y>0. ? mix(hor,top,pow(clamp(y,0.,1.),0.55)) : mix(hor,bot,clamp(-y*4.,0.,1.));
          float sd=max(dot(vD,normalize(sunDir)),0.); c+=sunCol*(pow(sd,900.)*(night>0.5?1.6:3.)+pow(sd,10.)*0.25*(1.-night*0.7));
          if(night>0.){ vec3 q=floor(vD*260.); float st=step(0.9965,h1(q)); float tw=0.6+0.4*sin(uTime*3.+h1(q+1.)*40.); c+=vec3(st*tw*night*smoothstep(0.02,0.25,y)); }
          if(aurora>0.){ float a=0.; for(int i=0;i<3;i++){ float fi=float(i); float w=sin(vD.x*6.+fi*1.7+uTime*0.15)*0.08+sin(vD.z*9.-uTime*0.22+fi)*0.05; float band=exp(-pow((y-0.35-fi*0.09-w)*14.,2.)); a+=band*(0.6+0.4*sin(vD.x*30.+uTime+fi*2.)); }
            c+=aurora*a*mix(vec3(0.15,1.,0.55),vec3(0.55,0.3,1.),smoothstep(0.3,0.55,y))*0.55*smoothstep(0.1,0.3,y); }
          gl_FragColor=vec4(c,1.); }` });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m); this.sky.frustumCulled = false; this.sky.renderOrder = -1; this.scene.add(this.sky);
    // φεγγάρι
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 30, 128, 128, 128); g.addColorStop(0, 'rgba(255,250,235,1)'); g.addColorStop(0.36, 'rgba(255,248,230,1)'); g.addColorStop(0.42, 'rgba(200,215,255,.35)'); g.addColorStop(1, 'rgba(120,150,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); c.fillStyle = 'rgba(200,200,215,.5)'; for (const [x, y, r] of [[110, 105, 12], [150, 140, 9], [120, 155, 7]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }), fog: false, depthWrite: false, transparent: true }));
    this.moon.scale.set(70, 70, 1); this.scene.add(this.moon);
  }
  buildLights() {
    const q = this.g.q;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2); this.sun.castShadow = q.shadow > 0;
    if (q.shadow) { const sc = this.sun.shadow; sc.mapSize.set(q.shadow, q.shadow); const c = sc.camera; c.left = c.bottom = -38; c.right = c.top = 38; c.near = 1; c.far = 160; sc.bias = -0.0004; sc.normalBias = 0.04; }
    this.scene.add(this.sun, this.sun.target);
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.01);
    // «δεξαμενή» φώτων που μπαίνουν στα πιο κοντινά φανάρια
    this.pool = []; for (let i = 0; i < q.lights; i++) { const l = new THREE.PointLight(0xffc47a, 0, 16, 1.6); this.scene.add(l); this.pool.push(l); }
    // φακός στο χέρι (νύχτα)
    this.lantern = new THREE.SpotLight(0xffd59a, 0, 30, 0.62, 0.55, 1.2); this.lantern.castShadow = false; this.scene.add(this.lantern, this.lantern.target);
  }
  setTime(name, sec = 4) {
    const b = TIMES[name]; this.timeName = name;
    if (sec < 0.05 || !this.cur) { this.trans = null; this.applyTime({ ...b }); return; }
    const a = { ...this.cur };
    this.trans = { a: this.mix(a, a, 0), b, t: 0, dur: Math.max(0.001, sec) }; this.timeName = name;
  }
  mix(a, b, t) {
    const C = (x, y) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), t).getHexString(), out = {};
    for (const k in b) out[k] = typeof b[k] === 'string' ? C(a[k], b[k]) : Array.isArray(b[k]) ? b[k].map((v, i) => lerp(a[k][i], v, t)) : lerp(a[k], b[k], t);
    return out;
  }
  applyTime(o) {
    this.cur = o; const u = this.skyU; u.top.value.set(o.top); u.hor.value.set(o.hor); u.bot.value.set(o.bot); u.sunCol.value.set(o.sun); u.night.value = o.stars;
    const d = new THREE.Vector3(...o.sunDir).normalize(); u.sunDir.value.copy(d);
    this.sun.color.set(o.sun); this.sun.intensity = o.sunI; this.sunDir = d;
    this.hemi.color.set(o.hemiS); this.hemi.groundColor.set(o.hemiG); this.hemi.intensity = o.hemiI;
    this.scene.fog.color.set(o.fog); this.scene.fog.density = o.fogD * (this.indoor ? 0 : 1);
    this.nightness = o.night; this.moon.material.opacity = clamp(o.night * 1.4 - 0.2, 0, 1);
    for (const m of this.windowsMats) m.color.copy(m.userData.day).lerp(m.userData.lit, clamp(o.night * 1.5 + 0.15, 0, 1));
    this.glowMat.opacity = clamp(o.night * 1.4 - 0.1, 0, 1); this.bulbMat.color.set(o.night > 0.2 ? 0xffe2a8 : 0xd9d2c4);
    this.lightsMat.opacity = clamp(0.35 + o.night, 0, 1);
    this.snowfall.material.uniforms.uOpacity.value = o.snow * (this.snowMul ?? 1);
    this.snowfall.material.uniforms.uColor.value.set(o.night > 0.6 ? '#dfe8ff' : '#ffffff');
  }
  // ---------------------------------------------------------------- έδαφος
  buildTerrain() {
    const seg = this.g.q === this.g.Q.low ? 150 : 230, size = 360, geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = height(x, z); p.setY(i, y);
      const road = (Math.abs(x) < 3.6 && z > -64 && z < 64) || (Math.abs(z) < 3.2 && x > -60 && x < 72);
      const path = z < -60 && z > -150 && Math.abs(x - pathX(z)) < 2.2;
      const n = hash(Math.floor(x * 2), Math.floor(z * 2)) * 0.03;
      if (road) c.setRGB(0.74 + n, 0.77 + n, 0.83 + n); else if (path) c.setRGB(0.86 + n, 0.88 + n, 0.93 + n); else c.setRGB(0.95 - n, 0.97 - n, 1);
      if (y > 6) c.lerp(new THREE.Color(0.9, 0.93, 1), 0.3);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
    mat.onBeforeCompile = (sh) => {           // λάμψεις στο χιόνι που τρεμοπαίζουν καθώς κινείσαι
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uTime; float hs(vec3 p){return fract(sin(dot(p,vec3(12.99,78.23,37.71)))*43758.55);}')
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          vec3 cell=floor(vWP*vec3(9.,30.,9.)); float sp=step(0.9965,hs(cell)); vec3 V=normalize(cameraPosition-vWP); float tw=pow(max(0.,sin(dot(V,vec3(31.,17.,23.))*3.+hs(cell+3.)*60.)),8.);
          float fade=1.-smoothstep(8.,40.,length(cameraPosition-vWP)); gl_FragColor.rgb+=vec3(sp*tw*fade*1.4);`);
    };
    this.ground = new THREE.Mesh(geo, mat); this.ground.receiveShadow = true; this.scene.add(this.ground);
  }
  buildLake() {
    const m = new THREE.MeshStandardMaterial({ color: 0xbfe2ff, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.92 });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb+=vec3(0.03,0.06,0.09)*(0.5+0.5*sin(gl_FragCoord.x*0.02+gl_FragCoord.y*0.013));'); };
    const ice = new THREE.Mesh(new THREE.CircleGeometry(P.lake.r + 1.2, 64), m); ice.rotation.x = -Math.PI / 2; ice.position.set(P.lake.x, LAKE_Y, P.lake.z); ice.receiveShadow = true; this.scene.add(ice);
    // ρωγμές / γραμμές πατινιού
    const lines = canvasTex(512, 512, (c) => { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; for (let i = 0; i < 26; i++) { c.beginPath(); const cx = 256 + rand(-170, 170), cy = 256 + rand(-170, 170), r = rand(30, 140); c.ellipse(cx, cy, r, r * rand(0.3, 0.8), rand(0, 3), 0, rand(1, 5)); c.stroke(); } }, { srgb: true });
    const sc = new THREE.Mesh(new THREE.CircleGeometry(P.lake.r, 64), new THREE.MeshBasicMaterial({ map: lines, transparent: true, depthWrite: false, opacity: 0.6 })); sc.rotation.x = -Math.PI / 2; sc.position.set(P.lake.x, LAKE_Y + 0.01, P.lake.z); this.scene.add(sc);
  }
  // ---------------------------------------------------------------- υλικά κοινά
  mats() {
    if (this._m) return this._m;
    const v = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), glow = (this.glowMat = new THREE.SpriteMaterial({ map: glowTex('rgba(255,210,140,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 }); this.lightsMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true });
    return (this._m = { v, glow });
  }
  windowMat(day = '#7f97b8', lit = '#ffcc7a') { const m = new THREE.MeshBasicMaterial({ color: day }); m.userData = { day: new THREE.Color(day), lit: new THREE.Color(lit) }; this.windowsMats.push(m); return m; }
  // ---------------------------------------------------------------- σπίτια & χωριό
  house(mg, win, lights, { x, z, ry, w = 9, d = 7, h = 4.2, wall = '#efe3cc', roof = '#8e2b25', xmas = false, chimney = true }) {
    const y0 = height(x, z) - 0.3, M = (lx, ly, lz) => { const c = Math.cos(ry), s = Math.sin(ry); return [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c]; };
    const add = (geo, lx, ly, lz, col, rot = [0, 0, 0], sc) => mg.add(geo, { pos: M(lx, ly, lz), rot: [rot[0], rot[1] + ry, rot[2]], scale: sc, color: col });
    add(new THREE.BoxGeometry(w, h, d), 0, h / 2, 0, wall);
    add(new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3), 0, 0.25, 0, '#9c9387');
    const a = 0.62, half = d / 2 + 0.55, len = half / Math.cos(a);
    for (const sgn of [-1, 1]) {
      add(new THREE.BoxGeometry(w + 0.9, 0.28, len), 0, h + Math.sin(a) * len / 2, sgn * (half / 2 - 0.05), roof, [sgn * a, 0, 0]);
      add(new THREE.BoxGeometry(w + 1, 0.24, len * 0.97), 0, h + Math.sin(a) * len / 2 + Math.cos(a) * 0.24, sgn * (half / 2 - 0.05 + Math.sin(a) * 0.24), '#fbfdff', [sgn * a, 0, 0]);   // χιόνι στη στέγη
    }
    const ridge = h + Math.tan(a) * half;
    const tri = new THREE.BufferGeometry(); const hw = w / 2;
    for (const sgn of [-1, 1]) { const pos = new Float32Array([sgn * hw, h, -half + 0.5, sgn * hw, h, half - 0.5, sgn * hw, ridge - 0.25, 0]); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals(); if (sgn < 0) g.index = null; mg.add(sgn < 0 ? flip(g) : g, { matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, y0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0, 'YXZ')), new THREE.Vector3(1, 1, 1)), color: wall }); }
    add(new THREE.BoxGeometry(1.5, 2.4, 0.15), 0, 1.2, d / 2 + 0.05, '#6b3d23');   // πόρτα
    add(new THREE.BoxGeometry(0.12, 0.12, 0.12), 0.5, 1.2, d / 2 + 0.16, '#d9b44a');
    add(new THREE.BoxGeometry(2.2, 0.15, 1.2), 0, 2.75, d / 2 + 0.55, '#fbfdff');   // υπόστεγο με χιόνι
    const wins = [[-w / 2 + 1.6, d / 2], [w / 2 - 1.6, d / 2], [-w / 2 + 1.6, -d / 2], [w / 2 - 1.6, -d / 2]];
    for (const [lx, lz] of wins) {
      const zz = lz + Math.sign(lz) * 0.06; add(new THREE.BoxGeometry(1.5, 1.4, 0.12), lx, 2.4, zz, '#ffffff');
      win.add(new THREE.PlaneGeometry(1.2, 1.1), { pos: M(lx, 2.4, lz + Math.sign(lz) * 0.14), rot: [0, ry + (lz < 0 ? Math.PI : 0), 0] });
      add(new THREE.BoxGeometry(1.7, 0.12, 0.35), lx, 1.65, lz + Math.sign(lz) * 0.2, '#fbfdff');
    }
    for (const lz of [-d / 4, d / 4]) for (const sx of [-1, 1]) { win.add(new THREE.PlaneGeometry(1.1, 1.1), { pos: M(sx * (w / 2 + 0.07), 2.4, lz), rot: [0, ry + sx * Math.PI / 2, 0] }); add(new THREE.BoxGeometry(0.12, 1.35, 1.4), sx * (w / 2 + 0.01), 2.4, lz, '#ffffff'); }
    if (chimney) { const cx = w / 4, cz = -half / 3, cy = h + Math.tan(a) * (half - Math.abs(cz)); add(new THREE.BoxGeometry(0.9, 2.2, 0.9), cx, cy + 0.6, cz, '#7a4a3a'); add(new THREE.BoxGeometry(1.05, 0.25, 1.05), cx, cy + 1.75, cz, '#fbfdff'); const p = M(cx, cy + 1.9, cz); this.chimneys.push({ x: p[0], y: p[1], z: p[2] }); }
    if (xmas) { const cols = ['#ff3b3b', '#ffd23b', '#3bff7a', '#3bb4ff', '#ff6ad5']; const n = 16; for (let i = 0; i <= n; i++) { const t = i / n, lx = -w / 2 - 0.3 + t * (w + 0.6); lights.add(new THREE.SphereGeometry(0.09, 6, 5), { pos: M(lx, h - 0.05 - Math.sin(t * Math.PI * 4) * 0.12, d / 2 + 0.35), color: cols[i % cols.length] }); } }
    this.g.phys.box(x, z, w / 2, d / 2, ry, h + 2);
    return { door: M(0, 0, d / 2 + 1.4) };
  }
  buildVillage() {
    const { v } = this.mats(), mg = new Merger(), win = new Merger(), lights = new Merger();
    const walls = ['#efe3cc', '#d9e6f2', '#f4d9d2', '#f1e3b0', '#dfe9d5', '#e8d4ee'], roofs = ['#8e2b25', '#5d3a2e', '#2f4b5e', '#6a2b3b', '#3d5a3a'];
    const list = [
      [16, 40, -1, true], [16, 22, -1], [16, 4, -1, true], [16, -22, -1], [16, -42, -1, true],
      [-16, 44, 1, true], [-16, 26, 1], [-16, 8, 1, true], [-16, -24, 1], [-16, -44, 1],
      [34, 32, -1], [34, 14, -1, true], [-34, 30, 1, true], [-34, 12, 1], [-36, -36, 1, true], [30, -44, -1],
    ];
    list.forEach(([x, z, side, xm], i) => { const r = this.house(mg, win, lights, { x, z, ry: side * Math.PI / 2, wall: walls[i % walls.length], roof: roofs[i % roofs.length], xmas: !!xm, w: 8.5 + (i % 3), d: 7 + (i % 2) }); if (i === 0) this.homeDoorPos = r.door; });
    // φανάρια δρόμου
    for (let z = 56; z >= -56; z -= 16) for (const sx of [-1, 1]) this.lamp(mg, sx * 5.2, z + (sx > 0 ? 8 : 0));
    for (let x = -50; x <= 66; x += 18) if (Math.abs(x) > 8) this.lamp(mg, x, 4.6);
    // φράχτες, γραμματοκιβώτια, πάγκοι
    for (const [x, z] of [[10, 30], [10, 50], [-10, 34], [-10, 54]]) for (let i = 0; i < 5; i++) { const zz = z - i * 2; mg.add(new THREE.BoxGeometry(0.15, 1.1, 0.15), { pos: [x, height(x, zz) + 0.5, zz], color: '#f6f1e8' }); mg.add(new THREE.BoxGeometry(0.08, 0.12, 2), { pos: [x, height(x, zz) + 0.8, zz - 1], color: '#f6f1e8' }); mg.add(new THREE.BoxGeometry(0.2, 0.1, 2), { pos: [x, height(x, zz) + 1.12, zz - 1], color: '#fbfdff' }); }
    const village = mg.mesh(v); this.scene.add(village);
    const winMesh = new THREE.Mesh(win.build(), this.windowMat()); this.scene.add(winMesh);
    const lm = new THREE.Mesh(lights.build(), this.lightsMat); this.scene.add(lm);
    // φανάρια: λάμπες + λάμψεις
    const bulbs = new Merger(); for (const l of this.lamps) bulbs.add(new THREE.SphereGeometry(0.22, 10, 8), { pos: [l.x, l.y, l.z] });
    this.scene.add(new THREE.Mesh(bulbs.build(), this.bulbMat));
    for (const l of this.lamps) { const s = new THREE.Sprite(this.glowMat); s.position.set(l.x, l.y, l.z); s.scale.set(3.2, 3.2, 1); this.scene.add(s); }
  }
  lamp(mg, x, z) {
    const y = height(x, z); mg.add(new THREE.CylinderGeometry(0.09, 0.13, 4.2, 8), { pos: [x, y + 2.1, z], color: '#23262b' });
    mg.add(new THREE.CylinderGeometry(0.32, 0.22, 0.5, 6), { pos: [x, y + 4.35, z], color: '#23262b' }); mg.add(new THREE.ConeGeometry(0.45, 0.35, 6), { pos: [x, y + 4.75, z], color: '#23262b' }); mg.add(new THREE.ConeGeometry(0.42, 0.18, 6), { pos: [x, y + 4.9, z], color: '#fbfdff' });
    this.lamps.push({ x, y: y + 4.3, z }); this.g.phys.circle(x, z, 0.25);
  }
  // ---------------------------------------------------------------- σχολείο
  buildSchool() {
    const { v } = this.mats(), mg = new Merger(), win = new Merger(), S = P.school, y0 = height(S.x, S.z) - 0.3, W = 36, D = 14, H = 8.4;
    mg.add(new THREE.BoxGeometry(W, H, D), { pos: [S.x, y0 + H / 2, S.z], color: '#e9d7b9' });
    mg.add(new THREE.BoxGeometry(W + 0.8, 0.6, D + 0.8), { pos: [S.x, y0 + H + 0.3, S.z], color: '#8b6f57' });
    mg.add(new THREE.BoxGeometry(W + 0.6, 0.45, D + 0.6), { pos: [S.x, y0 + H + 0.75, S.z], color: '#fbfdff' });
    mg.add(new THREE.BoxGeometry(W + 0.2, 0.6, D + 0.2), { pos: [S.x, y0 + 0.3, S.z], color: '#a39a8e' });
    for (let fl = 0; fl < 2; fl++) for (let i = 0; i < 9; i++) { const wx = S.x - W / 2 + 2.5 + i * 3.9; if (fl === 0 && Math.abs(wx) < 3) continue; const wy = y0 + 2.4 + fl * 3.6; win.add(new THREE.PlaneGeometry(2.2, 1.9), { pos: [wx, wy, S.z + D / 2 + 0.1] }); mg.add(new THREE.BoxGeometry(2.5, 2.2, 0.1), { pos: [wx, wy, S.z + D / 2 + 0.02], color: '#ffffff' }); mg.add(new THREE.BoxGeometry(2.6, 0.12, 0.4), { pos: [wx, wy - 1.1, S.z + D / 2 + 0.2], color: '#fbfdff' }); }
    mg.add(new THREE.BoxGeometry(5, 3.4, 0.2), { pos: [S.x, y0 + 1.7, S.z + D / 2 + 0.06], color: '#5a3520' });
    for (const sx of [-1, 1]) mg.add(new THREE.CylinderGeometry(0.35, 0.4, 4.6, 12), { pos: [S.x + sx * 3.2, y0 + 2.3, S.z + D / 2 + 1.6], color: '#f3ede2' });
    mg.add(new THREE.BoxGeometry(8, 0.5, 3.6), { pos: [S.x, y0 + 4.75, S.z + D / 2 + 1.5], color: '#8b6f57' }); mg.add(new THREE.BoxGeometry(8.2, 0.3, 3.8), { pos: [S.x, y0 + 5.1, S.z + D / 2 + 1.5], color: '#fbfdff' });
    this.scene.add(mg.mesh(v)); this.scene.add(new THREE.Mesh(win.build(), this.windowMat('#8aa1c0', '#ffd890')));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshStandardMaterial({ map: signTex(['ΔΗΜΟΤΙΚΟ ΣΧΟΛΕΙΟ'], { w: 1024, h: 180, bg: '#1d4e3a', fg: '#fff', border: '#e9d7b9', font: 'bold 92px system-ui,sans-serif' }) }));
    sign.position.set(S.x, y0 + 7.4, S.z + D / 2 + 0.08); this.scene.add(sign);
    this.g.phys.box(S.x, S.z, W / 2, D / 2, 0, H + 1);
    // φράχτης + πόρτα
    const fz = P.gate.z, fm = new Merger();
    for (let x = -26; x <= 26; x += 2) { if (Math.abs(x) < 3) continue; const y = height(x, fz); fm.add(new THREE.BoxGeometry(0.16, 1.6, 0.16), { pos: [x, y + 0.8, fz], color: '#2e3a46' }); fm.add(new THREE.SphereGeometry(0.14, 6, 4), { pos: [x, y + 1.66, fz], color: '#fbfdff' }); }
    for (const sx of [-1, 1]) { fm.add(new THREE.BoxGeometry(23, 0.1, 0.1), { pos: [sx * 14.5, height(sx * 14, fz) + 1.3, fz], color: '#2e3a46' }); fm.add(new THREE.BoxGeometry(23, 0.1, 0.1), { pos: [sx * 14.5, height(sx * 14, fz) + 0.5, fz], color: '#2e3a46' }); fm.add(new THREE.BoxGeometry(0.5, 2.6, 0.5), { pos: [sx * 3.1, height(sx * 3, fz) + 1.3, fz], color: '#a39a8e' }); fm.add(new THREE.BoxGeometry(0.62, 0.22, 0.62), { pos: [sx * 3.1, height(sx * 3, fz) + 2.7, fz], color: '#fbfdff' }); this.g.phys.box(sx * 14.5, fz, 11.6, 0.2, 0, 1.8); }
    for (const sx of [-1, 1]) { const x = sx * 26; fm.add(new THREE.BoxGeometry(0.1, 0.1, 18), { pos: [x, height(x, fz - 9) + 1.3, fz - 9], color: '#2e3a46' }); this.g.phys.box(x, fz - 9, 0.2, 9, 0, 1.8); }
    this.scene.add(fm.mesh(v));
    this.gates = []; const gm = new THREE.MeshStandardMaterial({ color: 0x2e3a46, roughness: 0.6, metalness: 0.4 });
    for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 2.85, height(0, fz), fz); const leaf = new THREE.Group(); for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), gm); b.position.set(-sx * (0.25 + i * 0.47), 0.95, 0); leaf.add(b); } for (const yy of [0.35, 1.6]) { const r = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.1), gm); r.position.set(-sx * 1.4, yy, 0); leaf.add(r); } piv.add(leaf); this.scene.add(piv); this.gates.push({ piv, sx }); }
    this.gateBox = this.g.phys.box(0, fz, 2.8, 0.25, 0, 2);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshStandardMaterial({ map: signTex(['ΚΛΕΙΣΤΟ ΣΗΜΕΡΑ', 'λόγω χιονόπτωσης ❄'], { w: 512, h: 256, bg: '#fff8e6', fg: '#b3121f', font: 'bold 48px system-ui,sans-serif', border: '#b3121f' }), side: THREE.DoubleSide }));
    cl.position.set(0, height(0, fz) + 1.15, fz + 0.12); this.scene.add(cl); this.closedSign = cl;
    // μεγάλο χριστουγεννιάτικο δέντρο στην αυλή
    this.bigTree = this.xmasTree(P.yardTree.x, P.yardTree.z, 2.6);
  }
  xmasTree(x, z, s = 1) {
    const g = new THREE.Group(), y = height(x, z); g.position.set(x, y, z);
    const green = new THREE.MeshStandardMaterial({ color: 0x1d5a35, roughness: 0.9 }), snow = new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 1 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.32 * s, 1.4 * s, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a24 })); trunk.position.y = 0.7 * s; g.add(trunk);
    for (let i = 0; i < 4; i++) { const r = (1.9 - i * 0.38) * s, h = 1.8 * s, yy = (1.2 + i * 1.05) * s; const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), green); c.position.y = yy + h / 2; c.castShadow = true; g.add(c); const sn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, h * 0.4, 12), snow); sn.position.y = yy + h * 0.82; g.add(sn); }
    const orn = new Merger(), cols = ['#ff2d44', '#ffd23b', '#38c7ff', '#ff7ae0', '#ffffff', '#59ff8f'], lightsM = new Merger();
    for (let i = 0; i < 70; i++) { const t = Math.random(), yy = (1.4 + t * 4.2) * s, r = (1.75 - t * 1.45) * s * 0.98, a = Math.random() * 6.28; (i % 2 ? orn : lightsM).add(new THREE.SphereGeometry(i % 2 ? 0.13 * s : 0.06 * s, 8, 6), { pos: [Math.cos(a) * r, yy, Math.sin(a) * r], color: cols[i % cols.length] }); }
    const ornM = new THREE.Mesh(orn.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.6 })); g.add(ornM);
    const lm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25 }); const lmesh = new THREE.Mesh(lightsM.build(), lm); g.add(lmesh);
    const starM = new THREE.MeshBasicMaterial({ color: 0x8a7a40 }); const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.42 * s, 0), starM); star.position.y = 6.75 * s; star.scale.set(1, 1.3, 0.4); g.add(star);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,220,120,1)'), blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false })); halo.position.y = 6.75 * s; halo.scale.set(5 * s, 5 * s, 1); g.add(halo);
    const tl = new THREE.PointLight(0xffc98a, 0, 26, 1.5); tl.position.y = 4 * s; g.add(tl);
    this.scene.add(g); this.g.phys.circle(x, z, 2 * s);
    return { g, lit: (k) => { tl.intensity = k * 60 * this.nightness; lm.opacity = 0.25 + k * 0.75; starM.color.set(new THREE.Color(0x8a7a40).lerp(new THREE.Color(0xfff0a0), k)); halo.material.opacity = k; }, star };
  }
  // ---------------------------------------------------------------- πάρκο
  buildPark() {
    const { v } = this.mats(), mg = new Merger(), p = P.park;
    // κούνιες
    const sx = p.x + 10, sz = p.z + 8, y = height(sx, sz);
    for (const d of [-2.4, 2.4]) { mg.add(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), { pos: [sx + d, y + 1.6, sz - 0.9], rot: [0.28, 0, 0], color: '#c8102e' }); mg.add(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), { pos: [sx + d, y + 1.6, sz + 0.9], rot: [-0.28, 0, 0], color: '#c8102e' }); }
    mg.add(new THREE.CylinderGeometry(0.11, 0.11, 5.2, 8), { pos: [sx, y + 3.2, sz], rot: [0, 0, Math.PI / 2], color: '#c8102e' }); mg.add(new THREE.CylinderGeometry(0.16, 0.16, 5.3, 8), { pos: [sx, y + 3.36, sz], rot: [0, 0, Math.PI / 2], color: '#fbfdff' });
    for (const d of [-1, 1]) { mg.add(new THREE.BoxGeometry(0.8, 0.08, 0.35), { pos: [sx + d, y + 0.75, sz], color: '#3b2a1e' }); mg.add(new THREE.BoxGeometry(0.85, 0.08, 0.4), { pos: [sx + d, y + 0.82, sz], color: '#fbfdff' }); for (const e of [-0.35, 0.35]) mg.add(new THREE.CylinderGeometry(0.015, 0.015, 2.4, 4), { pos: [sx + d + e, y + 1.98, sz], color: '#777' }); }
    this.g.phys.box(sx, sz, 2.7, 1.1, 0, 3.5);
    // τσουλήθρα
    const tx = p.x - 2, tz = p.z + 14, ty = height(tx, tz);
    mg.add(new THREE.BoxGeometry(1.4, 2.4, 1.4), { pos: [tx, ty + 1.2, tz], color: '#2b6cb0' }); mg.add(new THREE.BoxGeometry(1.5, 0.2, 1.5), { pos: [tx, ty + 2.5, tz], color: '#fbfdff' });
    mg.add(new THREE.BoxGeometry(1, 0.12, 4), { pos: [tx, ty + 1.3, tz + 2.4], rot: [0.55, 0, 0], color: '#f6c453' }); mg.add(new THREE.BoxGeometry(1.05, 0.06, 4), { pos: [tx, ty + 1.42, tz + 2.4], rot: [0.55, 0, 0], color: '#fbfdff' });
    this.g.phys.box(tx, tz, 0.8, 0.8, 0, 2.5);
    // πάγκοι
    for (const [bx, bz, r] of [[p.x - 12, p.z - 2, 0.4], [p.x + 2, p.z - 16, -0.3], [p.x - 6, p.z + 6, 1.2]]) { const by = height(bx, bz); mg.add(new THREE.BoxGeometry(2.4, 0.12, 0.6), { pos: [bx, by + 0.55, bz], rot: [0, r, 0], color: '#6b4a2b' }); mg.add(new THREE.BoxGeometry(2.4, 0.18, 0.62), { pos: [bx, by + 0.68, bz], rot: [0, r, 0], color: '#fbfdff' }); for (const e of [-1, 1]) mg.add(new THREE.BoxGeometry(0.1, 0.55, 0.5), { pos: [bx + Math.cos(r) * e, by + 0.27, bz - Math.sin(r) * e], rot: [0, r, 0], color: '#222' }); this.g.phys.box(bx, bz, 1.2, 0.3, r, 0.7); }
    // κάστρα από χιόνι για τη χιονοπόλεμο
    this.forts = [];
    for (const [fx, fz, r] of [[P.arena.x - 6, P.arena.z + 4, 0.3], [P.arena.x + 7, P.arena.z - 2, -0.5], [P.arena.x, P.arena.z - 9, 1.4], [P.arena.x - 3, P.arena.z - 2, 0]]) { const fy = height(fx, fz); mg.add(new THREE.BoxGeometry(3.2, 1.1, 0.9), { pos: [fx, fy + 0.45, fz], rot: [0, r, 0], color: '#f2f6fc' }); for (let i = -1; i <= 1; i++) mg.add(new THREE.SphereGeometry(0.42, 8, 6), { pos: [fx + Math.cos(r) * i * 1.1, fy + 1.05, fz - Math.sin(r) * i * 1.1], color: '#f7faff' }); this.g.phys.box(fx, fz, 1.6, 0.45, r, 1.2); this.forts.push({ x: fx, z: fz }); }
    // κύκλος για τον χιονάνθρωπο
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.9, 40), new THREE.MeshBasicMaterial({ color: 0x8fc7ff, transparent: true, opacity: 0.55, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(P.snowman.x, height(P.snowman.x, P.snowman.z) + 0.05, P.snowman.z); this.scene.add(ring); this.snowmanRing = ring;
    // πάγκος λαχανικών (καρότο) και σωρός κάρβουνα στον φούρνο
    const kx = p.x - 18, kz = p.z - 14, ky = height(kx, kz);
    mg.add(new THREE.BoxGeometry(3, 1, 1.4), { pos: [kx, ky + 0.5, kz], color: '#8a5a33' }); mg.add(new THREE.BoxGeometry(3.4, 0.12, 1.8), { pos: [kx, ky + 2.4, kz], color: '#c8102e' }); mg.add(new THREE.BoxGeometry(3.5, 0.2, 1.9), { pos: [kx, ky + 2.55, kz], color: '#fbfdff' });
    for (const e of [-1.5, 1.5]) mg.add(new THREE.BoxGeometry(0.1, 1.4, 0.1), { pos: [kx + e, ky + 1.7, kz - 0.6], color: '#5a3a24' });
    this.stall = { x: kx, z: kz }; this.g.phys.box(kx, kz, 1.5, 0.7, 0, 1);
    this.scene.add(mg.mesh(v));
  }
  // ---------------------------------------------------------------- δάσος & δέντρα
  buildForest() {
    const q = this.g.q, pts = [], rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const ok = (x, z) => {
      if (Math.abs(x) < 9 && z > -66 && z < 66) return false; if (Math.abs(z) < 8 && x > -64 && x < 76) return false;
      if (Math.hypot(x - P.clearing.x, z - P.clearing.z) < 20) return false; if (z < -58 && z > -152 && Math.abs(x - pathX(z)) < 4.5) return false;
      if (Math.hypot(x - P.lake.x, z - P.lake.z) < P.lake.r + 4) return false; if (Math.hypot(x - P.park.x, z - P.park.z) < 26) return false;
      if (x > -30 && x < 30 && z < -58 && z > -100) return false; if (x > 400) return false;
      for (const r of P.reindeer) if (Math.hypot(x - r.x, z - r.z) < 6) return false;
      return true;
    };
    for (let i = 0; i < 4200 && pts.length < 1100 * q.trees; i++) {
      const x = (rng() - 0.5) * 340, z = (rng() - 0.5) * 340, f = inForest(x, z);
      if (!f && rng() > 0.12) continue; if (Math.hypot(x, z) > 172) continue; if (!ok(x, z)) continue;
      // όχι πάνω σε σπίτια
      if (!f && this.g.phys.boxes.some((b) => Math.abs(b.x - x) < b.hx + 3 && Math.abs(b.z - z) < Math.max(b.hz, b.hx) + 3)) continue;
      pts.push({ x, z, s: f ? 0.8 + rng() * 0.9 : 0.6 + rng() * 0.5, r: rng() * 6.28 });
    }
    const n = pts.length, D = new THREE.Object3D();
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.32, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x4d3424, roughness: 1 }), n);
    const greens = [0, 1, 2].map((i) => new THREE.InstancedMesh(new THREE.ConeGeometry(2.1 - i * 0.55, 2.4, 9), new THREE.MeshStandardMaterial({ color: [0x1f4d33, 0x245a3b, 0x2a6643][i], roughness: 0.95, flatShading: true }), n));
    const snows = [0, 1, 2].map((i) => new THREE.InstancedMesh(new THREE.ConeGeometry((2.1 - i * 0.55) * 0.82, 1.0, 9), new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 1, flatShading: true }), n));
    pts.forEach((p, i) => {
      const y = height(p.x, p.z), s = p.s;
      D.position.set(p.x, y + 0.8 * s, p.z); D.rotation.set(0, p.r, 0); D.scale.setScalar(s); D.updateMatrix(); trunk.setMatrixAt(i, D.matrix);
      for (let k = 0; k < 3; k++) { D.position.set(p.x, y + (1.9 + k * 1.25) * s, p.z); D.updateMatrix(); greens[k].setMatrixAt(i, D.matrix); D.position.set(p.x, y + (2.55 + k * 1.25) * s, p.z); D.updateMatrix(); snows[k].setMatrixAt(i, D.matrix); }
      if (Math.hypot(p.x, p.z + 40) < 175) this.g.phys.circle(p.x, p.z, 0.45 * s);
    });
    for (const m of [trunk, ...greens, ...snows]) { m.castShadow = true; m.receiveShadow = true; this.scene.add(m); }
    this.treePts = pts;
    // κορμοί, βράχοι, θάμνοι
    const mg = new Merger();
    for (let i = 0; i < 90; i++) {
      const x = (rng() - 0.5) * 300, z = -105 - rng() * 70; if (!ok(x, z)) continue; const y = height(x, z), k = rng();
      if (k < 0.35) { const r = rng() * 3; mg.add(new THREE.CylinderGeometry(0.3, 0.35, 3.4, 8), { pos: [x, y + 0.3, z], rot: [0, r, Math.PI / 2], color: '#5b3e2a' }); mg.add(new THREE.BoxGeometry(3.2, 0.14, 0.45), { pos: [x, y + 0.62, z], rot: [0, -r, 0], color: '#f4f8ff' }); }
      else if (k < 0.7) { mg.add(new THREE.DodecahedronGeometry(0.6 + rng(), 0), { pos: [x, y + 0.2, z], rot: [rng(), rng(), 0], color: '#7d8590' }); mg.add(new THREE.SphereGeometry(0.7, 8, 4, 0, 6.3, 0, 1.2), { pos: [x, y + 0.65, z], scale: [1, 0.5, 1], color: '#f4f8ff' }); }
      else mg.add(new THREE.SphereGeometry(0.9 + rng() * 0.5, 8, 6), { pos: [x, y + 0.3, z], scale: [1.3, 0.75, 1], color: '#eef3fb' });
    }
    this.scene.add(mg.mesh(this.mats().v));
  }
  // ---------------------------------------------------------------- το σπίτι από μέσα
  buildInterior() {
    const I = P.interior, g = new THREE.Group(); g.position.set(I.x, 0, I.z); this.interior = g;
    const v = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), mg = new Merger();
    const floorTex = canvasTex(512, 512, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#a7744a' : '#9a6a42'; c.fillRect(0, i * 64, 512, 64); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, i * 64, 512, 2); for (let k = 0; k < 3; k++) { c.fillRect(rand(0, 512), i * 64, 2, 64); } } }, { repeat: 3 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 16), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.001, -3); floor.receiveShadow = true; g.add(floor);
    const wallTex = canvasTex(256, 256, (c) => { c.fillStyle = '#e6eef7'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#d6e2f0'; for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 10, 256); }, { repeat: 4 });
    const wallM = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, side: THREE.DoubleSide });
    const wall = (w, h, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m); };
    // δωμάτιο: x -6..6, z 5..-11, ύψος 3.2 · μεσότοιχος στο z=-3 με άνοιγμα
    wall(12, 3.2, 0, 5, Math.PI); wall(12, 3.2, 0, -11, 0); wall(16, 3.2, -6, -3, Math.PI / 2); wall(16, 3.2, 6, -3, -Math.PI / 2);
    for (const [w, x] of [[4.5, -3.75], [4.5, 3.75]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, 0.15), wallM); m.position.set(x, 1.6, -3); g.add(m); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 16), new THREE.MeshStandardMaterial({ color: 0xf6f3ee })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, -3); g.add(ceil);
    const ph = this.g.phys, X = I.x, Z = I.z;
    ph.box(X, Z + 5.1, 6, 0.1); ph.box(X, Z - 11.1, 6, 0.1); ph.box(X - 6.1, Z - 3, 0.1, 8); ph.box(X + 6.1, Z - 3, 0.1, 8); ph.box(X - 3.75, Z - 3, 2.25, 0.1); ph.box(X + 3.75, Z - 3, 2.25, 0.1);
    // κρεβάτι
    mg.add(new THREE.BoxGeometry(2.2, 0.5, 3.2), { pos: [-4.4, 0.3, 2.9], color: '#6b4a2b' }); mg.add(new THREE.BoxGeometry(2.1, 0.25, 3.1), { pos: [-4.4, 0.65, 2.9], color: '#ffffff' });
    mg.add(new THREE.BoxGeometry(2.15, 0.12, 2.2), { pos: [-4.4, 0.8, 2.4], color: '#c8102e' }); mg.add(new THREE.BoxGeometry(1.4, 0.25, 0.6), { pos: [-4.4, 0.85, 4.1], color: '#f4f4f4' }); mg.add(new THREE.BoxGeometry(2.2, 1.2, 0.15), { pos: [-4.4, 0.9, 4.55], color: '#6b4a2b' });
    ph.box(X - 4.4, Z + 2.9, 1.1, 1.6, 0, 0.9);
    // κομοδίνο + ξυπνητήρι
    mg.add(new THREE.BoxGeometry(0.8, 0.7, 0.7), { pos: [-2.8, 0.35, 4.3], color: '#7c5534' }); ph.box(X - 2.8, Z + 4.3, 0.4, 0.35, 0, 0.7);
    // ντουλάπα, γραφείο, καρέκλα, χαλί, ράφι
    mg.add(new THREE.BoxGeometry(2.2, 2.6, 0.9), { pos: [4.6, 1.3, 4.4], color: '#8a5f3c' }); mg.add(new THREE.BoxGeometry(0.06, 2.4, 0.02), { pos: [4.6, 1.3, 3.94], color: '#5a3a24' }); ph.box(X + 4.6, Z + 4.4, 1.1, 0.45);
    mg.add(new THREE.BoxGeometry(2, 0.1, 1), { pos: [4.8, 0.9, 0.5], color: '#b48a5e' }); for (const [a, b] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) mg.add(new THREE.BoxGeometry(0.08, 0.9, 0.08), { pos: [4.8 + a, 0.45, 0.5 + b], color: '#7c5534' }); ph.box(X + 4.8, Z + 0.5, 1, 0.5, 0, 0.95);
    mg.add(new THREE.BoxGeometry(0.6, 0.08, 0.6), { pos: [3.8, 0.55, 0.9], color: '#c8102e' }); mg.add(new THREE.BoxGeometry(0.6, 0.6, 0.08), { pos: [3.8, 0.85, 1.2], color: '#c8102e' });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c) => { for (let i = 8; i > 0; i--) { c.fillStyle = i % 2 ? '#2b6cb0' : '#f6c453'; c.beginPath(); c.arc(128, 128, i * 16, 0, 7); c.fill(); } }) })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, 1.5); g.add(rug);
    // κουζίνα: τραπέζι, ψυγείο, πάγκος
    mg.add(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 24), { pos: [-2, 0.85, -7], color: '#d9b48a' }); mg.add(new THREE.CylinderGeometry(0.1, 0.25, 0.85, 8), { pos: [-2, 0.42, -7], color: '#7c5534' }); ph.circle(X - 2, Z - 7, 1.1);
    mg.add(new THREE.BoxGeometry(1.1, 2.2, 0.8), { pos: [4.9, 1.1, -10.4], color: '#f2f5f9' }); ph.box(X + 4.9, Z - 10.4, 0.55, 0.4);
    mg.add(new THREE.BoxGeometry(3.6, 0.95, 0.8), { pos: [2.1, 0.47, -10.5], color: '#e2d2bd' }); mg.add(new THREE.BoxGeometry(3.7, 0.08, 0.85), { pos: [2.1, 0.97, -10.5], color: '#4a4a4a' }); ph.box(X + 2.1, Z - 10.5, 1.8, 0.4, 0, 1);
    // εξώπορτα (στο τέλος της κουζίνας, αριστερά)
    mg.add(new THREE.BoxGeometry(1.4, 2.4, 0.12), { pos: [-4.6, 1.2, -10.92], color: '#6b3d23' }); mg.add(new THREE.SphereGeometry(0.06, 8, 6), { pos: [-4.1, 1.2, -10.82], color: '#d9b44a' });
    // κάδρο & χριστουγεννιάτικο δεντράκι στη γωνία
    mg.add(new THREE.BoxGeometry(1.2, 0.9, 0.06), { pos: [0, 1.9, 4.93], color: '#6b4a2b' });
    g.add(mg.mesh(v));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.7), new THREE.MeshBasicMaterial({ map: canvasTex(256, 180, (c) => { c.fillStyle = '#9fd0ff'; c.fillRect(0, 0, 256, 180); c.fillStyle = '#fff'; c.fillRect(0, 120, 256, 60); c.fillStyle = '#1f4d33'; for (const x of [40, 120, 200]) { c.beginPath(); c.moveTo(x, 50); c.lineTo(x - 30, 130); c.lineTo(x + 30, 130); c.fill(); } }) })); pic.position.set(0, 1.9, 4.89); pic.rotation.y = Math.PI; g.add(pic);
    // παράθυρο με θέα στο χιονισμένο χωριό (ζωγραφιά + κινούμενο χιόνι)
    const view = canvasTex(512, 384, (c) => { const gr = c.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#b8c8dc'); gr.addColorStop(1, '#eef3f8'); c.fillStyle = gr; c.fillRect(0, 0, 512, 384);
      for (let i = 0; i < 6; i++) { const x = i * 95 - 20, h = 90 + (i % 3) * 20; c.fillStyle = ['#efe3cc', '#d9e6f2', '#f4d9d2'][i % 3]; c.fillRect(x, 270 - h, 80, h); c.fillStyle = '#8e2b25'; c.beginPath(); c.moveTo(x - 8, 272 - h); c.lineTo(x + 40, 230 - h); c.lineTo(x + 88, 272 - h); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 6, 266 - h); c.lineTo(x + 40, 228 - h); c.lineTo(x + 86, 266 - h); c.lineTo(x + 40, 244 - h); c.fill(); }
      c.fillStyle = '#fbfdff'; c.fillRect(0, 270, 512, 114); c.fillStyle = '#1f4d33'; for (const x of [60, 300, 450]) { c.beginPath(); c.moveTo(x, 200); c.lineTo(x - 26, 280); c.lineTo(x + 26, 280); c.fill(); } });
    const wv = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ map: view })); wv.position.set(5.96, 1.7, 2.2); wv.rotation.y = -Math.PI / 2; g.add(wv);
    const flakes = canvasTex(256, 256, (c) => { c.fillStyle = '#fff'; for (let i = 0; i < 90; i++) { c.globalAlpha = rand(0.4, 1); c.beginPath(); c.arc(rand(0, 256), rand(0, 256), rand(0.8, 2.6), 0, 7); c.fill(); } }); flakes.wrapS = flakes.wrapT = THREE.RepeatWrapping;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ map: flakes, transparent: true, depthWrite: false })); fl.position.set(5.94, 1.7, 2.2); fl.rotation.y = -Math.PI / 2; g.add(fl); this.windowFlakes = flakes;
    const frame = new Merger(); frame.add(new THREE.BoxGeometry(0.12, 1.9, 0.12), { pos: [5.9, 1.7, 3.45] }).add(new THREE.BoxGeometry(0.12, 1.9, 0.12), { pos: [5.9, 1.7, 0.95] }).add(new THREE.BoxGeometry(0.12, 0.12, 2.6), { pos: [5.9, 2.55, 2.2] }).add(new THREE.BoxGeometry(0.3, 0.12, 2.7), { pos: [5.85, 0.85, 2.2] }).add(new THREE.BoxGeometry(0.08, 1.6, 0.06), { pos: [5.92, 1.7, 2.2] });
    g.add(new THREE.Mesh(frame.build(), new THREE.MeshStandardMaterial({ color: 0xffffff })));
    // φως δωματίου (λάμπα οροφής + πρωινό φως από το παράθυρο)
    this.roomLight = new THREE.PointLight(0xffe2b8, 0, 14, 1.4); this.roomLight.position.set(I.x, 2.8, I.z + 1); this.scene.add(this.roomLight);
    this.roomLight2 = new THREE.PointLight(0xffe2b8, 0, 12, 1.4); this.roomLight2.position.set(I.x, 2.8, I.z - 7); this.scene.add(this.roomLight2);
    this.winLight = new THREE.SpotLight(0xdfeaff, 0, 14, 0.7, 0.8, 1); this.winLight.position.set(I.x + 5.6, 2.3, I.z + 2.2); this.winLight.target.position.set(I.x + 1, 0, I.z + 2); this.scene.add(this.winLight, this.winLight.target);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d0 })); bulb.position.set(0, 2.95, 1); g.add(bulb);
    this.scene.add(g); g.visible = false;
  }
  setIndoor(on) {
    this.indoor = on; this.interior.visible = on; this.sky.visible = !on; this.moon.visible = !on; this.snowfall.visible = !on;
    this.roomLight.intensity = on ? 9 : 0; this.roomLight2.intensity = on ? 7 : 0; this.winLight.intensity = on ? 22 : 0;
    if (this.cur) this.applyTime(this.cur);
    this.g.audio.setWind(on ? 0.15 : 1);
  }
  /** Ενημέρωση ανά καρέ: μετάβαση ώρας, σκιές που ακολουθούν, φώτα φαναριών, χιόνι. */
  update(dt, t, cam, focus) {
    this.uTime.value = t;
    if (this.trans) { const tr = this.trans; tr.t += dt; const k = smooth(clamp(tr.t / tr.dur, 0, 1)); this.applyTime(this.mix(tr.a, tr.b, k)); if (k >= 1) this.trans = null; }
    const f = focus;
    if (this.sunDir) { const d = this.sunDir; this.sun.position.set(f.x + d.x * 70, f.y + Math.max(0.15, d.y) * 70, f.z + d.z * 70); this.sun.target.position.set(f.x, f.y, f.z); this.sun.target.updateMatrixWorld(); this.moon.position.set(cam.x + d.x * 330, cam.y + Math.max(0.2, d.y) * 330, cam.z + d.z * 330); }
    this.sky.position.copy(cam);
    const su = this.snowfall.material.uniforms; su.uTime.value = t; su.uCam.value.copy(cam);
    if (this.windowFlakes) this.windowFlakes.offset.y = (t * 0.12) % 1;
    // φανάρια: τα κοντινότερα παίρνουν πραγματικό φως τη νύχτα
    if ((this._lt = (this._lt || 0) - dt) <= 0 && this.nightness > 0.2) {
      this._lt = 0.5; const near = this.lamps.map((l) => ({ l, d: (l.x - f.x) ** 2 + (l.z - f.z) ** 2 })).sort((a, b) => a.d - b.d);
      this.pool.forEach((p, i) => { const n = near[i]; if (n) p.position.set(n.l.x, n.l.y - 0.3, n.l.z); });
    }
    const li = this.indoor ? 0 : this.nightness * 26; for (const p of this.pool) p.intensity = li;
    for (const a of this.anim) a(dt, t);
  }
}
function flip(g) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } g.computeVertexNormals(); return g; }
