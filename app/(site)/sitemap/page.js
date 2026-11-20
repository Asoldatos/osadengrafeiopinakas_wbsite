import Link from 'next/link';
import { sitemapGroups } from '@/lib/sitemapData';

export const revalidate = 600;
export const metadata = { title: 'Χάρτης ιστοτόπου', description: 'Όλες οι σελίδες του ιστοτόπου σε μία λίστα: άρθρα, τεύχη, παιχνίδια και οδηγοί.', alternates: { canonical: '/sitemap' } };

/** Ο χάρτης του ιστοτόπου για τους επισκέπτες (το /sitemap.xml είναι για τις μηχανές αναζήτησης). */
export default async function SitemapPage() {
  const groups = await sitemapGroups();
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="wrap smap">
      <header className="smap-head"><span aria-hidden="true">🗺️</span><div><h1>Χάρτης ιστοτόπου</h1><p>Όλες οι σελίδες μας σε μία λίστα — {total} συνολικά.</p></div></header>
      <nav className="smap-jump" aria-label="Μετάβαση σε ενότητα">{groups.map((g) => <a key={g.id} href={`#${g.id}`}>{g.icon} {g.title} <small>{g.items.length}</small></a>)}</nav>
      <div className="smap-grid">
        {groups.map((g) => (
          <section key={g.id} id={g.id} className="smap-sec" aria-labelledby={`${g.id}-h`}>
            <h2 id={`${g.id}-h`}><span aria-hidden="true">{g.icon}</span> {g.title} <small>({g.items.length})</small></h2>
            <ul>{g.items.map((it) => <li key={it.path}>{it.path.startsWith('/game/') ? <a href={it.path}>{it.title}</a> : <Link href={it.path}>{it.title}</Link>}</li>)}</ul>
          </section>))}
      </div>
    </div>
  );
}
