import Mascot from '@/components/Mascot';
import ContactForm from '@/components/community/ContactForm';
import { getStudent } from '@/lib/student';
import { getSite } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Επικοινωνία', description: 'Στείλε μας ιδέα για άρθρο, γράψε κι εσύ στην εφημερίδα ή ρώτησέ μας ό,τι θέλεις.', alternates: { canonical: '/contact' } };

export default async function Contact({ searchParams }) {
  const [st, site] = await Promise.all([getStudent(), getSite()]);
  const c = site.footer?.contact || {};
  return (
    <div className="wrap narrow page-pad contact">
      <header className="contact-head"><Mascot mood="phone" size={120} /><div><h1 className="h1">Επικοινωνία</h1>
        <p className="lede">Έχεις ιδέα για άρθρο; Θέλεις να γράψεις κι εσύ στην εφημερίδα; Κάτι δεν δουλεύει; Γράψε μας! Κάθε μήνυμα παίρνει αριθμό και σου απαντάμε στο email σου.</p></div></header>
      <ContactForm student={st ? { nickname: st.nickname } : null} initialKind={searchParams?.kind} />
      {(c.email || c.phone || c.address) && <aside className="contact-alt card"><h2 className="h3">Άλλοι τρόποι</h2><ul className="plain">
        {c.email && <li>✉️ <a href={`mailto:${c.email}`}>{c.email}</a></li>}{c.phone && <li>📞 {c.phone}</li>}{c.address && <li>📍 {c.address}</li>}</ul></aside>}
    </div>
  );
}
