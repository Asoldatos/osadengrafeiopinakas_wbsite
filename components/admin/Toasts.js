'use client';
import { useEffect, useState } from 'react';
import Mascot from '../Mascot';
export default function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const h = (e) => { const id = Math.random(); setList((l) => [...l, { id, ...e.detail }]); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4200); };
    window.addEventListener('toast', h); return () => window.removeEventListener('toast', h);
  }, []);
  return <div className="toasts" role="status" aria-live="polite">{list.map((t) => <div key={t.id} className={`toast ${t.mood === 'oops' ? 'bad' : ''}`}><Mascot mood={t.mood} size={34} /><span>{t.msg}</span></div>)}</div>;
}
