import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticle, getRelated, getAdjacent, getSite } from '@/lib/data';
import { getAdmin } from '@/lib/auth';
import Pic from '@/components/Pic';
import ReadingProgress from '@/components/ReadingProgress';
import ShareButtons from '@/components/ShareButtons';
import { imageOnly } from '@/lib/media';
import { fmtDate, toEmbed, safeUrl, SITE_URL } from '@/lib/util';

async function load(params, sp) {
  const admin = sp?.preview ? await getAdmin() : null;
  return getArticle(decodeURIComponent(params.slug), !!admin);
}
export async function generateMetadata({ params, searchParams }) {
  const a = await load(params, searchParams);
  if (!a) return { title: 'Δεν βρέθηκε το άρθρο' };
  const desc = a.seo_desc || a.subtitle || a.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  return {
    title: a.seo_title || a.title, description: desc, alternates: { canonical: `/articles/${a.slug}` },
    robots: a.status !== 'published' ? { index: false } : undefined,
    openGraph: { type: 'article', title: a.seo_title || a.title, description: desc, publishedTime: a.date, images: imageOnly(a.cover_url) ? [imageOnly(a.cover_url)] : undefined },
  };
}
export default async function ArticlePage({ params, searchParams }) {
  const a = await load(params, searchParams);
  if (!a) notFound();
  const [rel, adj, site] = await Promise.all([getRelated(a), getAdjacent(a), getSite()]);
  const words = a.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  const url = `${SITE_URL}/articles/${a.slug}`;
  const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, description: a.subtitle || undefined, datePublished: a.date, dateModified: a.updated_at,
    image: imageOnly(a.cover_url) ? [imageOnly(a.cover_url)] : undefined, author: a.author_name ? [{ '@type': 'Person', name: a.author_name }] : undefined, publisher: { '@type': 'Organization', name: site.name }, mainEntityOfPage: url, inLanguage: 'el' };
  return (
    <>
      <ReadingProgress />
      {a.status !== 'published' && <div className="adminbar">Προεπισκόπηση — το άρθρο δεν είναι δημόσιο ({a.status === 'draft' ? 'πρόχειρο' : a.status}).</div>}
      <article className="article">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
        <header className="wrap narrow art-head">
          {a.category_name && <Link href={`/articles?category=${a.category_slug}`} className="tag" style={{ '--c': a.category_color }}>{a.category_name}</Link>}
          <h1 className="art-title">{a.title}</h1>{a.subtitle && <p className="lede">{a.subtitle}</p>}
          <div className="byline">
            {a.author_photo ? <Pic src={a.author_photo} alt="" ratio="1/1" className="avatar" sizes="48px" /> : <span className="avatar avatar-i" aria-hidden="true">{(a.author_name || '?').charAt(0)}</span>}
            <div><strong>{a.author_name || 'Η σύνταξη'}</strong>{a.author_role && <span className="role"> · {a.author_role}</span>}<br /><span className="meta"><time dateTime={a.date}>{fmtDate(a.date)}</time> · {mins} λεπτά ανάγνωσης</span></div>
          </div>
        </header>
        {a.cover_url && <div className="wrap art-cover"><Pic src={a.cover_url} alt="" ratio="16/8" priority sizes="1100px" className="framed" /></div>}
        <div className="wrap narrow">
          <div id="article-body" className="prose big" dangerouslySetInnerHTML={{ __html: a.content }} />
          {(a.videos || []).map((v, i) => { const e = toEmbed(v); return e ? <figure key={i} className="art-fig">{e.kind === 'video' ? <video className="hs-media" src={e.src} controls playsInline preload="metadata" /> : <div className="embed"><iframe src={e.src} title={`Βίντεο ${i + 1}`} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div>}</figure> : null; })}
          {a.gallery?.length > 0 && <div className="gal art-gal">{a.gallery.map((g, i) => <Pic key={i} src={g} alt={`Εικόνα ${i + 1} του άρθρου`} ratio="4/3" sizes="(max-width:800px) 50vw, 33vw" />)}</div>}
          {a.links?.length > 0 && <aside className="linkbox"><h2>Σύνδεσμοι</h2><ul>{a.links.map((l, i) => <li key={i}><a href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer">{l.label || l.url} ↗</a></li>)}</ul></aside>}
          {a.tags?.length > 0 && <p className="tags">{a.tags.map((t) => <Link key={t} className="chip" href={`/articles?tag=${encodeURIComponent(t)}`}>#{t}</Link>)}</p>}
          <ShareButtons url={url} title={a.title} />
          {a.author_name && a.author_bio && <aside className="authorbox"><strong>{a.author_name}</strong><p>{a.author_bio}</p></aside>}
          <nav className="prevnext" aria-label="Άλλα άρθρα">
            {adj.prev ? <Link href={`/articles/${adj.prev.slug}`}><small>← Προηγούμενο</small><span>{adj.prev.title}</span></Link> : <span />}
            {adj.next ? <Link href={`/articles/${adj.next.slug}`} className="r"><small>Επόμενο →</small><span>{adj.next.title}</span></Link> : <span />}
          </nav>
        </div>
        {rel.length > 0 && <section className="wrap rel"><h2 className="h2">Σχετικά άρθρα</h2><div className="grid">{rel.map((r) => (
          <Link key={r.id} href={`/articles/${r.slug}`} className="acard"><Pic src={r.cover_url} alt="" ratio="16/10" /><div className="acard-b"><h3>{r.title}</h3><p className="meta">{fmtDate(r.date)}</p></div></Link>))}</div></section>}
      </article>
    </>
  );
}
