'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Mascot from '../Mascot';
import Toasts from './Toasts';
import { api } from '@/lib/clientUpload';

const NAV = [
  ['/editor-panel', 'Πίνακας ελέγχου', '🏠'], ['/editor-panel/articles', 'Άρθρα', '📝'], ['/editor-panel/editions', 'Εφημερίδα (τεύχη)', '📰'],
  ['/editor-panel/writers', 'Συντακτική ομάδα', '👩‍🎓'], ['/editor-panel/categories', 'Κατηγορίες', '🏷️'], ['/editor-panel/media', 'Πολυμέσα', '🖼️'],
  ['/editor-panel/builder', 'Σχεδιαστής ιστοτόπου', '🎨', 'admin'], ['/editor-panel/settings', 'Ρυθμίσεις ιστοτόπου', '⚙️', 'admin'], ['/editor-panel/security', 'Ασφάλεια και 2FA', '🔐'],
];
export default function AdminShell({ user, children, tip }) {
  const path = usePathname(), router = useRouter(); const [open, setOpen] = useState(false);
  const on = (h) => (h === '/editor-panel' ? path === h : path.startsWith(h));
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); router.replace('/editor-panel/login'); router.refresh(); };
  return (
    <div className="adm">
      <aside className={`adm-side${open ? ' open' : ''}`}>
        <div className="adm-brand"><Mascot mood="happy" size={44} /><div><strong>Πίνακας διαχείρισης</strong><small>Όσα δεν γράφει ο πίνακας</small></div></div>
        <nav aria-label="Διαχείριση">{NAV.filter((n) => !n[3] || user.role === 'admin').map(([h, l, i]) => <Link key={h} href={h} className={on(h) ? 'on' : ''} onClick={() => setOpen(false)}><span aria-hidden="true">{i}</span>{l}</Link>)}
          <a href="/" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">🌍</span>Άνοιγμα ιστοτόπου ↗</a></nav>
        <div className="adm-user"><span>{user.name || user.email}<small>{user.role === 'admin' ? 'Διαχειριστής' : 'Συντάκτης'}</small></span><button type="button" className="btn btn-ghost sm" onClick={logout}>Αποσύνδεση</button></div>
      </aside>
      <div className="adm-main">
        <header className="adm-top"><button type="button" className="icon-btn adm-burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Μενού διαχείρισης">☰</button><span className="adm-tip" title="Συμβουλή του Κιμωλάκη">💡 {tip}</span></header>
        <main className="adm-content" id="main">{children}</main>
      </div>
      <Toasts />
    </div>
  );
}
