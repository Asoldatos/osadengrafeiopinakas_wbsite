'use client';
import { useState } from 'react';
export default function ShareButtons({ url, title }) {
  const [done, setDone] = useState(false);
  const u = encodeURIComponent(url), t = encodeURIComponent(title);
  const copy = async () => { try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1800); } catch {} };
  const native = () => navigator.share?.({ title, url }).catch(() => {});
  return (
    <div className="share" aria-label="Κοινοποίηση">
      <span className="share-l">Κοινοποίηση:</span>
      <a className="chip" href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className="chip" href={`https://twitter.com/intent/tweet?url=${u}&text=${t}`} target="_blank" rel="noopener noreferrer">X</a>
      <a className="chip" href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <button type="button" className="chip" onClick={copy}>{done ? 'Αντιγράφηκε ✓' : 'Αντιγραφή συνδέσμου'}</button>
      {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="chip" onClick={native}>Περισσότερα…</button>}
    </div>
  );
}
