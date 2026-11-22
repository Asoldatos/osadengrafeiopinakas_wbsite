import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needFeature } from '@/lib/communityServer';

/** Like / αναίρεση like (μόνο συνδεδεμένοι μαθητές: ένα like ανά λογαριασμό). */
export const POST = sroute(async (_req, { params }, st) => {
  await needFeature('likes', st);
  const id = +params.id;
  const ok = await q("select 1 from articles where id=$1 and status='published'", [id]); if (!ok.length) return json({ error: 'Δεν βρέθηκε το άρθρο.' }, 404);
  const del = await q('delete from article_likes where article_id=$1 and student_id=$2 returning 1', [id, st.id]);
  if (!del.length) await q('insert into article_likes(article_id, student_id) values($1,$2) on conflict do nothing', [id, st.id]);
  const n = (await q('update articles set like_count = (select count(*) from article_likes where article_id=$1) where id=$1 returning like_count', [id]))[0].like_count;
  return json({ liked: !del.length, likes: n });
});
