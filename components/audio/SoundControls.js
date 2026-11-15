'use client';
import { useEffect, useRef, useState } from 'react';
import { audio } from './engine';

/** Σταθερό component (εκτός render): αλλιώς κάθε αλλαγή έντασης «ξαναέφτιαχνε» τον ρυθμιστή και το μενού έκλεινε. */
function Row({ k, label, value }) {
  return <label className="snd-row"><span>{label} <b>{Math.round(value * 100)}%</b></span><input type="range" min="0" max="1" step="0.05" value={value} onChange={(e) => audio().setVolume(k, +e.target.value)} aria-label={`Ένταση: ${label}`} /></label>;
}
const SEL = '.btn, .chip, .ticket, .icon-btn, .key, .opt, .gcard, .acct, .linkbtn, .secname, .tabs [role=tab]';
/** Κουμπί ήχου με αναδυόμενο πάνελ: σίγαση και ένταση (γενική, μουσική, εφέ). Επίσης ενεργοποιεί τους ήχους κλικ σε όλο τον ιστότοπο. */
export default function SoundControls({ showMusic = false }) {
  const [st, setSt] = useState({ muted: false, vol: { master: 0.8, music: 0.6, sfx: 0.85, ui: 0.55 } }), [open, setOpen] = useState(false), ref = useRef(null);
  useEffect(() => {
    const a = audio(); setSt(a.state()); const off = a.subscribe(setSt);
    const click = (e) => { const el = e.target.closest?.(SEL); if (el && !el.disabled && !el.closest('.no-sfx')) a.ui('click', { volume: 0.8 }); };
    document.addEventListener('click', click, true);
    const away = (e) => { if (ref.current && e.target.isConnected && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { off(); document.removeEventListener('click', click, true); document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, []);
  const a = () => audio();
  return (
    <div className="snd" ref={ref}>
      <button type="button" className="icon-btn no-sfx" aria-expanded={open} aria-haspopup="true" aria-label={st.muted ? 'Ήχος: σίγαση. Ρυθμίσεις ήχου' : 'Ήχος: ενεργός. Ρυθμίσεις ήχου'} title="Ήχος" onClick={() => setOpen(!open)}>
        <span aria-hidden="true">{st.muted ? '🔇' : st.musicOn ? '🎶' : '🔊'}</span></button>
      {open && (
        <div className="snd-pop" role="dialog" aria-label="Ρυθμίσεις ήχου">
          <button type="button" className={`btn sm ${st.muted ? 'btn-primary' : 'btn-ghost'} block`} onClick={() => a().setMuted(!st.muted)}>{st.muted ? '🔊 Ενεργοποίηση ήχου' : '🔇 Σίγαση'}</button>
          <Row k="master" label="Γενική ένταση" value={st.vol.master} />{showMusic && <Row k="music" label="Μουσική" value={st.vol.music} />}<Row k="sfx" label="Εφέ" value={st.vol.sfx} /><Row k="ui" label="Κλικ και σελίδες" value={st.vol.ui} />
          {st.musicPending && !st.muted && <p className="snd-note">🎵 Η μουσική θα ξεκινήσει με το πρώτο σου κλικ.</p>}
        </div>)}
    </div>
  );
}
