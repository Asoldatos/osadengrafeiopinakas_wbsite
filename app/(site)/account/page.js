import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { getStudent } from '@/lib/student';
import { plain, fmtDate } from '@/lib/util';
import Link from 'next/link';
import Mascot from '@/components/Mascot';
import XpBar from '@/components/play/XpBar';
import AccountSettings from '@/components/play/AccountSettings';
import { BADGES, GAMES } from '@/lib/progress.mjs';
import Icon from '@/components/Icons';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ο λογαριασμός μου', robots: { index: false } };

export default async function Account() {
  const st = await getStudent();
  if (!st) redirect('/account/login?next=/account');
  const [badges, best, stories, dl, x3] = (await Promise.all([
    q('select code from student_badges where student_id=$1', [st.id]),
    q('select game, max(score)::int s, count(*)::int n from game_scores where student_id=$1 group by game', [st.id]),
    q('select a.title, a.slug, p.finished_at from adventure_progress p join adventures a on a.id=p.adventure_id where p.student_id=$1 and p.finished order by p.finished_at desc', [st.id]),
    q('select e.title, e.slug, d.ts from downloads d join editions e on e.id=d.edition_id where d.student_id=$1 order by d.ts desc limit 5', [st.id]),
    q('select max_ch, completed, completed_at from xmas3d_progress where student_id=$1', [st.id]).catch(() => []),
  ])).map(plain);
  const xm = x3[0];
  const cm = (await q(`select (select count(*)::int from dm_messages where (a=$1 or b=$1) and sender<>$1 and read_at is null) m,
    (select count(*)::int from friendships where (a=$1 or b=$1) and status='pending' and requester<>$1) r,
    (select count(*)::int from friendships where (a=$1 or b=$1) and status='accepted') f`, [st.id]).catch(() => [{ m: 0, r: 0, f: 0 }]))[0];
  const have = new Set(badges.map((b) => b.code)), bestBy = Object.fromEntries(best.map((b) => [b.game, b]));
  return (
    <div className="wrap page-pad">
      <header className="acc-head"><Mascot mood={st.avatar} size={120} /><div><h1 className="h1">Γεια σου, {st.nickname}!</h1><XpBar xp={st.xp} /></div></header>
      <section className="acc-sec"><h2 className="h2">Η παρέα μου</h2><div className="acc-comm">
        <a href={process.env.NEXT_PUBLIC_CHAT_URL || '/chat'} className="mini mini-big c-chat"><span aria-hidden="true"><Icon name="chat" size={26} /></span><b>Chat & μηνύματα{cm.m > 0 && <span className="cbadge">{cm.m}</span>}</b><small>{cm.m > 0 ? `${cm.m} αδιάβαστα μηνύματα` : 'Servers, μηνύματα 🔒 και κλήσεις'}</small></a>
        <Link href="/account/friends" className="mini mini-big c-fr"><span aria-hidden="true"><Icon name="users" size={26} /></span><b>Φίλοι{cm.r > 0 && <span className="cbadge">{cm.r}</span>}</b><small>{cm.r > 0 ? `${cm.r} νέα αιτήματα φιλίας` : `${cm.f} ${cm.f === 1 ? 'φίλος' : 'φίλοι'} · πρόσθεσε κι άλλους`}</small></Link>
        <Link href="/videos" className="mini mini-big c-vid"><span aria-hidden="true"><Icon name="film" size={26} /></span><b>Βίντεο</b><small>Τα άρθρα μας σε βίντεο</small></Link>
        <Link href="/contact?kind=article" className="mini mini-big c-write"><span aria-hidden="true"><Icon name="pen" size={26} /></span><b>Γράψε κι εσύ</b><small>Στείλε μας ιδέα ή το δικό σου άρθρο</small></Link></div></section>
      <section className="acc-sec"><h2 className="h2">Παράσημα <small>({have.size}/{Object.keys(BADGES).length})</small></h2>
        <ul className="badges">{Object.entries(BADGES).map(([c, b]) => <li key={c} className={`badge${have.has(c) ? ' on' : ''}`}><i aria-hidden="true">{have.has(c) ? b.icon : '🔒'}</i><b>{b.label}</b><small>{b.desc}</small></li>)}</ul></section>
      <section className="acc-sec"><h2 className="h2">Τα παιχνίδια μου</h2>
        <div className="mini-grid">{Object.entries(GAMES).map(([k, g]) => <Link key={k} href={`/play/games/${k}`} className="mini"><span aria-hidden="true">{g.icon}</span><b>{g.label}</b><small>{bestBy[k] ? `Καλύτερο σκορ: ${bestBy[k].s} · ${bestBy[k].n} παιχνίδια` : 'Δεν έχεις παίξει ακόμα'}</small></Link>)}</div></section>
      <section className="acc-sec"><h2 className="h2">🎄 Τα Χριστούγεννα του Κιμωλάκη (3D)</h2>
        <div className="x3-card"><div className="x3-bar" role="progressbar" aria-valuemin={0} aria-valuemax={7} aria-valuenow={xm ? (xm.completed ? 7 : xm.max_ch + 1) : 0}><span style={{ width: `${xm ? (xm.completed ? 100 : Math.round(((xm.max_ch + 1) / 7) * 100)) : 0}%` }} /></div>
          <p>{!xm ? 'Δεν έχεις αποθηκευμένη πρόοδο ακόμα.' : xm.completed ? <>✅ <b>Ολοκληρώθηκε</b> στις {fmtDate(xm.completed_at)} — Ήρωας των Χριστουγέννων!</> : <>Έφτασες στο <b>κεφάλαιο {xm.max_ch + 1}</b> από 7.</>}</p>
          <a className="btn btn-primary" href="/game/xmas/index.html?claim=1">{xm?.completed ? 'Παίξε ξανά' : xm ? 'Συνέχισε το παιχνίδι' : 'Παίξε / αποθήκευσε την πρόοδο αυτής της συσκευής'} →</a></div></section>
      <section className="acc-sec"><h2 className="h2">Περιπέτειες που ολοκλήρωσα</h2>
        {!stories.length ? <p className="muted">Καμία ακόμα. <Link href="/play">Ξεκίνα μια περιπέτεια!</Link></p> : <ul className="plain">{stories.map((s) => <li key={s.slug}><Link href={`/play/adventures/${s.slug}`}>{s.title}</Link> <small className="muted">· {fmtDate(s.finished_at)}</small></li>)}</ul>}</section>
      {dl.length > 0 && <section className="acc-sec"><h2 className="h2">Πρόσφατες λήψεις</h2><ul className="plain">{dl.map((d, i) => <li key={i}><Link href={`/editions/${d.slug}`}>{d.title}</Link> <small className="muted">· {fmtDate(d.ts)}</small></li>)}</ul></section>}
      <section className="acc-sec"><h2 className="h2">Ρυθμίσεις</h2><AccountSettings nickname={st.nickname} avatar={st.avatar} /></section>
    </div>
  );
}
