import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import { getSite } from '@/lib/data';
import AdminShell from '@/components/admin/AdminShell';
import { MascotProvider } from '@/components/Mascot';
export const dynamic = 'force-dynamic';
export default async function AppLayout({ children }) {
  const u = await getAdmin();
  if (!u) redirect('/editor-panel/login');
  const s = await getSite();
  return <MascotProvider enabled messages={s.mascot?.messages || {}}><AdminShell user={{ name: u.name, email: u.email, role: u.role }} tip={s.mascot?.messages?.adminTip}>{children}</AdminShell></MascotProvider>;
}
