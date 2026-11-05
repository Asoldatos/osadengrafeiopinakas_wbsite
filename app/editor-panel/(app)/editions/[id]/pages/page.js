import { notFound } from 'next/navigation';
import Link from 'next/link';
import { q } from '@/lib/db';
import HotspotEditor from '@/components/admin/HotspotEditor';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Διαδραστικά στοιχεία σελίδων' };
export default async function Page({ params }) {
  const r = await q('select id, slug, title, digital_pdf_url from editions where id=$1', [+params.id || 0]);
  if (!r[0]) notFound();
  return (<><p><Link href="/editor-panel/editions">← Πίσω στα τεύχη</Link></p><h1>Διαδραστικά στοιχεία: {r[0].title}</h1>
    {r[0].digital_pdf_url ? <HotspotEditor edition={{ id: r[0].id, slug: r[0].slug, title: r[0].title }} /> : <p>Ανέβασε πρώτα ψηφιακό PDF στο τεύχος.</p>}</>);
}
