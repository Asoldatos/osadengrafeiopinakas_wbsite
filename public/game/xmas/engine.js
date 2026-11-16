// «Τα Χριστούγεννα του Κιμωλάκη» — μηχανή παιχνιδιού: απόδοση, είσοδος (πληκτρολόγιο/ποντίκι, αφή, VR), φυσική, ήχος, διεπαφή.
import * as THREE from './three.module.min.js';
export { THREE };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const angLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

// ---------------------------------------------------------------- συσκευή / ποιότητα
const UA = navigator.userAgent;
export const DEVICE = {
  quest: /OculusBrowser|Quest|Pacific/i.test(UA),
  touch: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
  mobile: /Android|iPhone|iPad|iPod/i.test(UA) && !/OculusBrowser|Quest/i.test(UA),
  reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
export const QUALITY = {
  high: { pr: Math.min(2, devicePixelRatio || 1), shadow: 2048, snow: 9000, trees: 1, lights: 4, far: 380 },
  medium: { pr: Math.min(1.5, devicePixelRatio || 1), shadow: 1024, snow: 5000, trees: 0.8, lights: 3, far: 300 },
  low: { pr: 1, shadow: 0, snow: 2200, trees: 0.55, lights: 2, far: 220 },
  vr: { pr: 1, shadow: 1024, snow: 4000, trees: 0.85, lights: 3, far: 300 },
};
export const defaultQuality = () => (DEVICE.quest ? 'vr' : DEVICE.mobile ? 'low' : 'high');

// ---------------------------------------------------------------- υφές από canvas
export function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
export function glowTex(color = '#fff', inner = 0) {
  return canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, inner, 64, 64, 64); g.addColorStop(0, color); g.addColorStop(0.25, color); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
}
/** Πινακίδα με κείμενο (για ταμπέλες, σημειώματα). */
export function signTex(lines, { w = 512, h = 256, bg = '#f4ead2', fg = '#2a1a10', font = 'bold 44px "Nunito", system-ui, sans-serif', border = '#6b4a2b' } = {}) {
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = border; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
    c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    const L = Array.isArray(lines) ? lines : [lines], lh = h / (L.length + 1);
    L.forEach((t, i) => c.fillText(t, w / 2, lh * (i + 1)));
  });
}

// ---------------------------------------------------------------- συγχώνευση γεωμετριών (λίγα draw calls)
export class Merger {
  constructor() { this.parts = []; }
  add(geo, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], color = '#ffffff', matrix } = {}) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    const m = matrix || new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')), new THREE.Vector3(...(typeof scale === 'number' ? [scale, scale, scale] : scale)));
    g.applyMatrix4(m); if (!g.attributes.normal) g.computeVertexNormals();
    const col = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g); return this;
  }
  build() {
    let n = 0; for (const g of this.parts) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of this.parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3));
    out.computeBoundingSphere(); this.parts = []; return out;
  }
  mesh(mat, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(this.build(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }
}

// ---------------------------------------------------------------- φυσική: ύψος εδάφους + συγκρουόμενα σχήματα
export class Physics {
  constructor(heightFn) { this.H = heightFn; this.circles = []; this.boxes = []; }
  circle(x, z, r, tag) { const c = { x, z, r, tag, on: true }; this.circles.push(c); return c; }
  /** Ορθογώνιο (κάτοψη) με περιστροφή ry, μισά μεγέθη hx,hz και ύψος top (από κάτω πηδάς από πάνω). */
  box(x, z, hx, hz, ry = 0, top = 99, tag) { const b = { x, z, hx, hz, ry, c: Math.cos(ry), s: Math.sin(ry), top, tag, on: true }; this.boxes.push(b); return b; }
  remove(o) { o.on = false; }
  /** Σπρώχνει θέση (κύκλος ακτίνας r, στο ύψος y) έξω από εμπόδια. Επιστρέφει το «πάτωμα» από πάνω από κουτιά, αν πατάει. */
  resolve(p, r, y) {
    let floor = this.H(p.x, p.z);
    for (const c of this.circles) { if (!c.on) continue; const dx = p.x - c.x, dz = p.z - c.z, d2 = dx * dx + dz * dz, R = c.r + r; if (d2 < R * R && d2 > 1e-8) { const d = Math.sqrt(d2), k = (R - d) / d; p.x += dx * k; p.z += dz * k; } }
    for (const b of this.boxes) {
      if (!b.on) continue;
      const dx = p.x - b.x, dz = p.z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      const ox = b.hx + r - Math.abs(lx), oz = b.hz + r - Math.abs(lz);
      if (ox <= 0 || oz <= 0) continue;
      const gy = this.H(b.x, b.z) + b.top;
      if (y >= gy - 0.25) { floor = Math.max(floor, gy); continue; }               // πάνω στο κουτί
      let nx = lx, nz = lz; if (ox < oz) nx += Math.sign(lx || 1) * ox; else nz += Math.sign(lz || 1) * oz;
      p.x = b.x + nx * b.c + nz * b.s; p.z = b.z - nx * b.s + nz * b.c;
    }
    return floor;
  }
  /** Χτυπάει κάτι στο σημείο; (για χιονόμπαλες) */
  hit(x, y, z, r = 0.12) {
    for (const c of this.circles) { if (!c.on || c.noHit) continue; const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < (c.r + r) ** 2 && y < this.H(c.x, c.z) + (c.h || 3)) return c; }
    for (const b of this.boxes) { if (!b.on) continue; const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hx + r && Math.abs(lz) < b.hz + r && y < this.H(b.x, b.z) + b.top) return b; }
    return null;
  }
}

