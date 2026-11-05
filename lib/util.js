export const cx = (...a) => a.filter(Boolean).join(' ');
export const plain = (x) => JSON.parse(JSON.stringify(x ?? null));
export function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  return x.toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Athens' });
}
const GR = { α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o' };
export function slugify(s) {
  const t = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[α-ω]/g, (c) => GR[c] ?? c).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return t || 'item-' + Date.now().toString(36);
}
export function safeUrl(u) {
  if (!u) return '#';
  u = String(u).trim();
  if (u.startsWith('/') || u.startsWith('#')) return u;
  return /^(https?:|mailto:|tel:)/i.test(u) ? u : '#';
}
export function toEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: 'video', src: url };
  return null;
}
export const lines = (v) => (Array.isArray(v) ? v : []).join('\n');
export const parseLines = (t) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
