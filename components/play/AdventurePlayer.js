'use client';
import { useState } from 'react';
import Link from 'next/link';
import Mascot from '../Mascot';
import ResultPanel from './ResultPanel';
import { api } from '@/lib/clientUpload';

export default function AdventurePlayer({ adventure, signedIn, startScene, finishedBefore }) {
  const sc = adventure.scenes, byId = Object.fromEntries(sc.map((s) => [s.id, s]));
  const [id, setId] = useState(byId[startScene] && !byId[startScene].end ? startScene : sc[0].id), [res, setRes] = useState(null), [err, setErr] = useState(''), [steps, setSteps] = useState(1);
  const scene = byId[id];
  const save = async (to, finish) => { if (!signedIn) return null; try { return await api(`/api/play/adventure/${adventure.slug}`, { method: 'POST', body: { scene: to, finish } }); } catch (e) { setErr(e.message); return null; } };
  const go = async (to) => {
    setErr(''); setId(to); setSteps((n) => n + 1); window.scrollTo?.({ top: 0, behavior: 'smooth' });
    const t = byId[to];
    if (t.end) { const r = await save(to, true); setRes(r?.already ? { already: true } : r ? { xp: r.xp } : { guest: !signedIn }); } else await save(to, false);
  };
  const restart = () => { setId(sc[0].id); setRes(null); setSteps(1); setErr(''); save(sc[0].id, false); };
  return (
    <article className="adv" aria-live="polite">
      <p className="meta">Σκηνή {steps} · {adventure.title}</p>
      <div className="adv-scene" key={id}>
        <Mascot mood={scene.mood} size={150} className="adv-m" />
        <div className="adv-text">{scene.title && <h2 className="h2">{scene.title}</h2>}{scene.text.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {!scene.end ? <div className="adv-choices" role="group" aria-label="Τι θα κάνεις;">{scene.choices.map((c, i) => <button key={i} type="button" className="btn btn-ghost adv-choice" onClick={() => go(c.to)}>{c.label}</button>)}</div> : (
        <div className="adv-end"><h3 className="h2">🏁 {scene.endingTitle || 'Τέλος'}</h3>
          <ResultPanel mood="celebrate" title={res?.already ? 'Την έχεις ήδη ολοκληρώσει, αλλά αξίζει να την ξαναπαίξεις!' : 'Ολοκλήρωσες την περιπέτεια!'} xp={res?.xp} guest={res?.guest && !signedIn}>
            <button type="button" className="btn btn-primary" onClick={restart}>Παίξε ξανά για άλλο τέλος</button><Link className="btn btn-ghost" href="/play">Όλα τα παιχνίδια</Link></ResultPanel></div>)}
      {finishedBefore && !scene.end && <p className="muted small">✔ Έχεις ήδη ολοκληρώσει αυτή την περιπέτεια.</p>}
    </article>
  );
}
