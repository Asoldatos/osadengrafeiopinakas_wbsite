import { q, logActivity } from '@/lib/db';
import { verifyPassword, DUMMY_HASH } from '@/lib/crypto.mjs';
import { createSession, sessionCookie, clientIp } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';
import { checkLock, lockMessage, registerFailure, clearFailures } from '@/lib/security';
import { NextResponse } from 'next/server';

/** Σύνδεση διαχειριστή: όριο 5 αποτυχιών ανά IP+λογαριασμό και 15 ανά IP (περιορισμός 15 λεπτών), ειδοποίηση email στον λογαριασμό. */
export const POST = route(async (req) => {
  const { email = '', password = '' } = await body(req);
  const e = String(email).trim().toLowerCase().slice(0, 200);
  const ip = clientIp(req);
  const lock = await checkLock('login', e, ip);
  if (lock.locked) return json({ error: lockMessage(lock.minutes), locked: true }, 429);
  const r = await q('select * from users where email=$1', [e]);
  const u = r[0];
  const ok = verifyPassword(String(password), u ? u.password_hash : DUMMY_HASH) && !!u;
  if (!ok) { await registerFailure('login', e, ip, u || null, '/editor-panel/forgot'); return json({ error: 'Λάθος email ή κωδικός.' }, 401); }
  await clearFailures('login', e, ip);
  const { token, ttl } = await createSession(u.id, u.totp_enabled);
  if (!u.totp_enabled) await logActivity(u, 'Σύνδεση');
  const res = NextResponse.json({ ok: true, need2fa: u.totp_enabled });
  res.cookies.set(sessionCookie(token, ttl));
  return res;
}, { open: true });
