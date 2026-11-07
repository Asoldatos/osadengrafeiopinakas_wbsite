import { levelInfo } from '@/lib/progress.mjs';
export default function XpBar({ xp }) {
  const i = levelInfo(xp);
  return (<div className="xpwrap"><p className="xplabel"><b>Επίπεδο {i.level}</b> · {xp} XP <small>(επόμενο επίπεδο στα {i.next} XP)</small></p>
    <div className="xpbar" role="progressbar" aria-label="Πρόοδος επιπέδου" aria-valuemin={0} aria-valuemax={100} aria-valuenow={i.pct}><span style={{ width: `${i.pct}%` }} /></div></div>);
}
