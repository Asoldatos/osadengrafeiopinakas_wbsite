import Link from 'next/link';
import { ResetForm } from '@/components/play/StudentForms';
import { MascotSay } from '@/components/Mascot';
import { q } from '@/lib/db';
import { sha256 } from '@/lib/crypto.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Νέος κωδικός', robots: { index: false }, referrer: 'no-referrer' };
export default async function Page({ searchParams }) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const ok = token.length > 20 && (await q("select 1 from student_tokens where token_hash=$1 and kind='reset' and used_at is null and expires_at > now()", [sha256(token)])).length > 0;
  if (ok) return <ResetForm token={token} />;
  return <div className="wrap narrow page-pad"><MascotSay mood="oops" text="Αυτός ο σύνδεσμος δεν ισχύει πια ή έχει ήδη χρησιμοποιηθεί."><Link className="btn btn-primary sm" href="/account/forgot">Ζήτησε νέο σύνδεσμο</Link></MascotSay></div>;
}
