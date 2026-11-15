import { requireAdminPage } from '@/lib/auth';
import { getSite } from '@/lib/data';
import AdminShell from '@/components/admin/AdminShell';
import { MascotProvider } from '@/components/Mascot';
export const dynamic = 'force-dynamic';
export default async function AppLayout({ children }) {
  const u = await requireAdminPage();           // σύνδεση + υποχρεωτική αλλαγή κωδικού στην πρώτη είσοδο
  const s = await getSite();
  const user = { name: u.name, email: u.email, username: u.username, role: u.role, permissions: u.permissions || {} };
  return <MascotProvider enabled messages={s.mascot?.messages || {}}><AdminShell user={user} tip={s.mascot?.messages?.adminTip}>{children}</AdminShell></MascotProvider>;
}
