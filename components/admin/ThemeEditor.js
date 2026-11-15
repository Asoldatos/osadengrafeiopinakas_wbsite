'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, toast, uploadAudio, isAudioFile } from '@/lib/clientUpload';
import { Field, ImageField } from './Fields';
import Mascot from '../Mascot';
import { audio } from '../audio/engine';

const TABS = [['general', '📅 Ενεργοποίηση'], ['colors', '🎨 Χρώματα'], ['assets', '🖼️ Εικόνες'], ['fx', '❄️ Εφέ'], ['texts', '✍️ Κείμενα'], ['audio', '🎵 Ήχος'], ['transition', '🎬 Μετάβαση'], ['newsletter', '💌 Newsletter']];
const COLOR_LABELS = { paper: 'Φόντο σελίδας', paper2: 'Δεύτερο φόντο', ink: 'Κείμενο / περιγράμματα', board: 'Πίνακας (κεφαλίδα)', c1: 'Χρώμα 1 (μέντα)', c2: 'Χρώμα 2 (κόκκινο)', c3: 'Χρώμα 3 (χρυσό)', c4: 'Χρώμα 4 (πράσινο)', c5: 'Χρώμα 5 (μπλε)', c6: 'Χρώμα 6 (πορτοκαλί)' };
const TEXT_FIELDS = [
  ['popupTitle', 'Αναδυόμενο: τίτλος'], ['popupText', 'Αναδυόμενο: κείμενο', 3], ['popupAccept', 'Αναδυόμενο: κουμπί αποδοχής'], ['popupDecline', 'Αναδυόμενο: κουμπί απόρριψης'],
  ['toggleOn', 'Διακόπτης: ενεργοποίηση'], ['toggleOff', 'Διακόπτης: απενεργοποίηση'],
  ['startTitle', 'Οθόνη έναρξης (όταν ο browser μπλοκάρει τον ήχο): τίτλος'], ['startButton', 'Οθόνη έναρξης: κουμπί'],
  ['transitionTitle', 'Τίτλος στο τέλος της μετάβασης'], ['santaSpeech', 'Τι λέει ο Κιμωλάκης-Άγιος Βασίλης'], ['skip', 'Κουμπί παράλειψης'],
  ['countdown', 'Αντίστροφη μέτρηση στην αρχική ({n} = μέρες που μένουν)'], ['countdownOne', 'Αντίστροφη μέτρηση: παραμονή'], ['christmasDay', 'Μήνυμα ανήμερα (25–26/12)'],
  ['heroPhrases', 'Φράσεις του Κιμωλάκη όταν τον πατάς (μία ανά γραμμή)', 5], ['activationMessage', 'Μήνυμα ενεργοποίησης (προτείνεται στο newsletter)', 2],
];
const FX = [['snow', 'Χιόνι'], ['snowInteractive', 'Το χιόνι αντιδρά στο ποντίκι/δάχτυλο'], ['sparkles', 'Λάμψεις'], ['decorations', 'Διακοσμήσεις (λόφοι χιονιού, κορδέλες)'], ['lights', 'Λαμπάκια στο μενού'], ['snowCaps', 'Χιόνι πάνω σε κουμπιά & κάρτες'], ['ornaments', 'Μπάλες που χτυπάνε σαν καμπανάκια']];
const PHASES = [['begin', '1. Αρχή (ήχος, κουνήματα, αποχρωματισμός)'], ['takeover', '2. Κατάληψη (υγρό, καραμέλες, λογότυπο)'], ['transform', '3. Μεταμόρφωση του Κιμωλάκη'], ['reveal', '4. Αποκάλυψη (μουσική, χιόνι)']];
const SFX = [['begin', 'Φάση 1 · αρχή'], ['takeover', 'Φάση 2 · κατάληψη'], ['transform', 'Φάση 3 · μεταμόρφωση'], ['reveal', 'Φάση 4 · αποκάλυψη']];
const PSETS = { christmas: 'Χριστουγεννιάτικα (καραμέλες, μπάλες, δώρα)', confetti: 'Κομφετί', hearts: 'Καρδιές', leaves: 'Φύλλα', flowers: 'Λουλούδια' };
const REASON = { manual: 'Ενεργό χειροκίνητα', window: 'Ενεργό (εντός ημερομηνιών)', before: 'Θα ενεργοποιηθεί αυτόματα', after: 'Οι ημερομηνίες πέρασαν', off: 'Απενεργοποιημένο', noDate: 'Λείπει ημερομηνία έναρξης' };
const getIn = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setIn = (o, p, v) => { const [k, ...r] = p.split('.'); return { ...o, [k]: r.length ? setIn(o?.[k] || {}, r.join('.'), v) : v }; };
const mmss = (ms) => { const t = Math.max(0, +ms || 0), m = Math.floor(t / 60000), s = (t % 60000) / 1000; return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
const fromMmss = (s) => { const m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(String(s).trim()); return m ? (+m[1] * 60 + +m[2]) * 1000 : null; };

function Num({ label, value, onChange, min, max, step = 1, hint, suffix }) {
  return <div className="fld"><label>{label}{hint && <small>{hint}</small>}</label><div className="row"><input type="range" min={min} max={max} step={step} value={value ?? 0} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
    <input type="number" className="num-sm" min={min} max={max} step={step} value={value ?? 0} onChange={(e) => onChange(e.target.value === '' ? min : +e.target.value)} aria-label={`${label} (τιμή)`} />{suffix && <span className="muted small">{suffix}</span>}</div></div>;
}
function AudioUrl({ label, value, onChange }) {
  const [prog, setProg] = useState(null);
  const up = async (f) => { if (!f) return; if (!isAudioFile(f)) return toast('Διάλεξε αρχείο ήχου.', 'oops'); try { setProg(0); onChange(await uploadAudio(f, { onProgress: setProg })); toast('Ο ήχος ανέβηκε!', 'celebrate'); } catch (e) { toast(e.message, 'oops'); } setProg(null); };
  return <div className="fld"><label>{label}</label><div className="row"><input value={value || ''} placeholder="/audio/… ή https://…" onChange={(e) => onChange(e.target.value)} aria-label={label} />
    <label className="btn btn-ghost sm">⬆ Ανέβασμα<input type="file" hidden accept="audio/*,.mp3,.ogg,.wav,.m4a" onChange={(e) => { up(e.target.files[0]); e.target.value = ''; }} /></label></div>
    {prog !== null && <div className="bar"><span style={{ width: `${prog * 100}%` }} /></div>}</div>;
}

export default function ThemeEditor({ slug = 'christmas' }) {
  const [data, setData] = useState(null), [cfg, setCfg] = useState(null), [mode, setMode] = useState('auto'), [tab, setTab] = useState('general'), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const [campaign, setCampaign] = useState(undefined), [seam, setSeam] = useState(null);
  const load = useCallback(async () => {
    try { const d = await api(`/api/admin/themes/${slug}`); setData(d); setCfg(d.config); setMode(d.mode); setDirty(false); } catch (e) { toast(e.message, 'oops'); }
    api('/api/admin/campaigns').then((r) => setCampaign(r.filter((c) => c.theme_slug === slug).sort((a, b) => b.id - a.id)[0] || null)).catch(() => setCampaign(null));
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h); }, [dirty]);
  useEffect(() => () => { audio().stopMusic(200); audio().stopSlots(); }, []);
  const set = (p, v) => { setCfg((c) => setIn(c, p, v)); setDirty(true); };
  const v = (p) => getIn(cfg, p);
  const save = async (extra = {}) => {
    setBusy(true);
    try { const r = await api(`/api/admin/themes/${slug}`, { method: 'PUT', body: { mode, config: cfg, ...extra } }); setCfg(r.config); setMode(r.mode); setData((d) => ({ ...d, mode: r.mode, config: r.config, availability: r.availability })); setDirty(false); toast('Το θέμα αποθηκεύτηκε!', 'celebrate'); setBusy(false); return true; }
    catch (e) { toast(e.message, 'oops'); setBusy(false); return false; }
  };
  const open = async (param) => { if (dirty && !(await save())) return; window.open(`/?${param}=${slug}`, '_blank', 'noopener'); };
  const reset = () => { if (confirm('Επαναφορά ΟΛΩΝ των ρυθμίσεων του θέματος στις αρχικές; (Η λειτουργία ενεργοποίησης μένει ως έχει.)')) save({ reset: true }); };
  const playSfx = async (k) => { await audio().unlock(); audio().play(v(`audio.sfx.${k}`), { slot: 'preview' }); };
  const testSeam = async () => { const r = await audio().testLoop(v('audio.music'), 4000); if (!r) return toast('Δεν φορτώθηκε η μουσική. Έλεγξε τη διεύθυνση.', 'oops'); setSeam({ at: r.seamAt, dur: r.duration }); };
  const sample = (ms) => Math.round((+ms || 0) * 44.1);
  const st = data?.availability;
  const swatches = useMemo(() => cfg && Object.keys(COLOR_LABELS).map((k) => cfg.colors[k]), [cfg]);
  if (!cfg) return <p className="muted">Φόρτωση…</p>;
  return (
    <div className="theme-ed">
      <div className="card theme-head" style={{ '--sw-board': cfg.colors.board, '--sw-paper': cfg.colors.paper, '--sw-ink': cfg.colors.ink, '--sw-red': cfg.colors.c2, '--sw-green': cfg.colors.c4 }}>
        <div className="theme-mini" aria-hidden="true"><div className="tm-nav"><span /><span /><span /></div><div className="tm-hero"><Mascot mood="celebrate" size={70} costume={cfg.mascot.costume} /><div><b>{cfg.texts.transitionTitle}</b><i /></div></div><div className="tm-sw">{swatches.map((c, i) => <span key={i} style={{ background: c }} />)}</div></div>
        <div className="theme-status">
          <h2>{data.name}</h2>
          <p><span className={`pill ${st?.available ? 'published' : 'draft'}`}>{st?.available ? '🟢' : '⏸'} {REASON[st?.reason] || '—'}</span></p>
          <p className="small muted">Ενεργοποιήσεις από newsletter: <b>{data.stats?.people ?? 0}</b> άτομα · <b>{data.stats?.clicks ?? 0}</b> κλικ</p>
          <div className="row wrap">
            <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={() => save()}>{busy ? 'Αποθήκευση…' : dirty ? '💾 Αποθήκευση' : '✔ Αποθηκευμένο'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => open('theme-preview')} title="Δες το θέμα χωρίς μετάβαση — μόνο εσύ">👀 Προεπισκόπηση</button>
            <button type="button" className="btn btn-xmas" onClick={() => open('theme-test')} title="Ολόκληρη η κινηματογραφική μετάβαση με ήχο, όπως από το newsletter">🎬 Δοκιμή πλήρους μετάβασης</button>
          </div>
          {dirty && <p className="small warn-t">Έχεις μη αποθηκευμένες αλλαγές. Η προεπισκόπηση τις αποθηκεύει πρώτα.</p>}
        </div>
      </div>

      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      <div className="card form-card">
        {tab === 'general' && <>
          <div className="fld"><label>Λειτουργία</label><div className="seg">{[['auto', '📅 Αυτόματα (ημερομηνίες)'], ['on', '🟢 Πάντα ενεργό'], ['off', '⛔ Απενεργοποιημένο']].map(([k, l]) => <button key={k} type="button" className={mode === k ? 'on' : ''} onClick={() => { setMode(k); setDirty(true); }}>{l}</button>)}</div>
            <small className="muted">Όταν το θέμα είναι διαθέσιμο, οι επισκέπτες βλέπουν πρόσκληση και διακόπτη. Η <b>αυτόματη</b> μετάβαση γίνεται ΜΟΝΟ από το κουμπί του newsletter.</small></div>
          <div className="grid2">
            <Field f={{ k: 'from', label: 'Διαθέσιμο από', t: 'datetime' }} value={v('schedule.activateFrom')} onChange={(x) => set('schedule.activateFrom', x || '')} />
            <Field f={{ k: 'until', label: 'Διαθέσιμο έως', t: 'datetime' }} value={v('schedule.activateUntil')} onChange={(x) => set('schedule.activateUntil', x || '')} />
          </div>
          <Field f={{ k: 'popup', label: 'Εμφάνιση πρόσκλησης στους επισκέπτες που δεν ήρθαν από το newsletter', t: 'bool' }} value={v('schedule.popupEnabled')} onChange={(x) => set('schedule.popupEnabled', x)} />
          <Num label="Καθυστέρηση πρόσκλησης" suffix="ms" min={0} max={30000} step={250} value={v('schedule.popupDelayMs')} onChange={(x) => set('schedule.popupDelayMs', x)} />
          <div className="fld"><label>Στολή Κιμωλάκη</label><select value={v('mascot.costume')} onChange={(e) => set('mascot.costume', e.target.value)}><option value="santa">🎅 Άγιος Βασίλης</option><option value="none">Καμία</option></select></div>
          <hr /><button type="button" className="btn btn-danger sm" onClick={reset}>Επαναφορά προεπιλογών θέματος</button>
        </>}

        {tab === 'colors' && <><p className="muted small">Τα χρώματα αντικαθιστούν την παλέτα του ιστοτόπου όσο το θέμα είναι ενεργό. Κράτα καλή αντίθεση ανάμεσα σε «Κείμενο» και «Φόντο».</p>
          <div className="grid2">{Object.entries(COLOR_LABELS).map(([k, l]) => <Field key={k} f={{ k: `c-${k}`, label: l, t: 'color' }} value={v(`colors.${k}`)} onChange={(x) => set(`colors.${k}`, x)} />)}</div></>}

        {tab === 'assets' && <>
          <p className="muted small">Όσο το θέμα είναι ενεργό, αυτές οι εικόνες αντικαθιστούν τα κανονικά λογότυπα και το εικονίδιο της καρτέλας. Άφησε ένα πεδίο κενό για να μένει το κανονικό.</p>
          {[['logoUrl', 'Λογότυπο (μενού, υποσέλιδο, email)'], ['logoLargeUrl', 'Μεγάλο λογότυπο (αρχική σελίδα και κέντρο της μετάβασης)'], ['boardLogoUrl', 'Λογότυπο με πίνακα'], ['faviconUrl', 'Εικονίδιο καρτέλας (favicon) — τετράγωνο PNG']].map(([k, l]) =>
            <div key={k} className="fld"><label>{l}</label><ImageField value={v(`assets.${k}`)} onChange={(x) => set(`assets.${k}`, x || '')} noVideo /></div>)}
        </>}

        {tab === 'fx' && <>
          {FX.map(([k, l]) => <Field key={k} f={{ k: `fx-${k}`, label: l, t: 'bool' }} value={v(`fx.${k}`)} onChange={(x) => set(`fx.${k}`, x)} />)}
          <Num label="Πλήθος νιφάδων" hint="Σε κινητά και με «λιγότερη κίνηση» μειώνεται αυτόματα." min={0} max={400} step={5} value={v('fx.snowCount')} onChange={(x) => set('fx.snowCount', x)} />
          <Num label="Ταχύτητα χιονιού" min={0.2} max={3} step={0.1} value={v('fx.snowSpeed')} onChange={(x) => set('fx.snowSpeed', x)} suffix="×" />
        </>}

        {tab === 'texts' && TEXT_FIELDS.map(([k, l, rows]) => <Field key={k} f={{ k: `t-${k}`, label: l, t: rows ? 'area' : 'text', rows }} value={v(`texts.${k}`)} onChange={(x) => set(`texts.${k}`, x)} />)}

        {tab === 'audio' && <>
          <Num label="Συνολική ένταση θέματος" min={0} max={1} step={0.05} value={v('audio.masterVolume')} onChange={(x) => set('audio.masterVolume', x)} />
          <h3>🎶 Μουσική (σε βρόχο)</h3>
          <AudioUrl label="Αρχείο μουσικής" value={v('audio.music.url')} onChange={(x) => set('audio.music.url', x)} />
          <div className="grid2">
            {[['loopStartMs', 'Αρχή βρόχου'], ['loopEndMs', 'Τέλος βρόχου']].map(([k, l]) => <div key={k} className="fld"><label>{l}<small>λεπτά:δευτερόλεπτα.χιλιοστά · {sample(v(`audio.music.${k}`)).toLocaleString('el-GR')} δείγματα @44.1kHz</small></label>
              <div className="row"><input key={v(`audio.music.${k}`)} defaultValue={mmss(v(`audio.music.${k}`))} aria-label={`${l} (λλ:δδ.χχχ)`} onBlur={(e) => { const ms = fromMmss(e.target.value); if (ms === null) { e.target.value = mmss(v(`audio.music.${k}`)); toast('Γράψε τον χρόνο ως λλ:δδ.χχχ (π.χ. 00:51.466)', 'oops'); } else set(`audio.music.${k}`, ms); }} />
                <input type="number" className="num-sm" step="0.001" value={v(`audio.music.${k}`)} onChange={(e) => set(`audio.music.${k}`, +e.target.value)} aria-label={`${l} (ms)`} /><span className="muted small">ms</span></div></div>)}
          </div>
          <div className="row wrap"><button type="button" className="btn btn-ghost sm" onClick={testSeam}>🔁 Άκου τη «ραφή» του βρόχου</button><button type="button" className="btn btn-ghost sm" onClick={async () => { await audio().unlock(); audio().startMusic(v('audio.music'), { fadeInMs: 300 }); }}>▶ Από την αρχή</button><button type="button" className="btn btn-ghost sm" onClick={() => { audio().stopMusic(300); setSeam(null); }}>⏹ Σταμάτημα</button>
            {seam && <SeamCountdown at={seam.at} />}</div>
          <Num label="Ένταση μουσικής" min={0} max={1} step={0.05} value={v('audio.music.volume')} onChange={(x) => set('audio.music.volume', x)} />
          <Num label="Σταδιακή είσοδος μουσικής" suffix="ms" min={0} max={10000} step={100} value={v('audio.music.fadeInMs')} onChange={(x) => set('audio.music.fadeInMs', x)} />
          <h3>🔔 Ηχητικά εφέ μετάβασης</h3><p className="muted small">Κάθε φάση έχει το δικό της «κανάλι», ώστε τα εφέ να μην επικαλύπτονται. Τα «Αρχή/Τέλος» κόβουν κομμάτι από το αρχείο (0 = ολόκληρο). Η «Καθυστέρηση» μετριέται από την αρχή της φάσης.</p>
          {SFX.map(([k, l]) => <div key={k} className="sfx-row"><div className="row"><b>{l}</b><span className="grow" /><button type="button" className="btn btn-ghost sm" onClick={() => playSfx(k)}>▶ Άκου</button></div>
            <AudioUrl label="Αρχείο" value={v(`audio.sfx.${k}.url`)} onChange={(x) => set(`audio.sfx.${k}.url`, x)} />
            <div className="grid4">{[['startMs', 'Αρχή (ms)'], ['endMs', 'Τέλος (ms)'], ['offsetMs', 'Καθυστέρηση (ms)']].map(([kk, ll]) => <div key={kk} className="fld"><label>{ll}</label><input type="number" min={0} step={10} value={v(`audio.sfx.${k}.${kk}`)} onChange={(e) => set(`audio.sfx.${k}.${kk}`, +e.target.value)} /></div>)}
              <div className="fld"><label>Ένταση</label><input type="number" min={0} max={1} step={0.05} value={v(`audio.sfx.${k}.volume`)} onChange={(e) => set(`audio.sfx.${k}.volume`, +e.target.value)} /></div></div></div>)}
        </>}

        {tab === 'transition' && <>
          <p className="muted small">Η ίδια κινηματογραφική μηχανή χρησιμοποιείται για κάθε εποχιακό θέμα. Συνολική διάρκεια: <b>{(Object.values(v('transition.phases')).reduce((a, b) => a + b, 0) / 1000).toFixed(1)}″</b>. Με «λιγότερη κίνηση» στη συσκευή γίνεται απλό σβήσιμο.</p>
          {PHASES.map(([k, l]) => <Num key={k} label={l} suffix="ms" min={300} max={15000} step={100} value={v(`transition.phases.${k}`)} onChange={(x) => set(`transition.phases.${k}`, x)} />)}
          <Num label="Ένταση κουνήματος κάμερας" min={0} max={2} step={0.05} value={v('transition.shake')} onChange={(x) => set('transition.shake', x)} />
          <div className="fld"><label>Σωματίδια</label><select value={v('transition.particleSet')} onChange={(e) => set('transition.particleSet', e.target.value)}>{Object.entries(PSETS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <Num label="Πλήθος σωματιδίων" min={0} max={120} value={v('transition.particles.count')} onChange={(x) => set('transition.particles.count', x)} />
          <div className="fld"><label>Χρώματα «υγρού» (με τη σειρά που γεμίζουν την οθόνη· το τελευταίο καλύπτει τα πάντα)</label>
            <div className="row wrap">{v('transition.liquidColors').map((c, i) => <span key={i} className="liq"><input type="color" value={/^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff'} onChange={(e) => set('transition.liquidColors', v('transition.liquidColors').map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Στρώμα ${i + 1}`} />
              {v('transition.liquidColors').length > 1 && <button type="button" className="icon-btn sm" aria-label="Αφαίρεση" onClick={() => set('transition.liquidColors', v('transition.liquidColors').filter((_, j) => j !== i))}>✕</button>}</span>)}
              {v('transition.liquidColors').length < 8 && <button type="button" className="btn btn-ghost sm" onClick={() => set('transition.liquidColors', [...v('transition.liquidColors'), '#C8102E'])}>+ Στρώμα</button>}</div></div>
          <div className="fld"><label>Λογότυπο στο κέντρο της μετάβασης<small>Άφησέ το κενό για το «Μεγάλο λογότυπο» από την καρτέλα Εικόνες.</small></label><ImageField value={v('transition.logoUrl')} onChange={(x) => set('transition.logoUrl', x || '')} noVideo /></div>
          {[['flash', 'Λάμψη τη στιγμή της μεταμόρφωσης'], ['confetti', 'Κομφετί στην αποκάλυψη'], ['skippable', 'Κουμπί «Παράλειψη» (και πλήκτρο Esc)'], ['particles.sparkles', 'Λάμψεις γύρω από τον Κιμωλάκη']].map(([k, l]) => <Field key={k} f={{ k: `tr-${k}`, label: l, t: 'bool' }} value={v(`transition.${k}`)} onChange={(x) => set(`transition.${k}`, x)} />)}
        </>}

        {tab === 'newsletter' && <>
          <p>Το χριστουγεννιάτικο newsletter έχει το κουμπί <b>«🎄 ΕΝΕΡΓΟΠΟΙΗΣΗ ΧΡΙΣΤΟΥΓΕΝΝΙΑΤΙΚΗΣ ΛΕΙΤΟΥΡΓΙΑΣ 🎄»</b>. Κάθε παραλήπτης παίρνει προσωπικό, υπογεγραμμένο σύνδεσμο (ισχύει 60 ημέρες) που τον φέρνει στο osaden.gr και ξεκινά αυτόματα τη μετάβαση — μία φορά ανά επίσκεψη.</p>
          {campaign === undefined ? <p className="muted">Φόρτωση…</p> : campaign ? <div className="card inner"><b>{campaign.subject}</b><br /><small className="muted">Κατάσταση: {({ draft: 'Πρόχειρο', scheduled: 'Προγραμματισμένο', sending: 'Σε αποστολή', sent: 'Εστάλη', failed: 'Απέτυχε' })[campaign.status] || campaign.status}{campaign.scheduled_at && campaign.status === 'scheduled' ? ` · ${new Date(campaign.scheduled_at).toLocaleString('el-GR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Athens' })}` : ''}</small></div> : <p className="muted">Δεν υπάρχει ακόμα χριστουγεννιάτικο newsletter.</p>}
          <Link className="btn btn-primary" href="/editor-panel/newsletter">💌 Επεξεργασία, προεπισκόπηση & προγραμματισμός</Link>
        </>}
      </div>
      {dirty && <div className="savebar"><span>Μη αποθηκευμένες αλλαγές</span><button type="button" className="btn btn-ghost sm" onClick={load}>Αναίρεση</button><button type="button" className="btn btn-primary sm" disabled={busy} onClick={() => save()}>💾 Αποθήκευση</button></div>}
    </div>
  );
}
function SeamCountdown({ at }) {
  const [n, setN] = useState(Math.max(0, at - Date.now()));
  useEffect(() => { const id = setInterval(() => setN(Math.max(0, at - Date.now())), 100); return () => clearInterval(id); }, [at]);
  return <span className="small">{n > 0 ? `Ο βρόχος «γυρίζει» σε ${(n / 1000).toFixed(1)}″…` : '🔁 Μόλις γύρισε! Ακούστηκε ομαλό;'}</span>;
}
