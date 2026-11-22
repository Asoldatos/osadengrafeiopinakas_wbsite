import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVideo, getVideos } from '@/lib/data';
import { fmtDate, SITE_URL } from '@/lib/util';
export const revalidate = 300;

export async function generateMetadata({ params }) {
  const v = await getVideo(decodeURIComponent(params.slug));
  if (!v) return { title: 'Δεν βρέθηκε το βίντεο' };
  return { title: v.title, description: v.description?.slice(0, 160) || undefined, alternates: { canonical: `/videos/${v.slug}` }, openGraph: { type: 'video.other', title: v.title, images: [`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`] } };
}
export default async function VideoPage({ params }) {
  const v = await getVideo(decodeURIComponent(params.slug));
  if (!v) notFound();
  const more = (await getVideos()).filter((x) => x.id !== v.id).slice(0, 6);
  const ld = { '@context': 'https://schema.org', '@type': 'VideoObject', name: v.title, description: v.description || v.title, thumbnailUrl: [`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`], uploadDate: v.date, embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtube_id}`, url: `${SITE_URL}/videos/${v.slug}`, inLanguage: 'el' };
  return (
    <div className="wrap page-pad vpage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <p><Link href="/videos" className="linkbtn">← Όλα τα βίντεο</Link></p>
      <div className="embed vembed"><iframe src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?rel=0&modestbranding=1`} title={v.title} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
      <h1 className="h1 vtitle">{v.title}</h1>
      <p className="meta">{fmtDate(v.date)}</p>
      {v.description && <div className="prose"><p style={{ whiteSpace: 'pre-line' }}>{v.description}</p></div>}
      {v.article_slug && <p><Link className="btn btn-primary" href={`/articles/${v.article_slug}`}>📰 Διάβασε το άρθρο: {v.article_title}</Link></p>}
      {more.length > 0 && <section className="rel"><h2 className="h2">Δες επίσης</h2><div className="vgrid">{more.map((x) => (
        <Link key={x.id} href={`/videos/${x.slug}`} className="vcard"><span className="vthumb"><img src={`https://i.ytimg.com/vi/${x.youtube_id}/hqdefault.jpg`} alt="" loading="lazy" width="480" height="360" /><span className="vplay" aria-hidden="true">▶</span></span><span className="vcard-b"><b>{x.title}</b></span></Link>))}</div></section>}
    </div>
  );
}
