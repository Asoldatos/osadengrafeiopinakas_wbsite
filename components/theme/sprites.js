'use client';
// Σχήματα σωματιδίων (προ-σχεδιασμένα σε offscreen canvas για ταχύτητα). Κάθε εποχιακό θέμα διαλέγει ένα σετ.
const INK = '#2A0F14';
const mk = (s, fn) => { const c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; fn(x, s); return c; };
const star5 = (x, cx, cy, R, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; x.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } x.closePath(); };
const DRAW = {
  candycane: (x, s) => { const p = () => { x.beginPath(); x.moveTo(s * 0.42, s * 0.92); x.lineTo(s * 0.42, s * 0.38); x.arc(s * 0.58, s * 0.38, s * 0.16, Math.PI, 0); x.lineTo(s * 0.74, s * 0.5); };
    p(); x.strokeStyle = INK; x.lineWidth = s * 0.2; x.stroke(); p(); x.strokeStyle = '#fff'; x.lineWidth = s * 0.14; x.stroke(); p(); x.setLineDash([s * 0.09, s * 0.09]); x.strokeStyle = '#C8102E'; x.stroke(); },
  candy: (x, s) => { x.fillStyle = '#C8102E'; x.strokeStyle = INK; x.lineWidth = s * 0.04;
    for (const d of [-1, 1]) { x.beginPath(); x.moveTo(s / 2 + d * s * 0.2, s / 2); x.lineTo(s / 2 + d * s * 0.46, s * 0.3); x.lineTo(s / 2 + d * s * 0.46, s * 0.7); x.closePath(); x.fill(); x.stroke(); }
    x.beginPath(); x.ellipse(s / 2, s / 2, s * 0.24, s * 0.2, 0, 0, 7); x.fillStyle = '#fff'; x.fill(); x.stroke();
    x.save(); x.clip(); x.strokeStyle = '#C8102E'; x.lineWidth = s * 0.06; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(s / 2 + i * s * 0.1 - s * 0.2, s * 0.25); x.lineTo(s / 2 + i * s * 0.1 + s * 0.2, s * 0.75); x.stroke(); } x.restore(); },
  ornament: (x, s, col = '#C8102E') => { const g = x.createRadialGradient(s * 0.4, s * 0.48, s * 0.04, s / 2, s * 0.58, s * 0.34); g.addColorStop(0, '#fff'); g.addColorStop(0.25, col); g.addColorStop(1, '#3a0610');
    x.beginPath(); x.arc(s / 2, s * 0.58, s * 0.32, 0, 7); x.fillStyle = g; x.fill(); x.lineWidth = s * 0.04; x.strokeStyle = INK; x.stroke();
    x.fillStyle = '#F6C453'; x.fillRect(s * 0.4, s * 0.16, s * 0.2, s * 0.12); x.strokeRect(s * 0.4, s * 0.16, s * 0.2, s * 0.12);
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = s * 0.05; x.beginPath(); x.arc(s / 2, s * 0.58, s * 0.22, Math.PI * 1.1, Math.PI * 1.45); x.stroke(); },
  ornamentGreen: (x, s) => DRAW.ornament(x, s, '#0F7B4B'), ornamentGold: (x, s) => DRAW.ornament(x, s, '#E2A512'),
  star: (x, s) => { star5(x, s / 2, s / 2, s * 0.44, s * 0.19); x.fillStyle = '#F6C453'; x.fill(); x.lineWidth = s * 0.05; x.strokeStyle = INK; x.stroke(); star5(x, s * 0.47, s * 0.47, s * 0.2, s * 0.08); x.fillStyle = 'rgba(255,255,255,.55)'; x.fill(); },
  gift: (x, s) => { x.lineWidth = s * 0.045; x.strokeStyle = INK; x.fillStyle = '#0F7B4B'; x.fillRect(s * 0.16, s * 0.34, s * 0.68, s * 0.54); x.strokeRect(s * 0.16, s * 0.34, s * 0.68, s * 0.54);
    x.fillStyle = '#C8102E'; x.fillRect(s * 0.44, s * 0.34, s * 0.12, s * 0.54); x.fillRect(s * 0.16, s * 0.5, s * 0.68, s * 0.1);
    for (const d of [-1, 1]) { x.beginPath(); x.ellipse(s / 2 + d * s * 0.12, s * 0.26, s * 0.13, s * 0.08, d * 0.5, 0, 7); x.fillStyle = '#C8102E'; x.fill(); x.stroke(); } },
  snowflake: (x, s) => { x.translate(s / 2, s / 2); x.strokeStyle = '#fff'; x.lineWidth = s * 0.07; x.shadowColor = 'rgba(120,170,220,.8)'; x.shadowBlur = s * 0.06;
    for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -s * 0.42); x.moveTo(0, -s * 0.26); x.lineTo(-s * 0.1, -s * 0.34); x.moveTo(0, -s * 0.26); x.lineTo(s * 0.1, -s * 0.34); x.stroke(); } },
  sparkle: (x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.25, 'rgba(255,230,150,.65)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(s / 2, 0); x.quadraticCurveTo(s * 0.54, s * 0.46, s, s / 2); x.quadraticCurveTo(s * 0.54, s * 0.54, s / 2, s); x.quadraticCurveTo(s * 0.46, s * 0.54, 0, s / 2); x.quadraticCurveTo(s * 0.46, s * 0.46, s / 2, 0); x.fill(); },
  conf1: (x, s) => { x.fillStyle = '#C8102E'; x.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7); }, conf2: (x, s) => { x.fillStyle = '#F6C453'; x.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7); },
  conf3: (x, s) => { x.fillStyle = '#0F7B4B'; x.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7); }, conf4: (x, s) => { x.fillStyle = '#fff'; x.fillRect(s * 0.3, s * 0.15, s * 0.4, s * 0.7); },
  heart: (x, s) => { x.beginPath(); x.moveTo(s / 2, s * 0.85); x.bezierCurveTo(s * 0.05, s * 0.5, s * 0.15, s * 0.12, s / 2, s * 0.32); x.bezierCurveTo(s * 0.85, s * 0.12, s * 0.95, s * 0.5, s / 2, s * 0.85); x.fillStyle = '#E8365D'; x.fill(); x.lineWidth = s * 0.05; x.strokeStyle = INK; x.stroke(); },
  leaf: (x, s) => { x.beginPath(); x.moveTo(s * 0.15, s * 0.85); x.quadraticCurveTo(s * 0.1, s * 0.15, s * 0.85, s * 0.15); x.quadraticCurveTo(s * 0.85, s * 0.85, s * 0.15, s * 0.85); x.fillStyle = '#E07A1F'; x.fill(); x.lineWidth = s * 0.05; x.strokeStyle = INK; x.stroke(); },
  flower: (x, s) => { x.fillStyle = '#F5A3C7'; x.strokeStyle = INK; x.lineWidth = s * 0.04; for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5; x.beginPath(); x.arc(s / 2 + Math.cos(a) * s * 0.2, s / 2 + Math.sin(a) * s * 0.2, s * 0.16, 0, 7); x.fill(); x.stroke(); } x.beginPath(); x.arc(s / 2, s / 2, s * 0.12, 0, 7); x.fillStyle = '#F6C453'; x.fill(); x.stroke(); },
};
export const SETS = {
  christmas: ['candycane', 'candycane', 'candy', 'candy', 'ornament', 'ornamentGreen', 'ornamentGold', 'star', 'gift', 'snowflake'],
  confetti: ['conf1', 'conf2', 'conf3', 'conf4'], hearts: ['heart'], leaves: ['leaf'], flowers: ['flower'],
};
export const CONFETTI = ['conf1', 'conf2', 'conf3', 'conf4', 'star'];
const cache = new Map();
export function sprite(name, size = 96) { const k = name + size; if (!cache.has(k)) cache.set(k, mk(size, (x, s) => (DRAW[name] || DRAW.star)(x, s))); return cache.get(k); }
