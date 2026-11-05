import Link from 'next/link';
import { getArticles, getCategories } from '@/lib/data';
import Pic from '@/components/Pic';
import { MascotSay } from '@/components/Mascot';
import { fmtDate } from '@/lib/util';

export const metadata = { title: 'Άρθρα', description: 'Όλα τα άρθρα της σχολικής εφημερίδας.', alternates: { canonical: '/articles' } };
const PER = 12;
export default async function Articles({ searchParams }) {
  const sp = searchParams; const page = Math.max(1, +sp.page || 1);
  const cat = typeof sp.category === 'string' ? sp.category : '', tag = typeof sp.tag === 'string' ? sp.tag : '', search = typeof sp.q === 'string' ? sp.q.trim() : '';
  const [{ rows, total }, cats] = await Promise.all([getArticles({ limit: PER, offset: (page - 1) * PER, category: cat, search, tag }), getCategories()]);
  const pages = Math.ceil(total / PER);
  const href = (p) => { const u = new URLSearchParams(); if (cat) u.set('category', cat); if (tag) u.set('tag', tag); if (search) u.set('q', search); if (p > 1) u.set('page', p); return `/articles${u.size ? '?' + u : ''}`; };
  const filtered = cat || tag || search;
  return (
    <div className="wrap page-pad">
      <h1 className="h1">Άρθρα</h1>
      <form className="filters" role="search" action="/articles" method="get">
        <label className="sr-only" htmlFor="q">Αναζήτηση άρθρων</label>
        <input id="q" name="q" type="search" defaultValue={search} placeholder="Αναζήτηση άρθρων…" />
        {cat && <input type="hidden" name="category" value={cat} />}{tag && <input type="hidden" name="tag" value={tag} />}
        <button className="btn btn-primary" type="submit">Αναζήτηση</button>
      </form>
      <div className="chips" aria-label="Φίλτρο κατηγορίας">
        <Link className={`chip${!cat ? ' on' : ''}`} href={search ? `/articles?q=${encodeURIComponent(search)}` : '/articles'}>Όλα</Link>
        {cats.map((c) => <Link key={c.id} className={`chip${cat === c.slug ? ' on' : ''}`} style={{ '--c': c.color }} href={`/articles?category=${c.slug}${search ? `&q=${encodeURIComponent(search)}` : ''}`}>{c.name}</Link>)}
        {tag && <Link className="chip on" href="/articles">#{tag} ✕</Link>}
      </div>
      {!rows.length ? <MascotSay mood="confused" k={filtered ? 'noResults' : 'articles'} size={150} /> : (
        <div className="grid">
          {rows.map((a) => (
            <Link key={a.id} href={`/articles/${a.slug}`} className="acard">
              <Pic src={a.cover_url} alt="" ratio="16/10" />
              <div className="acard-b">{a.category_name && <span className="tag" style={{ '--c': a.category_color }}>{a.category_name}</span>}
                <h2>{a.title}</h2>{a.subtitle && <p>{a.subtitle}</p>}<p className="meta">{a.author_name ? `${a.author_name} · ` : ''}{fmtDate(a.date)}</p></div>
            </Link>))}
        </div>)}
      {pages > 1 && <nav className="pager" aria-label="Σελιδοποίηση">
        {page > 1 && <Link className="btn btn-ghost" href={href(page - 1)}>← Προηγούμενη</Link>}<span>Σελίδα {page} από {pages}</span>
        {page < pages && <Link className="btn btn-ghost" href={href(page + 1)}>Επόμενη →</Link>}</nav>}
    </div>
  );
}
