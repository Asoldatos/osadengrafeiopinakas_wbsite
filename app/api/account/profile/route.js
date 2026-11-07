import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { cleanNickname } from '@/lib/students.mjs';
import { AVATARS } from '@/lib/progress.mjs';

export const POST = sroute(async (req, _c, st) => {
  const b = await body(req); const sets = [], vals = [];
  if (b.nickname !== undefined && b.nickname !== st.nickname) {
    const n = cleanNickname(b.nickname); if (n.error) return json({ error: n.error }, 400);
    if ((await q('select 1 from students where nick_lower=$1 and id<>$2', [n.value.toLowerCase(), st.id])).length) return json({ error: 'Αυτό το όνομα χρήστη υπάρχει ήδη.' }, 409);
    vals.push(n.value, n.value.toLowerCase()); sets.push(`nickname=$${vals.length - 1}`, `nick_lower=$${vals.length}`);
  }
  if (b.avatar !== undefined) { if (!AVATARS.includes(b.avatar)) return json({ error: 'Μη έγκυρο avatar.' }, 400); vals.push(b.avatar); sets.push(`avatar=$${vals.length}`); }
  if (!sets.length) return json({ ok: true });
  vals.push(st.id);
  await q(`update students set ${sets.join(',')} where id=$${vals.length}`, vals);
  return json({ ok: true });
});
