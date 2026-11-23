import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needChat } from '@/lib/chat';
/** Μέλη ενός server (μόνο αν είσαι μέλος), με ένδειξη online. */
export const GET = sroute(async (req, _c, st) => {
  await needChat(st);
  const id = +new URL(req.url).searchParams.get('server') || 0;
  if (!(await q('select 1 from chat_members where server_id=$1 and student_id=$2', [id, st.id])).length) return json({ error: 'Δεν είσαι μέλος.' }, 403);
  return json(await q(`select s.id, s.nickname, s.avatar, coalesce(s.last_seen_chat > now() - interval '2 minutes', false) online from chat_members m join students s on s.id=m.student_id
    where m.server_id=$1 and not s.disabled order by online desc, s.nickname limit 300`, [id]));
});
