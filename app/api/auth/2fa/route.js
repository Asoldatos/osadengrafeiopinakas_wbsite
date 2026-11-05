import { q, logActivity } from '@/lib/db';
import { decrypt, verifyTotp, hashRecovery } from '@/lib/crypto.mjs';
import { getSession, tooMany, recordFail, clearFails, createSession, sessionCookie, destroySession } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';
import { NextResponse } from 'next/server';

/** Δεύτερο βήμα σύνδεσης: κωδικός TOTP ή κωδικός ανάκτησης. */
export const POST = route(async (req) => {
  const s = await getSession();
  if (!s || !s.pending) return json({ error: 'Η συνεδρία έληξε. Συνδεθείτε ξανά.' }, 401);
  const key = `2fa:${s.user_id}`;
  if (await tooMany(key, 5, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκιμάστε ξανά σε 15 λεπτά.' }, 429);
  const { code, recovery } = await body(req);
  const u = (await q('select * from users where id=$1', [s.user_id]))[0];
  let ok = false;
  if (recovery) {
    const r = await q('update recovery_codes set used_at=now() where user_id=$1 and code_hash=$2 and used_at is null returning id', [u.id, hashRecovery(recovery)]);
    ok = r.length > 0;
  } else if (u.totp_secret_enc) {
    const step = verifyTotp(decrypt(u.totp_secret_enc), code, Number(u.totp_last_step));
    if (step) {
      // ατομική ενημέρωση: αποτρέπει επανάληψη του ίδιου κωδικού
      const r = await q('update users set totp_last_step=$1 where id=$2 and totp_last_step<$1 returning id', [step, u.id]);
      ok = r.length > 0;
    }
  }
  if (!ok) { await recordFail(key); return json({ error: 'Μη έγκυρος κωδικός.' }, 401); }
  await clearFails(key);
  await destroySession();
  const { token, ttl } = await createSession(u.id, false);
  await logActivity(u, recovery ? 'Σύνδεση με κωδικό ανάκτησης' : 'Σύνδεση με 2FA');
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(token, ttl));
  return res;
}, { open: true });
