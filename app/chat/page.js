import { headers } from 'next/headers';
import Mascot from '@/components/Mascot';
import Icon from '@/components/Icons';
import ChatApp from '@/components/chat/ChatApp';
import { getStudent } from '@/lib/student';
import { getCommunity } from '@/lib/communityServer';
import { SITE_URL } from '@/lib/util';
export const dynamic = 'force-dynamic';

/** chat.osaden.gr (ή /chat): η εφαρμογή chat. Χωρίς σύνδεση → οθόνη εισόδου. */
export default async function ChatPage() {
  const host = (headers().get('host') || '').toLowerCase(), onSub = host.startsWith('chat.');
  const siteUrl = onSub ? SITE_URL : '';
  const [st, c] = await Promise.all([getStudent(), getCommunity()]);
  if (!c.chat) return <div className="pc-splash"><Mascot mood="confused" size={150} /><h1>Το chat είναι προσωρινά κλειστό</h1><p>Ξαναδοκίμασε λίγο αργότερα.</p><div className="pc-btns"><a className="pc-btn" href={siteUrl || '/'}>Πίσω στην εφημερίδα</a></div></div>;
  if (!st) {
    const next = onSub ? '/' : '/chat';
    return (
      <div className="pc-splash">
        <Mascot mood="phone" size={150} />
        <h1>Το chat του «Όσα δεν γράφει ο πίνακας»</h1>
        <p>Χώροι συζήτησης που στήνει η σύνταξη, προσωπικά μηνύματα με τους φίλους σου και κλήσεις με φωνή ή βίντεο.</p>
        <div className="pc-splash-tags"><span><Icon name="hash" size={15} /> Κανάλια</span><span><Icon name="lock" size={15} /> Κρυπτογραφημένα μηνύματα</span><span><Icon name="phone" size={15} /> Κλήσεις</span></div>
        <div className="pc-btns"><a className="pc-btn" href={`/account/login?next=${encodeURIComponent(next)}`}>Σύνδεση</a><a className="pc-btn ghost" href={`/account/register?next=${encodeURIComponent(next)}`}>Νέος λογαριασμός</a></div>
        <a className="pc-muted" href={siteUrl || '/'}>Πίσω στην εφημερίδα</a>
      </div>
    );
  }
  return <ChatApp siteUrl={siteUrl} />;
}
