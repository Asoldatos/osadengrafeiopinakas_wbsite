import { q, logActivity } from '@/lib/db';
import { verifyPassword, DUMMY_HASH } from '@/lib/crypto.mjs';
import { createSession, sessionCookie, tooMany, recordFail, clearFails, clientIp } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';
import { NextResponse } from 'next/server';

export const POST = route(async (req) => {
  const { email = '', password = '' } = await body(req);
  const e = String(email).trim().toLowerCase().slice(0, 200);
  const ip = clientIp(req);
  const k1 = `login:${ip}:${e}`, k2 = `login-ip:${ip}`;
  if ((await tooMany(k1, 5, 15)) || (await tooMany(k2, 20, 15)))
    return json({ error: 'Πάρα πολλές προσπάθειες. Δοκιμάστε ξανά σε 15 λεπτά.' }, 429);
  const r = await q('select * from users where email=$1', [e]);
  const u = r[0];
  const ok = verifyPassword(String(password), u ? u.password_hash : DUMMY_HASH) && !!u;
  if (!ok) { await Promise.all([recordFail(k1), recordFail(k2)]); return json({ error: 'Λάθος email ή κωδικός.' }, 401); }
  await clearFails(k1);
  const { token, ttl } = await createSession(u.id, u.totp_enabled);
  if (!u.totp_enabled) await logActivity(u, 'Σύνδεση');
  const res = NextResponse.json({ ok: true, need2fa: u.totp_enabled });
  res.cookies.set(sessionCookie(token, ttl));
  return res;
}, { open: true });
