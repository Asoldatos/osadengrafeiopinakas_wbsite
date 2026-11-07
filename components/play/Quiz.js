'use client';
import { useState } from 'react';
import Mascot from '../Mascot';
import ResultPanel from './ResultPanel';
import { api } from '@/lib/clientUpload';

export default function Quiz() {
  const [run, setRun] = useState(null), [qs, setQs] = useState([]), [i, setI] = useState(0), [ans, setAns] = useState([]), [sel, setSel] = useState(null), [res, setRes] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const start = async () => { setBusy(true); setErr(''); setRes(null); try { const r = await api('/api/play/quiz'); setRun(r.run); setQs(r.questions); setI(0); setAns([]); setSel(null); } catch (e) { setErr(e.message); } setBusy(false); };
  const next = async () => {
    const a = [...ans, sel]; setAns(a); setSel(null);
    if (i + 1 < qs.length) return setI(i + 1);
    setBusy(true);
    try { setRes(await api('/api/play/quiz', { method: 'POST', body: { run, answers: a } })); setRun(null); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  if (res) {
    const perfect = res.correct === res.total;
    return (<div className="game"><ResultPanel mood={perfect ? 'celebrate' : res.correct >= res.total / 2 ? 'happy' : 'confused'} title={`Σωστές απαντήσεις: ${res.correct} από ${res.total}`} xp={res.xp}>
      <button type="button" className="btn btn-primary" onClick={start}>Νέο κουίζ</button></ResultPanel>
      <ol className="review">{qs.map((q, k) => { const r = res.results[k]; return (<li key={q.id} className={r.correct ? 'right' : 'wrong'}><b>{q.question}</b><br />{r.correct ? '✅ Σωστά!' : `❌ Η σωστή απάντηση: ${q.options[r.right - 1] ?? '—'}`}{r.explanation && <small> {r.explanation}</small>}</li>); })}</ol></div>);
  }
  if (!run) return (<div className="game center"><Mascot mood="reading" size={130} /><p className="lede">10 ερωτήσεις. Πόσες θα βρεις σωστά;</p>{err && <p className="err" role="alert">{err}</p>}<button type="button" className="btn btn-primary" onClick={start} disabled={busy}>{busy ? 'Φόρτωση…' : 'Ξεκινάμε!'}</button></div>);
  const q = qs[i];
  return (
    <div className="game quiz">
      <div className="game-bar"><span>Ερώτηση <b>{i + 1}</b> από {qs.length}</span><div className="xpbar" aria-hidden="true"><span style={{ width: `${(i / qs.length) * 100}%` }} /></div></div>
      <h2 className="q">{q.question}</h2>
      <div className="opts" role="radiogroup" aria-label="Απαντήσεις">{q.options.map((o, k) => <button key={k} type="button" role="radio" aria-checked={sel === k + 1} className={`opt${sel === k + 1 ? ' on' : ''}`} onClick={() => setSel(k + 1)}><b>{'ΑΒΓΔ'[k]}</b> {o}</button>)}</div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="btns"><button type="button" className="btn btn-primary" disabled={!sel || busy} onClick={next}>{i + 1 < qs.length ? 'Επόμενη →' : busy ? 'Έλεγχος…' : 'Τέλος!'}</button></div>
    </div>
  );
}
