import { q } from '@/lib/db';
import { getAdmin } from '@/lib/auth';
import { route, json } from '@/lib/guard';
import { getStudent } from '@/lib/student';
import { getSite } from '@/lib/data';

/** Παράδοση PDF μέσω διακομιστή: ελέγχει κατάσταση δημοσίευσης και δικαιώματα ανά έκδοση (ψηφιακή/εκτυπώσιμη). */
export const GET = route(async (req, { params }) => {
  const { kind, slug } = params;
  if (!['digital', 'print'].includes(kind)) return json({ error: 'Δεν βρέθηκε.' }, 404);
  const ed = (await q('select * from editions where slug=$1', [slug]))[0];
  const admin = await getAdmin();
  const url = ed && (kind === 'digital' ? ed.digital_pdf_url : ed.print_pdf_url);
  const visible = ed && (admin || (['published', 'archived'].includes(ed.status) && (kind === 'digital' ? ed.digital_public : ed.print_public)));
  if (!url || !visible) return json({ error: 'Το αρχείο δεν είναι διαθέσιμο.' }, 404);
  // Πρόσβαση: λήψη/εκτύπωση (και προαιρετικά ανάγνωση) μόνο για συνδεδεμένους μαθητές, για προστασία από ρομπότ
  const acc = (await getSite()).accounts || {};
  const st = admin ? null : await getStudent();
  const needs = kind === 'print' ? acc.printRequiresAccount !== false : acc.requireForReading === true;
  if (needs && !admin && !st) return json({ error: 'Για αυτή την ενέργεια χρειάζεται λογαριασμός μαθητή.', login: true }, 401);
  const dl = new URL(req.url).searchParams.get('download') === '1';
  if (kind === 'print' && st && dl && !req.headers.get('range')) {
    const n = (await q("select count(*)::int n from downloads where student_id=$1 and ts > now() - interval '1 hour'", [st.id]))[0].n;
    if (n >= 20) return json({ error: 'Έχεις κατεβάσει πολλά αρχεία σε λίγη ώρα. Δοκίμασε ξανά αργότερα.' }, 429);
    await q('insert into downloads(student_id, edition_id, kind) values($1,$2,$3)', [st.id, ed.id, kind]);
  }
  const range = req.headers.get('range');
  const up = await fetch(url, { headers: range ? { Range: range } : {} });
  if (!up.ok && up.status !== 206) return json({ error: 'Το αρχείο δεν βρέθηκε.' }, 502);
  const h = new Headers({ 'Content-Type': 'application/pdf', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' });
  for (const k of ['content-length', 'content-range']) if (up.headers.get(k)) h.set(k, up.headers.get(k));
  h.set('Content-Disposition', `${dl ? 'attachment' : 'inline'}; filename="${slug}${kind === 'print' ? '-print' : ''}.pdf"`);
  return new Response(up.body, { status: up.status, headers: h });
}, { open: true });
