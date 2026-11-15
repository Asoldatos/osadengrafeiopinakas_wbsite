import { requireAdminPage } from '@/lib/auth';
import { can } from '@/lib/perms.mjs';
import NewsletterAdmin from '@/components/admin/NewsletterAdmin';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ενημερωτικό δελτίο' };
export default async function Page() {
  const u = await requireAdminPage('newsletter');
  return (<><h1>Ενημερωτικό δελτίο</h1>
    <p className="muted">Γράψε το μήνυμα, διάλεξε θέμα και διακοσμήσεις, δες προεπισκόπηση, στείλε δοκιμή στον εαυτό σου και μετά προγραμμάτισέ το ή στείλ' το. Κάθε συνδρομητής το λαμβάνει <b>μία μόνο φορά</b>.</p>
    <NewsletterAdmin canSend={can(u, 'newsletter_send')} myEmail={u.email} /></>);
}
