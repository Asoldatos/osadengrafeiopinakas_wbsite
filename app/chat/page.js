import { headers } from 'next/headers';
import Mascot from '@/components/Mascot';
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
  if (!c.chat) return <div className="cx-splash"><Mascot mood="confused" size={150} /><h1>Το chat ξεκουράζεται 😴</h1><p>Είναι προσωρινά κλειστό. Ξαναδοκίμασε αργότερα!</p><a className="cx-btn" href={siteUrl || '/'}>← Πίσω στην εφημερίδα</a></div>;
  if (!st) {
    const next = onSub ? '/' : '/chat';
    return (
      <div className="cx-splash">
        <div className="cx-splash-glow" /><Mascot mood="phone" size={170} />
        <h1>Chat του «Όσα δεν γράφει ο πίνακας»</h1>
        <p>Servers της σύνταξης, κρυπτογραφημένα μηνύματα με τους φίλους σου και κλήσεις, όλα με ασφάλεια. 🔒</p>
        <div className="cx-btns"><a className="cx-btn" href={`/account/login?next=${encodeURIComponent(next)}`}>Σύνδεση</a><a className="cx-btn ghost" href={`/account/register?next=${encodeURIComponent(next)}`}>Νέος λογαριασμός</a></div>
        <a className="cx-muted" href={siteUrl || '/'}>← Πίσω στην εφημερίδα</a>
      </div>
    );
  }
  return <ChatApp siteUrl={siteUrl} />;
}
