'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icons';

/** Κουμπί + παράθυρο αναζήτησης με αποτελέσματα καθώς γράφεις. Ανοίγει και με «/» ή Ctrl+K. */
export default function SearchOverlay() {
  const [open, setOpen] = useState(false), [q, setQ] = useState(''), [res, setRes] = useState(null), [i, setI] = useState(0), [loading, setLoading] = useState(false);
  const inp = useRef(null), router = useRouter();
  useEffect(() => {
    const k = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (open) { setTimeout(() => inp.current?.focus(), 30); document.documentElement.style.overflow = 'hidden'; } else document.documentElement.style.overflow = ''; return () => { document.documentElement.style.overflow = ''; }; }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    setLoading(true); const ctl = new AbortController();
    const t = setTimeout(() => fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal }).then((r) => r.json()).then((j) => { setRes(j); setI(0); setLoading(false); }).catch(() => {}), 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  const go = (href) => { setOpen(false); setQ(''); router.push(href); };
  const all = `/articles?q=${encodeURIComponent(q.trim())}`;
  const onKey = (e) => {
    const n = res?.rows?.length || 0;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); setI((i + 1) % (n + 1)); }
    if (e.key === 'ArrowUp' && n) { e.preventDefault(); setI((i - 1 + n + 1) % (n + 1)); }
    if (e.key === 'Enter' && q.trim()) { e.preventDefault(); go(n && i < n ? `/articles/${res.rows[i].slug}` : all); }
  };
  const fmt = (d) => new Date(d).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });
  return (<>
    <button type="button" className="icon-btn nav-search" onClick={() => setOpen(true)} aria-label="Αναζήτηση άρθρων (πλήκτρο /)" title="Αναζήτηση ( / )"><Icon name="search" /></button>
    {open && <div className="srch-back" onClick={() => setOpen(false)}>
      <div className="srch" role="dialog" aria-modal="true" aria-label="Αναζήτηση" onClick={(e) => e.stopPropagation()}>
        <div className="srch-in"><Icon name="search" size={22} />
          <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Ψάξε άρθρα, θέματα, ονόματα…" aria-label="Αναζήτηση άρθρων" role="combobox" aria-expanded={!!res?.rows?.length} aria-controls="srch-list" autoComplete="off" />
          <button type="button" className="srch-x" onClick={() => setOpen(false)} aria-label="Κλείσιμο"><kbd>Esc</kbd></button></div>
        <div className="srch-body">
          {q.trim().length < 2 ? <p className="srch-hint">Γράψε τουλάχιστον δύο γράμματα. Μπορείς να ανοίγεις την αναζήτηση από οπουδήποτε πατώντας <kbd>/</kbd>.</p>
            : loading && !res ? <p className="srch-hint">Αναζήτηση…</p>
            : !res?.rows?.length ? <p className="srch-hint">Δεν βρέθηκε κάτι για «{q.trim()}». Δοκίμασε άλλη λέξη.</p>
            : <ul id="srch-list" role="listbox">{res.rows.map((a, k) => (
                <li key={a.slug} role="option" aria-selected={i === k}><Link href={`/articles/${a.slug}`} className={`srch-r${i === k ? ' on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => setOpen(false)}>
                  <span className="srch-th">{a.cover_url && !/\.(mp4|webm|mov)/i.test(a.cover_url) ? <img src={a.cover_url} alt="" loading="lazy" /> : <Icon name="news" size={22} />}</span>
                  <span className="srch-t">{a.category_name && <span className="tag" style={{ '--c': a.category_color }}>{a.category_name}</span>}<b>{a.title}</b><small>{fmt(a.date)}</small></span></Link></li>))}
                <li role="option" aria-selected={i === res.rows.length}><Link href={all} className={`srch-all${i === res.rows.length ? ' on' : ''}`} onClick={() => setOpen(false)}>Όλα τα αποτελέσματα ({res.total}) <Icon name="arrowRight" size={16} /></Link></li></ul>}
        </div>
      </div>
    </div>}
  </>);
}
