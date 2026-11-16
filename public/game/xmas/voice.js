// Φωνές (ElevenLabs): κάθε ατάκα έχει ένα έτοιμο mp3 στο voice/<hash>.mp3.
// Τα αρχεία φτιάχνονται ΜΙΑ φορά στον υπολογιστή σου με το scripts/tts-voices.mjs — εδώ δεν υπάρχει κανένα κλειδί API.
// Οι φωνές ακούγονται σε 3D από τη θέση του χαρακτήρα που μιλάει, και η μουσική χαμηλώνει όσο μιλάνε.

/** Ίδιος αλγόριθμος με το script (FNV-1a 32-bit) ώστε η ατάκα να βρίσκει το αρχείο της. */
export function vhash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
/** Ποιος μιλάει: k-m/k-f (ο παίκτης, ανάλογα με το φύλο), m, n, s, e, mom, x (αφηγητής). */
export function speakerOf(line, gender) { if (!line.who) return line.c === 'mom' ? 'mom' : 'x'; const c = line.c || 'k'; return c === 'k' ? `k-${gender === 'f' ? 'f' : 'm'}` : c; }

const BASE = new URL('./voice/', import.meta.url).href;

export class Voices {
  constructor(g) {
    this.g = g; this.have = new Set(); this.cur = null; this.token = 0; this.cache = new Map();
    this.ready = fetch(BASE + 'manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((m) => { if (m?.lines) this.have = new Set(m.lines); }).catch(() => {});
  }
  hashOf(l) { return vhash(speakerOf(l, this.g.gender) + '|' + l.text); }
  /** Φορτώνει από πριν τις φωνές των επόμενων ατακών, ώστε να ξεκινούν αμέσως. Κρατάει λίγες στη μνήμη (σημαντικό για το Quest). */
  async preload(lines) {
    await this.ready; const c = this.g.audio.ensure(); if (!c) return;
    for (const l of lines) {
      if (!l?.text) continue; const h = this.hashOf(l); if (!this.have.has(h) || this.cache.has(h)) continue;
      this.cache.set(h, fetch(BASE + h + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? c.decodeAudioData(b) : null)).catch(() => null));
      while (this.cache.size > 14) this.cache.delete(this.cache.keys().next().value);
    }
  }
  get busy() { return !!this.cur && !this.cur.ended; }
  /** Παίζει τη φωνή μιας ατάκας (αν υπάρχει). Καλείται από το UI κάθε φορά που αλλάζει ατάκα. */
  async line(l) {
    this.stop(); const tk = ++this.token;
    await this.ready; if (tk !== this.token) return;   // η πρώτη ατάκα μπορεί να έρθει πριν φορτώσει η λίστα
    const a = this.g.audio, sp = speakerOf(l, this.g.gender), h = vhash(sp + '|' + l.text);
    this.preload(this.g.ui.queue.slice(0, 3));
    if (!this.have.has(h) || (a.vol.voice ?? 1) <= 0) return;
    const c = a.ensure(); if (!c) return; if (!this.cache.has(h)) await this.preload([l]); const buf = await this.cache.get(h); this.cache.delete(h); if (!buf || tk !== this.token) return;
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = 1.15; s.connect(g);
    const npc = this.g.npcs?.find((n) => n.voice === sp && n.a);
    let pan = null;
    if (npc) {
      // 3D: HRTF από τη θέση του χαρακτήρα + λίγο «στεγνό» σήμα ώστε να ακούγεται πάντα καθαρά
      pan = c.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 3.5; pan.rolloffFactor = 0.7;
      const dry = c.createGain(); dry.gain.value = 0.22; g.connect(pan); pan.connect(a.vBus); g.connect(dry); dry.connect(a.vBus);
    } else g.connect(a.vBus);   // αφηγητής, μαμά, εσύ: «μέσα στο κεφάλι»
    const cur = (this.cur = { s, g, pan, npc, ended: false }); s.onended = () => { cur.ended = true; if (this.cur === cur) this.unduck(); };
    this.update(); s.start(); this.duck();
  }
  stop() { const c = this.cur; if (!c) return; this.cur = null; this.token++; const ctx = this.g.audio.ctx; try { c.g.gain.setTargetAtTime(0, ctx.currentTime, 0.04); c.s.stop(ctx.currentTime + 0.15); } catch {} this.unduck(); }
  duck() { const a = this.g.audio; if (a.mBus) a.mBus.gain.setTargetAtTime(a.vol.music * 0.45, a.ctx.currentTime, 0.15); }
  unduck() { const a = this.g.audio; if (a.mBus) a.mBus.gain.setTargetAtTime(a.vol.music, a.ctx.currentTime, 0.5); }
  /** Κάθε καρέ: η φωνή ακολουθεί τον χαρακτήρα καθώς κινείται. */
  update() {
    const c = this.cur; if (!c?.pan || !c.npc?.a) return; const p = c.npc.a.root.position, h = (c.npc.a.height || 1.3) * 0.9;
    c.pan.positionX.value = p.x; c.pan.positionY.value = p.y + h; c.pan.positionZ.value = p.z;
  }
}
