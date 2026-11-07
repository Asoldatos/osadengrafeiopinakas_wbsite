import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { verifyPassword } from '@/lib/crypto.mjs';
import { tooMany, recordFail } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { clearStudentCookie } from '@/lib/student';

/** Οριστική διαγραφή λογαριασμού και όλων των δεδομένων του (πρόοδος, παράσημα, σκορ, ιστορικό λήψεων). */
export const POST = sroute(async (req, _c, st) => {
  const k = `sdel:${st.id}`;
  if (await tooMany(k, 5, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα.' }, 429);
  const { password = '' } = await body(req);
  const row = (await q('select password_hash from students where id=$1', [st.id]))[0];
  if (!verifyPassword(String(password), row.password_hash)) { await recordFail(k); return json({ error: 'Ο κωδικός δεν είναι σωστός.' }, 401); }
  await q('delete from students where id=$1', [st.id]);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearStudentCookie());
  return res;
});
