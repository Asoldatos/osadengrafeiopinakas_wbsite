import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { verifyPassword, DUMMY_HASH } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { createStudentSession, studentCookie, isKnownDevice, sendOtpMail } from '@/lib/student';
import { checkLock, lockMessage, registerFailure, clearFailures } from '@/lib/security';

/** Σύνδεση μαθητή: κωδικός → (νέα συσκευή: κωδικός email) → (2FA: κωδικός εφαρμογής) → πλήρης συνεδρία. */
export const POST = sroute(async (req) => {
  const { email = '', password = '' } = await body(req);
  const e = String(email).trim().toLowerCase().slice(0, 200), ip = clientIp(req);
  const lock = await checkLock('slogin', e, ip);
  if (lock.locked) return json({ error: lockMessage(lock.minutes), locked: true }, 429);
  const st = (await q('select * from students where email=$1', [e]))[0];
  const ok = verifyPassword(String(password), st ? st.password_hash : DUMMY_HASH) && !!st;
  if (!ok) { await registerFailure('slogin', e, ip, st && !st.disabled ? st : null, '/account/forgot'); return json({ error: 'Λάθος email ή κωδικός.' }, 401); }
  if (st.disabled) return json({ error: 'Ο λογαριασμός αυτός έχει αποκλειστεί. Επικοινώνησε με τη σύνταξη.' }, 403);
  if (!st.verified) return json({ error: 'Πρέπει πρώτα να επιβεβαιώσεις το email σου. Έλεγξε τα εισερχόμενά σου.', unverified: true }, 403);
  await clearFailures('slogin', e, ip);
  const respond = async (stage, step) => {
    const res = NextResponse.json({ ok: true, step });
    res.cookies.set(studentCookie(await createStudentSession(st.id, stage), !!stage));
    return res;
  };
  if (!(await isKnownDevice(st.id))) {                 // άγνωστη συσκευή → κωδικός μίας χρήσης στο email (ισχύει 5 λεπτά)
    const k = `otp-send:${st.id}:login`;
    if (await tooMany(k, 4, 15)) return json({ error: 'Έχεις ζητήσει πολλούς κωδικούς. Δοκίμασε ξανά σε λίγο.' }, 429);
    await recordFail(k);
    try { await sendOtpMail(st, 'login'); } catch (err) { console.error('OTP email:', err.message); return json({ error: 'Δεν μπορέσαμε να στείλουμε τον κωδικό στο email σου. Δοκίμασε ξανά σε λίγο.' }, 503); }
    return respond('otp', 'otp');
  }
  if (st.totp_enabled) return respond('totp', 'totp');
  await q('update students set last_login=now() where id=$1', [st.id]);
  return respond(null, 'done');
}, { open: true });