// ---------------------------------------------------------------- ήχος
export class AudioSys {
  constructor() { this.ctx = null; this.buf = new Map(); this.vol = { master: 0.9, music: 0.55, sfx: 0.9 }; this.music = null; this.wind = null; try { Object.assign(this.vol, JSON.parse(localStorage.getItem('kimo3d:vol') || '{}')); } catch {} }
  ensure() {
    if (this.ctx) return this.ctx;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    const c = (this.ctx = new C()); this.out = c.createGain(); this.out.gain.value = this.vol.master; this.out.connect(c.destination);
    this.mBus = c.createGain(); this.mBus.gain.value = this.vol.music; this.mBus.connect(this.out);
    this.sBus = c.createGain(); this.sBus.gain.value = this.vol.sfx; this.sBus.connect(this.out);
    const len = c.sampleRate * 2, nb = c.createBuffer(1, len, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
    return c;
  }
  async unlock() { const c = this.ensure(); if (c && c.state !== 'running') try { await c.resume(); } catch {} return c?.state === 'running'; }
  setVol(k, v) { this.vol[k] = v; try { localStorage.setItem('kimo3d:vol', JSON.stringify(this.vol)); } catch {} if (!this.ctx) return; ({ master: this.out, music: this.mBus, sfx: this.sBus })[k].gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  async load(url) {
    if (this.buf.has(url)) return this.buf.get(url);
    const p = (async () => { const c = this.ensure(); if (!c) return null; try { const r = await fetch(url); return await c.decodeAudioData(await r.arrayBuffer()); } catch { return null; } })();
    this.buf.set(url, p); return p;
  }
  async play(url, { vol = 1, rate = 1, at, start = 0, dur } = {}) {
    const c = this.ensure(), b = await this.load(url); if (!c || !b) return null;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g);
    if (at) { const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 3; p.rolloffFactor = 1.2; p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z; g.connect(p); p.connect(this.sBus); } else g.connect(this.sBus);
    s.start(0, start, dur); return s;
  }
  /** Μουσική με βρόχο σε ακριβή σημεία (δευτερόλεπτα). */
  async musicLoop(url, ls = 0, le = 0, vol = 1, fade = 2) {
    const c = this.ensure(), b = await this.load(url); if (!c || !b) return;
    if (this.music?.url === url) { this.music.g.gain.setTargetAtTime(vol, c.currentTime, 0.6); return; }
    this.stopMusic(1.5);
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.loop = true; if (le > ls) { s.loopStart = ls; s.loopEnd = le; }
    g.gain.value = 0; g.gain.setTargetAtTime(vol, c.currentTime, fade / 3); s.connect(g); g.connect(this.mBus); s.start();
    this.music = { s, g, url };
  }
  stopMusic(fade = 1.5) { const m = this.music; if (!m || !this.ctx) return; this.music = null; m.g.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3); setTimeout(() => { try { m.s.stop(); } catch {} }, fade * 1500); }
  musicVol(v) { if (this.music && this.ctx) this.music.g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.8); }
  /** Συνθετικοί ήχοι: πάτημα στο χιόνι, χτύπημα χιονόμπαλας, καμπανάκι, άνεμος. */
  crunch(v = 0.35) { const c = this.ctx; if (!c) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 900; f.Q.value = 0.9; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); s.connect(f); f.connect(g); g.connect(this.sBus); s.start(t, Math.random()); s.stop(t + 0.2); }
  splat(v = 0.6) { const c = this.ctx; if (!c) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime; s.buffer = this.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.25); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); s.connect(f); f.connect(g); g.connect(this.sBus); s.start(t, Math.random()); s.stop(t + 0.32); }
  bell(freq = 1320, v = 0.25, at) {
    const c = this.ctx; if (!c) return; const t = c.currentTime, g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    let out = g; if (at) { const p = c.createPanner(); p.panningModel = 'HRTF'; p.refDistance = 4; p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z; g.connect(p); out = p; }
    out.connect(this.sBus);
    for (const [m, a] of [[1, 1], [2.76, 0.4], [5.4, 0.2]]) { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = freq * m; og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.5); }
  }
  chime(notes = [784, 988, 1175, 1568], gap = 0.09, v = 0.18) { if (!this.ctx) return; notes.forEach((f, i) => setTimeout(() => this.bell(f, v), i * gap * 1000)); }
  setWind(level) {
    const c = this.ctx; if (!c) return;
    if (!this.wind) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); s.buffer = this.noise; s.loop = true; f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 0.6; lfo.frequency.value = 0.13; lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.sBus); s.start(); lfo.start(); this.wind = g; }
    this.wind.gain.setTargetAtTime(level * 0.22, c.currentTime, 1.2);
  }
  listener(pos, fwd) { const c = this.ctx; if (!c) return; const L = c.listener; if (L.positionX) { L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z; L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; } }
}

