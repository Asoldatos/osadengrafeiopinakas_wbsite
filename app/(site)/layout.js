import Link from 'next/link';
import { getSite } from '@/lib/data';
import { getAdmin } from '@/lib/auth';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import Mascot from '@/components/Mascot';
import Media from '@/components/Media';
import { safeUrl } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }) {
  const site = await getSite();
  const admin = await getAdmin();
  const m = site.maintenance || {};
  // Η λειτουργία συντήρησης επιβάλλεται στον διακομιστή: οι επισκέπτες δεν λαμβάνουν ποτέ το περιεχόμενο.
  if (m.enabled && !admin) {
    return (
      <main className="maint board" id="main">
        <div className="wrap center-page">
          {m.imageUrl ? <Media src={m.imageUrl} alt="" className="maint-img" /> : <Mascot mood="work" size={220} />}
          <h1 className="h1">{m.title}</h1><p className="lede">{m.message}</p>
        </div>
      </main>
    );
  }
  const items = (site.nav || []).filter((n) => n.visible !== false);
  const a = site.announcement;
  return (
    <>
      <a className="skip" href="#main">Μετάβαση στο περιεχόμενο</a>
      {m.enabled && admin && <div className="adminbar">Η λειτουργία συντήρησης είναι ΕΝΕΡΓΗ — οι επισκέπτες βλέπουν τη σελίδα συντήρησης. <Link href="/editor-panel/settings">Ρυθμίσεις</Link></div>}
      {a?.enabled && a.text && <div className="announce">{a.link ? <Link href={safeUrl(a.link)}>{a.text} →</Link> : a.text}</div>}
      <SiteNav name={site.name} logoUrl={site.logoUrl} items={items} />
      <main id="main">{children}</main>
      <Footer site={site} items={items} />
    </>
  );
}
