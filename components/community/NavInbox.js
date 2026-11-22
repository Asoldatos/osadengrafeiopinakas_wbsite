'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Εικονίδιο μηνυμάτων στη μπάρα με αριθμό αδιάβαστων (ελέγχει κάθε 60″ μόνο όσο η καρτέλα είναι ορατή). */
export default function NavInbox() {
  const [n, setN] = useState({ messages: 0, requests: 0 }); const path = usePathname();
  useEffect(() => {
    let alive = true;
    const tick = () => document.visibilityState === 'visible' && fetch('/api/community/unread', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => alive && j && setN(j)).catch(() => {});
    tick(); const t = setInterval(tick, 60000); document.addEventListener('visibilitychange', tick);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [path]);
  const total = n.messages + n.requests;
  const href = n.messages || !n.requests ? '/messages' : '/account/friends';
  return <Link href={href} className="nav-inbox" aria-label={`Μηνύματα${n.messages ? `: ${n.messages} αδιάβαστα` : ''}${n.requests ? `, ${n.requests} αιτήματα φιλίας` : ''}`}>💬{total > 0 && <span className="cbadge">{total > 99 ? '99+' : total}</span>}</Link>;
}
