'use client';
import { useEffect, useRef, useState } from 'react';
import TutorialView from '@/components/TutorialView';
import { HtmlEditor, ImageField } from './Fields';
import { TUT_KINDS, TUT_TEMPLATES, renderText, blockPlain } from '@/lib/tutorials.mjs';

const blank = (kind) => (kind === 'button' ? { kind, label: '', href: '/', style: 'primary' } : kind === 'image' ? { kind, img: '', caption: '', size: 'normal' } : { kind, title: '', html: '' });
const PAGES = [['/', 'Αρχική'], ['/articles', 'Άρθρα'], ['/editions', 'Τεύχη'], ['/play', 'Παιχνίδια'], ['/help', 'Οδηγοί'], ['/account/register', 'Εγγραφή μαθητή'], ['/account/login', 'Σύνδεση μαθητή'], ['/contact', 'Επικοινωνία']];

/** Επεξεργαστής οδηγού: μπλοκ με μορφοποίηση σαν τα άρθρα, εικόνες, κουμπιά, πρότυπα, μεταφορά-απόθεση και ζωντανή προεπισκόπηση. */
export default function TutorialEditor({ f, value, onChange, form }) {
  const bl = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(() => new Set(bl.length <= 6 ? bl.map((_, i) => i) : [0]));
  const [active, setActive] = useState(null), [ins, setIns] = useState(null), [drag, setDrag] = useState(null), [over, setOver] = useState(null), [showTpl, setShowTpl] = useState(false);
  const refs = useRef({});
  // παλιοί οδηγοί (απλό κείμενο) → μορφοποιημένο κείμενο, μία φορά
  useEffect(() => { if (bl.some((b) => b.text && !b.html)) onChange(bl.map((b) => (b.text && !b.html ? { ...b, html: renderText(b.text), text: undefined } : b))); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (a) => onChange(a);
  const upd = (i, p) => set(bl.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const toggle = (i, on) => setOpen((s) => { const n = new Set(s); (on ?? !n.has(i)) ? n.add(i) : n.delete(i); return n; });
  const focus = (i) => { setActive(i); toggle(i, true); setTimeout(() => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); };
  const insertAt = (at, kind) => { const a = [...bl]; a.splice(at, 0, blank(kind)); set(a); setIns(null); setOpen((s) => new Set([...[...s].map((x) => (x >= at ? x + 1 : x)), at])); focus(at); };
  const move = (from, to) => { if (to < 0 || to >= bl.length || from === to) return; const a = [...bl]; const [x] = a.splice(from, 1); a.splice(to, 0, x); set(a); setActive(to); };
  const del = (i) => { if ((bl[i].title || blockPlain(bl[i]) || bl[i].img) && !window.confirm('Να διαγραφεί αυτό το μπλοκ;')) return; set(bl.filter((_, j) => j !== i)); setActive(null); };
  const useTpl = (t) => { if (bl.length && bl.some((b) => b.title || blockPlain(b)) && !window.confirm('Το πρότυπο θα αντικαταστήσει το τωρινό περιεχόμενο. Συνέχεια;')) return; set(t.blocks.map((b) => ({ ...b }))); setOpen(new Set(t.blocks.map((_, i) => i))); setShowTpl(false); };
  const steps = bl.filter((b) => b.kind === 'step').length;
  let n = 0;

  const Adder = ({ at }) => (
    <div className={`tuted-ins${ins === at ? ' on' : ''}`}>
      {ins === at ? (
        <div className="tuted-kinds" role="group" aria-label="Τι να προστεθεί εδώ;">
          {Object.entries(TUT_KINDS).map(([k, x]) => <button key={k} type="button" className="tuted-kind" onClick={() => insertAt(at, k)} title={x.hint}><span aria-hidden="true">{x.icon}</span>{x.label}</button>)}
          <button type="button" className="icon-btn sm" aria-label="Άκυρο" onClick={() => setIns(null)}>✕</button>
        </div>) : <button type="button" className="tuted-plus" onClick={() => setIns(at)} aria-label="Πρόσθεσε μπλοκ εδώ">＋</button>}
    </div>);

  return (
    <div className="fld tuted">
      <div className="tuted-top">
        <label>{f.label}<small>{bl.length} μπλοκ · {steps} βήματα. Τα βήματα αριθμούνται μόνα τους. Πάτα ＋ ανάμεσα στα μπλοκ ή σύρε το ⠿ για αλλαγή σειράς.</small></label>
        <div className="row wrap">
          <button type="button" className="btn btn-ghost sm" onClick={() => setShowTpl(!showTpl)} aria-expanded={showTpl}>📋 Πρότυπα</button>
          <button type="button" className="btn btn-ghost sm" onClick={() => setOpen(new Set(bl.map((_, i) => i)))}>Άνοιγμα όλων</button>
          <button type="button" className="btn btn-ghost sm" onClick={() => setOpen(new Set())}>Κλείσιμο όλων</button>
        </div>
      </div>
      {(showTpl || !bl.length) && (
        <div className="tuted-tpls">{TUT_TEMPLATES.map((t) => <button key={t.id} type="button" className="tuted-tpl" onClick={() => useTpl(t)}><span aria-hidden="true">{t.icon}</span><b>{t.label}</b><small>{t.desc}</small></button>)}</div>)}

      <div className="tuted-grid">
        <div className="tuted-list">
          <Adder at={0} />
          {bl.map((b, i) => {
            const k = TUT_KINDS[b.kind] || TUT_KINDS.step; if (b.kind === 'step') n++; const isOpen = open.has(i);
            const summary = b.kind === 'button' ? (b.label || 'Κουμπί χωρίς κείμενο') : b.kind === 'image' ? (b.caption || (b.img ? 'Εικόνα' : 'Δεν έχει επιλεγεί εικόνα')) : (b.title || blockPlain(b).slice(0, 70) || 'Χωρίς τίτλο');
            return (
              <div key={i}>
                <div ref={(el) => { refs.current[i] = el; }} className={`tuted-b k-${b.kind}${active === i ? ' act' : ''}${over === i && drag !== null && drag !== i ? ' drop' : ''}`}
                  onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-tut-block')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== i) setOver(i); } }}
                  onDragLeave={() => setOver((o) => (o === i ? null : o))}
                  onDrop={(e) => { const from = Number(e.dataTransfer.getData('application/x-tut-block')); e.preventDefault(); if (Number.isInteger(from)) move(from, i); setDrag(null); setOver(null); }} onFocus={() => setActive(i)}>
                  <div className="tuted-h">
                    <span className="tuted-drag" draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('application/x-tut-block', String(i)); }} onDragEnd={() => { setDrag(null); setOver(null); }} title="Σύρε για αλλαγή σειράς" aria-hidden="true">⠿</span>
                    <button type="button" className="tuted-tog" onClick={() => toggle(i)} aria-expanded={isOpen}>
                      <span className="tuted-badge">{k.icon} {b.kind === 'step' ? `Βήμα ${n}` : k.label}</span><span className="tuted-sum">{summary}</span><span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                    </button>
                    <button type="button" className="icon-btn sm" aria-label="Μετακίνηση πάνω" disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                    <button type="button" className="icon-btn sm" aria-label="Μετακίνηση κάτω" disabled={i === bl.length - 1} onClick={() => move(i, i + 1)}>↓</button>
                    <button type="button" className="icon-btn sm" aria-label="Αντίγραφο" title="Αντίγραφο" onClick={() => { const a = [...bl]; a.splice(i + 1, 0, JSON.parse(JSON.stringify(b))); set(a); toggle(i + 1, true); }}>⧉</button>
                    <button type="button" className="icon-btn sm danger" aria-label="Διαγραφή" title="Διαγραφή" onClick={() => del(i)}>🗑</button>
                  </div>
                  {isOpen && (
                    <div className="tuted-body">
                      <div className="tuted-kindbar" role="radiogroup" aria-label="Είδος μπλοκ">
                        {Object.entries(TUT_KINDS).map(([kk, x]) => <button key={kk} type="button" role="radio" aria-checked={b.kind === kk} className={`tuted-chip${b.kind === kk ? ' on' : ''}`} title={x.hint}
                          onClick={() => upd(i, kk === 'button' ? { kind: kk, label: b.label || b.title || '', href: b.href || '/', style: b.style || 'primary' } : kk === 'image' ? { kind: kk, img: b.img || '', caption: b.caption || '', size: b.size || 'normal' } : { kind: kk, html: b.html ?? '', title: b.title ?? '' })}>{x.icon} {x.label}</button>)}
                      </div>
                      <p className="tuted-hint">{k.hint}</p>
                      {b.kind === 'button' ? (
                        <div className="tuted-btnf">
                          <label>Κείμενο κουμπιού<input value={b.label || ''} onChange={(e) => upd(i, { label: e.target.value })} placeholder="π.χ. Φτιάξε λογαριασμό" /></label>
                          <label>Πού πηγαίνει;<input value={b.href || ''} onChange={(e) => upd(i, { href: e.target.value })} placeholder="/account/register ή https://…" list="tut-pages" /></label>
                          <div className="row wrap">{PAGES.map(([h, l]) => <button key={h} type="button" className={`tuted-chip${b.href === h ? ' on' : ''}`} onClick={() => upd(i, { href: h })}>{l}</button>)}</div>
                          <div className="row"><button type="button" className={`tuted-chip${b.style !== 'ghost' ? ' on' : ''}`} onClick={() => upd(i, { style: 'primary' })}>Κόκκινο κουμπί</button><button type="button" className={`tuted-chip${b.style === 'ghost' ? ' on' : ''}`} onClick={() => upd(i, { style: 'ghost' })}>Απλό κουμπί</button></div>
                        </div>
                      ) : b.kind === 'image' ? (
                        <div className="tuted-imgf">
                          <ImageField value={b.img || ''} onChange={(u) => upd(i, { img: u })} noVideo />
                          <label>Λεζάντα (προαιρετική)<input value={b.caption || ''} onChange={(e) => upd(i, { caption: e.target.value })} placeholder="Τι δείχνει η εικόνα;" /></label>
                          <div className="row"><button type="button" className={`tuted-chip${b.size !== 'wide' ? ' on' : ''}`} onClick={() => upd(i, { size: 'normal' })}>Κανονικό μέγεθος</button><button type="button" className={`tuted-chip${b.size === 'wide' ? ' on' : ''}`} onClick={() => upd(i, { size: 'wide' })}>Σε όλο το πλάτος</button></div>
                          {!b.img && <p className="tuted-warn">Διάλεξε μια εικόνα — ένα μπλοκ εικόνας χωρίς εικόνα δεν αποθηκεύεται.</p>}
                        </div>
                      ) : (<>
                        <input className="tuted-title" aria-label="Τίτλος" value={b.title || ''} onChange={(e) => upd(i, { title: e.target.value })}
                          placeholder={b.kind === 'step' ? 'Τι κάνει ο χρήστης; (π.χ. «Άνοιξε τα Ανεπιθύμητα»)' : b.kind === 'tip' ? 'Τίτλος συμβουλής' : b.kind === 'warn' ? 'Τίτλος προειδοποίησης' : 'Επικεφαλίδα ενότητας'} />
                        <HtmlEditor compact label={`Κείμενο: ${b.title || k.label}`} value={b.html || ''} onChange={(h) => upd(i, { html: h })} placeholder="Γράψε εδώ… Με τα κουμπιά πάνω βάζεις έντονα, λίστες, συνδέσμους και εικόνες."
                          extra={({ insert }) => <button type="button" className="tb" title="Βάλε το email από το οποίο στέλνει το site" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('{{sender}}')}>✉️ email site</button>} />
                        <details className="tuted-shot" open={!!b.img}>
                          <summary>📸 {b.img ? 'Στιγμιότυπο οθόνης' : 'Πρόσθεσε στιγμιότυπο οθόνης / εικόνα σε αυτό το μπλοκ'}</summary>
                          <ImageField value={b.img || ''} onChange={(u) => upd(i, { img: u })} noVideo />
                          {b.img && <label>Λεζάντα<input value={b.caption || ''} onChange={(e) => upd(i, { caption: e.target.value })} placeholder="π.χ. Το κουμπί είναι πάνω δεξιά" /></label>}
                        </details>
                      </>)}
                    </div>)}
                </div>
                <Adder at={i + 1} />
              </div>);
          })}
          <datalist id="tut-pages">{PAGES.map(([h, l]) => <option key={h} value={h}>{l}</option>)}</datalist>
        </div>
        <aside className="tuted-prev" aria-label="Ζωντανή προεπισκόπηση">
          <div className="tuted-prev-h"><b>👀 Ζωντανή προεπισκόπηση</b><small>Πάτα ένα κομμάτι για να το επεξεργαστείς</small></div>
          <div className="tuted-frame"><TutorialView t={{ ...(form || {}), blocks: bl }} vars={{ sender: '(email του site)' }} compact onPick={focus} active={active} /></div>
        </aside>
      </div>
    </div>
  );
}
