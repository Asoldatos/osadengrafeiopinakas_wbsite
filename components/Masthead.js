import Link from 'next/link';
/** Λωρίδα «εφημερίδας» πάνω από το μενού (νέα εμφάνιση): σημερινή ημερομηνία, σύνθημα, γρήγοροι σύνδεσμοι. */
export default function Masthead({ tagline }) {
  const today = new Date().toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Athens' });
  return (
    <div className="masthead"><div className="masthead-in">
      <span className="mh-date">{today.charAt(0).toUpperCase() + today.slice(1)}</span>
      {tagline && <span className="mh-tag">{tagline}</span>}
      <span className="mh-links"><Link href="/editions">Τεύχη</Link><Link href="/contact?kind=article">Γράψε κι εσύ</Link></span>
    </div></div>
  );
}
