import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { consumeToken, createStudentSession, studentCookie } from '@/lib/student';

export const POST = sroute(async (req) => {
  const k = `verify-ip:${clientIp(req)}`;
  if (await tooMany(k, 20, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα.' }, 429);
  const { token = '' } = await body(req);
  const st = await consumeToken(token, 'verify');
  if (!st) { await recordFail(k); return json({ error: 'Ο σύνδεσμος δεν ισχύει πια ή έχει ήδη χρησιμοποιηθεί.' }, 400); }
  await q('update students set verified=true, last_login=now() where id=$1', [st.id]);
  const res = NextResponse.json({ ok: true, nickname: st.nickname });
  res.cookies.set(studentCookie(await createStudentSession(st.id)));
  return res;
}, { open: true });
