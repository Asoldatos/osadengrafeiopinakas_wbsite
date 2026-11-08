import Link from 'next/link';
import { getSite } from '@/lib/data';
import { getAdmin } from '@/lib/auth';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import Mascot from '@/components/Mascot';
import Media from '@/components/Media';
import NewsletterForm from '@/components/NewsletterForm';
import { safeUrl } from '@/lib/util';
import { getStudent } from '@/lib/student';
import { levelFor } from '@/lib/progress.mjs';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }) {
  const site = await getSite();
  const admin = await getAdmin();
  const st = await getStudent();
  const m = site.maintenance || {};
  // Η λειτουργία συντήρησης επιβάλλεται στον διακομιστή: οι επισκέπτες δεν λαμβάνουν ποτέ το περιεχόμενο.
  if (m.enabled && !admin) {
    return (
      <div className="maint board">
        <header className="maint-bar"><div className="wrap maint-bar-in">{site.logoUrl && <Media src={site.logoUrl} alt={site.name} className="maint-logo" width="130" height="48" loading="eager" />}
          {site.newsletter?.enabled !== false && <nav aria-label="Μενού"><a className="btn btn-light sm" href="#newsletter">💌 {site.newsletter?.title || 'Ενημερωτικό δελτίο'}</a></nav>}</div></header>
        <main className="wrap center-page" id="main">
          {m.imageUrl ? <Media src={m.imageUrl} alt="" className="maint-img" /> : <Mascot mood="work" size={220} />}
          <h1 className="h1">{m.title}</h1><p className="lede">{m.message}</p>
          {site.newsletter?.enabled !== false && <div className="maint-news"><NewsletterForm id="newsletter" dark title={site.newsletter?.title} text={site.newsletter?.maintenanceText || site.newsletter?.text} button={site.newsletter?.button} placeholder={site.newsletter?.placeholder} thanks={site.mascot?.messages?.newsletterThanks} /></div>}
        </main>
      </div>
    );
  }
  const items = (site.nav || []).filter((n) => n.visible !== false);
  const a = site.announcement;
  return (
    <>
      <a className="skip" href="#main">Μετάβαση στο περιεχόμενο</a>
      {m.enabled && admin && <div className="adminbar">Η λειτουργία συντήρησης είναι ΕΝΕΡΓΗ — οι επισκέπτες βλέπουν τη σελίδα συντήρησης. <Link href="/editor-panel/settings">Ρυθμίσεις</Link></div>}
      {a?.enabled && a.text && <div className="announce">{a.link ? <Link href={safeUrl(a.link)}>{a.text} →</Link> : a.text}</div>}
      <SiteNav name={site.name} logoUrl={site.logoUrl} items={items} student={st ? { nickname: st.nickname, avatar: st.avatar, level: levelFor(st.xp) } : null} />
      <main id="main">{children}</main>
      <Footer site={site} items={items} />
    </>
  );
}
