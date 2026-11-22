import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { cleanText } from '@/lib/sanitize';
import { moderate, filterOpts } from '@/lib/community.mjs';
import { needFeature, getCommunity, countSince } from '@/lib/communityServer';

const list = (id, me) => q(`select c.id, c.body, c.created_at, s.nickname, s.avatar, (c.student_id = $2) mine,
    exists(select 1 from comment_reports r where r.comment_id=c.id and r.student_id=$2) reported
  from comments c join students s on s.id=c.student_id where c.article_id=$1 and c.status='visible' and not s.disabled order by c.id desc limit 200`, [id, me || 0]);
/** Σχόλια άρθρου (ανοιχτά για ανάγνωση) + κατάσταση του μαθητή (like, μπορεί να σχολιάσει). */
export const GET = sroute(async (_req, { params }, st) => {
  const id = +params.id, c = await getCommunity();
  const a = (await q("select like_count, view_count from articles where id=$1 and status='published'", [id]))[0];
  if (!a) return json({ error: 'Δεν βρέθηκε.' }, 404);
  const liked = st ? (await q('select 1 from article_likes where article_id=$1 and student_id=$2', [id, st.id])).length > 0 : false;
  return json({ enabled: { comments: c.comments, likes: c.likes, views: c.views }, likes: a.like_count, views: a.view_count, liked, me: st ? { nickname: st.nickname, avatar: st.avatar } : null, comments: c.comments ? await list(id, st?.id) : [] });
}, { open: true });
/** Νέο σχόλιο: φίλτρο λέξεων/συνδέσμων/στοιχείων επικοινωνίας και όρια ρυθμού. Εμφανίζεται αμέσως. */
export const POST = sroute(async (req, { params }, st) => {
  const c = await needFeature('comments', st);
  const id = +params.id;
  const ok = await q("select 1 from articles where id=$1 and status='published'", [id]); if (!ok.length) return json({ error: 'Δεν βρέθηκε το άρθρο.' }, 404);
  const text = cleanText((await body(req)).body, 1000).trim();
  if (text.length < 2) return json({ error: 'Γράψε το σχόλιό σου.' }, 400);
  const m = moderate(text, filterOpts(c, 'comments')); if (m.error) return json({ error: m.error }, 400);
  if (await countSince("select count(*)::int n from comments where student_id=$1 and created_at > now() - interval '30 seconds'", [st.id])) return json({ error: 'Περίμενε λίγα δευτερόλεπτα πριν το επόμενο σχόλιο.' }, 429);
  if (await countSince("select count(*)::int n from comments where student_id=$1 and created_at > now() - interval '1 day'", [st.id]) >= 30) return json({ error: 'Έφτασες το όριο σχολίων για σήμερα. Τα λέμε αύριο!' }, 429);
  // ήπιοι όροι: δημοσιεύεται, αλλά εμφανίζεται στους διαχειριστές για έλεγχο (με τον όρο και τον κανόνα που ταίριαξε)
  await q('insert into comments(article_id, student_id, body, auto_flag) values($1,$2,$3,$4)', [id, st.id, text, (m.flag || []).map((x) => `${x.term} (${x.rule})`).join(', ').slice(0, 300)]);
  await q("update articles set comment_count = (select count(*) from comments where article_id=$1 and status='visible') where id=$1", [id]);
  return json({ ok: true, comments: await list(id, st.id) }, 201);
});
