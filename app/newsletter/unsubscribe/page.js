import MiniPage from '@/components/MiniPage';
import { UnsubClient } from '@/components/NewsletterBits';
import { MascotSay } from '@/components/Mascot';
import { getSite } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Διαγραφή από το ενημερωτικό δελτίο', robots: { index: false }, referrer: 'no-referrer' };
export default async function Page({ searchParams }) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '', m = (await getSite()).mascot?.messages || {};
  return <MiniPage title="Διαγραφή συνδρομής">{/^[a-f0-9]{48}$/.test(token) ? <UnsubClient token={token} bye={m.newsletterBye} /> : <MascotSay mood="oops" text="Ο σύνδεσμος διαγραφής δεν είναι σωστός. Χρησιμοποίησε τον σύνδεσμο από το τελευταίο email που έλαβες." />}</MiniPage>;
}
