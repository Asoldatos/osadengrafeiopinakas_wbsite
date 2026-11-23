'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '../Icons';

/** Κουμπί «Μηνύματα» στη μπάρα, με αριθμό αδιάβαστων + αιτημάτων φιλίας.
 *  Ελέγχει κάθε 30″ (μόνο όσο η καρτέλα είναι ορατή) και ειδοποιεί το αιωρούμενο κουμπί (ChatFab) με το γεγονός «inbox». */
export default function NavInbox() {
  const [n, setN] = useState({ messages: 0, requests: 0 }); const path = usePathname(); const prev = useRef(null);
  useEffect(() => {
    let alive = true;
    const tick = () => document.visibilityState === 'visible' && fetch('/api/community/unread', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!alive || !j) return; setN(j);
      const p = prev.current; prev.current = j;
      window.dispatchEvent(new CustomEvent('inbox', { detail: { ...j, newMsg: !!p && j.messages > p.messages, newReq: !!p && j.requests > p.requests } }));
    }).catch(() => {});
    tick(); const t = setInterval(tick, 30000); document.addEventListener('visibilitychange', tick);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [path]);
  const total = n.messages + n.requests;
  const href = n.messages || !n.requests ? (process.env.NEXT_PUBLIC_CHAT_URL || '/chat') + '#dm' : '/account/friends';
  const on = path.startsWith('/messages') || path.startsWith('/account/friends');
  return <Link href={href} className={`nav-inbox${total ? ' has' : ''}${on ? ' on' : ''}`} aria-label={`Μηνύματα${n.messages ? `: ${n.messages} αδιάβαστα` : ''}${n.requests ? `, ${n.requests} αιτήματα φιλίας` : ''}`}>
    <Icon name="chat" /><span className="nav-inbox-t">Chat</span>{total > 0 && <span className="cbadge">{total > 99 ? '99+' : total}</span>}</Link>;
}
