// Βοηθητικά για εικόνες/βίντεο. Οι ρυθμίσεις ενός βίντεο αποθηκεύονται μέσα στη διεύθυνση, μετά το «#»,
// ώστε να λειτουργεί παντού όπου υπάρχει πεδίο εικόνας: https://…/video.mp4#vo=1&c=1&a=0&l=0&m=0&f=cover&p=<poster>
const VID = /\.(mp4|webm|ogv|ogg|mov|m4v)$/i;
export function splitUrl(src) {
  const s = String(src || ''); const i = s.indexOf('#');
  return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
}
export const stripHash = (src) => splitUrl(src)[0];
export function isVideoUrl(src) { return VID.test(stripHash(src).split('?')[0]); }
export const DEFAULT_VOPTS = { controls: true, autoplay: false, loop: false, muted: false, fit: 'cover', poster: '' };
export function parseVideo(src) {
  const [url, h] = splitUrl(src); const p = new URLSearchParams(h);
  if (p.get('vo') !== '1') return { url, ...DEFAULT_VOPTS };
  return { url, controls: p.get('c') === '1', autoplay: p.get('a') === '1', loop: p.get('l') === '1', muted: p.get('m') === '1', fit: p.get('f') === 'contain' ? 'contain' : 'cover', poster: p.get('p') || '' };
}
export function buildVideoUrl(url, o) {
  const p = new URLSearchParams();
  p.set('vo', '1'); p.set('c', o.controls ? '1' : '0'); p.set('a', o.autoplay ? '1' : '0'); p.set('l', o.loop ? '1' : '0');
  p.set('m', o.muted || o.autoplay ? '1' : '0'); p.set('f', o.fit === 'contain' ? 'contain' : 'cover'); if (o.poster) p.set('p', o.poster);
  return stripHash(url) + '#' + p.toString();
}
// Για μεταδεδομένα (Open Graph, favicon): επιστρέφει τη διεύθυνση μόνο αν είναι εικόνα.
export const imageOnly = (src) => (src && !isVideoUrl(src) ? src : undefined);
