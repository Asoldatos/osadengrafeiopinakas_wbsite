import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { finishPlay } from '@/lib/student';
import { scoreFor, xpFor } from '@/lib/games.mjs';

/** Καταγραφή αποτελέσματος για memory / hangman / catch. Η βαθμολογία υπολογίζεται εδώ, όχι στον browser. */
export const POST = sroute(async (req, _c, st) => {
  const { game, meta = {} } = await body(req);
  if (!['memory', 'hangman', 'catch'].includes(game)) return json({ error: 'Άγνωστο παιχνίδι.' }, 400);
  const score = scoreFor(game, meta);
  if (score == null) return json({ error: 'Μη έγκυρο αποτέλεσμα.' }, 400);
  const recent = await q("select 1 from game_scores where student_id=$1 and game=$2 and created_at > now() - interval '12 seconds'", [st.id, game]);
  if (recent.length) return json({ error: 'Πολύ γρήγορα! Περίμενε λίγο πριν το επόμενο παιχνίδι.' }, 429);
  const clean = game === 'memory' ? { moves: +meta.moves, secs: +meta.secs } : game === 'hangman' ? { won: meta.won === true, wrong: +meta.wrong } : { caught: +meta.caught, bombs: +meta.bombs };
  await q('insert into game_scores(student_id, game, score, meta) values($1,$2,$3,$4::jsonb)', [st.id, game, score, JSON.stringify(clean)]);
  const codes = ['first-game'];
  if (game === 'memory' && clean.moves < 12) codes.push('speedy-memory');
  if (game === 'catch' && score >= 100) codes.push('chalk-master');
  if (game === 'hangman' && (await q("select count(*)::int n from game_scores where student_id=$1 and game='hangman' and score>0", [st.id]))[0].n >= 5) codes.push('wordsmith');
  const xp = await finishPlay(st.id, { xp: xpFor(game, score, clean), codes });
  const best = (await q('select max(score)::int s from game_scores where student_id=$1 and game=$2', [st.id, game]))[0].s;
  return json({ score, best, xp });
});
