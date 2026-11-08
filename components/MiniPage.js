import Link from 'next/link';
import { getSite } from '@/lib/data';
import Media from './Media';
/** Απλή σελίδα χωρίς μενού/συντήρηση, για συνδέσμους από email (επιβεβαίωση/διαγραφή) που πρέπει να δουλεύουν πάντα. */
export default async function MiniPage({ title, children }) {
  const site = await getSite();
  return (
    <>
      <header className="nav"><div className="wrap nav-in"><Link href="/" className="brand" aria-label={`${site.name} – αρχική σελίδα`}>{site.logoUrl && <Media src={site.logoUrl} alt="" width="130" height="48" loading="eager" />}</Link></div></header>
      <main className="wrap narrow page-pad center-page" id="main"><h1 className="h1">{title}</h1>{children}</main>
    </>
  );
}
