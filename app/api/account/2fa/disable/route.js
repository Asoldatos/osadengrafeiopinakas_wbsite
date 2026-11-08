import { q } from '@/lib/db';
import { verifyPassword, decrypt, verifyTotp, hashRecovery } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clearFails } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';

export const POST = sroute(async (req, _c, st) => {
  const key = `s2fa-off:${st.id}`;
  if (await tooMany(key, 5, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα.' }, 429);
  const { password, code, recovery } = await body(req);
  const u = (await q('select * from students where id=$1', [st.id]))[0];
  if (!u.totp_enabled) return json({ error: 'Η επαλήθευση δύο βημάτων δεν είναι ενεργή.' }, 409);
  let ok = verifyPassword(String(password || ''), u.password_hash);
  if (ok) {
    if (recovery) ok = (await q('update student_recovery_codes set used_at=now() where student_id=$1 and code_hash=$2 and used_at is null returning id', [st.id, hashRecovery(recovery)])).length > 0;
    else ok = !!verifyTotp(decrypt(u.totp_secret_enc), code, Number(u.totp_last_step));
  }
  if (!ok) { await recordFail(key); return json({ error: 'Λάθος κωδικός ή κωδικός επαλήθευσης.' }, 401); }
  await clearFails(key);
  await q('update students set totp_enabled=false, totp_secret_enc=null, totp_pending_enc=null, totp_last_step=0 where id=$1', [st.id]);
  await q('delete from student_recovery_codes where student_id=$1', [st.id]);
  return json({ ok: true });
});
