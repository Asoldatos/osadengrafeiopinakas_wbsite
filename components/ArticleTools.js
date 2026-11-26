'use client';
import { useEffect, useState } from 'react';
import Icon from './Icons';

/** Εργαλεία ανάγνωσης (νέα εμφάνιση): περιεχόμενα από τους υπότιτλους, μέγεθος γραμμάτων, αντιγραφή συνδέσμου. */
const SIZES = [0.92, 1, 1.1, 1.22];
export default function ArticleTools({ url }) {
  const [toc, setToc] = useState([]), [active, setActive] = useState(''), [size, setSize] = useState(1), [copied, setCopied] = useState(false), [openToc, setOpenToc] = useState(false);
  useEffect(() => {
    const body = document.getElementById('article-body'); if (!body) return;
    const hs = [...body.querySelectorAll('h2, h3')].filter((h) => h.textContent.trim());
    hs.forEach((h, i) => { if (!h.id) h.id = 'enotita-' + (i + 1); });
    setToc(hs.map((h) => ({ id: h.id, t: h.textContent.trim(), lvl: h.tagName === 'H3' ? 3 : 2 })));
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.id); }, { rootMargin: '-80px 0px -65% 0px' });
    hs.forEach((h) => io.observe(h));
    try { const s = +localStorage.getItem('art-size'); if (SIZES.includes(s)) setSize(s); } catch {}
    return () => io.disconnect();
  }, []);
  useEffect(() => { const b = document.getElementById('article-body'); if (b) b.style.setProperty('--fs', size); try { localStorage.setItem('art-size', String(size)); } catch {} }, [size]);
  const idx = SIZES.indexOf(size);
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  return (
    <aside className="art-tools" aria-label="Εργαλεία ανάγνωσης">
      <div className="at-row">
        <span className="at-l">Μέγεθος</span>
        <button type="button" className="at-b" onClick={() => setSize(SIZES[Math.max(0, idx - 1)])} disabled={idx <= 0} aria-label="Μικρότερα γράμματα">A−</button>
        <button type="button" className="at-b" onClick={() => setSize(SIZES[Math.min(SIZES.length - 1, idx + 1)])} disabled={idx >= SIZES.length - 1} aria-label="Μεγαλύτερα γράμματα">A+</button>
        <button type="button" className="at-b" onClick={copy} aria-label="Αντιγραφή συνδέσμου" title="Αντιγραφή συνδέσμου">{copied ? <Icon name="checks" size={16} /> : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>}</button>
      </div>
      {toc.length >= 2 && <nav className={`at-toc${openToc ? ' open' : ''}`} aria-label="Περιεχόμενα άρθρου">
        <button type="button" className="at-toc-h" onClick={() => setOpenToc(!openToc)} aria-expanded={openToc}>Σε αυτό το άρθρο<Icon name="back" size={14} /></button>
        <ol>{toc.map((h) => <li key={h.id} className={`l${h.lvl}${active === h.id ? ' on' : ''}`}><a href={`#${h.id}`} onClick={() => setOpenToc(false)}>{h.t}</a></li>)}</ol>
      </nav>}
    </aside>
  );
}
