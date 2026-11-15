'use client';
// Κεντρική μηχανή ήχου (Web Audio): μουσική με ακριβή σημεία βρόχου, ηχητικά εφέ με χρονοπρογραμματισμό συγχρονισμένο με τις κινήσεις,
// ήχοι διεπαφής (κλικ, γύρισμα σελίδας) και κουδουνάκια. Σέβεται τους περιορισμούς αυτόματης αναπαραγωγής: ο ήχος ξεκινά μόνο μετά από αλληλεπίδραση.
const MUTE_KEY = 'snd:muted', VOL_KEY = 'snd:vol';
const read = (s, k, d) => { try { const v = s?.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const write = (s, k, v) => { try { s?.setItem(k, JSON.stringify(v)); } catch {} };

class Engine {
  constructor() {
    this.ctx = null; this.buffers = new Map(); this.slots = new Map(); this.music = null; this.pendingMusic = null; this.listeners = new Set(); this.lastUi = new Map();
    // Ο ήχος είναι ΕΝΕΡΓΟΣ από προεπιλογή και η σίγαση μηδενίζεται σε κάθε νέα επίσκεψη (sessionStorage). Οι εντάσεις θυμούνται (localStorage).
    this.muted = typeof window !== 'undefined' ? read(window.sessionStorage, MUTE_KEY, false) : false;
    this.vol = { master: 0.8, music: 0.6, sfx: 0.85, ui: 0.55, ...(typeof window !== 'undefined' ? read(window.localStorage, VOL_KEY, {}) : {}) };
    if (typeof window !== 'undefined') {
      const unlock = () => this.unlock();
      ['pointerdown', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
      document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend?.().catch(() => {}); else if (this.ctx.state === 'suspended' && this.wasRunning) this.ctx.resume?.().catch(() => {}); });
    }
  }
  ensure() {
    if (this.ctx || typeof window === 'undefined') return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const c = (this.ctx = new AC({ latencyHint: 'interactive' }));
    this.master = c.createGain(); this.master.connect(c.destination);
    // Ήπιος συμπιεστής στην έξοδο: αποτρέπει απότομες εξάρσεις έντασης όταν παίζουν μαζί μουσική και εφέ.
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.25;
    this.master.disconnect(); this.master.connect(comp); comp.connect(c.destination);
    this.bus = {}; for (const k of ['music', 'sfx', 'ui']) { const g = c.createGain(); g.gain.value = this.vol[k]; g.connect(this.master); this.bus[k] = g; }
    this.master.gain.value = this.muted ? 0 : this.vol.master;
    return c;
  }
  get running() { return this.ctx?.state === 'running'; }
  async unlock() {
    const c = this.ensure(); if (!c) return false;
    if (c.state !== 'running') { try { await c.resume(); } catch {} }
    this.wasRunning = c.state === 'running';
    if (this.wasRunning && this.pendingMusic) { const p = this.pendingMusic; this.pendingMusic = null; this.startMusic(p.spec, p.opts); }
    this.emit(); return this.wasRunning;
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const f of this.listeners) try { f(this.state()); } catch {} }
  state() { return { muted: this.muted, vol: { ...this.vol }, running: this.running, musicOn: !!this.music, musicPending: !!this.pendingMusic }; }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  setMuted(m) {
    this.muted = !!m; write(window.sessionStorage, MUTE_KEY, this.muted);
    if (this.ctx) { const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05); }
    if (!this.muted) this.unlock();
    this.emit();
  }
  setVolume(k, v) {
    this.vol[k] = Math.min(1, Math.max(0, +v)); write(window.localStorage, VOL_KEY, this.vol);
    if (this.ctx) { const t = this.ctx.currentTime, g = k === 'master' ? this.master : this.bus[k]; if (g && !(k === 'master' && this.muted)) g.gain.setTargetAtTime(this.vol[k], t, 0.04); }
    this.emit();
  }
  load(url) {
    if (!url) return Promise.resolve(null);
    if (this.buffers.has(url)) return this.buffers.get(url);
    const p = (async () => {
      const c = this.ensure(); if (!c) return null;
      const r = await fetch(url, { cache: 'force-cache' }); if (!r.ok) throw new Error('audio ' + r.status);
      const ab = await r.arrayBuffer();
      return await new Promise((res, rej) => { const out = c.decodeAudioData(ab, res, rej); if (out?.then) out.then(res, rej); });
    })().catch((e) => { console.warn('Ήχος:', url, e.message); this.buffers.delete(url); return null; });
    this.buffers.set(url, p); return p;
  }
  /** Παίζει τμήμα [startMs, endMs) ενός αρχείου τη στιγμή `when` (χρόνος AudioContext), με μικρά fade για να μην «κλικάρει».
   *  slot: όνομα καναλιού — νέος ήχος στο ίδιο κανάλι σταματά ομαλά τον προηγούμενο (χωρίς επικαλύψεις). */
  async play(spec, { when = 0, slot, bus = 'sfx' } = {}) {
    if (!spec?.url) return null;
    const c = this.ensure(); if (!c) return null;
    const buf = await this.load(spec.url); if (!buf) return null;
    const off = Math.max(0, (spec.startMs || 0) / 1000), end = spec.endMs > spec.startMs ? Math.min(buf.duration, spec.endMs / 1000) : buf.duration, dur = Math.max(0.02, end - off);
    const at = Math.max(c.currentTime + 0.005, when || 0), src = c.createBufferSource(), g = c.createGain(), v = spec.volume ?? 1, fi = off > 0 ? 0.012 : 0.002, fo = Math.min(0.06, dur / 4);
    src.buffer = buf; src.connect(g); g.connect(this.bus[bus] || this.bus.sfx);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(v, at + fi); g.gain.setValueAtTime(v, at + dur - fo); g.gain.linearRampToValueAtTime(0, at + dur);
    if (slot) { const prev = this.slots.get(slot); if (prev) this.fadeStop(prev, at); this.slots.set(slot, { src, g }); src.onended = () => { if (this.slots.get(slot)?.src === src) this.slots.delete(slot); }; }
    src.start(at, off, dur); return { src, g };
  }
  fadeStop(h, at = 0) { try { const t = Math.max(this.ctx.currentTime, at); h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0, t, 0.02); h.src.stop(t + 0.12); } catch {} }
  stopSlots() { for (const [k, h] of this.slots) { this.fadeStop(h); this.slots.delete(k); } }
  /** Μουσική με βρόχο: παίζει από την αρχή μία φορά και μετά επαναλαμβάνει ΑΚΡΙΒΩΣ το τμήμα [loopStartMs, loopEndMs) για πάντα (ακρίβεια δείγματος). */
  async startMusic(spec, { when = 0, fadeInMs } = {}) {
    if (!spec?.url) return;
    if (!this.running) { this.pendingMusic = { spec, opts: { fadeInMs } }; this.ensure(); this.emit(); return; }
    if (this.music?.url === spec.url) return;
    this.stopMusic(400);
    const c = this.ctx, buf = await this.load(spec.url); if (!buf) return;
    const src = c.createBufferSource(), g = c.createGain(), at = Math.max(c.currentTime + 0.02, when || 0), v = spec.volume ?? 0.6, fade = (fadeInMs ?? spec.fadeInMs ?? 2000) / 1000;
    src.buffer = buf; src.loop = true;
    if (spec.loopEndMs > spec.loopStartMs && spec.loopEndMs / 1000 <= buf.duration + 0.05) { src.loopStart = spec.loopStartMs / 1000; src.loopEnd = Math.min(buf.duration, spec.loopEndMs / 1000); }
    src.connect(g); g.connect(this.bus.music);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + Math.max(0.05, fade));
    src.start(at, 0);
    this.music = { src, g, url: spec.url, startedAt: at, spec }; this.pendingMusic = null; this.emit();
  }
  stopMusic(fadeMs = 900) {
    this.pendingMusic = null;
    const m = this.music; this.music = null;
    if (m && this.ctx) { const t = this.ctx.currentTime; try { m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(0.0001, t + fadeMs / 1000); m.src.stop(t + fadeMs / 1000 + 0.05); } catch {} }
    this.emit();
  }
  /** Δοκιμή ραφής βρόχου (για τον διαχειριστή): ξεκινά λίγο πριν το τέλος του βρόχου ώστε να ακουστεί η μετάβαση στην αρχή του. */
  async testLoop(spec, leadMs = 4000) {
    await this.unlock(); this.stopMusic(200);
    const c = this.ctx, buf = await this.load(spec.url); if (!buf) return null;
    const src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; src.loop = true;
    src.loopStart = spec.loopStartMs / 1000; src.loopEnd = Math.min(buf.duration, spec.loopEndMs / 1000);
    src.connect(g); g.connect(this.bus.music); g.gain.value = spec.volume ?? 0.6;
    const at = c.currentTime + 0.05; src.start(at, Math.max(0, src.loopEnd - leadMs / 1000));
    this.music = { src, g, url: spec.url + '#test', startedAt: at, spec }; this.emit();
    return { seamAt: Date.now() + leadMs + 50, duration: buf.duration };
  }
  /** Ήχοι διεπαφής (δείγματα, όχι 8-bit): click, pop, success, sparkle, jingle, flip1..3. */
  ui(name, { volume = 1, minGapMs = 45 } = {}) {
    if (this.muted) return;
    const now = performance.now(); if (now - (this.lastUi.get(name) || 0) < minGapMs) return; this.lastUi.set(name, now);
    if (!this.running) { this.unlock(); if (!this.running) return; }
    this.play({ url: `/audio/sfx/${name}.mp3`, volume }, { bus: 'ui' });
  }
  flip() { this.ui('flip' + (1 + Math.floor(Math.random() * 3)), { volume: 0.9, minGapMs: 90 }); }
  /** Κουδουνάκι συντεθειμένο σε πραγματικό χρόνο (προσθετική σύνθεση με τα μερικά μιας μεταλλικής καμπάνας). */
  bell(freq, volume = 0.5) {
    if (this.muted || !this.running) { this.unlock(); if (!this.running || this.muted) return; }
    const c = this.ctx, t = c.currentTime + 0.005, out = c.createGain(); out.gain.value = volume; out.connect(this.bus.ui);
    for (const [r, a, d] of [[1, 1, 1.4], [2.0, 0.45, 0.9], [2.76, 0.32, 0.6], [4.07, 0.18, 0.4], [5.4, 0.1, 0.25]]) {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = freq * r * (1 + (Math.random() - 0.5) * 0.004);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
    }
  }
}
let E = null;
export const audio = () => (E ||= new Engine());
