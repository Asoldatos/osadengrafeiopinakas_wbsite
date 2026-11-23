'use client';
import { useEffect, useState } from 'react';
import Mascot from '../Mascot';
import { api } from '@/lib/clientUpload';

/** Κατάλογος servers (τους φτιάχνουν οι διαχειριστές). */
export function Explore({ onJoin, onOpen, onMenu }) {
  const [list, setList] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api('/api/chat/servers').then(setList).catch((e) => setErr(e.message)); }, []);
  return (
    <div className="cx-explore">
      <header className="cx-top"><button type="button" className="cx-ib cx-burger" onClick={onMenu} aria-label="Μενού">☰</button><b>🧭 Εξερεύνηση servers</b></header>
      <div className="cx-ex-hero"><Mascot mood="reading" size={110} /><div><h1>Βρες την παρέα σου!</h1><p>Οι servers δημιουργούνται από τη σύνταξη. Διάλεξε όποιον σου αρέσει, διάβασε τους κανόνες και μπες!</p></div></div>
      {err && <p className="cx-err">{err}</p>}
      {!list ? <div className="cx-loader" /> : !list.length ? <p className="cx-muted cx-pad">Δεν υπάρχουν ακόμα servers. Έρχονται σύντομα! ✨</p> : (
        <div className="cx-ex-grid">{list.map((s) => (
          <article key={s.id} className="cx-ex-card" style={{ '--sc': s.color }}>
            <div className="cx-ex-ban"><span>{s.icon}</span></div>
            <div className="cx-ex-b"><h2>{s.name}</h2><p>{s.description}</p><small>👥 {s.members} μέλη · # {s.channels} κανάλια</small>
              {s.joined ? <button type="button" className="cx-btn ghost" onClick={() => onOpen(s)}>✔ Είσαι μέλος · Άνοιγμα</button> : <button type="button" className="cx-btn" onClick={() => onJoin(s)}>Μπες στον server</button>}</div>
          </article>))}</div>)}
    </div>
  );
}
/** Κανόνες server: πρέπει να τους αποδεχτεί ο μαθητής για να μπει. */
export function RulesModal({ server, onClose, onAccept }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="cx-modal-back" onClick={onClose}><div className="cx-modal" role="dialog" aria-modal="true" aria-labelledby="cx-rules-t" onClick={(e) => e.stopPropagation()}>
      <div className="cx-rules-h" style={{ '--sc': server.color }}><span>{server.icon}</span><h2 id="cx-rules-t">Κανόνες: {server.name}</h2></div>
      <div className="cx-rules">{server.rules.split('\n').filter((l) => l.trim()).map((l, i) => <p key={i}>{l}</p>)}</div>
      <label className="cx-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> Διάβασα τους κανόνες και δεσμεύομαι να τους τηρώ.</label>
      <div className="cx-btns"><button type="button" className="cx-btn ghost" onClick={onClose}>Ακύρωση</button><button type="button" className="cx-btn" disabled={!ok} onClick={onAccept}>Αποδοχή και είσοδος 🚀</button></div>
    </div></div>
  );
}
