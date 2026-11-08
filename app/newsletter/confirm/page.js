import MiniPage from '@/components/MiniPage';
import { ConfirmClient } from '@/components/NewsletterBits';
import { MascotSay } from '@/components/Mascot';
import { getSite } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Επιβεβαίωση εγγραφής', robots: { index: false }, referrer: 'no-referrer' };
export default async function Page({ searchParams }) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '', m = (await getSite()).mascot?.messages || {};
  return <MiniPage title="Ενημερωτικό δελτίο">{token.length > 20 ? <ConfirmClient token={token} ok={m.newsletterConfirmed} bad="Ο σύνδεσμος δεν ισχύει πια ή έχει ήδη χρησιμοποιηθεί." /> : <MascotSay mood="oops" text="Ο σύνδεσμος επιβεβαίωσης δεν είναι σωστός." />}</MiniPage>;
}
