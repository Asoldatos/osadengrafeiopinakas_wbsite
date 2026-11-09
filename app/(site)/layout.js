import Link from 'next/link';
import { getSite, getPage } from '@/lib/data';
import { getAdmin } from '@/lib/auth';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import MaintenanceView from '@/components/MaintenanceView';
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
    // Το «Απόρρητο» διαβάζεται από τη δημοσιευμένη σελίδα /privacy (επεξεργάσιμη από τον Σχεδιαστή) και ανοίγει σε πλαϊνό πάνελ.
    let privacy = null;
    try {
      const secs = await getPage('privacy');
      const head = secs?.find((x) => x.type === 'pageHeader' && !x.hidden)?.props, html = (secs || []).filter((x) => x.type === 'custom' && !x.hidden).map((x) => x.props?.html || '').join('');
      if (html) privacy = { title: head?.title || 'Απόρρητο και όροι χρήσης', subtitle: head?.subtitle || '', html };
    } catch {}
    return <MaintenanceView site={{ name: site.name, logoUrl: site.logoUrl, maintenance: m, newsletter: site.newsletter || {}, thanks: site.mascot?.messages?.newsletterThanks }} privacy={privacy} />;
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
