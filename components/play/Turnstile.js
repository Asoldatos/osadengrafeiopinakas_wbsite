'use client';
import { useEffect, useRef } from 'react';
/** Cloudflare Turnstile (προαιρετικό). Εμφανίζεται μόνο αν έχει οριστεί NEXT_PUBLIC_TURNSTILE_SITE_KEY. */
export default function Turnstile({ siteKey, onToken }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!siteKey || !ref.current) return; let id;
    const mount = () => { id = window.turnstile.render(ref.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') }); };
    if (window.turnstile) mount();
    else { const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = mount; document.head.appendChild(s); }
    return () => { try { window.turnstile?.remove(id); } catch {} };
  }, [siteKey]);
  return siteKey ? <div ref={ref} className="turnstile" /> : null;
}
