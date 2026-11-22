import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
/** Αποκλεισμός μαθητή από σχόλια, φίλους και μηνύματα (ο λογαριασμός και τα παιχνίδια μένουν). */
export const POST = route(async (req, _c, user) => {
  const b = await body(req), banned = b.banned === true;
  const r = await q('update students set community_banned=$1 where id=$2 returning nickname', [banned, +b.student_id]);
  if (!r.length) return json({ error: 'Δεν βρέθηκε.' }, 404);
  if (banned) await q("update comments set status='hidden' where student_id=$1 and status='visible'", [+b.student_id]);
  await logActivity(user, banned ? 'Αποκλεισμός από κοινότητα' : 'Άρση αποκλεισμού κοινότητας', r[0].nickname);
  return json({ ok: true });
}, { perm: 'community' });
