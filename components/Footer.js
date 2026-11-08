import Link from 'next/link';
import { safeUrl } from '@/lib/util';
import Media from './Media';
import NewsletterForm from './NewsletterForm';
export default function Footer({ site, items }) {
  const f = site.footer || {}, c = f.contact || {};
  return (
    <footer className="footer board">
      {site.newsletter?.enabled !== false && site.newsletter?.footerForm !== false && <div className="wrap foot-news"><NewsletterForm dark title={site.newsletter?.title} text={site.newsletter?.text} button={site.newsletter?.button} placeholder={site.newsletter?.placeholder} thanks={site.mascot?.messages?.newsletterThanks} /></div>}
      <div className="wrap foot-grid">
        <div>{site.logoUrl && <Media src={site.logoUrl} alt={site.name} className="foot-logo" width="180" height="67" />}<p>{f.about}</p></div>
        <nav aria-label="Πλοήγηση υποσέλιδου"><h2>{f.linksTitle}</h2><ul>{items.map((n, i) => <li key={i}><Link href={safeUrl(n.href)}>{n.label}</Link></li>)}{(f.extraLinks || []).filter((n) => n.label).map((n, i) => <li key={`x${i}`}><Link href={safeUrl(n.href)}>{n.label}</Link></li>)}</ul></nav>
        <div><h2>{f.contactTitle}</h2><ul>
          {c.email && <li><a href={`mailto:${c.email}`}>{c.email}</a></li>}{c.phone && <li><a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></li>}{c.address && <li>{c.address}</li>}
          {(f.social || []).map((s, i) => <li key={i}><a href={safeUrl(s.url)} target="_blank" rel="noopener noreferrer">{s.label} ↗</a></li>)}
        </ul></div>
      </div>
      <p className="wrap copy">{f.copyright}</p>
    </footer>
  );
}
