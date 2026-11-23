import Link from 'next/link';
import Mascot from '../Mascot';
import { getVideos } from '@/lib/data';
import { getStudent } from '@/lib/student';
import { getCommunity } from '@/lib/communityServer';
import Icon from '../Icons';

/** Ενότητα της αρχικής που δείχνει καθαρά τις λειτουργίες κοινότητας: βίντεο, φίλοι & μηνύματα, σχόλια, «γράψε κι εσύ». */
export default async function CommunityStrip() {
  const [videos, st, c] = await Promise.all([getVideos(), getStudent(), getCommunity()]);
  const v = videos[0];
  const social = c.friends || c.messages || c.chat;
  const CHAT = process.env.NEXT_PUBLIC_CHAT_URL || '/chat';
  return (
    <section className="cstrip wrap" aria-labelledby="cstrip-t">
      <div className="cstrip-head"><Mascot mood="celebrate" size={96} /><div><span className="cstrip-k">ΝΕΟ ΣΤΗΝ ΠΑΡΕΑ</span><h2 id="cstrip-t" className="h2">Η εφημερίδα έγινε κοινότητα!</h2>
        <p>Δες βίντεο, γράψε τη γνώμη σου στα άρθρα, κάνε φίλους και στείλε μας τη δική σου ιδέα.</p></div></div>
      <div className="cstrip-grid">
        <Link href={v ? `/videos/${v.slug}` : '/videos'} className="comcard c-vid">
          {v ? <span className="comcard-thumb"><img src={`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`} alt="" loading="lazy" width="480" height="360" /><span className="vplay" aria-hidden="true"><Icon name="play" size={22} /></span></span> : <span className="comcard-i" aria-hidden="true"><Icon name="film" size={30} /></span>}
          <b>Βίντεο</b><small>{v ? v.title : 'Τα άρθρα μας ζωντανεύουν με κινούμενα σχέδια και αφήγηση.'}</small><span className="comcard-go">Δες τα βίντεο →</span></Link>
        {social && <a href={st ? CHAT : '/account/register?next=/chat'} className="comcard c-chat"><span className="comcard-i" aria-hidden="true"><Icon name="chat" size={30} /></span><b>Chat της εφημερίδας</b>
          <small>{st ? 'Χώροι, κανάλια, κρυπτογραφημένα μηνύματα και κλήσεις με τους φίλους σου.' : 'Φτιάξε δωρεάν λογαριασμό: κανάλια, κρυπτογραφημένα μηνύματα και κλήσεις με τους φίλους σου.'}</small><span className="comcard-go">{st ? 'Άνοιξε το chat →' : 'Φτιάξε λογαριασμό →'}</span></a>}
        {(c.comments || c.likes) && <Link href="/articles" className="comcard c-com"><span className="comcard-i" aria-hidden="true"><Icon name="heart" size={30} /></span><b>Σχόλια & likes</b><small>Πες τη γνώμη σου σε κάθε άρθρο και δες τι αρέσει στους άλλους.</small><span className="comcard-go">Διάβασε τα άρθρα →</span></Link>}
        <Link href="/contact?kind=article" className="comcard c-write"><span className="comcard-i" aria-hidden="true"><Icon name="pen" size={30} /></span><b>Γράψε κι εσύ</b><small>Έχεις ιδέα για άρθρο ή θες να γράψεις στην εφημερίδα; Στείλε μας!</small><span className="comcard-go">Στείλε την ιδέα σου →</span></Link>
      </div>
    </section>
  );
}
