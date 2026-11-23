import Link from 'next/link';
import { getTutorial } from '@/lib/tutorialsData';
import { tutorialHtml, tutorialVars } from '@/lib/tutorials.mjs';
import { getSite, getPage } from '@/lib/data';
import { getAdmin } from '@/lib/auth';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import GamePromo from '@/components/GamePromo';
import ChatFab from '@/components/community/ChatFab';
import MaintenanceView from '@/components/MaintenanceView';
import { safeUrl } from '@/lib/util';
import { getStudent } from '@/lib/student';
import { levelFor } from '@/lib/progress.mjs';
import { cookies } from 'next/headers';
import ThemeRuntime from '@/components/theme/ThemeRuntime';
import { getThemes, getAvailableTheme } from '@/lib/themeServer';
import { verifyIntro } from '@/lib/activation.mjs';
import { themeAvailability } from '@/lib/themes.mjs';
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
    // ο οδηγός email έρχεται από τους «Οδηγούς βοήθειας» (με εφεδρεία την παλιά σελίδα του Σχεδιαστή)
    const loadHelp = async () => { const t = await getTutorial('email-help'); return t ? { title: t.title, subtitle: t.subtitle || '', html: tutorialHtml(t, tutorialVars()) } : load('email-help', 'Δεν βλέπεις τα email μας;'); };
    const [privacy, help] = await Promise.all([load('privacy', 'Απόρρητο και όροι χρήσης'), loadHelp()]);
    const panels = {}; if (help) panels.help = help; if (privacy) panels.privacy = privacy;
    return <MaintenanceView site={{ name: site.name, logoUrl: site.logoUrl, maintenance: m, newsletter: site.newsletter || {}, thanks: site.mascot?.messages?.newsletterThanks }} panels={panels} />;
  }
  // Οι νέες σελίδες (Βίντεο, Επικοινωνία) μπαίνουν αυτόματα στο μενού, εκτός αν ο διαχειριστής τις έχει ήδη (ή τις έκρυψε) στον Σχεδιαστή
  const nav = site.nav || [], has = (h) => nav.some((n) => (n.href || '').replace(/\/$/, '') === h);
  const auto = [!has('/videos') && { label: 'Βίντεο', href: '/videos', visible: true, isNew: true }, !has('/contact') && { label: 'Επικοινωνία', href: '/contact', visible: true }, !has('/chat') && !nav.some((n) => /chat\./.test(n.href || '')) && { label: 'Chat', href: process.env.NEXT_PUBLIC_CHAT_URL || '/chat', visible: true, isNew: true }].filter(Boolean);
  const items = [...nav, ...auto].filter((n) => n.visible !== false).map((n) => ((n.href || '').replace(/\/$/, '') === '/videos' ? { ...n, isNew: true } : n));
  const a = site.announcement;
  // Εποχιακό θέμα: διαθέσιμο θέμα, προτίμηση επισκέπτη (cookie), εισαγωγή από το newsletter (υπογεγραμμένο cookie) και προεπισκόπηση διαχειριστή.
  const jar = cookies(), themes = await getThemes(), avail = await getAvailableTheme();
  const canPreview = can(admin, 'themes');
  let intro = null; try { intro = verifyIntro(jar.get('ti')?.value); } catch {}
  const introTheme = intro ? themes.find((t) => t.slug === intro && t.mode !== 'off') : null;
  // Η επιλογή του επισκέπτη θυμάται (cookie 1 έτους): όποιος το ενεργοποίησε το βλέπει αμέσως σε κάθε επίσκεψη, χωρίς να ξαναπαίξει η μετάβαση
  // (μόνο η μουσική). Ισχύει όσο το θέμα δεν είναι απενεργοποιημένο και δεν έχει λήξει η περίοδός του.
  const [prefSlug, prefVal] = decodeURIComponent(jar.get('theme_pref')?.value || '').split(':');
  const remembered = prefVal === 'on' ? themes.find((t) => t.slug === prefSlug && t.mode !== 'off' && !(t.mode === 'auto' && themeAvailability(t).reason === 'after')) : null;
  const theme = avail || introTheme || remembered || (canPreview ? themes.find((t) => t.mode !== 'off') || themes[0] : null) || null;
  const initialActive = !!(theme && remembered && remembered.slug === theme.slug);
  const c = site.colors || {};
  return (
    <ThemeRuntime theme={theme ? { slug: theme.slug, name: theme.name, config: theme.config } : null} available={!!avail || initialActive} initialActive={initialActive}
      intro={!!introTheme && introTheme.slug === theme?.slug} canPreview={canPreview} logoUrl={site.logoUrl} baseColors={[c.paper || '#FBF6EA', c.c1 || '#00C8E0', c.board || '#2C5E4A']}>
      <a className="skip" href="#main">Μετάβαση στο περιεχόμενο</a>
      {m.enabled && admin && <div className="adminbar">Η λειτουργία συντήρησης είναι ΕΝΕΡΓΗ — οι επισκέπτες βλέπουν τη σελίδα συντήρησης. <Link href="/editor-panel/settings">Ρυθμίσεις</Link></div>}
      {a?.enabled && a.text && <div className="announce">{a.link ? <Link href={safeUrl(a.link)}>{a.text} →</Link> : a.text}</div>}
      <GamePromo />
      <SiteNav name={site.name} logoUrl={site.logoUrl} items={items} student={st ? { nickname: st.nickname, avatar: st.avatar, level: levelFor(st.xp) } : null} />
      <main id="main">{children}</main>
      {st && <ChatFab />}
      <Footer site={site} items={items} />
    </ThemeRuntime>
  );
}
