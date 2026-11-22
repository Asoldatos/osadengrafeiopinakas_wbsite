import { redirect } from 'next/navigation';
import { getStudent } from '@/lib/student';
import Friends from '@/components/community/Friends';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Οι φίλοι μου', robots: { index: false } };
export default async function Page() {
  const st = await getStudent();
  if (!st) redirect('/account/login?next=/account/friends');
  return <div className="wrap narrow page-pad"><h1 className="h1">Φίλοι 🤝</h1><Friends me={st.nickname} /></div>;
}
