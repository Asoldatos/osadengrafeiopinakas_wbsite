import { q } from '@/lib/db';
import { randomToken } from '@/lib/crypto.mjs';
import { tooMany, recordFail } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { finishPlay } from '@/lib/student';
import { QUIZ_LEN, gradeQuiz, quizXp } from '@/lib/games.mjs';

/** Έναρξη κουίζ: οι σωστές απαντήσεις ΔΕΝ στέλνονται ποτέ στον browser. */
export const GET = sroute(async (_req, _c, st) => {
  const k = `quizstart:${st.id}`;
  if (await tooMany(k, 12, 60)) return json({ error: 'Έπαιξες πολλά κουίζ σε λίγη ώρα. Κάνε ένα διάλειμμα!' }, 429);
  await recordFail(k);
  const qs = await q('select id, question, options from quiz_questions where active order by random() limit $1', [QUIZ_LEN]);
  if (qs.length < 3) return json({ error: 'Δεν υπάρχουν ακόμα αρκετές ερωτήσεις. Έλα ξανά σύντομα!' }, 503);
  const run = randomToken(16);
  await q('insert into quiz_runs(id, student_id, qids) values($1,$2,$3::jsonb)', [run, st.id, JSON.stringify(qs.map((x) => x.id))]);
  return json({ run, questions: qs });
});
/** Υποβολή: βαθμολόγηση στον διακομιστή, μία φορά ανά κουίζ. */
export const POST = sroute(async (req, _c, st) => {
  const { run, answers } = await body(req);
  if (typeof run !== 'string' || !Array.isArray(answers)) return json({ error: 'Μη έγκυρα δεδομένα.' }, 400);
  const claimed = await q("update quiz_runs set done=true where id=$1 and student_id=$2 and not done and started_at > now() - interval '1 hour' returning qids, started_at", [run, st.id]);
  if (!claimed.length) return json({ error: 'Αυτό το κουίζ έχει ήδη υποβληθεί ή έχει λήξει. Ξεκίνα ένα νέο!' }, 400);
  const qids = claimed[0].qids;
  if (answers.length !== qids.length) return json({ error: 'Λείπουν απαντήσεις.' }, 400);
  if ((Date.now() - new Date(claimed[0].started_at).getTime()) / 1000 < qids.length * 1.5) return json({ error: 'Πολύ γρήγορα! Διάβασε τις ερωτήσεις με την ησυχία σου.' }, 429);
  const rows = await q('select id, correct_no, explanation from quiz_questions where id in (select jsonb_array_elements_text($1::jsonb)::int)', [JSON.stringify(qids)]);
  const g = gradeQuiz(qids, answers, new Map(rows.map((r) => [r.id, r])));
  const xp = await finishPlay(st.id, { xp: quizXp(g.correct, g.total), codes: ['first-game', g.total >= 5 && g.correct === g.total ? 'quiz-perfect' : null] });
  await q('insert into game_scores(student_id, game, score, meta) values($1,$2,$3,$4::jsonb)', [st.id, 'quiz', g.correct * 10, JSON.stringify({ total: g.total })]);
  return json({ ...g, xp });
});
