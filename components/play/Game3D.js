'use client';
import { useEffect, useState } from 'react';
import Mascot from '../Mascot';
import { isVRHeadset, goToGame, vrSiteUrl, GAME_URL } from '@/lib/vrDetect';

/** Η μεγάλη κάρτα του 3D παιχνιδιού. Ανοίγει στην ΙΔΙΑ καρτέλα, με απαλή μετάβαση. Χωρίς αναδυόμενα. */
export default function Game3D() {
  const [vr, setVr] = useState(false);
  useEffect(() => { let alive = true; isVRHeadset().then((ok) => alive && setVr(ok)); return () => { alive = false; }; }, []);
  const play = (e) => { e.preventDefault(); goToGame(); };
  return (
    <section className="g3d" aria-labelledby="g3d-t">
      <div className="g3d-snow" aria-hidden="true" />
      <div className="g3d-b">
        <span className="g3d-new">ΝΕΟ · 3D · VR</span>
        <h2 id="g3d-t">Τα Χριστούγεννα του Κιμωλάκη</h2>
        <p>Ξυπνάς και όλη η πόλη είναι κάτασπρη. Το σχολείο είναι κλειστό, αλλά κάτι μυστήριο συμβαίνει στη γειτονιά… Μια μεγάλη χριστουγεννιάτικη περιπέτεια σε 3D, με 7 κεφάλαια.</p>
        <ul className="g3d-tags"><li>🖥️ Υπολογιστής</li><li>📱 Κινητό</li><li>🥽 Γυαλιά VR</li><li>⏱️ ~30 λεπτά</li></ul>
        <div className="btns">
          <a className="btn btn-primary" href={GAME_URL} onClick={play}>Παίξε τώρα →</a>
          {vr && <a className="btn btn-ghost" href={vrSiteUrl('/play')} onClick={(e) => { e.preventDefault(); goToGame(vrSiteUrl(location.pathname)); }}>🥽 Όλος ο ιστότοπος σε VR</a>}
        </div>
        <p className="g3d-note">Δεν χρειάζεται λογαριασμός — αλλά αν συνδεθείς, η πρόοδός σου αποθηκεύεται.</p>
      </div>
      <div className="g3d-m" aria-hidden="true"><Mascot mood="celebrate" size={170} costume="santa" /></div>
    </section>
  );
}
