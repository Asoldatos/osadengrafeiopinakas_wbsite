import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
/** Μετρητές για το εικονίδιο της μπάρας: αδιάβαστα μηνύματα + αιτήματα φιλίας. */
export const GET = sroute(async (_r, _c, st) => {
  if (!st) return json({ messages: 0, requests: 0 });
  const r = (await q(`select (select count(*)::int from dm_messages where (a=$1 or b=$1) and sender<>$1 and read_at is null) m,
    (select count(*)::int from friendships where (a=$1 or b=$1) and status='pending' and requester<>$1) f`, [st.id]))[0];
  return json({ messages: r.m, requests: r.f });
}, { open: true });
