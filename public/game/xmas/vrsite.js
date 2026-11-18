// Ο ΙΣΤΟΤΟΠΟΣ ΜΕΣΑ ΣΤΟ VR: μια μεγάλη αιωρούμενη οθόνη στο χιονισμένο χωριό, με το μενού του site, άρθρα, τεύχη,
// παιχνίδια, περιπέτειες και οδηγούς. Το περιεχόμενο έρχεται από το /api/vr (μόνο δημοσιευμένο, καθαρό κείμενο)
// και ζωγραφίζεται σε καμβά. Σημαδεύεις με το χειριστήριο, πατάς τη σκανδάλη, κυλάς με τον μοχλό.
import { THREE } from './engine.js';

const W = 1600, H = 1040, HEAD = 176, PAD = 64, SB = 70, CW = W - PAD * 2 - SB;
const C = { bg: 'rgba(251,246,234,.98)', ink: '#1d1a24', mut: '#6b6478', red: '#c8102e', gold: '#b8860b', teal: '#00a3b8', card: '#ffffff', head: '#2c5e4a', hov: '#fff4c2' };
const F = (w, s) => `${w} ${s}px system-ui, "Segoe UI", sans-serif`;

export class VRSite {
  constructor(g, { onGame, onExit } = {}) {
    this.g = g; this.onGame = onGame; this.onExit = onExit; this.open = false; this.path = '/'; this.hist = []; this.view = null;
    this.items = []; this.hits = []; this.head = []; this.scroll = 0; this.maxScroll = 0; this.hover = null; this.imgs = new Map(); this.dirty = true; this.loading = false; this.adv = null;
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H; this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8; this.tex.generateMipmaps = true; this.tex.minFilter = THREE.LinearMipmapLinearFilter;
    const PW = 2.2, PH = PW * H / W;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false }));
    this.panel.renderOrder = 999;
    // πλαίσιο (σαν πίνακας της τάξης) + μαλακή λάμψη πίσω
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(PW + 0.08, PH + 0.08), new THREE.MeshBasicMaterial({ color: 0x5a3a22, toneMapped: false })); frame.position.z = -0.006;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(PW + 0.9, PH + 0.7), new THREE.MeshBasicMaterial({ map: radial(), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })); glow.position.z = -0.02;
    this.group = new THREE.Group(); this.group.add(glow, frame, this.panel); this.group.visible = false; g.rig.add(this.group);
    this.rays = [0, 1].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85 })); l.visible = false; g.scene.add(l); return l; });
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), new THREE.MeshBasicMaterial({ color: 0xc8102e, depthTest: false })); this.dot.renderOrder = 1003; this.dot.visible = false; this.panel.add(this.dot);
    this.rc = new THREE.Raycaster(); this.place = 0;
  }

  // ---------- πλοήγηση ----------
  async show(path = this.path || '/') { this.open = true; this.g.menuOpen = true; if (!this.group.visible) this.place = 3; await this.go(path, false); }
  hide() { this.open = false; this.group.visible = false; this.g.menuOpen = false; for (const r of this.rays) r.visible = false; this.dot.visible = false; }
  back() { const p = this.hist.pop(); if (p) this.go(p, false); }
  async go(path, push = true) {
    path = String(path || '/'); if (/^https?:\/\//.test(path)) return this.outside(path);
    if (push && this.path !== path) { this.hist.push(this.path); if (this.hist.length > 40) this.hist.shift(); }
    this.path = path; this.adv = null; this.scroll = 0; this.loading = true; this.view = { kind: 'loading', title: 'Φόρτωση…' }; this.build(); this.g.audio.play('../../audio/sfx/click.mp3', { vol: 0.35 });
    try {
      const r = await fetch('/api/vr?path=' + encodeURIComponent(path), { credentials: 'same-origin' });
      const j = await r.json(); if (this.path !== path) return;
      this.view = r.ok ? j : { kind: 'error', title: 'Η σελίδα δεν βρέθηκε', site: this.view?.site };
      if (j.site) this.site = j.site;
    } catch { if (this.path === path) this.view = { kind: 'error', title: 'Δεν υπάρχει σύνδεση με τον ιστότοπο' }; }
    this.loading = false; this.build();
  }
  async category(slug, label) {
    const r = await fetch('/api/vr?cat=' + encodeURIComponent(slug)).then((x) => x.json()).catch(() => null);
    if (!r?.cards) return; this.hist.push(this.path); this.view = { ...this.view, title: label, cards: r.cards, activeCat: slug }; this.scroll = 0; this.build();
  }
  /** Σελίδα που δεν γίνεται μέσα στο VR: κλείνει το VR και την ανοίγει κανονικά, στην ίδια καρτέλα. */
  outside(href) { this.leaveTo = href; this.g.vr.session?.end(); }

  // ---------- διάταξη ----------
  build() {
    const v = this.view || {}, it = []; const add = (o) => it.push(o);
    if (v.kind === 'loading') add({ t: 'p', text: '⏳ Φόρτωση…' });
    else if (v.kind === 'error') { add({ t: 'title', text: '😕 ' + v.title }); add({ t: 'btn', label: '⌂ Αρχική', fn: () => this.go('/') }); }
    else if (v.kind === 'home') {
      add({ t: 'hero', title: v.title, text: v.intro });
      add({ t: 'game', title: '🎄 Τα Χριστούγεννα του Κιμωλάκη', sub: 'Η 3D περιπέτειά μας — παίξ\' την ΤΩΡΑ, μέσα στο VR!', fn: () => this.onGame?.() });
      if (v.featured?.length) { add({ t: 'h', text: '⭐ Ξεχωριστά' }); v.featured.forEach((c) => add({ t: 'card', ...c, big: true, fn: () => this.go(c.href) })); }
      if (v.recent?.length) { add({ t: 'h', text: '📰 Πρόσφατα άρθρα' }); v.recent.forEach((c) => add({ t: 'card', ...c, fn: () => this.go(c.href) })); add({ t: 'btn', label: 'Όλα τα άρθρα →', fn: () => this.go('/articles') }); }
      if (v.edition) { add({ t: 'h', text: '🗞️ Το νέο τεύχος' }); add({ t: 'card', ...v.edition, fn: () => this.go(v.edition.href) }); }
    } else if (v.kind === 'articles') {
      add({ t: 'title', text: v.title || 'Άρθρα' });
      if (v.cats?.length) add({ t: 'chips', items: [{ label: 'Όλα', on: !v.activeCat, fn: () => this.go('/articles', false) }, ...v.cats.map((c) => ({ label: c.label, color: c.color, on: v.activeCat === c.slug, fn: () => this.category(c.slug, c.label) }))] });
      (v.cards || []).forEach((c) => add({ t: 'card', ...c, fn: () => this.go(c.href) }));
      if (!v.cards?.length) add({ t: 'p', text: 'Δεν υπάρχουν άρθρα εδώ ακόμα.' });
    } else if (v.kind === 'cards') {
      add({ t: 'title', text: v.title }); (v.cards || []).forEach((c) => add({ t: 'card', ...c, fn: () => this.go(c.href) }));
      if (!v.cards?.length) add({ t: 'p', text: 'Δεν υπάρχει τίποτα εδώ ακόμα.' });
    } else if (v.kind === 'article') {
      add({ t: 'title', text: v.title }); if (v.sub) add({ t: 'sub', text: v.sub }); if (v.meta) add({ t: 'meta', text: v.meta });
      if (v.img) add({ t: 'img', src: v.img });
      for (const b of v.blocks || []) add(b);
      if (v.outside) add({ t: 'btn', label: '↗ Άνοιγμα της κανονικής σελίδας (έξω από το VR)', fn: () => this.outside(v.outside) });
      add({ t: 'btn', label: '← Πίσω', fn: () => this.back() });
    } else if (v.kind === 'games') {
      add({ t: 'title', text: '🎮 Παιχνίδια' });
      add({ t: 'game', title: '🎄 ' + v.game3d.title, sub: v.game3d.sub, fn: () => this.onGame?.() });
      if (v.adventures?.length) { add({ t: 'h', text: '🗺️ Περιπέτειες με τον Κιμωλάκη (παίζονται στο VR)' }); v.adventures.forEach((c) => add({ t: 'card', ...c, fn: () => this.go(c.href) })); }
      if (v.games?.length) { add({ t: 'h', text: '🕹️ Μικρά παιχνίδια (παίζονται έξω από το VR)' }); v.games.forEach((c) => add({ t: 'card', ...c, meta: '↗ Άνοιγμα έξω από το VR', fn: () => this.outside(c.href) })); }
    } else if (v.kind === 'adventure') this.buildAdventure(add);
    else if (v.kind === 'outside') {
      add({ t: 'title', text: '↗ ' + v.title }); add({ t: 'p', text: 'Αυτή η σελίδα (π.χ. σύνδεση ή φόρμες) δουλεύει μόνο στην κανονική προβολή. Θα βγεις από το VR και θα ανοίξει εδώ, στην ίδια καρτέλα.' });
      add({ t: 'btn', label: 'Άνοιγμα έξω από το VR', primary: true, fn: () => this.outside(v.outside) }); add({ t: 'btn', label: '← Πίσω', fn: () => this.back() });
    }
    // διάταξη: θέσεις & ύψη
    const c = this.ctx; let y = 24;
    for (const o of it) { o.y = y; o.h = this.measure(c, o); y += o.h + (o.t === 'li' ? 6 : 22); }
    this.items = it; this.contentH = y + 40; this.maxScroll = Math.max(0, this.contentH - (H - HEAD)); this.scroll = Math.min(this.scroll, this.maxScroll); this.dirty = true;
  }
  buildAdventure(add) {
    const v = this.view; this.adv ||= { id: v.scenes?.[0]?.id, steps: 0, msg: '' };
    const s = v.scenes.find((x) => x.id === this.adv.id) || v.scenes[0]; if (!s) return;
    add({ t: 'meta', text: '🗺️ ' + v.title }); add({ t: 'title', text: s.end ? '🏁 ' + (s.endingTitle || 'Τέλος') : s.title || '' });
    for (const para of String(s.text || '').split(/\n\s*\n/)) if (para.trim()) add({ t: 'p', text: para.trim() });
    if (s.end) {
      if (this.adv.msg) add({ t: 'tip', text: this.adv.msg, body: '' });
      add({ t: 'btn', label: '↻ Παίξε ξανά', primary: true, fn: () => { this.adv = { id: v.scenes[0].id, steps: 0, msg: '' }; this.scroll = 0; this.build(); } });
      add({ t: 'btn', label: '← Όλα τα παιχνίδια', fn: () => this.go('/play') });
      if (!this.adv.sent) { this.adv.sent = true; fetch(`/api/play/adventure/${encodeURIComponent(v.slug)}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scene: s.id, finish: true }) })
        .then(async (r) => { const j = await r.json().catch(() => ({})); this.adv.msg = r.ok ? (j.already ? 'Την έχεις ξανατελειώσει — μπράβο!' : `Κέρδισες ${j.xp?.gained ?? v.xp} XP! 🎉`) : r.status === 401 ? 'Συνδέσου στον λογαριασμό σου (έξω από το VR) για να κερδίζεις XP.' : (j.error || ''); this.build(); }).catch(() => {}); }
    } else (s.choices || []).forEach((ch) => add({ t: 'btn', label: '➜ ' + ch.label, primary: true, fn: () => { this.adv.id = ch.to; this.scroll = 0; this.build(); this.g.audio.crunch(0.1); } }));
  }
  measure(c, o) {
    switch (o.t) {
      case 'hero': c.font = F(900, 64); o.l1 = wrap(c, o.title, CW); c.font = F(600, 32); o.l2 = o.text ? wrap(c, o.text, CW) : []; return o.l1.length * 74 + o.l2.length * 44 + 20;
      case 'title': c.font = F(900, 56); o.lines = wrap(c, o.text, CW); return o.lines.length * 66;
      case 'sub': c.font = F(600, 34); o.lines = wrap(c, o.text, CW); return o.lines.length * 46;
      case 'meta': c.font = F(800, 26); o.lines = wrap(c, o.text, CW); return o.lines.length * 34;
      case 'h': case 'h3': c.font = F(900, o.t === 'h' ? 42 : 36); o.lines = wrap(c, o.text, CW); return o.lines.length * 52 + 10;
      case 'p': case 'quote': case 'small': c.font = F(o.t === 'small' ? 600 : 500, o.t === 'small' ? 26 : 32); o.lines = wrapP(c, o.text, CW - (o.t === 'quote' ? 40 : 0)); return o.lines.length * (o.t === 'small' ? 36 : 46);
      case 'li': c.font = F(500, 32); o.lines = wrapP(c, o.text, CW - 50); return o.lines.length * 46;
      case 'step': c.font = F(900, 38); o.lines = wrap(c, o.text, CW - 90); return Math.max(64, o.lines.length * 48);
      case 'tip': case 'warn': { c.font = F(900, 32); o.l1 = wrap(c, (o.t === 'tip' ? '💡 ' : '⚠️ ') + o.text, CW - 60); c.font = F(500, 30); o.l2 = o.body ? wrapP(c, o.body, CW - 60) : []; return o.l1.length * 42 + o.l2.length * 42 + 44; }
      case 'img': { const im = this.image(o.src); return im?.ok ? Math.min(560, CW * im.el.naturalHeight / im.el.naturalWidth) : im?.bad ? 0 : 380; }
      case 'card': { c.font = F(900, o.big ? 40 : 34); o.lt = wrap(c, o.title, CW - (o.img ? 360 : 60)).slice(0, 2); c.font = F(500, 28); o.ls = o.sub ? wrap(c, o.sub, CW - (o.img ? 360 : 60)).slice(0, o.big ? 3 : 2) : []; return Math.max(o.img ? (o.big ? 230 : 190) : 0, 40 + o.lt.length * (o.big ? 48 : 42) + o.ls.length * 36 + (o.meta ? 38 : 0)); }
      case 'game': return 200;
      case 'btn': return 92;
      case 'chips': { c.font = F(800, 28); let x = 0, rows = 1; o.pos = []; for (const ch of o.items) { const w = c.measureText(ch.label).width + 50; if (x + w > CW) { x = 0; rows++; } o.pos.push({ x, row: rows - 1, w }); x += w + 14; } return rows * 70; }
      default: return 0;
    }
  }
  image(src) {
    let im = this.imgs.get(src); if (im) return im;
    im = { el: new Image(), ok: false, bad: false }; this.imgs.set(src, im); im.el.crossOrigin = 'anonymous'; im.el.decoding = 'async';
    im.el.onload = () => { im.ok = true; if (this.open) this.build(); }; im.el.onerror = () => { im.bad = true; if (this.open) this.build(); };
    im.el.src = src; if (this.imgs.size > 60) this.imgs.delete(this.imgs.keys().next().value); return im;
  }

  // ---------- ζωγραφική ----------
  draw() {
    const c = this.ctx; this.dirty = false; this.hits = []; this.head = [];
    c.clearRect(0, 0, W, H); rr(c, 0, 0, W, H, 34, C.bg);
    // περιεχόμενο (με κύλιση)
    c.save(); c.beginPath(); c.rect(0, HEAD, W, H - HEAD); c.clip();
    for (const o of this.items) { const y = HEAD + o.y - this.scroll; if (y > H || y + o.h < HEAD) continue; this.drawItem(c, o, PAD, y); }
    c.restore();
    // μπάρα κύλισης
    if (this.maxScroll > 0) {
      const x = W - SB + 10, top = HEAD + 70, hh = H - HEAD - 150; rr(c, x + 14, top, 22, hh, 11, 'rgba(0,0,0,.08)');
      const th = Math.max(60, hh * (H - HEAD) / this.contentH), ty = top + (hh - th) * (this.scroll / this.maxScroll); rr(c, x + 14, ty, 22, th, 11, '#8a8296');
      this.btn(c, '▲', x, HEAD + 8, 50, 54, () => this.scrollBy(-500), 'sb-up'); this.btn(c, '▼', x, H - 70, 50, 54, () => this.scrollBy(500), 'sb-dn');
    }
    // κεφαλίδα: πλοήγηση + μενού του site
    c.save(); rr(c, 0, 0, W, HEAD, [34, 34, 0, 0], C.head); c.fillStyle = C.red; c.fillRect(0, HEAD - 8, W, 8); c.restore();
    let x = 26;
    x += this.btn(c, '←', x, 18, 70, 64, () => this.back(), 'back', this.hist.length ? null : 'dis') + 12;
    x += this.btn(c, '⌂', x, 18, 70, 64, () => this.go('/'), 'home') + 18;
    c.fillStyle = '#fff'; c.font = F(900, 38); c.textBaseline = 'middle'; c.fillText(clip(c, this.site?.name || 'Όσα δεν γράφει ο πίνακας', 620), x, 50);
    c.font = F(800, 30); const wE = c.measureText('✕ Έξοδος από το VR').width + 56, wG = c.measureText('🎄 Το 3D παιχνίδι').width + 56;
    const ex = W - 26 - wE; this.btn(c, '✕ Έξοδος από το VR', ex, 18, wE, 64, () => this.outside(this.path), 'exit', 'red');
    this.btn(c, '🎄 Το 3D παιχνίδι', ex - 14 - wG, 18, wG, 64, () => this.onGame?.(), 'game', 'gold');
    const nav = this.site?.nav?.length ? this.site.nav : [{ label: 'Αρχική', href: '/' }, { label: 'Άρθρα', href: '/articles' }, { label: 'Τεύχη', href: '/editions' }, { label: 'Παιχνίδια', href: '/play' }];
    const tabs = [...nav, ...(nav.some((n) => n.href === '/help') ? [] : [{ label: '📘 Οδηγοί', href: '/help' }])];
    c.font = F(800, 28); let tx = 26; const cur = this.path.split('?')[0];
    for (const n of tabs) {
      const w = c.measureText(n.label).width + 40; if (tx + w > W - 26) break;
      const on = n.href === '/' ? cur === '/' : cur.startsWith(n.href);
      this.btn(c, n.label, tx, 98, w, 56, () => this.go(n.href), 'nav' + n.href, on ? 'on' : 'tab'); tx += w + 10;
    }
    this.tex.needsUpdate = true;
  }
  btn(c, label, x, y, w, h, fn, id, style) {
    const hov = this.hover === id, dis = style === 'dis';
    const fill = dis ? 'rgba(255,255,255,.1)' : style === 'red' ? (hov ? '#ff3b55' : C.red) : style === 'gold' ? (hov ? '#ffd76e' : '#f6c453') : style === 'on' ? '#fff' : style === 'tab' ? (hov ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.12)') : style === 'primary' ? (hov ? '#ff3b55' : C.red) : (hov ? C.hov : '#fff');
    rr(c, x, y, w, h, Math.min(28, h / 2), fill, hov ? '#f6c453' : null);
    c.fillStyle = dis ? 'rgba(255,255,255,.35)' : style === 'red' || style === 'primary' ? '#fff' : style === 'tab' ? '#fff' : style === 'gold' ? '#2a0f14' : C.ink;
    c.font = F(800, h > 60 ? 30 : 28); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + w / 2, y + h / 2 + 1); c.textAlign = 'left';
    if (!dis) this.head.push({ x, y, w, h, fn, id }); return w;
  }
  drawItem(c, o, x, y) {
    c.textBaseline = 'top'; c.textAlign = 'left';
    const hit = (fn, id, hx = x, hy = y, hw = CW, hh = o.h) => { if (hy + hh > HEAD && hy < H) this.hits.push({ x: hx, y: Math.max(HEAD, hy), w: hw, h: Math.min(H, hy + hh) - Math.max(HEAD, hy), fn, id }); };
    const lines = (ls, font, color, lx, ly, lh) => { c.font = font; c.fillStyle = color; ls.forEach((l, i) => c.fillText(l, lx, ly + i * lh)); };
    switch (o.t) {
      case 'hero': lines(o.l1, F(900, 64), C.ink, x, y, 74); lines(o.l2, F(600, 32), C.mut, x, y + o.l1.length * 74 + 10, 44); break;
      case 'title': lines(o.lines, F(900, 56), C.ink, x, y, 66); break;
      case 'sub': lines(o.lines, F(600, 34), C.mut, x, y, 46); break;
      case 'meta': lines(o.lines, F(800, 26), C.gold, x, y, 34); break;
      case 'h': case 'h3': lines(o.lines, F(900, o.t === 'h' ? 42 : 36), C.head, x, y + 6, 52); break;
      case 'p': lines(o.lines, F(500, 32), C.ink, x, y, 46); break;
      case 'small': lines(o.lines, F(600, 26), C.mut, x, y, 36); break;
      case 'quote': c.fillStyle = C.teal; c.fillRect(x, y, 8, o.h); lines(o.lines, F(500, 32), '#3a3546', x + 40, y, 46); break;
      case 'li': c.fillStyle = C.red; c.beginPath(); c.arc(x + 16, y + 22, 7, 0, Math.PI * 2); c.fill(); lines(o.lines, F(500, 32), C.ink, x + 50, y, 46); break;
      case 'step': c.fillStyle = C.teal; c.beginPath(); c.arc(x + 30, y + 30, 30, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = F(900, 32); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(o.n), x + 30, y + 31); c.textAlign = 'left'; c.textBaseline = 'top'; lines(o.lines, F(900, 38), C.ink, x + 90, y + 8, 48); break;
      case 'tip': case 'warn': rr(c, x, y, CW, o.h, 22, o.t === 'tip' ? '#e9f8ef' : '#fff3e2', o.t === 'tip' ? '#2f9e5b' : '#e08a00'); lines(o.l1, F(900, 32), o.t === 'tip' ? '#123d24' : '#4a2d00', x + 30, y + 22, 42); lines(o.l2, F(500, 30), '#2d2a33', x + 30, y + 22 + o.l1.length * 42, 42); break;
      case 'img': { const im = this.image(o.src); if (im.ok) { const w = Math.min(CW, o.h * im.el.naturalWidth / im.el.naturalHeight); c.save(); rr(c, x, y, w, o.h, 20); c.clip(); c.drawImage(im.el, x, y, w, o.h); c.restore(); } else if (!im.bad) { rr(c, x, y, CW, o.h, 20, '#ece6d6'); c.fillStyle = C.mut; c.font = F(700, 30); c.fillText('🖼️ φόρτωση εικόνας…', x + 30, y + 30); } break; }
      case 'card': {
        const id = 'c' + o.y, hov = this.hover === id; rr(c, x, y, CW, o.h, 24, hov ? C.hov : C.card, hov ? '#f6c453' : 'rgba(0,0,0,.12)');
        let tx = x + 30;
        if (o.img) { const im = this.image(o.img), iw = 300, ih = o.h - 30; c.save(); rr(c, x + 15, y + 15, iw, ih, 18); c.clip(); if (im.ok) { const s = Math.max(iw / im.el.naturalWidth, ih / im.el.naturalHeight), dw = im.el.naturalWidth * s, dh = im.el.naturalHeight * s; c.drawImage(im.el, x + 15 + (iw - dw) / 2, y + 15 + (ih - dh) / 2, dw, dh); } else { c.fillStyle = '#ece6d6'; c.fillRect(x + 15, y + 15, iw, ih); } c.restore(); tx = x + 340; }
        let ty = y + 22; if (o.meta) { lines([clip(c, o.meta, CW - (tx - x) - 30)], F(800, 24), C.gold, tx, ty, 30); ty += 38; }
        lines(o.lt, F(900, o.big ? 40 : 34), C.ink, tx, ty, o.big ? 48 : 42); ty += o.lt.length * (o.big ? 48 : 42) + 4; lines(o.ls, F(500, 28), C.mut, tx, ty, 36);
        c.fillStyle = C.red; c.font = F(900, 40); c.textBaseline = 'middle'; c.fillText('›', x + CW - 40, y + o.h / 2); hit(o.fn, id); break;
      }
      case 'game': {
        const id = 'g' + o.y, hov = this.hover === id, gr = c.createLinearGradient(x, y, x + CW, y + o.h); gr.addColorStop(0, '#0b1026'); gr.addColorStop(0.6, '#1f4a8a'); gr.addColorStop(1, '#8a1530');
        rr(c, x, y, CW, o.h, 28, gr, hov ? '#f6c453' : '#2a2a3a'); c.fillStyle = '#fff'; c.font = F(900, 46); c.fillText(o.title, x + 40, y + 36); c.font = F(600, 30); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText(clip(c, o.sub, CW - 420), x + 40, y + 104);
        rr(c, x + CW - 340, y + 60, 300, 80, 40, hov ? '#ffd76e' : '#f6c453'); c.fillStyle = '#2a0f14'; c.font = F(900, 32); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('▶ Παίξε τώρα', x + CW - 190, y + 101); c.textAlign = 'left'; hit(o.fn, id); break;
      }
      case 'btn': { const id = 'b' + o.y, hov = this.hover === id; c.font = F(800, 32); const w = Math.min(CW, c.measureText(o.label).width + 90); rr(c, x, y + 6, w, 80, 40, o.primary ? (hov ? '#ff3b55' : C.red) : hov ? C.hov : '#fff', hov ? '#f6c453' : o.primary ? null : 'rgba(0,0,0,.2)'); c.fillStyle = o.primary ? '#fff' : C.ink; c.textBaseline = 'middle'; c.fillText(o.label, x + 45, y + 47); hit(o.fn, id, x, y + 6, w, 80); break; }
      case 'chips': o.items.forEach((ch, i) => { const p = o.pos[i], cx = x + p.x, cy = y + p.row * 70, id = 'ch' + o.y + '_' + i, hov = this.hover === id; rr(c, cx, cy, p.w, 56, 28, ch.on ? C.ink : hov ? C.hov : '#fff', ch.color || 'rgba(0,0,0,.2)'); c.fillStyle = ch.on ? '#fff' : C.ink; c.font = F(800, 28); c.textBaseline = 'middle'; c.fillText(ch.label, cx + 25, cy + 29); hit(ch.fn, id, cx, cy, p.w, 56); }); break;
    }
  }
  scrollBy(d) { this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll + d)); this.dirty = true; }

  // ---------- κάθε καρέ ----------
  update(dt) {
    if (!this.open || !this.g.inVR) return;
    if (this.place > 0) { this.place--; if (this.place === 0) { if (!this.placeNow()) this.place = 1; } if (!this.group.visible) return; }
    else { const h = yawOf(this.g.camera); let d = h - this.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > 0.8 || this.following) { this.following = Math.abs(d) > 0.05; this.placeNow(true); } }
    const vr = this.g.vr, st = vr.state;
    // κύλιση με όποιον μοχλό (πάνω/κάτω)
    const sy = Math.abs(st.ry) > Math.abs(st.ly) ? st.ry : st.ly; if (Math.abs(sy) > 0.2) this.scrollBy(sy * dt * 1500);
    let hover = null, hitPt = null, best = null;
    vr.hands.forEach((hd, i) => {
      const r = this.rays[i], o = new THREE.Vector3(), q = new THREE.Quaternion(); hd.ctl.getWorldPosition(o); hd.ctl.getWorldQuaternion(q);
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q); this.rc.set(o, dir); const x = this.rc.intersectObject(this.panel, false)[0];
      r.geometry.setFromPoints([o, x ? x.point : o.clone().addScaledVector(dir, 3)]); r.visible = true;
      if (x?.uv) { const px = x.uv.x * W, py = (1 - x.uv.y) * H; const h = [...this.head, ...this.hits].find((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h); if (h || !hitPt) { hitPt = x.point; if (h) { hover = h.id; best = { h, i }; } } }
    });
    if (hitPt) { this.dot.visible = true; this.dot.position.copy(this.panel.worldToLocal(hitPt.clone())); this.dot.position.z = 0.004; } else this.dot.visible = false;
    if (hover !== this.hover) { this.hover = hover; this.dirty = true; if (hover) { this.g.audio.crunch(0.04); for (const s of vr.session.inputSources) s.gamepad?.hapticActuators?.[0]?.pulse?.(0.2, 20); } }
    if (best && (vr.edge('trigger', best.i) || vr.edge('a') || vr.edge('x'))) { this.g.audio.play('../../audio/sfx/click.mp3', { vol: 0.5 }); const fn = best.h.fn; this.hover = null; Promise.resolve().then(fn).catch((e) => console.error(e)); }
    if (vr.edge('b') || vr.edge('y')) this.back();
    if (this.dirty) this.draw();
  }
  placeNow(smooth = false) {
    const cam = this.g.camera, head = cam.position; if (!(head.y > 0.2 && head.y < 3)) return false;
    const h = yawOf(cam), want = new THREE.Vector3(head.x - Math.sin(h) * 1.9, head.y - 0.05, head.z - Math.cos(h) * 1.9);
    if (smooth) { this.group.position.lerp(want, 0.06); let d = h - this.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.group.rotation.y += d * 0.06; }
    else { this.group.position.copy(want); this.group.rotation.set(0, h, 0); }
    this.group.visible = true; return true;
  }
}

const yawOf = (cam) => new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ').y;
function rr(c, x, y, w, h, r, fill, stroke) { c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = 4; c.strokeStyle = stroke; c.stroke(); } }
function wrap(c, text, max) { const out = []; let line = ''; for (const w of String(text || '').split(/\s+/)) { if (!w) continue; const t = line ? line + ' ' + w : w; if (c.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out.length ? out : ['']; }
const wrapP = (c, text, max) => String(text || '').split('\n').flatMap((l) => wrap(c, l, max));
function clip(c, s, max) { s = String(s || ''); if (c.measureText(s).width <= max) return s; while (s.length > 1 && c.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; }
function radial() { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, 'rgba(255,220,150,.5)'); g.addColorStop(1, 'rgba(255,220,150,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
