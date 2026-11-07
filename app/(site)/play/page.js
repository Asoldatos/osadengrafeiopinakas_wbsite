import Link from 'next/link';
import { q } from '@/lib/db';
import { getStudent } from '@/lib/student';
import { plain } from '@/lib/util';
import Pic from '@/components/Pic';
import XpBar from '@/components/play/XpBar';
import { MascotSay } from '@/components/Mascot';
import { GAMES, levelFor } from '@/lib/progress.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Παιχνίδια και περιπέτειες', description: 'Παιχνίδια, κουίζ και περιπέτειες με τον Κιμωλάκη. Φτιάξε λογαριασμό μαθητή και ξεκλείδωσε τα πάντα!', alternates: { canonical: '/play' } };

export default async function Play() {
  const st = await getStudent(); const level = st ? levelFor(st.xp) : 0;
  const advs = plain(await q("select id, slug, title, description, cover_url, unlock_level, xp_reward from adventures where status='published' order by sort, id"));
  const done = new Set(st ? (await q('select adventure_id from adventure_progress where student_id=$1 and finished', [st.id])).map((r) => r.adventure_id) : []);
  return (
    <div className="wrap page-pad">
      <h1 className="h1">Παιχνίδια και περιπέτειες</h1>
      {st ? <div className="card playbar"><p>Γεια σου, <b>{st.nickname}</b>!</p><XpBar xp={st.xp} /><Link className="btn btn-ghost sm" href="/account">Ο λογαριασμός μου</Link></div>
        : <div className="card invite"><MascotSay mood="wave" k="locked" size={110}><div className="btns"><Link className="btn btn-primary" href="/account/register">Φτιάξε λογαριασμό</Link><Link className="btn btn-ghost" href="/account/login">Έχω ήδη λογαριασμό</Link></div></MascotSay></div>}
      <h2 className="h2">🎮 Παιχνίδια</h2>
      <div className="cards4">{Object.entries(GAMES).map(([k, g]) => { const open = g.public || !!st; return (
        <Link key={k} href={`/play/games/${k}`} className={`gcard${open ? '' : ' locked'}`}><span className="gicon" aria-hidden="true">{g.icon}</span><h3>{g.label}</h3><p>{g.desc}</p>
          <span className="gtag">{open ? (g.public && !st ? 'Δωρεάν δοκιμή' : 'Παίξε →') : '🔒 Με λογαριασμό'}</span></Link>); })}</div>
      <h2 className="h2">🗺️ Περιπέτειες με τον Κιμωλάκη</h2>
      {!advs.length ? <MascotSay mood="reading" text="Οι περιπέτειες ετοιμάζονται! Έλα ξανά σύντομα." /> : (
        <div className="cards3">{advs.map((a) => {
          const lock = a.unlock_level > 0 && (!st ? '🔒 Με λογαριασμό' : level < a.unlock_level ? `🔒 Ξεκλειδώνει στο επίπεδο ${a.unlock_level}` : '');
          return (<Link key={a.id} href={`/play/adventures/${a.slug}`} className={`acard adv-card${lock ? ' locked' : ''}`}><Pic src={a.cover_url} alt="" ratio="16/9" />
            <div className="acard-b"><h3>{a.title}</h3><p>{a.description}</p><p className="meta">{done.has(a.id) ? '✔ Ολοκληρωμένη' : lock || (a.unlock_level === 0 && !st ? 'Δωρεάν για όλους' : `Κέρδισε ${a.xp_reward} XP`)}</p></div></Link>);
        })}</div>)}
    </div>
  );
}
