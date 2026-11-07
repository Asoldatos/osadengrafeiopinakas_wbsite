import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/play/StudentForms';
import { getStudent } from '@/lib/student';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Σύνδεση μαθητή', robots: { index: false } };
export default async function Page({ searchParams }) {
  const next = typeof searchParams.next === 'string' && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '/account';
  if (await getStudent()) redirect(next);
  return <LoginForm next={next} />;
}
