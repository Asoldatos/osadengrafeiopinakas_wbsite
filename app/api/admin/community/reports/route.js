import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { cleanText } from '@/lib/sanitize';
/** Αναφορές συνομιλιών. Ο διαχειριστής βλέπει ΜΟΝΟ συνομιλίες που αναφέρθηκαν (όχι όλα τα μηνύματα). */
export const GET = route(async (req) => {
  const st = new URL(req.url).searchParams.get('s') === 'all' ? '' : "where r.status='open'";
  return json(await q(`select r.id, r.reason, r.snapshot, r.status, r.note, r.created_at, r.resolved_at,
    a.id reporter_id, a.nickname reporter, b.id reported_id, b.nickname reported, b.community_banned reported_banned
    from dm_reports r left join students a on a.id=r.reporter left join students b on b.id=r.reported ${st} order by r.id desc limit 200`));
}, { perm: 'community' });
export const PUT = route(async (req, _c, user) => {
  const b = await body(req);
  const status = b.status === 'open' ? 'open' : 'resolved';
  const r = await q(`update dm_reports set status=$1, note=$2, resolved_at=${status === 'resolved' ? 'now()' : 'null'} where id=$3 returning id`, [status, cleanText(b.note, 1000), +b.id]);
  if (!r.length) return json({ error: 'Δεν βρέθηκε.' }, 404);
  await logActivity(user, 'Αναφορά συνομιλίας', `#${b.id} → ${status}`);
  return json({ ok: true });
}, { perm: 'community' });