// ---------------------------------------------------------------- είσοδος
export class Input {
  constructor(dom) {
    this.keys = new Set(); this.pressed = new Set(); this.look = { x: 0, y: 0 }; this.move = { x: 0, y: 0 }; this.locked = false; this.dom = dom;
    this.sens = Number(localStorage.getItem('kimo3d:sens') || 1); this.touch = { move: null, look: null };
    addEventListener('keydown', (e) => { if (e.repeat) return; this.keys.add(e.code); this.pressed.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === dom; });
    addEventListener('mousemove', (e) => { if (this.locked) { this.look.x += e.movementX * 0.0022 * this.sens; this.look.y += e.movementY * 0.0022 * this.sens; } });
    addEventListener('mousedown', (e) => { if (this.locked) { this.pressed.add(e.button === 2 ? 'Mouse2' : 'Mouse0'); this.keys.add(e.button === 2 ? 'Mouse2' : 'Mouse0'); } });
    addEventListener('mouseup', (e) => this.keys.delete(e.button === 2 ? 'Mouse2' : 'Mouse0'));
    addEventListener('contextmenu', (e) => { if (this.locked) e.preventDefault(); });
  }
  lock() { if (!DEVICE.touch && this.dom.requestPointerLock) try { const p = this.dom.requestPointerLock(); p?.catch?.(() => {}); } catch {} }
  /** «Πατήθηκε σε αυτό το καρέ» (μία φορά). */
  hit(...codes) { for (const c of codes) if (this.pressed.has(c)) return true; return false; }
  down(...codes) { for (const c of codes) if (this.keys.has(c)) return true; return false; }
  endFrame() { this.pressed.clear(); this.look.x = this.look.y = 0; }
  axes() {
    let x = (this.down('KeyD', 'ArrowRight') ? 1 : 0) - (this.down('KeyA', 'ArrowLeft') ? 1 : 0), y = (this.down('KeyW', 'ArrowUp') ? 1 : 0) - (this.down('KeyS', 'ArrowDown') ? 1 : 0);
    x += this.move.x; y += this.move.y; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y };
  }
  /** Εικονικά joysticks + κουμπιά για κινητά. */
  buildTouch(root) {
    const el = document.createElement('div'); el.className = 'touch'; el.innerHTML = `<div class="stick" id="stL"><i></i></div><div class="lookpad" id="lookpad"></div>
      <div class="tbtns"><button id="tbJump" aria-label="Άλμα">⤒</button><button id="tbAct" aria-label="Ενέργεια">✋</button><button id="tbThrow" aria-label="Ρίξε">❄</button></div>`;
    root.appendChild(el); document.body.classList.add('touchui');
    const st = el.querySelector('#stL'), knob = st.querySelector('i'), pad = el.querySelector('#lookpad');
    let sid = null, cx = 0, cy = 0, lid = null, lx = 0, ly = 0;
    st.addEventListener('pointerdown', (e) => { sid = e.pointerId; const r = st.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; st.setPointerCapture(sid); mv(e); });
    const mv = (e) => { if (e.pointerId !== sid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const m = 52, l = Math.hypot(dx, dy); if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.move.x = dx / m; this.move.y = -dy / m; };
    st.addEventListener('pointermove', mv); const up = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; this.move.x = this.move.y = 0; }; st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    pad.addEventListener('pointerdown', (e) => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; pad.setPointerCapture(lid); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; this.look.x += (e.clientX - lx) * 0.006 * this.sens; this.look.y += (e.clientY - ly) * 0.006 * this.sens; lx = e.clientX; ly = e.clientY; });
    const lup = (e) => { if (e.pointerId === lid) lid = null; }; pad.addEventListener('pointerup', lup); pad.addEventListener('pointercancel', lup);
    const btn = (id, code) => { const b = el.querySelector(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.keys.add(code); this.pressed.add(code); }); const u = () => this.keys.delete(code); b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u); };
    btn('#tbJump', 'Space'); btn('#tbAct', 'KeyE'); btn('#tbThrow', 'Mouse0');
    this.touchEl = el; return el;
  }
}

