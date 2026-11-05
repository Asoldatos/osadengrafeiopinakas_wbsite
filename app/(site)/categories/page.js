import Link from 'next/link';
import { getCategories } from '@/lib/data';
import { MascotSay } from '@/components/Mascot';
export const metadata = { title: 'Κατηγορίες', description: 'Τα θέματα της εφημερίδας μας.', alternates: { canonical: '/categories' } };
export default async function Categories() {
  const cs = await getCategories();
  return (
    <div className="wrap page-pad"><h1 className="h1">Κατηγορίες</h1><p className="lede">Διάλεξε θέμα και βουτά μέσα.</p>
      {!cs.length ? <MascotSay mood="confused" k="empty" /> : <div className="tickets big">{cs.map((c, i) => (
        <Link key={c.id} href={`/articles?category=${c.slug}`} className="ticket" style={{ '--c': c.color, '--r': `${[-2, 1.5, -1, 2.5, -1.5][i % 5]}deg` }}>
          <span className="ticket-n">{c.name}</span>{c.description && <span className="ticket-d">{c.description}</span>}<span className="ticket-c">{c.count} {c.count === 1 ? 'άρθρο' : 'άρθρα'}</span></Link>))}</div>}
    </div>
  );
}
