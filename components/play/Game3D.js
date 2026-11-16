'use client';
import { useEffect, useState } from 'react';
import Mascot from '../Mascot';

const URL = '/game/xmas/index.html';
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

/** Η μεγάλη κάρτα του 3D παιχνιδιού + αναδυόμενο «VR DETECTED» (Quest) ή υπενθύμιση (υπολογιστής). */
export default function Game3D({ popup = true }) {
  const [vr, setVr] = useState(false), [pop, setPop] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      let ok = false; try { ok = !!(navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr'))); } catch {}
      if (!alive) return; setVr(ok);
      const quest = /OculusBrowser|Quest/i.test(navigator.userAgent), touch = matchMedia('(pointer: coarse)').matches && !quest;
      if (!popup || read('g3d:nopop') === '1' || sessionStorage.getItem('g3d:seen')) return;
      sessionStorage.setItem('g3d:seen', '1');
      setTimeout(() => alive && setPop(ok || quest ? 'vr' : touch ? 'mobile' : 'desktop'), 900);
    })();
    return () => { alive = false; };
  }, []);
  const open = () => { window.open(URL, '_blank', 'noopener'); setPop(null); };
  return (
    <>
      <section className="g3d" aria-labelledby="g3d-t">
        <div className="g3d-snow" aria-hidden="true" />
        <div className="g3d-b">
          <span className="g3d-new">ΝΕΟ · 3D · VR</span>
          <h2 id="g3d-t">Τα Χριστούγεννα του Κιμωλάκη</h2>
          <p>Ξυπνάς και όλη η πόλη είναι κάτασπρη. Το σχολείο είναι κλειστό, αλλά κάτι μυστήριο συμβαίνει στη γειτονιά… Μια μεγάλη χριστουγεννιάτικη περιπέτεια σε 3D, με 7 κεφάλαια.</p>
          <ul className="g3d-tags"><li>🖥️ Υπολογιστής</li><li>📱 Κινητό</li><li>🥽 Meta Quest (VR)</li><li>⏱️ ~30 λεπτά</li></ul>
          <div className="btns"><a className="btn btn-primary" href={URL} target="_blank" rel="noopener">Παίξε τώρα ↗</a>{vr && <a className="btn btn-ghost" href={URL} target="_blank" rel="noopener">🥽 Παίξε σε VR</a>}</div>
          <p className="g3d-note">Ανοίγει σε νέα καρτέλα. Δεν χρειάζεται λογαριασμός.</p>
        </div>
        <div className="g3d-m" aria-hidden="true"><Mascot mood="celebrate" size={170} costume="santa" /></div>
      </section>
      {pop && (
        <div className="g3d-pop-back" onClick={() => setPop(null)}>
          <div className="g3d-pop" role="dialog" aria-modal="true" aria-labelledby="g3dp-t" onClick={(e) => e.stopPropagation()}>
            {pop === 'vr' ? <><div className="g3d-pop-ico" aria-hidden="true">🥽</div><span className="g3d-vrd">VR DETECTED</span><h2 id="g3dp-t">Θέλεις να παίξεις σε λειτουργία VR;</h2>
              <p>Το νέο μας παιχνίδι «Τα Χριστούγεννα του Κιμωλάκη» παίζεται <b>μέσα</b> στο VR! Περπάτα στο χιονισμένο χωριό με τους μοχλούς και ρίξε χιονόμπαλες με τις σκανδάλες.</p><p className="g3d-allow">⚠️ Όταν ο browser ρωτήσει αν επιτρέπεται να χρησιμοποιηθεί το VR, πάτα <b>«Allow» / «Να επιτρέπεται»</b>.</p></>
              : <><div className="g3d-pop-ico" aria-hidden="true">🎄</div><h2 id="g3dp-t">Νέο παιχνίδι: Τα Χριστούγεννα του Κιμωλάκη!</h2>
              <p>{pop === 'mobile' ? 'Παίζεται και στο κινητό, σε πλήρη οθόνη με μοχλό αφής. Γύρνα το κινητό οριζόντια!' : 'Μια περιπέτεια σε 3D που παίζεται με ποντίκι και πληκτρολόγιο (WASD).'} <b>Έχεις Meta Quest;</b> Άνοιξε το osaden.gr από τον browser του γυαλιού και παίξ\' το σε VR!</p></>}
            <div className="btns"><button type="button" className="btn btn-primary" onClick={open}>{pop === 'vr' ? 'Ναι, σε VR!' : 'Παίξε τώρα ↗'}</button><button type="button" className="btn btn-ghost" onClick={() => setPop(null)}>Αργότερα</button></div>
            <button type="button" className="linkbtn" onClick={() => { write('g3d:nopop', '1'); setPop(null); }}>Να μην το ξαναδώ</button>
          </div>
        </div>)}
    </>
  );
}
