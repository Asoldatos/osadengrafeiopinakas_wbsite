import Link from 'next/link';
import { publishedTutorials } from '@/lib/tutorialsData';

export const revalidate = 60;
export const metadata = { title: 'Οδηγοί βοήθειας', description: 'Απλοί οδηγοί βήμα-βήμα για ό,τι χρειάζεσαι στον ιστότοπο.', alternates: { canonical: '/help' } };

export default async function HelpHub() {
  const list = await publishedTutorials();
  return (
    <div className="wrap tut-hub">
      <header className="tut-hub-head"><span aria-hidden="true">📘</span><div><h1>Οδηγοί βοήθειας</h1><p>Απλοί οδηγοί βήμα-βήμα. Διάλεξε αυτό που χρειάζεσαι!</p></div></header>
      {list.length ? (
        <ul className="tut-cards">{list.map((t) => (
          <li key={t.slug}><Link href={`/help/${t.slug}`} className="tut-card"><span className="tut-card-i" aria-hidden="true">{t.icon}</span>
            <span><b>{t.title}</b>{t.subtitle && <small>{t.subtitle}</small>}</span><span className="tut-card-go" aria-hidden="true">→</span></Link></li>))}</ul>
      ) : <p className="muted">Δεν υπάρχουν ακόμα οδηγοί.</p>}
    </div>
  );
}
