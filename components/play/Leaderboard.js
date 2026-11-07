'use client';
import { useEffect, useState } from 'react';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';
export default function Leaderboard({ game }) {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api(`/api/play/leaderboard?game=${game}`).then(setD).catch((e) => setErr(e.message)); }, [game]);
  if (err) return null;
  if (!d) return <p className="muted small">Φόρτωση κατάταξης…</p>;
  return (
    <section className="board-card" aria-label="Κατάταξη"><h2 className="h3">🏆 Κορυφαίοι παίκτες</h2>
      {!d.rows.length ? <p className="muted">Κανείς δεν έχει παίξει ακόμα. Γίνε ο πρώτος!</p> : <ol className="lb">{d.rows.map((r, i) => <li key={i} className={r.nickname === d.me ? 'me' : ''}><span className="pos">{i + 1}</span><Mascot mood={r.avatar} size={26} /><span className="nm">{r.nickname}</span><b>{r.score}</b></li>)}</ol>}
      {d.mine != null && <p className="small muted">Το καλύτερό σου σκορ: <b>{d.mine}</b></p>}
    </section>
  );
}
