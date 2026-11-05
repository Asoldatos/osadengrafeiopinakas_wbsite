'use client';
import { useEffect, useState } from 'react';
import { soundOn, setSound, blip } from './sound';

export default function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(soundOn());
    const h = (e) => { if (e.target.closest?.('.btn, .chip, .ticket')) blip(520 + Math.random() * 200); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);
  return (
    <button type="button" className="icon-btn" aria-pressed={on} title={on ? 'Σίγαση ήχων' : 'Ενεργοποίηση ήχων'}
      aria-label={on ? 'Απενεργοποίηση ήχων' : 'Ενεργοποίηση ήχων'}
      onClick={() => { const v = !on; setOn(v); setSound(v); if (v) blip(784, 140); }}>
      <span aria-hidden="true">{on ? '🔊' : '🔇'}</span>
    </button>
  );
}
