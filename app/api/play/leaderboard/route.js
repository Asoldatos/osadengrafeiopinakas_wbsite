import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';

export const GET = sroute(async (req, _c, st) => {
  const game = new URL(req.url).searchParams.get('game');
  if (!['quiz', 'memory', 'hangman', 'catch'].includes(game)) return json({ error: 'Άγνωστο παιχνίδι.' }, 400);
  const rows = await q(`select s.nickname, s.avatar, max(g.score)::int as score from game_scores g join students s on s.id = g.student_id
    where g.game=$1 and s.verified and not s.disabled group by s.id, s.nickname, s.avatar order by score desc, min(g.created_at) asc limit 10`, [game]);
  const mine = (await q('select max(score)::int s from game_scores where student_id=$1 and game=$2', [st.id, game]))[0].s;
  return json({ rows, mine, me: st.nickname });
});
