import { q } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/crypto.mjs';
import { tooMany, recordFail } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { currentSessionHash } from '@/lib/student';
import { passwordOk } from '@/lib/students.mjs';

export const POST = sroute(async (req, _c, st) => {
  const k = `spw:${st.id}`;
  if (await tooMany(k, 5, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα.' }, 429);
  const { current = '', next = '' } = await body(req);
  const row = (await q('select password_hash from students where id=$1', [st.id]))[0];
  if (!verifyPassword(String(current), row.password_hash)) { await recordFail(k); return json({ error: 'Ο τρέχων κωδικός δεν είναι σωστός.' }, 401); }
  if (!passwordOk(next)) return json({ error: 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.' }, 400);
  await q('update students set password_hash=$1 where id=$2', [hashPassword(next), st.id]);
  await q('delete from student_sessions where student_id=$1 and id<>$2', [st.id, currentSessionHash()]);
  return json({ ok: true });
});
