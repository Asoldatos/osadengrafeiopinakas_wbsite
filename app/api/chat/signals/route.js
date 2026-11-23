import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
/** Εφεδρικό «polling» για σήματα (κλήσεις, νέα DM) όταν δεν υπάρχει σύνδεση Ably. ?after=ID */
export const GET = sroute(async (req, _c, st) => {
  const after = +new URL(req.url).searchParams.get('after') || 0;
  await q("delete from chat_signals where created_at < now() - interval '3 minutes'");
  const rows = await q(`select id, from_id, kind, data from chat_signals where to_id=$1 and id>$2 and created_at > now() - interval '90 seconds' order by id limit 100`, [st.id, after]);
  const last = after ? null : (await q('select coalesce(max(id),0)::bigint id from chat_signals where to_id=$1', [st.id]))[0].id;
  return json({ signals: rows.map((r) => ({ id: +r.id, from: r.from_id, kind: r.kind, data: r.data })), last: last !== null ? +last : undefined });
});
