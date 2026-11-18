'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isVRHeadset, vrSiteUrl, goToGame } from '@/lib/vrDetect';

const get = (s, k) => { try { return s.getItem(k); } catch { return null; } };
const set = (s, k, v) => { try { s.setItem(k, v); } catch {} };

/** 3D παιχνίδι: παράθυρο «Αποθήκευση» για όσους το έπαιξαν σε αυτή τη συσκευή χωρίς να έχει περάσει στον λογαριασμό τους. */
const LAST = 6;
const lget = (k, d) => { try { return JSON.parse(localStorage.getItem('kimo3d:' + k)) ?? d; } catch { return d; } };
/** Τι έχει παίξει αυτή η συσκευή (το παιχνίδι είναι στο ίδιο domain, άρα βλέπουμε τα δεδομένα του). */
function localProgress() { const max = Math.min(LAST, Number(lget('max', 0)) || 0), save = lget('save', null); return { maxCh: max, completed: lget('done', false) === true || (max >= LAST && !!save && save.ch === 0) }; }
const loginUrl = (email) => `/account/login?next=${encodeURIComponent('/game/xmas/index.html?claim=1')}${email ? '&email=' + encodeURIComponent(email) : ''}`;

export default function GamePromo() {
  const path = usePathname() || '';
  const [vr, setVr] = useState(false), [claim, setClaim] = useState(null), [email, setEmail] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  // «Αποθήκευση»: ολοκλήρωσες/έπαιξες σε αυτή τη συσκευή αλλά δεν έχει περάσει στον λογαριασμό
  useEffect(() => {
    if (path.startsWith('/editor-panel') || path.startsWith('/account/login') || get(sessionStorage, 'g3d:claimLater')) return;
    const l = localProgress(); if (!l.completed && l.maxCh < 1) return;
    let alive = true;
    fetch('/api/play/xmas3d', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!alive || !j) return; const s = j.progress;
      if (s && s.max_ch >= l.maxCh && (s.completed || !l.completed)) return;   // ήδη αποθηκευμένο
      setTimeout(() => alive && setClaim({ l, student: j.student }), 1500);
    }).catch(() => {});
    return () => { alive = false; };
  }, [path]);
  // «Είσαι σε VR»: ΜΟΝΟ σε πραγματικά γυαλιά VR (ποτέ σε κινητό), μία φορά ανά επίσκεψη, σε όλο τον ιστότοπο
  useEffect(() => {
    if (path.startsWith('/editor-panel') || get(sessionStorage, 'vr:asked')) return;
    let alive = true;
    isVRHeadset().then((ok) => { if (!alive || !ok || get(localStorage, 'vr:never') === '1') return; set(sessionStorage, 'vr:asked', '1'); setTimeout(() => alive && setVr(true), 700); });
    return () => { alive = false; };
  }, [path]);
  const later = () => { set(sessionStorage, 'g3d:claimLater', '1'); setClaim(null); };
  const saveNow = async () => {
    setBusy(true); setMsg('Αποθήκευση…');
    try {
      const r = await fetch('/api/play/xmas3d', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ maxCh: claim.l.maxCh, completed: claim.l.completed, source: 'claim' }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setMsg(j.reward?.gained ? `✅ Αποθηκεύτηκε! Κέρδισες ${j.reward.gained} XP${j.reward.badges?.includes('xmas-hero') ? ' και το παράσημο 🎄' : ''}!` : '✅ Αποθηκεύτηκε στον λογαριασμό σου!');
      setTimeout(() => setClaim(null), 2400);
    } catch (e) { setMsg(e.message || 'Δεν έγινε η αποθήκευση. Δοκίμασε ξανά.'); }
    setBusy(false);
  };
  if (path.startsWith('/editor-panel')) return null;
  return (
    <>
      {vr && (
        <div className="g3d-pop-back" onClick={() => setVr(false)}>
          <div className="g3d-pop" role="dialog" aria-modal="true" aria-labelledby="vrq-t" onClick={(e) => e.stopPropagation()}>
            <div className="g3d-pop-ico" aria-hidden="true">🥽</div><span className="g3d-vrd">ΕΙΣΑΙ ΣΕ VR</span>
            <h2 id="vrq-t">Θέλεις να δεις τον ιστότοπο σε VR;</h2>
            <p>Όλος ο ιστότοπος σε 3D: διάβασε άρθρα, δες τα τεύχη, παίξε περιπέτειες και «Τα Χριστούγεννα του Κιμωλάκη», μέσα σε ένα χιονισμένο χωριό.</p>
            <p className="g3d-allow">⚠️ Στο επόμενο βήμα, όταν ο browser ρωτήσει για το VR, πάτα <b>«Allow» / «Να επιτρέπεται»</b>.</p>
            <div className="btns"><button type="button" className="btn btn-primary" onClick={() => { setVr(false); goToGame(vrSiteUrl(window.location.pathname)); }}>Ναι, σε VR! 🥽</button><button type="button" className="btn btn-ghost" onClick={() => setVr(false)}>Όχι, κανονικά</button></div>
            <button type="button" className="linkbtn" onClick={() => { set(localStorage, 'vr:never', '1'); setVr(false); }}>Να μην το ξαναρωτήσεις</button>
          </div>
        </div>)}
      {claim && !vr && (
        <div className="g3d-pop-back" onClick={later}>
          <div className="g3d-pop g3d-save" role="dialog" aria-modal="true" aria-labelledby="g3ds-t" onClick={(e) => e.stopPropagation()}>
            <div className="g3d-pop-ico" aria-hidden="true">🎄</div>
            <h2 id="g3ds-t">{claim.l.completed ? 'Τελείωσες «Τα Χριστούγεννα του Κιμωλάκη»!' : `Έφτασες στο κεφάλαιο ${claim.l.maxCh + 1} από 7!`}</h2>
            <p>{claim.l.completed ? <>Αποθήκευσέ το στον λογαριασμό σου για να πάρεις το παράσημο 🎄 <b>Ήρωας των Χριστουγέννων</b> και <b>150 XP</b>.</> : 'Αποθήκευσέ το στον λογαριασμό σου για να συνεχίσεις από οποιαδήποτε συσκευή.'}</p>
            {claim.student ? (<>
              <p>Είσαι συνδεδεμένος ως <b>{claim.student.nickname || claim.student.email}</b> ({claim.student.email}).</p>
              <div className="btns"><button type="button" className="btn btn-primary" disabled={busy} onClick={saveNow}>💾 Αποθήκευση</button><button type="button" className="btn btn-ghost" onClick={later}>Αργότερα</button></div>
            </>) : (<>
              <form onSubmit={(e) => { e.preventDefault(); window.location.assign(loginUrl(email.trim())); }}>
                <label htmlFor="g3ds-e">Γράψε το email του λογαριασμού σου για να καταχωρηθεί εκεί:</label>
                <input id="g3ds-e" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="το-email-σου@…" />
                <div className="btns"><button className="btn btn-primary">Σύνδεση &amp; αποθήκευση</button><button type="button" className="btn btn-ghost" onClick={later}>Αργότερα</button></div>
              </form>
              <p className="small">Δεν έχεις λογαριασμό; <a href="/account/register">Φτιάξε έναν δωρεάν</a> — η πρόοδός σου μένει σε αυτή τη συσκευή μέχρι να συνδεθείς.</p>
            </>)}
            <p className="msg" role="status">{msg}</p>
          </div>
        </div>)}
    </>
  );
}
