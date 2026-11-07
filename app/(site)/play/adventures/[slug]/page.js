import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q } from '@/lib/db';
import { getStudent } from '@/lib/student';
import { plain } from '@/lib/util';
import { levelFor } from '@/lib/progress.mjs';
import { MascotSay } from '@/components/Mascot';
import AdventurePlayer from '@/components/play/AdventurePlayer';
export const dynamic = 'force-dynamic';
async function load(slug) { return plain((await q("select id, slug, title, description, unlock_level, xp_reward, scenes from adventures where slug=$1 and status='published'", [slug]))[0]); }
export async function generateMetadata({ params }) { const a = await load(params.slug).catch(() => null); return a ? { title: a.title, description: a.description, alternates: { canonical: `/play/adventures/${a.slug}` } } : { title: 'Περιπέτεια' }; }

export default async function Adventure({ params }) {
  const a = await load(params.slug);
  if (!a) notFound();
  const st = await getStudent();
  const need = a.unlock_level, level = st ? levelFor(st.xp) : 0;
  if (need > 0 && level < need) return (
    <div className="wrap narrow page-pad"><p><Link href="/play">← Όλες οι περιπέτειες</Link></p><h1 className="h1">🔒 {a.title}</h1>
      <div className="card">{!st ? <MascotSay mood="wave" k="locked" size={110}><div className="btns"><Link className="btn btn-primary" href="/account/register">Φτιάξε λογαριασμό</Link><Link className="btn btn-ghost" href={`/account/login?next=/play/adventures/${a.slug}`}>Σύνδεση</Link></div></MascotSay>
        : <MascotSay mood="reading" text={`Αυτή η περιπέτεια ξεκλειδώνει στο επίπεδο ${need}. Παίξε παιχνίδια και άλλες περιπέτειες για να κερδίσεις XP! (Τώρα είσαι στο επίπεδο ${level}.)`}><Link className="btn btn-primary sm" href="/play">Πάμε να παίξουμε</Link></MascotSay>}</div></div>);
  const prog = st ? (await q('select scene_id, finished from adventure_progress where student_id=$1 and adventure_id=$2', [st.id, a.id]))[0] : null;
  return (
    <div className="wrap narrow page-pad"><p><Link href="/play">← Όλες οι περιπέτειες</Link></p><h1 className="h1">{a.title}</h1>
      {!st && <p className="note-guest">🔒 Παίζεις ως επισκέπτης: η πρόοδός σου δεν αποθηκεύεται και δεν κερδίζεις XP. <Link href="/account/register">Φτιάξε λογαριασμό</Link></p>}
      <AdventurePlayer adventure={{ id: a.id, slug: a.slug, title: a.title, scenes: a.scenes, xp_reward: a.xp_reward }} signedIn={!!st} startScene={prog?.scene_id} finishedBefore={!!prog?.finished} /></div>
  );
}
