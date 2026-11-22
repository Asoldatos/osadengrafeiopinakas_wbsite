import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';

const recount = (aid) => q("update articles set comment_count = (select count(*) from comments where article_id=$1 and status='visible') where id=$1", [aid]);
/** Σχόλια για έλεγχο: ?f=reported (προεπιλογή) | hidden | all */
export const GET = route(async (req) => {
  const f = new URL(req.url).searchParams.get('f') || 'reported';
  const w = f === 'hidden' ? "c.status='hidden'" : f === 'all' ? "c.status<>'deleted'" : "c.status<>'deleted' and (c.reports > 0 or c.auto_flag <> '')";
  return json(await q(`select c.id, c.body, c.status, c.reports, c.auto_flag, c.created_at, a.title article, a.slug, s.id student_id, s.nickname, s.community_banned
    from comments c join articles a on a.id=c.article_id join students s on s.id=c.student_id where ${w} order by c.id desc limit 300`));
}, { perm: 'community' });
/** { id, status: visible|hidden|deleted } — «visible» μηδενίζει και τις αναφορές. */
export const PUT = route(async (req, _c, user) => {
  const b = await body(req);
  if (!['visible', 'hidden', 'deleted'].includes(b.status)) return json({ error: 'Μη έγκυρη κατάσταση.' }, 400);
  const r = await q(`update comments set status=$1${b.status === 'visible' ? ", reports=0, auto_flag=''" : ''} where id=$2 returning article_id`, [b.status, +b.id]);
  if (!r.length) return json({ error: 'Δεν βρέθηκε.' }, 404);
  if (b.status === 'visible') await q('delete from comment_reports where comment_id=$1', [+b.id]);
  await recount(r[0].article_id);
  await logActivity(user, 'Έλεγχος σχολίου', `#${b.id} → ${b.status}`);
  return json({ ok: true });
}, { perm: 'community' });
