import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { verifyPassword, DUMMY_HASH } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clearFails, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { createStudentSession, studentCookie } from '@/lib/student';

export const POST = sroute(async (req) => {
  const { email = '', password = '' } = await body(req);
  const e = String(email).trim().toLowerCase().slice(0, 200), ip = clientIp(req);
  const k1 = `slogin:${ip}:${e}`, k2 = `slogin-ip:${ip}`;
  if ((await tooMany(k1, 8, 15)) || (await tooMany(k2, 40, 15))) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε 15 λεπτά.' }, 429);
  const st = (await q('select * from students where email=$1', [e]))[0];
  const ok = verifyPassword(String(password), st ? st.password_hash : DUMMY_HASH) && !!st;
  if (!ok) { await Promise.all([recordFail(k1), recordFail(k2)]); return json({ error: 'Λάθος email ή κωδικός.' }, 401); }
  if (st.disabled) return json({ error: 'Ο λογαριασμός αυτός έχει αποκλειστεί. Επικοινώνησε με τη σύνταξη.' }, 403);
  if (!st.verified) return json({ error: 'Πρέπει πρώτα να επιβεβαιώσεις το email σου. Έλεγξε τα εισερχόμενά σου.', unverified: true }, 403);
  await clearFails(k1);
  await q('update students set last_login=now() where id=$1', [st.id]);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(studentCookie(await createStudentSession(st.id)));
  return res;
}, { open: true });
