import Link from 'next/link';
import { notFound } from 'next/navigation';
import TutorialView from '@/components/TutorialView';
import { getTutorial, publishedTutorials } from '@/lib/tutorialsData';
import { tutorialVars } from '@/lib/tutorials.mjs';
import { getAdmin } from '@/lib/auth';
import { can } from '@/lib/perms.mjs';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const t = await getTutorial(params.slug);
  return t ? { title: t.title, description: t.subtitle || undefined, alternates: { canonical: `/help/${t.slug}` } } : { title: 'Οδηγός' };
}
export default async function TutorialPage({ params }) {
  let t = await getTutorial(params.slug), draft = false;
  if (!t) { const admin = await getAdmin(); if (can(admin, 'content')) { t = await getTutorial(params.slug, { includeDrafts: true }); draft = !!t; } }
  if (!t) notFound();
  const others = (await publishedTutorials()).filter((x) => x.slug !== t.slug).slice(0, 6);
  return (
    <div className="wrap tut-page">
      {draft && <p className="tut-draft">👀 Προεπισκόπηση: αυτός ο οδηγός δεν είναι δημοσιευμένος — τον βλέπουν μόνο οι διαχειριστές.</p>}
      <nav className="tut-crumb" aria-label="Διαδρομή"><Link href="/help">📘 Οδηγοί βοήθειας</Link> › <span>{t.title}</span></nav>
      <TutorialView t={t} vars={tutorialVars()} />
      {others.length > 0 && (
        <aside className="tut-more"><h2>Άλλοι οδηγοί</h2>
          <ul className="tut-cards">{others.map((o) => (
            <li key={o.slug}><Link href={`/help/${o.slug}`} className="tut-card"><span className="tut-card-i" aria-hidden="true">{o.icon}</span><span><b>{o.title}</b></span><span className="tut-card-go" aria-hidden="true">→</span></Link></li>))}</ul>
        </aside>)}
    </div>
  );
}
