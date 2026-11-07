'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Mascot from '../Mascot';
import ResultPanel from './ResultPanel';
import { ALPHABET, MAX_WRONG, maskWord, wrongCount, isSolved, normalizeGreek } from '@/lib/games.mjs';
import { api } from '@/lib/clientUpload';

export default function Hangman() {
  const [w, setW] = useState(null), [g, setG] = useState(new Set()), [err, setErr] = useState(''), [res, setRes] = useState(null); const sent = useRef(false);
  const load = useCallback(async () => { setW(null); setG(new Set()); setRes(null); setErr(''); sent.current = false; try { setW(await api('/api/play/words')); } catch (e) { setErr(e.message); } }, []);
  useEffect(() => { load(); }, [load]);
  const word = w?.word || '', wrong = wrongCount(word, g), solved = !!word && isSolved(word, g), lost = wrong >= MAX_WRONG, over = solved || lost;
  const guess = useCallback((c) => { if (!word || over || g.has(c)) return; setG((x) => new Set([...x, c])); }, [word, over, g]);
  useEffect(() => {
    const k = (e) => { if (e.ctrlKey || e.metaKey || e.altKey) return; const c = normalizeGreek(e.key); if (ALPHABET.includes(c)) guess(c); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [guess]);
  useEffect(() => {
    if (!over || sent.current) return; sent.current = true;
    api('/api/play/score', { method: 'POST', body: { game: 'hangman', meta: { won: solved, wrong } } }).then((r) => setRes({ xp: r.xp })).catch((e) => setRes({ error: e.message }));
  }, [over, solved, wrong]);
  if (err) return <p className="err">{err}</p>;
  if (!w) return <p className="muted">Ψάχνω μια λέξη…</p>;
  const mood = solved ? 'celebrate' : lost ? 'oops' : wrong >= 4 ? 'confused' : 'happy';
  return (
    <div className="game hang">
      <div className="hang-top"><Mascot mood={mood} size={110} /><div><p className="hint">Υπόδειξη: <b>{w.hint || '—'}</b></p><p className="lives" aria-label={`Απομένουν ${MAX_WRONG - wrong} προσπάθειες`}>{Array.from({ length: MAX_WRONG }, (_, i) => <span key={i} className={i < MAX_WRONG - wrong ? 'life' : 'life lost'} aria-hidden="true">{i < MAX_WRONG - wrong ? '🖍️' : '💔'}</span>)}</p></div></div>
      <p className="theword" aria-live="polite" aria-label={maskWord(word, g).map((c) => (c === '_' ? 'κενό' : c)).join(' ')}>{(over && lost ? [...word] : maskWord(word, g)).map((c, i) => <span key={i} className={c === '_' ? 'blank' : lost && !g.has(c) ? 'missed' : ''}>{c === '_' ? '' : c}</span>)}</p>
      <div className="keys" role="group" aria-label="Γράμματα">{ALPHABET.map((c) => <button key={c} type="button" className={`key${g.has(c) ? (word.includes(c) ? ' hit' : ' miss') : ''}`} disabled={g.has(c) || over} onClick={() => guess(c)}>{c}</button>)}</div>
      {over && (res ? <ResultPanel mood={solved ? 'celebrate' : 'oops'} title={solved ? 'Μπράβο! Βρήκες τη λέξη!' : `Η λέξη ήταν: ${word}. Δοκίμασε ξανά!`} xp={res.xp} error={res.error}><button type="button" className="btn btn-primary" onClick={load}>Επόμενη λέξη</button></ResultPanel> : <p className="muted">Αποθήκευση…</p>)}
    </div>
  );
}
