'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const URL = '/game/xmas/index.html';
const get = (s, k) => { try { return s.getItem(k); } catch { return null; } };
const set = (s, k, v) => { try { s.setItem(k, v); } catch {} };

/** Διαφήμιση του 3D παιχνιδιού σε ΟΛΟ τον ιστότοπο: μπάρα ανακοίνωσης + «VR DETECTED» σε συσκευές VR. */
export default function GamePromo() {
  const path = usePathname() || '';
  const [bar, setBar] = useState(false), [vr, setVr] = useState(false);
  useEffect(() => {
    if (get(sessionStorage, 'g3d:bar') !== '0') setBar(true);
    let alive = true;
    (async () => {
      let ok = false; try { ok = !!(navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr'))); } catch {}
      if (!alive || !ok || get(localStorage, 'g3d:nopop') === '1' || get(sessionStorage, 'g3d:seen')) return;
      set(sessionStorage, 'g3d:seen', '1'); setTimeout(() => alive && setVr(true), 1200);
    })();
    return () => { alive = false; };
  }, []);
  if (path.startsWith('/editor-panel')) return null;
  return (
    <>
      {bar && (
        <div className="g3d-bar" role="region" aria-label="Νέο παιχνίδι">
          <a href={URL} target="_blank" rel="noopener" className="g3d-bar-link">
            <span className="g3d-bar-new">ΝΕΟ</span>
            <span className="g3d-bar-t">🎮 <b>Τα Χριστούγεννα του Κιμωλάκη</b> <span className="g3d-bar-sub">— περιπέτεια σε 3D για υπολογιστή, κινητό & VR</span></span>
            <span className="g3d-bar-cta">Παίξε τώρα →</span>
          </a>
          <button type="button" className="g3d-bar-x" aria-label="Κλείσιμο" onClick={() => { setBar(false); set(sessionStorage, 'g3d:bar', '0'); }}>✕</button>
        </div>)}
      {vr && (
        <div className="g3d-pop-back" onClick={() => setVr(false)}>
          <div className="g3d-pop" role="dialog" aria-modal="true" aria-labelledby="g3dv-t" onClick={(e) => e.stopPropagation()}>
            <div className="g3d-pop-ico" aria-hidden="true">🥽</div><span className="g3d-vrd">VR DETECTED</span>
            <h2 id="g3dv-t">Θέλεις να παίξεις «Τα Χριστούγεννα του Κιμωλάκη» σε VR;</h2>
            <p>Μια χριστουγεννιάτικη περιπέτεια που παίζεται <b>μέσα</b> στο VR! Περπάτα στο χιονισμένο χωριό, ρίξε χιονόμπαλες και πέτα με το έλκηθρο.</p>
            <p className="g3d-allow">⚠️ Όταν ο browser ρωτήσει αν επιτρέπεται να χρησιμοποιηθεί το VR, πάτα <b>«Allow» / «Να επιτρέπεται»</b>.</p>
            <div className="btns"><a className="btn btn-primary" href={URL} target="_blank" rel="noopener" onClick={() => setVr(false)}>Ναι, πάμε! 🥽</a><button type="button" className="btn btn-ghost" onClick={() => setVr(false)}>Αργότερα</button></div>
            <button type="button" className="linkbtn" onClick={() => { set(localStorage, 'g3d:nopop', '1'); setVr(false); }}>Να μην το ξαναδώ</button>
          </div>
        </div>)}
    </>
  );
}
