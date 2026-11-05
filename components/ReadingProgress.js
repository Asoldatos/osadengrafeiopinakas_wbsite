'use client';
import { useEffect, useState } from 'react';
export default function ReadingProgress({ targetId = 'article-body' }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const f = () => {
      const el = document.getElementById(targetId); if (!el) return;
      const r = el.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      setP(Math.min(1, Math.max(0, total > 0 ? -r.top / total : 0)));
    };
    f(); window.addEventListener('scroll', f, { passive: true }); window.addEventListener('resize', f);
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('resize', f); };
  }, [targetId]);
  return <div className="progress" role="progressbar" aria-label="Πρόοδος ανάγνωσης" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}><span style={{ transform: `scaleX(${p})` }} /></div>;
}
