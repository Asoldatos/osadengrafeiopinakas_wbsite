let ctx;
export const soundOn = () => typeof window !== 'undefined' && localStorage.getItem('snd') === '1';
export function setSound(v) { try { localStorage.setItem('snd', v ? '1' : '0'); } catch {} }
export function blip(freq = 660, ms = 90) {
  if (!soundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq; g.gain.value = 0.04;
    o.connect(g); g.connect(ctx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000); o.stop(ctx.currentTime + ms / 1000);
  } catch {}
}
