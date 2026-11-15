import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import ChangePassword from '@/components/admin/ChangePassword';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Αλλαγή κωδικού' };
export default async function Page() {
  const u = await getAdmin();
  if (!u) redirect('/editor-panel/login');
  if (!u.must_change) redirect('/editor-panel/security');
  return <ChangePassword forced username={u.username || ''} email={u.email} />;
}
