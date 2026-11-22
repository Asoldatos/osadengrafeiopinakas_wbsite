import Link from 'next/link';
import Mascot from '@/components/Mascot';
import { getVideos } from '@/lib/data';
import { fmtDate } from '@/lib/util';
export const revalidate = 300;
export const metadata = { title: 'Βίντεο', description: 'Τα άρθρα μας σε βίντεο, με κινούμενα σχέδια και αφήγηση.', alternates: { canonical: '/videos' } };

export default async function Videos() {
  const v = await getVideos();
  return (
    <div className="wrap page-pad">
      <header className="vid-head"><Mascot mood="celebrate" size={110} /><div><h1 className="h1">Βίντεο 🎬</h1><p className="lede">Τα άρθρα μας ζωντανεύουν: κινούμενα σχέδια, αφήγηση και ο Κιμωλάκης σε ρόλο παρουσιαστή!</p></div></header>
      {!v.length ? <p className="muted">Τα πρώτα βίντεο έρχονται σύντομα! 🍿</p> : (
        <div className="vgrid">{v.map((x) => (
          <Link key={x.id} href={`/videos/${x.slug}`} className="vcard">
            <span className="vthumb"><img src={`https://i.ytimg.com/vi/${x.youtube_id}/hqdefault.jpg`} alt="" loading="lazy" width="480" height="360" /><span className="vplay" aria-hidden="true">▶</span></span>
            <span className="vcard-b"><b>{x.title}</b><small>{fmtDate(x.date)}{x.article_title ? ' · από το άρθρο' : ''}</small></span>
          </Link>))}</div>)}
    </div>
  );
}
