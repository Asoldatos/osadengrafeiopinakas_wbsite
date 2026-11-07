import Link from 'next/link';
import { ResetForm } from '@/components/admin/AuthForms';
import { MascotSay } from '@/components/Mascot';
import { q } from '@/lib/db';
import { sha256 } from '@/lib/crypto.mjs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Νέος κωδικός', referrer: 'no-referrer' };
export default async function Page({ searchParams }) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const ok = token.length > 20 && (await q('select 1 from password_resets where token_hash=$1 and used_at is null and expires_at > now()', [sha256(token)])).length > 0;
  if (ok) return <ResetForm token={token} />;
  return (
    <main className="login board" id="main"><div className="login-card">
      <MascotSay mood="oops" text="Αυτός ο σύνδεσμος δεν ισχύει πια ή έχει ήδη χρησιμοποιηθεί." size={110} /><h1>Ο σύνδεσμος έληξε</h1>
      <Link className="btn btn-primary block" href="/editor-panel/forgot">Ζήτησε νέο σύνδεσμο</Link><Link className="linkbtn forgot-link" href="/editor-panel/login">← Πίσω στη σύνδεση</Link>
    </div></main>
  );
}
