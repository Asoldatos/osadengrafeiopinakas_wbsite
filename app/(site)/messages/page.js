import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getStudent } from '@/lib/student';
import Messages from '@/components/community/Messages';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Μηνύματα', robots: { index: false } };
export default async function Page() {
  if (!(await getStudent())) redirect('/account/login?next=/messages');
  return <div className="wrap page-pad"><h1 className="h1">Μηνύματα 💬</h1><Suspense fallback={<p className="muted">Φόρτωση…</p>}><Messages /></Suspense></div>;
}
