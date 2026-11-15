import Admins from '@/components/admin/Admins';
import { requireAdminPage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Διαχειριστές' };
export default async function Page() {
  const u = await requireAdminPage('admins');
  return (<><h1>Διαχειριστές</h1>
    <p className="muted">Δημιούργησε λογαριασμούς για την ομάδα και διάλεξε τι μπορεί να κάνει ο καθένας. Κάθε περιορισμός ελέγχεται στον διακομιστή, όχι μόνο στο μενού.</p>
    <Admins me={{ id: u.user_id, role: u.role, permissions: u.permissions || {} }} /></>);
}
