import Link from 'next/link';
import { q } from '@/lib/db';
import { getAdmin } from '@/lib/auth';
import { getSite } from '@/lib/data';
import { MascotSay } from '@/components/Mascot';
export const metadata = { title: 'Πίνακας ελέγχου' };

export default async function Dashboard() {
  const u = await getAdmin(); const site = await getSite();
  const [a, ed, w, act, media] = await Promise.all([
    q("select count(*)::int total, count(*) filter (where status='published' and (publish_at is null or publish_at<=now()))::int pub, count(*) filter (where status='draft')::int draft, count(*) filter (where status='published' and publish_at>now())::int sched from articles"),
    q("select count(*)::int total, count(*) filter (where status='published')::int pub from editions"),
    q('select count(*)::int total from authors'),
    q('select user_name, action, detail, ts from activity order by id desc limit 10'),
    q("select id,url,name,mime from media order by id desc limit 8"),
  ]);
  const cards = [['Συνολικά άρθρα', a[0].total], ['Δημοσιευμένα', a[0].pub], ['Πρόχειρα', a[0].draft], ['Προγραμματισμένα', a[0].sched], ['Τεύχη', ed[0].total], ['Συντάκτες', w[0].total]];
  return (
    <div>
      <h1>Καλώς ήρθες{u.name ? `, ${u.name}` : ''}!</h1>
      <div className="stats">{cards.map(([l, n]) => <div key={l} className="stat"><b>{n}</b><span>{l}</span></div>)}</div>
      {!u.totp_enabled && <div className="card warn"><MascotSay mood="phone" k="twofa" size={90}><Link className="btn btn-primary sm" href="/editor-panel/security">Ενεργοποίηση 2FA</Link></MascotSay></div>}
      <div className="cols">
        <section className="card"><h2>Γρήγορες ενέργειες</h2><div className="qa">
          <Link className="btn btn-primary" href="/editor-panel/articles">📝 Νέο άρθρο</Link><Link className="btn btn-ghost" href="/editor-panel/editions">📰 Νέο τεύχος</Link>
          {u.role === 'admin' && <Link className="btn btn-ghost" href="/editor-panel/builder">🎨 Σχεδιαστής ιστοτόπου</Link>}<Link className="btn btn-ghost" href="/editor-panel/media">🖼️ Πολυμέσα</Link></div>
          <h2>Κατάσταση ιστοτόπου</h2>
          <p><span className={`pill ${site.maintenance?.enabled ? 'draft' : 'published'}`}>{site.maintenance?.enabled ? 'Λειτουργία συντήρησης' : 'Σε λειτουργία'}</span> · Βάση δεδομένων: <span className="pill published">συνδεδεμένη</span></p>
        </section>
        <section className="card"><h2>Πρόσφατη δραστηριότητα</h2>
          {!act.length ? <p className="muted">Δεν υπάρχει ακόμα δραστηριότητα.</p> : <ul className="feed">{act.map((x, i) => <li key={i}><b>{x.action}</b>{x.detail && `: ${x.detail}`}<small>{x.user_name} · {new Date(x.ts).toLocaleString('el-GR')}</small></li>)}</ul>}</section>
      </div>
      <section className="card"><h2>Πρόσφατες μεταφορτώσεις</h2>
        {!media.length ? <p className="muted">Δεν έχουν ανέβει αρχεία ακόμα.</p> : <div className="mrow">{media.map((m) => m.mime.startsWith('image/') ? <img key={m.id} src={m.url} alt={m.name} loading="lazy" /> : <span key={m.id} className="pdfthumb sm" title={m.name}>PDF</span>)}</div>}</section>
    </div>
  );
}
