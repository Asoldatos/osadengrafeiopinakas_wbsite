import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { decrypt, verifyTotp, hashRecovery } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clearFails } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { getPendingStudent, createStudentSession, destroyStudentSession, studentCookie, addDevice, setPending } from '@/lib/student';
import { checkOtp } from '@/lib/otp';

async function finish(st, deviceCookie) {
  await destroyStudentSession();
  await q('update students set last_login=now() where id=$1', [st.id]);
  const res = NextResponse.json({ ok: true, step: 'done' });
  res.cookies.set(studentCookie(await createStudentSession(st.id)));
  if (deviceCookie) res.cookies.set(deviceCookie);
  return res;
}
export const POST = sroute(async (req) => {
  const st = await getPendingStudent();
  if (!st) return json({ error: 'Η συνεδρία έληξε. Συνδέσου ξανά.', restart: true }, 401);
  const { code, recovery } = await body(req);
  if (st.pending === 'otp') {
    const k = `sotp:${st.id}`;
    if (await tooMany(k, 6, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.' }, 429);
    const r = await checkOtp(st.id, 'login', code);
    if (r !== 'ok') { await recordFail(k); return json({ error: r === 'expired' ? 'Ο κωδικός έληξε. Πάτα «Στείλε νέο κωδικό».' : r === 'locked' ? 'Πολλά λάθη σε αυτόν τον κωδικό. Ζήτησε νέο.' : 'Λάθος κωδικός.' }, 401); }
    await clearFails(k);
    const dev = await addDevice(st.id);                 // η συσκευή γίνεται αξιόπιστη
    if (st.totp_enabled) { await setPending('totp'); const res = NextResponse.json({ ok: true, step: 'totp' }); res.cookies.set(dev); return res; }
    return finish(st, dev);
  }
  const k = `s2fa:${st.id}`;
  if (await tooMany(k, 6, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.' }, 429);
  const u = (await q('select * from students where id=$1', [st.id]))[0];
  let ok = false;
  if (recovery) ok = (await q('update student_recovery_codes set used_at=now() where student_id=$1 and code_hash=$2 and used_at is null returning id', [st.id, hashRecovery(recovery)])).length > 0;
  else if (u.totp_secret_enc) {
    const step = verifyTotp(decrypt(u.totp_secret_enc), code, Number(u.totp_last_step));
    if (step) ok = (await q('update students set totp_last_step=$1 where id=$2 and totp_last_step<$1 returning id', [step, st.id])).length > 0;
  }
  if (!ok) { await recordFail(k); return json({ error: 'Μη έγκυρος κωδικός.' }, 401); }
  await clearFails(k);
  return finish(st, null);
}, { open: true });
