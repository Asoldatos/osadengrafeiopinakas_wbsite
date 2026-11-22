import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needFeature } from '@/lib/communityServer';

const recount = (aid) => q("update articles set comment_count = (select count(*) from comments where article_id=$1 and status='visible') where id=$1", [aid]);
/** Αναφορά σχολίου: μετά από Ν αναφορές (ρύθμιση) κρύβεται αυτόματα μέχρι να το δει διαχειριστής. */
export const POST = sroute(async (_req, { params }, st) => {
  const c = await needFeature('comments', st);
  const id = +params.id;
  const cm = (await q('select id, article_id, student_id from comments where id=$1 and status=$2', [id, 'visible']))[0];
  if (!cm) return json({ error: 'Δεν βρέθηκε.' }, 404);
  if (cm.student_id === st.id) return json({ error: 'Δεν μπορείς να αναφέρεις δικό σου σχόλιο.' }, 400);
  const ins = await q('insert into comment_reports(comment_id, student_id) values($1,$2) on conflict do nothing returning 1', [id, st.id]);
  if (ins.length) {
    const n = (await q('update comments set reports = reports + 1 where id=$1 returning reports', [id]))[0].reports;
    if (n >= c.autoHideReports) { await q("update comments set status='hidden' where id=$1", [id]); await recount(cm.article_id); }
  }
  return json({ ok: true });
});
/** Ο μαθητής σβήνει δικό του σχόλιο. */
export const DELETE = sroute(async (_req, { params }, st) => {
  const r = await q("update comments set status='deleted' where id=$1 and student_id=$2 and status<>'deleted' returning article_id", [+params.id, st.id]);
  if (!r.length) return json({ error: 'Δεν βρέθηκε.' }, 404);
  await recount(r[0].article_id);
  return json({ ok: true });
});
