'use client';
import { useState } from 'react';
import TutorialView from '@/components/TutorialView';
import { TUT_KINDS, FORMAT_HELP } from '@/lib/tutorials.mjs';

/** Επεξεργαστής οδηγού: μπλοκ (βήματα, ενότητες, συμβουλές, προσοχή) με μετακίνηση, και ζωντανή προεπισκόπηση. */
export default function TutorialEditor({ f, value, onChange, form }) {
  const bl = Array.isArray(value) ? value : [];
  const [prev, setPrev] = useState(true), [help, setHelp] = useState(false);
  const upd = (i, p) => onChange(bl.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const move = (i, d) => { const a = [...bl], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  const add = (kind, at = bl.length) => { const a = [...bl]; a.splice(at, 0, { kind, title: '', text: '' }); onChange(a); };
  const del = (i) => { if ((bl[i].title || bl[i].text) && !window.confirm('Να διαγραφεί αυτό το μπλοκ;')) return; onChange(bl.filter((_, j) => j !== i)); };
  let n = 0;
  return (
    <div className="fld tuted">
      <label>{f.label}<small>Τα βήματα αριθμούνται μόνα τους. Μπορείς να ανακατέψεις βήματα, ενότητες, συμβουλές και προειδοποιήσεις.</small></label>
      <button type="button" className="btn btn-ghost sm" onClick={() => setHelp(!help)} aria-expanded={help}>✍️ Πώς μορφοποιώ το κείμενο;</button>
      {help && <table className="tuted-help"><tbody>{FORMAT_HELP.map(([a, b]) => <tr key={a}><td><code>{a}</code></td><td>{b}</td></tr>)}</tbody></table>}
      {bl.map((b, i) => {
        const k = TUT_KINDS[b.kind] || TUT_KINDS.step; if (b.kind === 'step') n++;
        return (
          <div key={i} className={`tuted-b k-${b.kind}`}>
            <div className="tuted-h">
              <select aria-label="Είδος μπλοκ" value={b.kind} onChange={(e) => upd(i, { kind: e.target.value })}>
                {Object.entries(TUT_KINDS).map(([v, x]) => <option key={v} value={v}>{x.icon} {x.label}</option>)}</select>
              <b>{b.kind === 'step' ? `Βήμα ${n}` : k.label}</b><span className="grow" />
              <button type="button" className="icon-btn sm" aria-label="Πάνω" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="icon-btn sm" aria-label="Κάτω" disabled={i === bl.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="icon-btn sm" aria-label="Διπλότυπο" onClick={() => { const a = [...bl]; a.splice(i + 1, 0, { ...b }); onChange(a); }}>⧉</button>
              <button type="button" className="icon-btn sm" aria-label="Διαγραφή" onClick={() => del(i)}>🗑</button>
            </div>
            <input aria-label="Τίτλος" placeholder={b.kind === 'step' ? 'Τι κάνει ο χρήστης; (π.χ. «Άνοιξε τα Ανεπιθύμητα»)' : 'Τίτλος'} value={b.title} onChange={(e) => upd(i, { title: e.target.value })} />
            <textarea aria-label="Κείμενο" rows={Math.min(10, Math.max(3, (b.text.match(/\n/g) || []).length + 2))} placeholder="Κείμενο… (κενή γραμμή = νέα παράγραφος, «- » = λίστα, **έντονα**, [σύνδεσμος](/play))" value={b.text} onChange={(e) => upd(i, { text: e.target.value })} />
          </div>);
      })}
      <div className="row wrap tuted-add">{Object.entries(TUT_KINDS).map(([v, x]) => <button key={v} type="button" className="btn btn-ghost sm" onClick={() => add(v)}>+ {x.icon} {x.label}</button>)}</div>
      <div className="tuted-prev">
        <button type="button" className="btn btn-ghost sm" onClick={() => setPrev(!prev)} aria-expanded={prev}>{prev ? '▾' : '▸'} Ζωντανή προεπισκόπηση</button>
        {prev && <div className="tuted-frame"><TutorialView t={{ ...(form || {}), blocks: bl }} vars={{ sender: '(η διεύθυνση αποστολής του site)' }} compact /></div>}
      </div>
    </div>
  );
}
