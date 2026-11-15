import Link from 'next/link';
import { getSite, getPage } from '@/lib/data';
import { getAdmin } from '@/lib/auth';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import MaintenanceView from '@/components/MaintenanceView';
import { safeUrl } from '@/lib/util';
import { getStudent } from '@/lib/student';
import { levelFor } from '@/lib/progress.mjs';
import { cookies } from 'next/headers';
import ThemeRuntime from '@/components/theme/ThemeRuntime';
import { getThemes, getAvailableTheme } from '@/lib/themeServer';
import { verifyIntro } from '@/lib/activation.mjs';
import { can } from '@/lib/perms.mjs';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }) {
  const site = await getSite();
  const admin = await getAdmin();
  const st = await getStudent();
  const m = site.maintenance || {};
  // Η λειτουργία συντήρησης επιβάλλεται στον διακομιστή: οι επισκέπτες δεν λαμβάνουν ποτέ το περιεχόμενο.
  if (m.enabled && !admin) {
    // Οι σελίδες «Απόρρητο» και «Βοήθεια email» διαβάζονται από τη δημοσιευμένη εκδοχή τους (επεξεργάσιμες από τον Σχεδιαστή) και ανοίγουν σε πλαϊνό πάνελ.
    const load = async (slug, fallbackTitle) => {
      try {
        const secs = await getPage(slug);
        const head = secs?.find((x) => x.type === 'pageHeader' && !x.hidden)?.props, html = (secs || []).filter((x) => x.type === 'custom' && !x.hidden).map((x) => x.props?.html || '').join('');
        return html ? { title: head?.title || fallbackTitle, subtitle: head?.subtitle || '', html } : null;
      } catch { return null; }
    };
    const [privacy, help] = await Promise.all([load('privacy', 'Απόρρητο και όροι χρήσης'), load('email-help', 'Δεν βλέπεις τα email μας;')]);
    const panels = {}; if (help) panels.help = help; if (privacy) panels.privacy = privacy;
    return <MaintenanceView site={{ name: site.name, logoUrl: site.logoUrl, maintenance: m, newsletter: site.newsletter || {}, thanks: site.mascot?.messages?.newsletterThanks }} panels={panels} />;
  }
  const items = (site.nav || []).filter((n) => n.visible !== false);
  const a = site.announcement;
  // Εποχιακό θέμα: διαθέσιμο θέμα, προτίμηση επισκέπτη (cookie), εισαγωγή από το newsletter (υπογεγραμμένο cookie) και προεπισκόπηση διαχειριστή.
  const jar = cookies(), themes = await getThemes(), avail = await getAvailableTheme();
  const canPreview = can(admin, 'themes');
  let intro = null; try { intro = verifyIntro(jar.get('ti')?.value); } catch {}
  const introTheme = intro ? themes.find((t) => t.slug === intro && t.mode !== 'off') : null;
  const theme = avail || introTheme || (canPreview ? themes.find((t) => t.mode !== 'off') || themes[0] : null) || null;
  const [prefSlug, prefVal] = decodeURIComponent(jar.get('theme_pref')?.value || '').split(':');
  const initialActive = !!(avail && theme && avail.slug === theme.slug && prefSlug === theme.slug && prefVal === 'on');
  const c = site.colors || {};
  return (
    <ThemeRuntime theme={theme ? { slug: theme.slug, name: theme.name, config: theme.config } : null} available={!!avail} initialActive={initialActive}
      intro={!!introTheme && introTheme.slug === theme?.slug} canPreview={canPreview} logoUrl={site.logoUrl} baseColors={[c.paper || '#FBF6EA', c.c1 || '#00C8E0', c.board || '#2C5E4A']}>
      <a className="skip" href="#main">Μετάβαση στο περιεχόμενο</a>
      {m.enabled && admin && <div className="adminbar">Η λειτουργία συντήρησης είναι ΕΝΕΡΓΗ — οι επισκέπτες βλέπουν τη σελίδα συντήρησης. <Link href="/editor-panel/settings">Ρυθμίσεις</Link></div>}
      {a?.enabled && a.text && <div className="announce">{a.link ? <Link href={safeUrl(a.link)}>{a.text} →</Link> : a.text}</div>}
      <SiteNav name={site.name} logoUrl={site.logoUrl} items={items} student={st ? { nickname: st.nickname, avatar: st.avatar, level: levelFor(st.xp) } : null} />
      <main id="main">{children}</main>
      <Footer site={site} items={items} />
    </ThemeRuntime>
  );
}
