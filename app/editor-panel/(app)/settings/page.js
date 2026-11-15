import { redirect } from 'next/navigation';
import SettingsForm from '@/components/admin/SettingsForm';
import { getAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ρυθμίσεις ιστοτόπου' };
export default async function Page() {
  
  return (<><h1>Ρυθμίσεις ιστοτόπου</h1><SettingsForm /></>);
}