// ---------------------------------------------------------------- VR (WebXR)
export class VR {
  constructor(game) {
    this.g = game; this.session = null; this.state = { lx: 0, ly: 0, rx: 0, ry: 0, trigger: [false, false], a: false, b: false, grip: [false, false] }; this.prev = { trigger: [false, false], a: false, b: false, grip: [false, false], snap: false };
    this.hands = [];
  }
  static async supported() { try { return !!(navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr'))); } catch { return false; } }
  async start() {
    const r = this.g.renderer;
    const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
    r.xr.setReferenceSpaceType('local-floor'); r.xr.setFramebufferScaleFactor(DEVICE.quest ? 1.25 : 1.4); try { r.xr.setFoveation(0.3); } catch {}
    await r.xr.setSession(s); this.session = s;
    s.addEventListener('end', () => { this.session = null; this.g.onVREnd?.(); });
    // γάντια στα χειριστήρια
    for (let i = 0; i < 2; i++) {
      const grip = r.xr.getControllerGrip(i), ctl = r.xr.getController(i);
      grip.add(this.mitten(i)); this.g.rig.add(grip); this.g.rig.add(ctl);
      const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.55 }));
      ray.scale.z = 3; ray.visible = false; ctl.add(ray);
      ctl.addEventListener('connected', (e) => { ctl.userData.hand = e.data.handedness; grip.userData.hand = e.data.handedness; });
      this.hands.push({ grip, ctl, ray });
    }
    return s;
  }
  mitten(i) {
    const g = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: i ? 0xc8102e : 0x0f7b4b, roughness: 0.85 }), wool = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), red); palm.scale.set(1, 0.65, 1.3); palm.position.set(0, -0.01, 0.02);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), red); thumb.position.set(i ? -0.04 : 0.04, 0, 0); thumb.scale.set(1, 1, 1.6);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.016, 8, 16), wool); cuff.position.set(0, -0.01, 0.09);
    g.add(palm, thumb, cuff); return g;
  }
  hand(which) { return this.hands.find((h) => h.ctl.userData.hand === which) || this.hands[which === 'left' ? 0 : 1]; }
  poll() {
    const s = this.session, st = this.state; if (!s) return;
    st.lx = st.ly = st.rx = st.ry = 0; st.trigger = [false, false]; st.grip = [false, false]; st.a = st.b = st.x = st.y = false;
    for (const src of s.inputSources) {
      const gp = src.gamepad; if (!gp) continue; const L = src.handedness === 'left', ax = gp.axes, bt = gp.buttons;
      const x = ax.length >= 4 ? ax[2] : ax[0] || 0, y = ax.length >= 4 ? ax[3] : ax[1] || 0, dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
      if (L) { st.lx = dz(x); st.ly = dz(y); } else { st.rx = dz(x); st.ry = dz(y); }
      const i = L ? 0 : 1; st.trigger[i] = !!bt[0]?.pressed; st.grip[i] = !!bt[1]?.pressed;
      if (!L) { st.a = !!bt[4]?.pressed; st.b = !!bt[5]?.pressed; } else { st.x = !!bt[4]?.pressed; st.y = !!bt[5]?.pressed; }
    }
  }
  edge(k, i) { const now = i == null ? this.state[k] : this.state[k][i], was = i == null ? this.prev[k] : this.prev[k][i]; return now && !was; }
  endFrame() { const st = this.state, p = this.prev; p.trigger = [...st.trigger]; p.grip = [...st.grip]; p.a = st.a; p.b = st.b; p.x = st.x; p.y = st.y; }
}

