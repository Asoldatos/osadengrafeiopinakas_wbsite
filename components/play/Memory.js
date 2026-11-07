'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Mascot from '../Mascot';
import ResultPanel from './ResultPanel';
import { dealMemory } from '@/lib/games.mjs';
import { api } from '@/lib/clientUpload';

export default function Memory({ signedIn }) {
  const [cards, setCards] = useState([]), [open, setOpen] = useState([]), [matched, setMatched] = useState(new Set()), [moves, setMoves] = useState(0), [now, setNow] = useState(0), [res, setRes] = useState(null), [started, setStarted] = useState(false);
  const lock = useRef(false), t0 = useRef(0), mv = useRef(0), openRef = useRef([]), done = useRef(new Set());
  const start = useCallback(() => { setCards(dealMemory()); setOpen([]); openRef.current = []; setMatched(new Set()); done.current = new Set(); setMoves(0); mv.current = 0; t0.current = 0; setStarted(false); setNow(0); setRes(null); lock.current = false; }, []);
  useEffect(() => { start(); }, [start]);
  useEffect(() => { if (!started || res) return; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [started, res]);
  const finish = async () => {
    const secs = Math.max(4, Math.round((Date.now() - t0.current) / 1000)), m = Math.max(8, mv.current);
    const base = { lines: [`Κινήσεις: ${m}`, `Χρόνος: ${secs} δευτερόλεπτα`] };
    if (!signedIn) return setRes({ ...base, guest: true });
    try { setRes({ ...base, xp: await api('/api/play/score', { method: 'POST', body: { game: 'memory', meta: { moves: m, secs } } }).then((r) => ({ ...r.xp, score: r.score })) }); } catch (e) { setRes({ ...base, error: e.message }); }
  };
  const flip = (i) => {
    if (lock.current || res || done.current.has(i) || openRef.current.includes(i)) return;
    if (!t0.current) { t0.current = Date.now(); setNow(Date.now()); setStarted(true); }
    const o = [...openRef.current, i]; openRef.current = o; setOpen(o);
    if (o.length < 2) return;
    mv.current += 1; setMoves(mv.current);
    const [a, b] = o;
    if (cards[a].mood === cards[b].mood) {
      done.current.add(a); done.current.add(b); setMatched(new Set(done.current)); openRef.current = []; setOpen([]);
      if (done.current.size === cards.length) finish();
    } else { lock.current = true; setTimeout(() => { openRef.current = []; setOpen([]); lock.current = false; }, 800); }
  };
  const secs = t0.current ? Math.round(((res ? Date.now() : now || Date.now()) - t0.current) / 1000) : 0;
  return (
    <div className="game">
      <div className="game-bar"><span>Κινήσεις: <b>{moves}</b></span><span>Χρόνος: <b>{secs}s</b></span><span>Ζευγάρια: <b>{matched.size / 2}/8</b></span><button type="button" className="btn btn-ghost sm" onClick={start}>Ξανά</button></div>
      <div className="memgrid" role="group" aria-label="Κάρτες μνήμης">
        {cards.map((c, i) => { const up = open.includes(i) || matched.has(i); return (
          <button key={c.id} type="button" className={`memcard${up ? ' up' : ''}${matched.has(i) ? ' ok' : ''}`} onClick={() => flip(i)} aria-label={up ? `Κάρτα ${i + 1}: ${c.mood}` : `Κάρτα ${i + 1}: κλειστή`} aria-pressed={up}>
            <span className="mc-back" aria-hidden="true">?</span><span className="mc-front" aria-hidden="true"><Mascot mood={c.mood} size={56} /></span></button>); })}
      </div>
      {res && <ResultPanel mood="celebrate" title="Τα ταίριαξες όλα! Μπράβο!" lines={res.lines} xp={res.xp} guest={res.guest} error={res.error}><button type="button" className="btn btn-primary" onClick={start}>Παίξε ξανά</button></ResultPanel>}
    </div>
  );
}
