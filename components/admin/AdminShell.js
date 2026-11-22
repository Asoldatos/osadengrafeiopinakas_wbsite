'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Mascot from '../Mascot';
import Toasts from './Toasts';
import { api } from '@/lib/clientUpload';
import { can, ROLE_LABEL } from '@/lib/perms.mjs';

// [διαδρομή, ετικέτα, εικονίδιο, δικαίωμα]. Το μενού κρύβει ό,τι δεν επιτρέπεται· ο έλεγχος γίνεται ΠΑΝΤΑ και στον διακομιστή.
const NAV = [
  ['/editor-panel', 'Πίνακας ελέγχου', '🏠'], ['/editor-panel/articles', 'Άρθρα', '📝', 'content'], ['/editor-panel/editions', 'Εφημερίδα (τεύχη)', '📰', 'editions'],
  ['/editor-panel/writers', 'Συντακτική ομάδα', '👩‍🎓', 'writers'], ['/editor-panel/categories', 'Κατηγορίες', '🏷️', 'content'], ['/editor-panel/media', 'Πολυμέσα', '🖼️', 'uploads'],
  ['/editor-panel/adventures', 'Περιπέτειες Κιμωλάκη', '🗺️', 'content'], ['/editor-panel/quiz', 'Ερωτήσεις κουίζ', '🧠', 'content'], ['/editor-panel/words', 'Λέξεις Κρεμάλας', '🔤', 'content'], ['/editor-panel/tutorials', 'Οδηγοί βοήθειας', '📘', 'content'],
  ['/editor-panel/videos', 'Βιντεοθήκη', '🎬', 'content'], ['/editor-panel/students', 'Λογαριασμοί μαθητών', '🧑‍🎓', 'students'], ['/editor-panel/tickets', 'Αιτήματα επικοινωνίας', '✉️', 'community'], ['/editor-panel/community', 'Κοινότητα', '🤝', 'community'], ['/editor-panel/newsletter', 'Ενημερωτικό δελτίο', '💌', 'newsletter'], ['/editor-panel/subscribers', 'Συνδρομητές', '📬', 'newsletter'],
  ['/editor-panel/themes', 'Εποχιακά θέματα 🎄', '❄️', 'themes'], ['/editor-panel/builder', 'Σχεδιαστής ιστοτόπου', '🎨', 'appearance'], ['/editor-panel/settings', 'Ρυθμίσεις ιστοτόπου', '⚙️', 'settings'],
  ['/editor-panel/admins', 'Διαχειριστές', '🛡️', 'admins'], ['/editor-panel/security', 'Ο λογαριασμός μου', '🔐'],
];
export default function AdminShell({ user, children, tip }) {
  const path = usePathname(), router = useRouter(); const [open, setOpen] = useState(false);
  const on = (h) => (h === '/editor-panel' ? path === h : path.startsWith(h));
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); router.replace('/editor-panel/login'); router.refresh(); };
  // Όσο είναι ανοιχτός ο πίνακας, «ξυπνάει» τα προγραμματισμένα ενημερωτικά που έφτασε η ώρα τους (πέρα από το καθημερινό cron).
  useEffect(() => {
    if (!can(user, 'newsletter')) return;
    const tick = () => api('/api/admin/newsletter/tick', { method: 'POST', body: {} }).catch(() => {});
    tick(); const id = setInterval(tick, 5 * 60 * 1000); return () => clearInterval(id);
  }, [user]);
  return (
    <div className="adm">
      <aside className={`adm-side${open ? ' open' : ''}`}>
        <div className="adm-brand"><Mascot mood="happy" size={44} /><div><strong>Πίνακας διαχείρισης</strong><small>Όσα δεν γράφει ο πίνακας</small></div></div>
        <nav aria-label="Διαχείριση">{NAV.filter((n) => !n[3] || can(user, n[3])).map(([h, l, i]) => <Link key={h} href={h} className={on(h) ? 'on' : ''} onClick={() => setOpen(false)}><span aria-hidden="true">{i}</span>{l}</Link>)}
          <a href="/" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">🌍</span>Άνοιγμα ιστοτόπου ↗</a></nav>
        <div className="adm-user"><span>{user.name || user.username || user.email}<small>{ROLE_LABEL[user.role] || 'Διαχειριστής'}{user.username ? ` · @${user.username}` : ''}</small></span><button type="button" className="btn btn-ghost sm" onClick={logout}>Αποσύνδεση</button></div>
      </aside>
      <div className="adm-main">
        <header className="adm-top"><button type="button" className="icon-btn adm-burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Μενού διαχείρισης">☰</button><span className="adm-tip" title="Συμβουλή του Κιμωλάκη">💡 {tip}</span></header>
        <main className="adm-content" id="main">{children}</main>
      </div>
      <Toasts />
    </div>
  );
}
