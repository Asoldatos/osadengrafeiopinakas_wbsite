import { q } from '@/lib/db';
import { getAdmin } from '@/lib/auth';
import { route, json } from '@/lib/guard';

/** Παράδοση PDF μέσω διακομιστή: ελέγχει κατάσταση δημοσίευσης και δικαιώματα ανά έκδοση (ψηφιακή/εκτυπώσιμη). */
export const GET = route(async (req, { params }) => {
  const { kind, slug } = params;
  if (!['digital', 'print'].includes(kind)) return json({ error: 'Δεν βρέθηκε.' }, 404);
  const ed = (await q('select * from editions where slug=$1', [slug]))[0];
  const admin = await getAdmin();
  const url = ed && (kind === 'digital' ? ed.digital_pdf_url : ed.print_pdf_url);
  const visible = ed && (admin || (['published', 'archived'].includes(ed.status) && (kind === 'digital' ? ed.digital_public : ed.print_public)));
  if (!url || !visible) return json({ error: 'Το αρχείο δεν είναι διαθέσιμο.' }, 404);
  const range = req.headers.get('range');
  const up = await fetch(url, { headers: range ? { Range: range } : {} });
  if (!up.ok && up.status !== 206) return json({ error: 'Το αρχείο δεν βρέθηκε.' }, 502);
  const h = new Headers({ 'Content-Type': 'application/pdf', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' });
  for (const k of ['content-length', 'content-range']) if (up.headers.get(k)) h.set(k, up.headers.get(k));
  const dl = new URL(req.url).searchParams.get('download') === '1';
  h.set('Content-Disposition', `${dl ? 'attachment' : 'inline'}; filename="${slug}${kind === 'print' ? '-print' : ''}.pdf"`);
  return new Response(up.body, { status: up.status, headers: h });
}, { open: true });
