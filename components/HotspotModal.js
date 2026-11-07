'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toEmbed, safeUrl } from '@/lib/util';
import Media from './Media';

export const HOTSPOT_TYPES = {
  link: { label: 'Εξωτερικός σύνδεσμος', icon: '🔗' }, article: { label: 'Άρθρο του ιστοτόπου', icon: '📰' },
  video: { label: 'Βίντεο', icon: '▶️' }, audio: { label: 'Ήχος', icon: '🎧' }, gallery: { label: 'Συλλογή εικόνων', icon: '🖼️' },
  text: { label: 'Επιπλέον κείμενο', icon: '💬' }, game: { label: 'Παιχνίδι', icon: '🎮' }, custom: { label: 'Προσαρμοσμένο περιεχόμενο', icon: '🧩' },
};
export const hotspotIcon = (h) => h.icon || HOTSPOT_TYPES[h.type]?.icon || '✨';

export function HotspotContent({ h }) {
  const c = h.config || {}; const [i, setI] = useState(0);
  if (h.type === 'link') return <p><a className="btn btn-primary" href={safeUrl(c.url)} target="_blank" rel="noopener noreferrer">Άνοιγμα συνδέσμου ↗</a></p>;
  if (h.type === 'article') return <p><Link className="btn btn-primary" href={`/articles/${encodeURIComponent(c.slug || '')}`}>Διάβασε το άρθρο →</Link></p>;
  if (h.type === 'video') { const e = toEmbed(c.url); return !e ? <p>Το βίντεο δεν είναι διαθέσιμο.</p> : e.kind === 'video' ? <video src={e.src} controls playsInline className="hs-media" /> : <div className="embed"><iframe src={e.src} title={h.label || 'Βίντεο'} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div>; }
  if (h.type === 'audio') return c.url ? <audio src={c.url} controls className="hs-audio" /> : <p>Ο ήχος δεν είναι διαθέσιμος.</p>;
  if (h.type === 'gallery') { const im = c.images || []; return !im.length ? <p>Η συλλογή είναι κενή.</p> : (<div className="hs-gal"><Media src={im[i]} alt={`Εικόνα ${i + 1} από ${im.length}`} className="hs-media" />
    <div className="hs-gal-nav"><button type="button" className="btn btn-ghost" onClick={() => setI((i - 1 + im.length) % im.length)} aria-label="Προηγούμενη εικόνα">←</button><span>{i + 1} / {im.length}</span><button type="button" className="btn btn-ghost" onClick={() => setI((i + 1) % im.length)} aria-label="Επόμενη εικόνα">→</button></div></div>); }
  if (h.type === 'text') return <div className="prose">{String(c.text || '').split(/\n{2,}/).map((p, k) => <p key={k}>{p}</p>)}</div>;
  if (h.type === 'game') return /^https:\/\//.test(c.url || '') ? <div className="embed embed-game"><iframe src={c.url} title={h.label || 'Παιχνίδι'} sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms" loading="lazy" allowFullScreen /></div> : <p>Το παιχνίδι δεν είναι διαθέσιμο.</p>;
  if (h.type === 'custom') return <div className="prose" dangerouslySetInnerHTML={{ __html: c.html || '' }} />;
  return null;
}

export default function HotspotModal({ h, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement; ref.current?.focus();
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [onClose]);
  if (!h) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={h.label || 'Διαδραστικό στοιχείο'} onClick={(e) => e.stopPropagation()}>
        <button ref={ref} type="button" className="modal-x" onClick={onClose} aria-label="Κλείσιμο">✕</button>
        {h.label && <h3>{h.label}</h3>}
        <HotspotContent h={h} />
      </div>
    </div>
  );
}
