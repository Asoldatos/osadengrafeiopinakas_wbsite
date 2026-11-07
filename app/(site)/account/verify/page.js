import { VerifyClient } from '@/components/play/StudentForms';
import { MascotSay } from '@/components/Mascot';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Επιβεβαίωση email', robots: { index: false }, referrer: 'no-referrer' };
export default function Page({ searchParams }) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  return token.length > 20 ? <VerifyClient token={token} /> : <div className="wrap narrow page-pad"><MascotSay mood="oops" text="Ο σύνδεσμος επιβεβαίωσης δεν είναι σωστός. Άνοιξέ τον ξανά από το email σου." /></div>;
}
