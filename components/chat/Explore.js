'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icons';
import { api } from '@/lib/clientUpload';
import { SpaceMark } from './ChatApp';

/** Κατάλογος χώρων (τους φτιάχνει η σύνταξη). */
export function Explore({ onJoin, onOpen, onBack }) {
  const [list, setList] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api('/api/chat/servers').then(setList).catch((e) => setErr(e.message)); }, []);
  return (
    <div className="pc-explore">
      <header className="pc-top"><button type="button" className="pc-ib pc-back" onClick={onBack} aria-label="Πίσω"><Icon name="back" /></button><div className="pc-title"><h1>Εξερεύνηση χώρων</h1><span className="pc-sub">Οι χώροι δημιουργούνται από τη σύνταξη</span></div></header>
      <div className="pc-ex">
        {err && <p className="pc-err">{err}</p>}
        {!list ? <div className="pc-loader" /> : !list.length ? <p className="pc-muted">Δεν υπάρχουν ακόμα χώροι. Έρχονται σύντομα.</p> : (
          <div className="pc-ex-grid">{list.map((s) => (
            <article key={s.id} className="pc-ex-card" style={{ '--sc': s.color }}>
              <SpaceMark s={s} size={48} />
              <div className="pc-ex-b"><h2>{s.name}</h2>{s.description && <p>{s.description}</p>}<small>{s.members} {s.members === 1 ? 'μέλος' : 'μέλη'} · {s.channels} κανάλια</small></div>
              {s.joined ? <button type="button" className="pc-btn ghost" onClick={() => onOpen(s)}>Άνοιγμα</button> : <button type="button" className="pc-btn" onClick={() => onJoin(s)}>Συμμετοχή</button>}
            </article>))}</div>)}
      </div>
    </div>
  );
}
/** Κανόνες χώρου: πρέπει να τους αποδεχτεί ο μαθητής για να μπει. */
export function RulesModal({ server, onClose, onAccept }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="pc-modal-back" onClick={onClose}><div className="pc-modal" role="dialog" aria-modal="true" aria-labelledby="pc-rules-t" onClick={(e) => e.stopPropagation()}>
      <div className="pc-modal-h"><SpaceMark s={server} size={36} /><h2 id="pc-rules-t">Κανόνες · {server.name}</h2><button type="button" className="pc-ib" onClick={onClose} aria-label="Κλείσιμο"><Icon name="x" /></button></div>
      <ol className="pc-rules">{server.rules.split('\n').map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ol>
      <label className="pc-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> Διάβασα τους κανόνες και δεσμεύομαι να τους τηρώ.</label>
      <div className="pc-btns"><button type="button" className="pc-btn ghost" onClick={onClose}>Ακύρωση</button><button type="button" className="pc-btn" disabled={!ok} onClick={onAccept}>Αποδοχή και συμμετοχή</button></div>
    </div></div>
  );
}
