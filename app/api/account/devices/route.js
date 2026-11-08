import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
export const GET = sroute(async (_r, _c, st) => json(await q('select id, label, created_at, last_seen from student_devices where student_id=$1 order by last_seen desc', [st.id])));
/** { id } αφαιρεί μία συσκευή· { all: true } αφαιρεί όλες (χρειάζεται νέος κωδικός email στην επόμενη σύνδεση). */
export const POST = sroute(async (req, _c, st) => {
  const b = await body(req);
  if (b.all) await q('delete from student_devices where student_id=$1', [st.id]);
  else await q('delete from student_devices where student_id=$1 and id=$2', [st.id, +b.id || 0]);
  return json({ ok: true });
});
