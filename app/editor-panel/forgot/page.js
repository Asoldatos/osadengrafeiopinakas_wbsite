import { redirect } from 'next/navigation';
import { ForgotForm } from '@/components/admin/AuthForms';
import { getAdmin } from '@/lib/auth';
import { getSite } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Επαναφορά κωδικού' };
export default async function Page() {
  if (await getAdmin()) redirect('/editor-panel/security');
  return <ForgotForm name={(await getSite()).name} />;
}
