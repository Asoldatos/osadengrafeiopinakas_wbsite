import { redirect } from 'next/navigation';
import Login from '@/components/admin/Login';
import { getAdmin } from '@/lib/auth';
import { getSite } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Σύνδεση' };
export default async function Page() {
  if (await getAdmin()) redirect('/editor-panel');
  const s = await getSite();
  return <Login name={s.name} />;
}
