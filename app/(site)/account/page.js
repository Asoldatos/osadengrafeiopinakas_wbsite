import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { getStudent } from '@/lib/student';
import { plain, fmtDate } from '@/lib/util';
import Link from 'next/link';
import Mascot from '@/components/Mascot';
import XpBar from '@/components/play/XpBar';
import AccountSettings from '@/components/play/AccountSettings';
import { BADGES, GAMES } from '@/lib/progress.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ο λογαριασμός μου', robots: { index: false } };

export default async function Account() {
  const st = await getStudent();
  if (!st) redirect('/account/login?next=/account');
  const [badges, best, stories, dl] = (await Promise.all([
    q('select code from student_badges where student_id=$1', [st.id]),
    q('select game, max(score)::int s, count(*)::int n from game_scores where student_id=$1 group by game', [st.id]),
    q('select a.title, a.slug, p.finished_at from adventure_progress p join adventures a on a.id=p.adventure_id where p.student_id=$1 and p.finished order by p.finished_at desc', [st.id]),
    q('select e.title, e.slug, d.ts from downloads d join editions e on e.id=d.edition_id where d.student_id=$1 order by d.ts desc limit 5', [st.id]),
  ])).map(plain);
  const have = new Set(badges.map((b) => b.code)), bestBy = Object.fromEntries(best.map((b) => [b.game, b]));
  return (
    <div className="wrap page-pad">
      <header className="acc-head"><Mascot mood={st.avatar} size={120} /><div><h1 className="h1">Γεια σου, {st.nickname}!</h1><XpBar xp={st.xp} /></div></header>
      <section className="acc-sec"><h2 className="h2">Παράσημα <small>({have.size}/{Object.keys(BADGES).length})</small></h2>
        <ul className="badges">{Object.entries(BADGES).map(([c, b]) => <li key={c} className={`badge${have.has(c) ? ' on' : ''}`}><i aria-hidden="true">{have.has(c) ? b.icon : '🔒'}</i><b>{b.label}</b><small>{b.desc}</small></li>)}</ul></section>
      <section className="acc-sec"><h2 className="h2">Τα παιχνίδια μου</h2>
        <div className="mini-grid">{Object.entries(GAMES).map(([k, g]) => <Link key={k} href={`/play/games/${k}`} className="mini"><span aria-hidden="true">{g.icon}</span><b>{g.label}</b><small>{bestBy[k] ? `Καλύτερο σκορ: ${bestBy[k].s} · ${bestBy[k].n} παιχνίδια` : 'Δεν έχεις παίξει ακόμα'}</small></Link>)}</div></section>
      <section className="acc-sec"><h2 className="h2">Περιπέτειες που ολοκλήρωσα</h2>
        {!stories.length ? <p className="muted">Καμία ακόμα. <Link href="/play">Ξεκίνα μια περιπέτεια!</Link></p> : <ul className="plain">{stories.map((s) => <li key={s.slug}>📖 <Link href={`/play/adventures/${s.slug}`}>{s.title}</Link> <small className="muted">· {fmtDate(s.finished_at)}</small></li>)}</ul>}</section>
      {dl.length > 0 && <section className="acc-sec"><h2 className="h2">Πρόσφατες λήψεις</h2><ul className="plain">{dl.map((d, i) => <li key={i}>🖨️ <Link href={`/editions/${d.slug}`}>{d.title}</Link> <small className="muted">· {fmtDate(d.ts)}</small></li>)}</ul></section>}
      <section className="acc-sec"><h2 className="h2">Ρυθμίσεις</h2><AccountSettings nickname={st.nickname} avatar={st.avatar} /></section>
    </div>
  );
}