// ---------------------------------------------------------------- διάλογοι, στόχοι, μηνύματα (DOM + πάνελ μέσα στο VR)
export class UI {
  constructor(game, root) {
    this.g = game; this.root = root; this.queue = []; this.cur = null; this.t = 0; this.done = null; this.toastT = 0;
    root.insertAdjacentHTML('beforeend', `<div id="hud"><div id="obj" hidden><small>ΣΤΟΧΟΣ</small><b></b><em></em></div><div id="chap" hidden></div>
      <div id="toast" hidden></div><div id="hint" hidden></div><div id="arrow" hidden>➤</div><div id="cross"></div>
      <div id="dlg" hidden><div class="who"></div><div class="txt"></div><div class="nx">▶ E / κλικ</div></div><div id="fade"></div></div>`);
    this.$ = (s) => root.querySelector(s);
    this.$('#dlg').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.advance(); });
    if (DEVICE.touch) this.$('#dlg .nx').textContent = '▶ πάτα εδώ';
    // πάνελ VR
    this.vc = document.createElement('canvas'); this.vc.width = 1024; this.vc.height = 320; this.vctx = this.vc.getContext('2d');
    this.vtex = new THREE.CanvasTexture(this.vc); this.vtex.colorSpace = THREE.SRGBColorSpace;
    this.vpanel = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.36), new THREE.MeshBasicMaterial({ map: this.vtex, transparent: true, depthTest: false, depthWrite: false }));
    this.vpanel.renderOrder = 999; this.vpanel.visible = false; this.vdirty = true;
  }
  say(lines, done) { const gx = (t) => t.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, m, f) => (this.g.gender === 'f' ? f : m)); this.queue.push(...lines.map((l) => (typeof l === 'string' ? { who: '', text: gx(l) } : { ...l, text: gx(l.text) }))); if (done) this.queue.push({ fn: done }); if (!this.cur) this.next(); }
  get busy() { return !!this.cur || this.queue.length > 0; }
  next() {
    this.cur = null;
    while (this.queue.length && this.queue[0].fn) this.queue.shift().fn();
    const d = this.$('#dlg'); if (!this.queue.length) { d.hidden = true; this.vdirty = true; return; }
    this.cur = this.queue.shift(); this.t = 0; this.shown = 0;
    d.hidden = false; d.querySelector('.who').textContent = this.cur.who || ''; d.querySelector('.who').hidden = !this.cur.who; d.className = this.cur.who ? `w-${this.cur.c || 'k'}` : 'w-x';
    this.g.audio.crunch(0.05); this.vdirty = true;
  }
  advance() { if (!this.cur) return; const full = this.cur.text.length; if (this.shown < full) { this.shown = full; this.render(); } else this.next(); }
  render() { const d = this.$('#dlg .txt'); d.textContent = this.cur.text.slice(0, Math.floor(this.shown)); this.vdirty = true; }
  objective(text, sub = '') { const o = this.$('#obj'); if (!text) { o.hidden = true; this.objText = ''; this.vdirty = true; return; } o.hidden = false; o.querySelector('b').textContent = text; o.querySelector('em').textContent = sub; o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); this.objText = text; this.objSub = sub; this.vdirty = true; }
  progress(sub) { const o = this.$('#obj em'); o.textContent = sub; this.objSub = sub; this.vdirty = true; }
  toast(text, ms = 2600) { const t = this.$('#toast'); t.textContent = text; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in'); this.toastT = ms / 1000; this.toastText = text; this.vdirty = true; }
  hint(text) { const h = this.$('#hint'); if (this.hintText === text) return; this.hintText = text; h.hidden = !text; h.textContent = text || ''; this.vdirty = true; }
  chapter(n, title) {
    const c = this.$('#chap'); c.innerHTML = `<small>ΚΕΦΑΛΑΙΟ ${n}</small><b>${title}</b>`; c.hidden = false; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
    this.chapText = `Κεφάλαιο ${n}: ${title}`; this.chapT = 4.5; this.vdirty = true; setTimeout(() => { c.hidden = true; }, 4800);
  }
  fade(to, sec = 0.8) { const f = this.$('#fade'); f.style.transition = `opacity ${sec}s`; f.style.opacity = to; this.fadeLevel = to; return new Promise((r) => setTimeout(r, sec * 1000)); }
  update(dt) {
    if (this.cur) {
      const full = this.cur.text.length;
      if (this.shown < full) { this.shown = Math.min(full, this.shown + dt * 42); this.render(); }
      else { this.t += dt; if (this.cur.auto && this.t > this.cur.auto) this.next(); }
    }
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) { this.$('#toast').hidden = true; this.toastText = ''; this.vdirty = true; }
    if (this.chapT > 0 && (this.chapT -= dt) <= 0) { this.chapText = ''; this.vdirty = true; }
    if (this.g.vr.session) this.drawVR();
  }
  /** Ζωγραφίζει διάλογο/στόχο/μηνύματα στο πάνελ που αιωρείται μπροστά στο βλέμμα μέσα στο VR. */
  drawVR() {
    const p = this.vpanel; const any = this.cur || this.objText || this.toastText || this.hintText || this.chapText || this.tut; p.visible = !!any; if (!any || !this.vdirty) return;
    const c = this.vctx, W = 1024, H = 320; c.clearRect(0, 0, W, H); this.vdirty = false;
    const box = (y, h, col) => { c.fillStyle = col; c.beginPath(); c.roundRect(10, y, W - 20, h, 26); c.fill(); };
    c.textBaseline = 'top'; c.font = '600 34px system-ui,sans-serif';
    let y = 8;
    if (this.chapText) { box(y, 64, 'rgba(142,16,35,.92)'); c.fillStyle = '#ffe9a8'; c.font = '800 40px system-ui,sans-serif'; c.fillText(this.chapText, 36, y + 12); y += 74; }
    if (this.objText && !this.cur) { box(y, 70, 'rgba(15,40,30,.82)'); c.fillStyle = '#9ff0c8'; c.font = '800 30px system-ui,sans-serif'; c.fillText('★ ' + this.objText + (this.objSub ? `  (${this.objSub})` : ''), 32, y + 18); y += 80; }
    if (this.toastText) { box(y, 60, 'rgba(255,255,255,.92)'); c.fillStyle = '#2a0f14'; c.font = '800 32px system-ui,sans-serif'; c.fillText(this.toastText, 32, y + 12); y += 70; }
    if (this.cur) {
      box(y, H - y - 8, 'rgba(20,10,14,.88)'); c.fillStyle = '#ffd36b'; c.font = '800 30px system-ui,sans-serif'; if (this.cur.who) c.fillText(this.cur.who, 34, y + 14);
      c.fillStyle = '#fff'; c.font = '600 32px system-ui,sans-serif'; const words = this.cur.text.slice(0, Math.floor(this.shown)).split(' '); let line = '', ly = y + (this.cur.who ? 56 : 20);
      for (const w of words) { if (c.measureText(line + w).width > W - 80) { c.fillText(line, 34, ly); ly += 40; line = ''; } line += w + ' '; } c.fillText(line, 34, ly);
      c.fillStyle = 'rgba(255,211,107,.85)'; c.font = '800 24px system-ui,sans-serif'; c.textAlign = 'right'; c.fillText('▶ σκανδάλη', W - 34, H - 44); c.textAlign = 'left';
    } else if (this.tut) {
      const t = this.tut, n = t.rows.length; box(y, Math.min(H - y - 8, 52 + n * 42), 'rgba(40,24,6,.9)'); c.fillStyle = '#f6c453'; c.font = '900 28px system-ui,sans-serif'; c.fillText('🎮 ' + t.title + (this.hintText ? '   ·   ' + this.hintText : ''), 32, y + 12);
      t.rows.forEach((r, i) => { const ok = r.k && t.done?.includes(r.k); c.fillStyle = ok ? '#7fd1ae' : '#fff'; c.font = '700 27px system-ui,sans-serif'; c.fillText((ok ? '✓ ' : '• ') + r.text, 40, y + 52 + i * 42); });
    } else if (this.hintText) { box(y, 56, 'rgba(0,0,0,.6)'); c.fillStyle = '#fff'; c.font = '700 28px system-ui,sans-serif'; c.fillText(this.hintText, 32, y + 12); }
    this.vtex.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- χιόνι που πέφτει (shader, τυλίγεται γύρω από την κάμερα)
export function makeSnowfall(count, size = 60) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(count * 3), S = new Float32Array(count);
  for (let i = 0; i < count; i++) { P[i * 3] = Math.random() * size; P[i * 3 + 1] = Math.random() * size; P[i * 3 + 2] = Math.random() * size; S[i] = Math.random(); }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('seed', new THREE.BufferAttribute(S, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSize: { value: size }, uWind: { value: new THREE.Vector2(0.6, 0.2) }, uFall: { value: 1 }, uScale: { value: 300 }, uOpacity: { value: 1 }, uColor: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: `attribute float seed; uniform float uTime,uSize,uFall,uScale; uniform vec3 uCam; uniform vec2 uWind; varying float vA;
      void main(){ vec3 p=position; float t=uTime*(0.6+seed*0.7);
        p.y-=t*uFall*(1.2+seed*1.3); p.x+=t*uWind.x+sin(uTime*0.9+seed*40.)*0.6; p.z+=t*uWind.y+cos(uTime*0.7+seed*31.)*0.6;
        vec3 w=mod(p-uCam+uSize*.5,uSize)-uSize*.5+uCam;
        vec4 mv=modelViewMatrix*vec4(w,1.); gl_Position=projectionMatrix*mv;
        float d=-mv.z; gl_PointSize=uScale*(0.035+seed*0.05)/max(d,0.5); vA=smoothstep(uSize*.5,uSize*.3,d)*smoothstep(0.2,1.2,d); }`,
    fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float r=length(c); float a=smoothstep(.5,.1,r)*vA*uOpacity; if(a<.01) discard; gl_FragColor=vec4(uColor,a); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; return pts;
}
