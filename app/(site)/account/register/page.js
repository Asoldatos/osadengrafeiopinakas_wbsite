import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/play/StudentForms';
import { MascotSay } from '@/components/Mascot';
import { getStudent } from '@/lib/student';
import { getSite } from '@/lib/data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Δημιουργία λογαριασμού μαθητή', robots: { index: false } };
export default async function Page() {
  if (await getStudent()) redirect('/account');
  const acc = (await getSite()).accounts || {};
  if (acc.registrationOpen === false) return <div className="wrap narrow page-pad"><MascotSay mood="oops" text="Οι εγγραφές είναι προσωρινά κλειστές. Έλα ξανά σύντομα!" /></div>;
  return <RegisterForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''} domains={acc.allowedDomains || ''} />;
}
