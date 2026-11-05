import { redirect } from 'next/navigation';
import Builder from '@/components/admin/Builder';
import { getAdmin } from '@/lib/auth';
import { getSite } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Σχεδιαστής ιστοτόπου' };
export default async function Page() {
  const u = await getAdmin(); if (u?.role !== 'admin') redirect('/editor-panel');
  return <Builder site={await getSite()} />;
}
