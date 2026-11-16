// Μενού ΜΕΣΑ στο VR: ένα αιωρούμενο πάνελ με κουμπιά. Σημαδεύεις με το χειριστήριο (ακτίνα) και πατάς τη σκανδάλη.
import { THREE } from './engine.js';

const W = 1024, H = 1152;
export class VRMenu {
  constructor(g) {
    this.g = g; this.open = false; this.buttons = []; this.hover = -1; this.page = null;
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H; this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.35), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.panel.renderOrder = 1001; this.group = new THREE.Group(); this.group.add(this.panel); this.group.visible = false; g.rig.add(this.group);
    // ακτίνες & δείκτης
    this.rays = [0, 1].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, depthTest: false })); l.renderOrder = 1002; l.visible = false; g.scene.add(l); return l; });
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a, depthTest: false })); this.dot.renderOrder = 1003; this.dot.visible = false; this.panel.add(this.dot); this.dot.position.z = 0.002;
    this.rc = new THREE.Raycaster();
  }
  /** Ανοίγει μια σελίδα: { title, sub, text: [γραμμές], buttons: [{ label, sub, fn, primary }] }. Επιστρέφει όταν πατηθεί κάποιο κουμπί που κλείνει το μενού. */
  show(page) {
    this.page = page; this.open = true; this.group.visible = true; this.hover = -1; this.g.menuOpen = true;
    // τοποθέτηση μπροστά στο βλέμμα
    const cam = this.g.camera, head = new THREE.Vector3(), dir = new THREE.Vector3(); cam.getWorldPosition(head); cam.getWorldDirection(dir);
    const yaw = Math.atan2(dir.x, dir.z), local = this.g.rig.worldToLocal(head.clone().add(new THREE.Vector3(Math.sin(yaw) * 1.5, -0.12, Math.cos(yaw) * 1.5)));
    this.group.position.copy(local); this.group.rotation.set(0, yaw + Math.PI - this.g.rig.rotation.y, 0);
    this.draw(); this.g.audio.play('../../audio/sfx/pop.mp3', { vol: 0.35 });
  }
  close() { this.open = false; this.group.visible = false; this.g.menuOpen = false; for (const r of this.rays) r.visible = false; this.dot.visible = false; }
  draw() {
    const c = this.ctx, p = this.page; c.clearRect(0, 0, W, H);
    const rr = (x, y, w, h, r, fill, stroke) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 6; c.strokeStyle = stroke; c.stroke(); } };
    rr(8, 8, W - 16, H - 16, 48, 'rgba(24,10,28,.94)', 'rgba(246,196,83,.85)');
    c.fillStyle = '#c8102e'; c.beginPath(); c.roundRect(8, 8, W - 16, 22, [48, 48, 0, 0]); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'top'; let y = 58;
    if (p.badge) { c.font = '900 34px system-ui,sans-serif'; const w = c.measureText(p.badge).width + 50; rr((W - w) / 2, y, w, 54, 27, '#7fd1ae'); c.fillStyle = '#0b2a1e'; c.fillText(p.badge, W / 2, y + 10); y += 74; }
    c.fillStyle = '#fff'; c.font = '800 60px system-ui,sans-serif'; for (const line of wrap(c, p.title || '', W - 120)) { c.fillText(line, W / 2, y); y += 70; }
    if (p.sub) { c.fillStyle = '#f6c453'; c.font = '800 32px system-ui,sans-serif'; c.fillText(p.sub, W / 2, y + 2); y += 54; }
    if (p.text) { c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,.92)'; c.font = '600 34px system-ui,sans-serif'; for (const t of p.text) { for (const line of wrap(c, t, W - 140)) { c.fillText(line, 70, y); y += 44; } y += 8; } c.textAlign = 'center'; }
    y += 14; this.buttons = [];
    const bs = p.buttons || [], bh = bs.length > 5 ? 84 : 104, gap = 16;
    bs.forEach((b, i) => {
      const x = 90, w = W - 180, hov = i === this.hover;
      rr(x, y, w, bh, 26, b.primary ? (hov ? '#ff3b55' : '#c8102e') : hov ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.1)', hov ? '#f6c453' : b.primary ? '#ff8fa0' : 'rgba(255,255,255,.25)');
      c.fillStyle = b.disabled ? 'rgba(255,255,255,.4)' : '#fff'; c.font = `900 ${b.sub ? 38 : 42}px system-ui,sans-serif`; c.fillText(b.label, W / 2, y + (b.sub ? 12 : bh / 2 - 24));
      if (b.sub) { c.font = '700 26px system-ui,sans-serif'; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(b.sub, W / 2, y + 58); }
      this.buttons.push({ ...b, x, y, w, h: bh }); y += bh + gap;
    });
    if (p.foot) { c.font = '700 28px system-ui,sans-serif'; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText(p.foot, W / 2, H - 70); }
    this.tex.needsUpdate = true;
  }
  /** Κάθε καρέ (μόνο μέσα στο VR). */
  update() {
    if (!this.open || !this.g.inVR) return;
    let hover = -1, hit = null; const vr = this.g.vr;
    vr.hands.forEach((h, i) => {
      const r = this.rays[i], o = new THREE.Vector3(), q = new THREE.Quaternion(); h.ctl.getWorldPosition(o); h.ctl.getWorldQuaternion(q);
      const d = new THREE.Vector3(0, 0, -1).applyQuaternion(q); this.rc.set(o, d);
      const x = this.rc.intersectObject(this.panel, false)[0];
      const end = x ? x.point : o.clone().addScaledVector(d, 3); r.geometry.setFromPoints([o, end]); r.visible = true;
      if (x && x.uv) { const cx = x.uv.x * W, cy = (1 - x.uv.y) * H; const bi = this.buttons.findIndex((b) => !b.disabled && cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h); if (bi >= 0 || !hit) { hit = { x, i }; if (bi >= 0) hover = bi; } }
    });
    if (hit) { this.dot.visible = true; this.dot.position.copy(this.panel.worldToLocal(hit.x.point.clone())); this.dot.position.z = 0.003; } else this.dot.visible = false;
    if (hover !== this.hover) { this.hover = hover; this.draw(); if (hover >= 0) { this.g.audio.crunch(0.05); for (const s of this.g.vr.session.inputSources) s.gamepad?.hapticActuators?.[0]?.pulse?.(0.25, 25); } }
    if (hover >= 0 && (vr.edge('trigger', 0) || vr.edge('trigger', 1) || vr.edge('a'))) { const b = this.buttons[hover]; this.g.audio.play('../../audio/sfx/click.mp3', { vol: 0.5 }); b.fn?.(); }
  }
}
function wrap(c, text, max) { const out = []; let line = ''; for (const w of String(text).split(' ')) { if (c.measureText(line + w).width > max && line) { out.push(line.trim()); line = ''; } line += w + ' '; } if (line.trim()) out.push(line.trim()); return out; }

export const VR_CONTROLS = [
  '🕹️ Αριστερός μοχλός: περπάτημα (κράτα τη λαβή για τρέξιμο)',
  '↪️ Δεξιός μοχλός: στροφή αριστερά/δεξιά',
  '👉 Σκανδάλη: ενέργεια, επόμενη φράση, ρίψη χιονόμπαλας (δεξί χέρι)',
  '⤒ Κουμπί B: άλμα',
  '☰ Κουμπί Y (αριστερό χέρι): παύση και μενού',
  '🛷 Στο έλκηθρο: αριστερός μοχλός για τιμόνι και ύψος, σκανδάλη για να ρίξεις δώρο',
];
