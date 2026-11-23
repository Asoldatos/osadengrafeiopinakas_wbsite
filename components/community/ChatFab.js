'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Mascot from '../Mascot';
import Icon from '../Icons';

/** Αιωρούμενο κουμπί συνομιλιών (κάτω δεξιά) για συνδεδεμένους μαθητές: αριθμός αδιάβαστων και «φούσκα» όταν έρχεται νέο μήνυμα ή αίτημα φιλίας. */
export default function ChatFab() {
  const path = usePathname() || ''; const [n, setN] = useState({ messages: 0, requests: 0 }), [pop, setPop] = useState(null), [open, setOpen] = useState(false);
  useEffect(() => {
    const on = (e) => { const d = e.detail; setN(d); if (d.newMsg) setPop('msg'); else if (d.newReq) setPop('req'); };
    window.addEventListener('inbox', on); return () => window.removeEventListener('inbox', on);
  }, []);
  useEffect(() => { if (!pop) return; const t = setTimeout(() => setPop(null), 7000); return () => clearTimeout(t); }, [pop]);
  useEffect(() => setOpen(false), [path]);
  if (path.startsWith('/messages') || path.startsWith('/chat') || path.startsWith('/editor-panel') || path.startsWith('/game')) return null;
  const CHAT = process.env.NEXT_PUBLIC_CHAT_URL || '/chat';
  const total = n.messages + n.requests;
  return (
    <div className="fab-wrap">
      {pop && <Link href={pop === 'msg' ? CHAT + '#dm' : '/account/friends'} className="fab-pop" role="status"><Mascot mood="phone" size={46} /><span><b>{pop === 'msg' ? 'Νέο μήνυμα' : 'Νέο αίτημα φιλίας'}</b><small>Πάτα για να το δεις</small></span></Link>}
      {open && <nav className="fab-menu" aria-label="Κοινότητα">
        <a href={CHAT}><Icon name="hash" />Chat</a>
        <a href={CHAT + '#dm'}><Icon name="chat" />Μηνύματα{n.messages > 0 && <span className="cbadge">{n.messages}</span>}</a>
        <Link href="/account/friends"><Icon name="users" />Φίλοι{n.requests > 0 && <span className="cbadge">{n.requests}</span>}</Link>
        <Link href="/videos"><Icon name="film" />Βίντεο</Link>
        <Link href="/contact?kind=article"><Icon name="pen" />Γράψε κι εσύ</Link></nav>}
      <button type="button" className={`fab${total ? ' has' : ''}${pop ? ' ring' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Κοινότητα${total ? `: ${total} νέα` : ''}`}>
        <Icon name={open ? 'x' : 'chat'} size={24} />{total > 0 && !open && <span className="cbadge">{total > 99 ? '99+' : total}</span>}</button>
    </div>
  );
}
