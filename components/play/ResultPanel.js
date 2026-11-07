'use client';
import { MascotSay } from '../Mascot';
import { BADGES } from '@/lib/progress.mjs';
import { levelInfo } from '@/lib/progress.mjs';

/** Αποτέλεσμα παιχνιδιού: XP, επίπεδο, νέα παράσημα. xp = απάντηση του διακομιστή (ή null για επισκέπτες). */
export default function ResultPanel({ mood = 'celebrate', title, lines = [], xp, guest, error, children }) {
  const info = xp ? levelInfo(xp.total) : null;
  return (
    <div className="result" role="status" aria-live="polite">
      <MascotSay mood={xp?.leveledUp ? 'celebrate' : mood} text={xp?.leveledUp ? `Ανέβηκες στο επίπεδο ${xp.level}! Συνέχισε έτσι!` : title} size={110} />
      {lines.length > 0 && <ul className="rlines">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>}
      {error && <p className="err">{error}</p>}
      {guest && <p className="note-guest">🔒 Φτιάξε έναν δωρεάν λογαριασμό για να κερδίζεις πόντους XP, παράσημα και να ξεκλειδώνεις περισσότερα παιχνίδια! <a className="btn btn-primary sm" href="/account/register">Δημιουργία λογαριασμού</a></p>}
      {xp && (<div className="xpgain">
        <b>{xp.gained > 0 ? `+${xp.gained} XP` : 'Δεν κέρδισες XP αυτή τη φορά'}</b>
        {xp.capped && <small> Έφτασες το ημερήσιο όριο XP, έλα ξανά αύριο!</small>}
        <div className="xpbar" aria-hidden="true"><span style={{ width: `${info.pct}%` }} /></div><small>Επίπεδο {info.level} · {xp.total} XP</small>
        {xp.badges?.length > 0 && <div className="newbadges">{xp.badges.map((c) => <span key={c} className="badge on" title={BADGES[c]?.desc}><i>{BADGES[c]?.icon}</i>Νέο παράσημο: {BADGES[c]?.label}</span>)}</div>}
      </div>)}
      <div className="btns center">{children}</div>
    </div>
  );
}
