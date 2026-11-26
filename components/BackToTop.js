'use client';
import { useEffect, useState } from 'react';
/** Κουμπί «επιστροφή στην κορυφή» (εμφανίζεται μετά από λίγο κύλισμα). */
export default function BackToTop() {
  const [on, setOn] = useState(false);
  useEffect(() => { const f = () => setOn(window.scrollY > 900); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  return <button type="button" className={`totop${on ? ' on' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Επιστροφή στην κορυφή" tabIndex={on ? 0 : -1}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg></button>;
}
