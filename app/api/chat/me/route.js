import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
/** Ρυθμίσεις του μαθητή για το chat: { allowCalls } */
export const PATCH = sroute(async (req, _c, st) => {
  const b = await body(req);
  await q('update students set allow_calls=$1 where id=$2', [b.allowCalls !== false, st.id]);
  return json({ ok: true, allowCalls: b.allowCalls !== false });
});
