// Ο «σκηνοθέτης»: παίκτης, κάμερα, VR, αλληλεπιδράσεις, χιονόμπαλες, NPC και ο βρόχος του παιχνιδιού.
import { THREE, QUALITY, DEVICE, Physics, AudioSys, Input, VR, UI, clamp, lerp, angLerp, rand, glowTex } from './engine.js';
import { World, height, P, LAKE_Y } from './world.js';
import { makeKid, makeBeacon } from './actors.js';

const UP = new THREE.Vector3(0, 1, 0);
export class Game {
  constructor(root, qualityName) {
    this.root = root; this.Q = QUALITY; this.qName = qualityName; this.q = QUALITY[qualityName];
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: qualityName !== 'low', powerPreference: 'high-performance' }));
    r.setPixelRatio(this.q.pr); r.setSize(innerWidth, innerHeight); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = this.q.shadow > 0; r.shadowMap.type = THREE.PCFSoftShadowMap; r.xr.enabled = true;
    root.prepend(r.domElement); r.domElement.className = 'gl';
    this.phys = new Physics(height); this.audio = new AudioSys(); this.input = new Input(r.domElement); this.vr = new VR(this); this.ui = new UI(this, root);
    this.world = new World(this); this.scene = this.world.scene;
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, this.q.far); this.rig = new THREE.Group(); this.rig.add(this.camera); this.scene.add(this.rig);
    this.camera.add(this.ui.vpanel);
    // παίκτης
    this.kid = makeKid({ coat: 0x2b6cb0, hat: 0xc8102e, scarf: 0xf6c453, backpack: false }); this.scene.add(this.kid.root);
    this.p = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: -0.15, ground: true, mode: 'walk', speed: 0, stepT: 0, coyote: 0 };
    this.camMode = DEVICE.touch ? 'third' : 'third'; this.camDist = 3.8; this.camPos = new THREE.Vector3(); this.firstFrame = true;
    this.inter = []; this.npcs = []; this.balls = []; this.canThrow = false; this.onBallHit = null; this.waiters = []; this.t = 0; this.paused = false; this.locked = false;
    this.beacon = makeBeacon(); this.beacon.g.visible = false; this.scene.add(this.beacon.g);
    this.splat = this.makeSplats(); this.fadeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true, opacity: 0, depthTest: false })); this.fadeSphere.renderOrder = 1000; this.camera.add(this.fadeSphere);
    // πατημασιές στο χιόνι (κυκλικός «buffer»)
    { const n = 220, geo = new THREE.PlaneGeometry(0.16, 0.28); geo.rotateX(-Math.PI / 2); const tex = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 34, 2, 16, 34, 18); gr.addColorStop(0, 'rgba(120,140,180,.75)'); gr.addColorStop(1, 'rgba(120,140,180,0)'); x.fillStyle = gr; x.beginPath(); x.ellipse(16, 34, 13, 28, 0, 0, 7); x.fill(); return c; })());
      this.prints = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.8 }), n); this.prints.count = 0; this.prints.frustumCulled = false; this.printI = 0; this.printSide = 1; this.scene.add(this.prints); }
    this.ballGeo = new THREE.SphereGeometry(0.11, 10, 8); this.ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); r.setSize(innerWidth, innerHeight); });
    this.timeScale = Number(new URLSearchParams(location.search).get('speed') || 1); this.clock = new THREE.Clock(); r.setAnimationLoop(() => this.frame());
  }
  // ---------------------------------------------------------------- βοηθήματα για την ιστορία
  /** Περιμένει μέχρι να ισχύει η συνθήκη (ελέγχεται κάθε καρέ). */
  until(fn) { return new Promise((res) => this.waiters.push({ fn, res })); }
  wait(sec) { const end = this.t + sec; return this.until(() => this.t >= end); }
  say(lines) { return new Promise((res) => this.ui.say(lines, res)); }
  teleport(x, z, yaw = this.p.yaw, y) { this.p.pos.set(x, y ?? height(x, z), z); this.p.vel.set(0, 0, 0); this.p.yaw = yaw; this.firstFrame = true; }
  async fadeTo(v, sec = 0.7) { this.fadeTarget = v; this.fadeSpeed = 1 / sec; await this.ui.fade(v, sec); }
  setBeacon(pos) { if (!pos) { this.beacon.g.visible = false; this.beaconPos = null; return; } this.beaconPos = pos; this.beacon.g.visible = true; this.beacon.g.position.set(pos.x, pos.y ?? height(pos.x, pos.z), pos.z); }
  /** Αλληλεπίδραση: εμφανίζει «E: …» όταν είσαι κοντά. */
  addInter(o) { const it = { r: 2, on: true, ...o }; this.inter.push(it); return it; }
  removeInter(it) { const i = this.inter.indexOf(it); if (i >= 0) this.inter.splice(i, 1); }
  addNPC(actor, x, z, yaw = 0) { const n = { a: actor, pos: new THREE.Vector3(x, height(x, z), z), yaw, target: null, speed: 3, follow: null, look: null, vy: 0, coll: this.phys.circle(x, z, 0.4) }; n.coll.npc = n; n.coll.h = 1.8; this.scene.add(actor.root); this.npcs.push(n); this.placeNPC(n); return n; }
  removeNPC(n) { this.scene.remove(n.a.root); this.phys.remove(n.coll); this.npcs.splice(this.npcs.indexOf(n), 1); }
  placeNPC(n) { n.a.root.position.copy(n.pos); n.a.root.rotation.y = n.yaw; n.coll.x = n.pos.x; n.coll.z = n.pos.z; }
  /** Καθαρίζει ό,τι έστησε το προηγούμενο κεφάλαιο. */
  reset() { for (const n of [...this.npcs]) this.removeNPC(n); this.inter.length = 0; this.canThrow = false; this.onBallHit = null; this.setBeacon(null); this.ui.objective(''); this.ui.hint(''); this.p.mode = 'walk'; this.lantern(false); for (const o of this.temp || []) { this.scene.remove(o); } this.temp = []; this.tick = null; this.slippery = false; }
  keep(o) { this.scene.add(o); (this.temp ||= []).push(o); return o; }
  lantern(on) { this.lanternOn = on; this.world.lantern.intensity = on ? 38 : 0; }
  get inVR() { return !!this.vr.session; }
  get headPos() { const v = new THREE.Vector3(); this.camera.getWorldPosition(v); return v; }
  get headDir() { const v = new THREE.Vector3(); this.camera.getWorldDirection(v); return v; }

  // ---------------------------------------------------------------- χιονόμπαλες & πιτσιλιές
  makeSplats() {
    const n = 400, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3).fill(-999), vel = new Float32Array(n * 3), life = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, depthWrite: false })); pts.frustumCulled = false; this.scene.add(pts);
    let k = 0;
    return { burst: (p, cnt = 22, sp = 3) => { for (let i = 0; i < cnt; i++) { const j = k++ % n; pos[j * 3] = p.x; pos[j * 3 + 1] = p.y; pos[j * 3 + 2] = p.z; const a = rand(0, 6.28), u = rand(0.2, 1); vel[j * 3] = Math.cos(a) * sp * u; vel[j * 3 + 1] = rand(1, 3.5); vel[j * 3 + 2] = Math.sin(a) * sp * u; life[j] = rand(0.5, 1); } },
      update: (dt) => { for (let j = 0; j < n; j++) { if (life[j] <= 0) continue; life[j] -= dt; vel[j * 3 + 1] -= 9 * dt; pos[j * 3] += vel[j * 3] * dt; pos[j * 3 + 1] += vel[j * 3 + 1] * dt; pos[j * 3 + 2] += vel[j * 3 + 2] * dt; if (life[j] <= 0) pos[j * 3 + 1] = -999; } g.attributes.position.needsUpdate = true; } };
  }
  throwBall(from, dir, speed = 17, owner = 'player') {
    const m = new THREE.Mesh(this.ballGeo, this.ballMat); m.castShadow = true; m.position.copy(from); this.scene.add(m);
    this.balls.push({ m, v: dir.clone().normalize().multiplyScalar(speed).add(new THREE.Vector3(0, owner === 'player' ? 2.6 : 3.2, 0)), owner, life: 4 });
    if (owner === 'player') { this.kid.st.throw = 0.35; this.audio.play('../../audio/sfx/pop.mp3', { vol: 0.35, rate: 0.7 }); }
  }
  updateBalls(dt) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i]; b.v.y -= 11 * dt; b.m.position.addScaledVector(b.v, dt); b.life -= dt; const p = b.m.position;
      let hit = null, done = b.life <= 0 || p.y < height(p.x, p.z);
      if (!done) { const c = this.phys.hit(p.x, p.y, p.z, 0.12); if (c && !(b.owner !== 'player' && c.npc)) { hit = c; done = true; } }
      if (!done && b.owner !== 'player' && !this.inVR) { const d = p.distanceTo(new THREE.Vector3(this.p.pos.x, this.p.pos.y + 1, this.p.pos.z)); if (d < 0.55) { done = true; this.onPlayerHit?.(); } }
      if (!done && b.owner !== 'player' && this.inVR) { if (p.distanceTo(this.headPos) < 0.45) { done = true; this.onPlayerHit?.(); } }
      if (done) { this.splat.burst(p); this.audio.splat(b.owner === 'player' ? 0.5 : 0.3); this.scene.remove(b.m); this.balls.splice(i, 1); if (hit && b.owner === 'player') this.onBallHit?.(hit, p); }
    }
  }

  // ---------------------------------------------------------------- VR
  async enterVR() { this.audio.ensure(); const s = this.vr.start(); this.audio.unlock(); await s; this.camModePrev = this.camMode; this.camMode = 'first'; this.kid.root.visible = false; this.firstFrame = true; this.ui.vdirty = true; this.onVRStart?.(); }
  onVREnd() { this.camMode = this.camModePrev || 'third'; this.rig.position.set(0, 0, 0); this.rig.rotation.set(0, 0, 0); this.camera.position.set(0, 0, 0); this.ui.vpanel.visible = false; this.onVRExit?.(); }

  // ---------------------------------------------------------------- βρόχος
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta()) * (this.timeScale || 1); this.t += dt; const vr = this.inVR;
    if (vr) this.vr.poll();
    if (!this.paused) {
      this.updatePlayer(dt, vr);
      this.updateNPCs(dt);
      this.updateBalls(dt); this.splat.update(dt);
      this.tick?.(dt, this.t);
      for (let i = this.waiters.length - 1; i >= 0; i--) if (this.waiters[i].fn()) { const w = this.waiters.splice(i, 1)[0]; w.res(); }
    }
    this.updateCamera(dt, vr);
    const cam = this.headPos; this.world.update(dt, this.t, cam, this.p.pos); this.beacon.update(this.t);
    this.ui.update(dt);
    if (vr) { this.fadeSphere.material.opacity = lerp(this.fadeSphere.material.opacity, this.fadeTarget || 0, Math.min(1, dt * 6)); this.placeVRPanel(); }
    const fwd = this.headDir; this.audio.listener(cam, fwd);
    // λάμπα χεριού
    if (this.lanternOn) { const L = this.world.lantern; L.position.copy(cam).add(new THREE.Vector3(0, -0.25, 0)); L.target.position.copy(cam).addScaledVector(fwd, 8); L.target.updateMatrixWorld(); }
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame(); if (vr) this.vr.endFrame();
  }
  placeVRPanel() {
    const p = this.ui.vpanel; p.position.set(0, -0.32, -1.25); p.rotation.set(-0.22, 0, 0);
  }
  actionPressed(vr) { return this.input.hit('KeyE', 'Enter') || (DEVICE.touch && !this.canThrow && this.input.hit('Mouse0')) || (vr && (this.vr.edge('trigger', 0) || this.vr.edge('a') || (!this.canThrow && this.vr.edge('trigger', 1)))); }
  updatePlayer(dt, vr) {
    const p = this.p, inp = this.input;
    // διάλογοι: προχωράνε με E / κλικ / σκανδάλη
    if (this.ui.cur) { if (inp.hit('KeyE', 'Enter', 'Space', 'Mouse0') || (vr && (this.vr.edge('trigger', 0) || this.vr.edge('trigger', 1) || this.vr.edge('a')))) this.ui.advance(); }
    if (p.mode === 'sleigh') { this.kid.update(dt, 0, this.t); return; }
    const frozen = this.locked || (this.ui.cur && this.ui.cur.lock !== false);
    // κοίταγμα
    if (!vr) { p.yaw -= inp.look.x; p.pitch = clamp(p.pitch - inp.look.y, -1.2, 0.9); }
    else if (this.vr.state.rx && !this._snap) { this.vr.prev.snap = true; this._snap = true; const s = Math.sign(this.vr.state.rx) * -Math.PI / 6; this.rig.rotation.y += s; } else if (!this.vr.state.rx) this._snap = false;
    // κατεύθυνση κίνησης από το βλέμμα
    let ax = 0, ay = 0;
    if (!frozen) { if (vr) { ax = this.vr.state.lx; ay = -this.vr.state.ly; } else { const a = inp.axes(); ax = a.x; ay = a.y; } }
    let yaw = p.yaw; if (vr) { const d = this.headDir; yaw = Math.atan2(-d.x, -d.z); }
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const sprint = inp.down('ShiftLeft', 'ShiftRight') || (vr && this.vr.state.grip[0]);
    const max = (sprint ? 6.2 : 3.6) * (this.speedMul || 1);
    const wx = (fx * ay + rx * ax) * max, wz = (fz * ay + rz * ax) * max;
    const k = this.slippery && this.onIce ? 1.1 : p.ground ? 12 : 3;
    p.vel.x += (wx - p.vel.x) * Math.min(1, dt * k); p.vel.z += (wz - p.vel.z) * Math.min(1, dt * k);
    if (this.slippery && this.onIce && !(ax || ay)) { p.vel.x *= 1 - dt * 0.25; p.vel.z *= 1 - dt * 0.25; }
    // άλμα + βαρύτητα
    p.coyote -= dt; if (p.ground) p.coyote = 0.12;
    if (!frozen && (inp.hit('Space') || (vr && this.vr.edge('b'))) && p.coyote > 0) { p.vel.y = 5.4; p.ground = false; p.coyote = 0; this.audio.crunch(0.3); }
    p.vel.y -= 15 * dt;
    const next = new THREE.Vector3(p.pos.x + p.vel.x * dt, p.pos.y + p.vel.y * dt, p.pos.z + p.vel.z * dt);
    const floor = this.phys.resolve(next, 0.34, next.y);
    const lakeFloor = Math.hypot(next.x - P.lake.x, next.z - P.lake.z) < P.lake.r + 1 ? LAKE_Y : -99; this.onIce = lakeFloor > -99;
    const f = Math.max(floor, lakeFloor);
    if (next.y <= f + 0.02) { if (!p.ground && p.vel.y < -6) { this.audio.crunch(0.5); this.splat.burst(new THREE.Vector3(next.x, f + 0.1, next.z), 10, 2); } next.y = f; p.vel.y = Math.max(0, p.vel.y); p.ground = true; } else if (next.y > f + 0.25) p.ground = false;
    // όρια κόσμου
    if (next.x < 400) { const d = Math.hypot(next.x, next.z + 10); if (d > 168) { next.x *= 168 / d; next.z = (next.z + 10) * (168 / d) - 10; } }
    p.pos.copy(next); p.speed = Math.hypot(p.vel.x, p.vel.z);
    // βήματα
    if (p.ground && p.speed > 0.6) { p.stepT -= dt * p.speed; if (p.stepT <= 0) { p.stepT = 1.25; if (this.onIce) this.audio.crunch(0.06); else this.audio.crunch(this.world.indoor ? 0.08 : 0.22); if (!this.world.indoor && !this.onIce) this.footprint(); } }
    // μοντέλο
    if (p.speed > 0.3) p.face = Math.atan2(p.vel.x, p.vel.z); this.kid.root.rotation.y = angLerp(this.kid.root.rotation.y, p.face ?? 0, Math.min(1, dt * 12));
    this.kid.root.position.copy(p.pos); this.kid.st.air = !p.ground; this.kid.update(dt, p.ground ? p.speed : 0, this.t);
    // αλληλεπιδράσεις
    let best = null, bd = 1e9;
    if (!this.ui.cur) for (const it of this.inter) { if (!it.on) continue; const ip = typeof it.pos === 'function' ? it.pos() : it.pos; const dx = ip.x - p.pos.x, dz = ip.z - p.pos.z, d = Math.hypot(dx, dz); if (d < it.r && d < bd) { bd = d; best = it; } }
    this.focus = best;
    this.ui.hint(best ? `${vr ? 'Σκανδάλη' : DEVICE.touch ? '✋' : 'E'}: ${best.label}` : this.canThrow && !this.ui.cur ? (vr ? 'Δεξιά σκανδάλη: ρίξε χιονόμπαλα' : DEVICE.touch ? '❄: ρίξε χιονόμπαλα' : 'Κλικ: ρίξε χιονόμπαλα') : '');
    if (best && !this.ui.cur && this.actionPressed(vr)) { this.audio.play('../../audio/sfx/click.mp3', { vol: 0.4 }); best.fn(best); return; }
    // ρίψη
    if (this.canThrow && !this.ui.cur && !frozen) {
      const now = this.t; if ((this._lastThrow || 0) + 0.32 > now) return;
      if (vr && this.vr.edge('trigger', 1)) { const h = this.vr.hand('right'); const o = new THREE.Vector3(), q = new THREE.Quaternion(); h.ctl.getWorldPosition(o); h.ctl.getWorldQuaternion(q); this.throwBall(o, new THREE.Vector3(0, 0, -1).applyQuaternion(q)); this._lastThrow = now; }
      else if (!vr && inp.hit('Mouse0')) { const d = this.headDir; d.y += 0.04; const o = new THREE.Vector3(p.pos.x, p.pos.y + 1.4, p.pos.z).addScaledVector(new THREE.Vector3(d.x, 0, d.z).normalize(), 0.5); this.throwBall(o, d); this._lastThrow = now; }
    }
  }
  footprint() {
    const p = this.p, yaw = Math.atan2(p.vel.x, p.vel.z), s = (this.printSide *= -1) * 0.12, D = this._D ||= new THREE.Object3D();
    D.position.set(p.pos.x + Math.cos(yaw) * s, height(p.pos.x, p.pos.z) + 0.025, p.pos.z - Math.sin(yaw) * s); D.rotation.set(0, yaw, 0); D.updateMatrix();
    this.prints.setMatrixAt(this.printI, D.matrix); this.printI = (this.printI + 1) % this.prints.instanceMatrix.count; this.prints.count = Math.min(this.prints.instanceMatrix.count, this.prints.count + 1); this.prints.instanceMatrix.needsUpdate = true;
  }
  updateNPCs(dt) {
    for (const n of this.npcs) {
      let tgt = n.follow ? (typeof n.follow === 'function' ? n.follow() : n.follow) : n.target, sp = 0;
      if (tgt) {
        const dx = tgt.x - n.pos.x, dz = tgt.z - n.pos.z, d = Math.hypot(dx, dz), stop = n.follow ? n.followDist || 2.2 : 0.3;
        if (d > stop) { sp = Math.min(n.speed * (n.follow && d > 8 ? 1.8 : 1), d * 3); n.pos.x += (dx / d) * sp * dt; n.pos.z += (dz / d) * sp * dt; n.yaw = angLerp(n.yaw, Math.atan2(dx, dz), Math.min(1, dt * 8)); }
        else if (!n.follow) { n.target = null; n.onArrive?.(); }
      }
      if (!sp && n.look) { const l = n.look === 'player' ? this.p.pos : n.look; n.yaw = angLerp(n.yaw, Math.atan2(l.x - n.pos.x, l.z - n.pos.z), Math.min(1, dt * 4)); }
      if (n.fly == null) n.pos.y = height(n.pos.x, n.pos.z); else n.pos.y = n.fly;
      n.a.root.position.copy(n.pos); n.a.root.rotation.y = n.yaw; n.coll.x = n.pos.x; n.coll.z = n.pos.z;
      n.a.update(dt, sp, this.t); n.ai?.(dt, this.t);
    }
  }
  updateCamera(dt, vr) {
    const p = this.p, cam = this.camera;
    if (vr) {
      if (p.mode === 'sleigh' && this.sleighSeat) { this.sleighSeat.getWorldPosition(this.rig.position); }
      else this.rig.position.copy(p.pos);
      return;
    }
    if (this.cine) { const c = this.cine; cam.position.lerp(c.pos, this.firstFrame ? 1 : Math.min(1, dt * (c.speed || 2))); const m = new THREE.Matrix4().lookAt(cam.position, c.look, UP); const q = new THREE.Quaternion().setFromRotationMatrix(m); cam.quaternion.slerp(q, this.firstFrame ? 1 : Math.min(1, dt * (c.speed || 2))); this.firstFrame = false; return; }
    if (p.mode === 'sleigh' && this.sleighCam) { this.sleighCam(cam, dt); this.firstFrame = false; return; }
    const first = this.camMode === 'first' || this.world.indoor;
    this.kid.root.visible = !first;
    const eye = new THREE.Vector3(p.pos.x, p.pos.y + 1.45, p.pos.z);
    const dir = new THREE.Vector3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
    if (first) { cam.position.copy(eye); cam.lookAt(eye.clone().add(dir)); this.firstFrame = false; return; }
    const want = eye.clone().addScaledVector(dir, -this.camDist).add(new THREE.Vector3(0, 0.35, 0));
    const gh = height(want.x, want.z) + 0.4; if (want.y < gh) want.y = gh;
    // αν κάτι (σπίτι) κρύβει την κάμερα, πλησίασε
    for (let i = 1; i <= 6; i++) { const t = i / 6, q = eye.clone().lerp(want, t); if (this.phys.hit(q.x, q.y, q.z, 0.2)?.hx) { want.copy(eye.clone().lerp(want, (i - 1) / 6)); break; } }
    if (this.firstFrame) this.camPos.copy(want); else this.camPos.lerp(want, Math.min(1, dt * 14));
    cam.position.copy(this.camPos); cam.lookAt(eye.clone().addScaledVector(dir, 2)); this.firstFrame = false;
  }
}
