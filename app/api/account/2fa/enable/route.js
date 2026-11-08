import { q } from '@/lib/db';
import { decrypt, verifyTotp, makeRecoveryCodes, hashRecovery } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clearFails } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';

export const POST = sroute(async (req, _c, st) => {
  const key = `s2fa-setup:${st.id}`;
  if (await tooMany(key, 8, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα.' }, 429);
  const { code } = await body(req);
  const u = (await q('select * from students where id=$1', [st.id]))[0];
  if (u.totp_enabled) return json({ error: 'Ήδη ενεργή.' }, 409);
  if (!u.totp_pending_enc) return json({ error: 'Ξεκίνα ξανά τη ρύθμιση.' }, 400);
  const step = verifyTotp(decrypt(u.totp_pending_enc), code, 0);
  if (!step) { await recordFail(key); return json({ error: 'Ο κωδικός δεν είναι σωστός. Έλεγξε την ώρα του κινητού σου και δοκίμασε ξανά.' }, 400); }
  await clearFails(key);
  const codes = makeRecoveryCodes(10);
  await q('delete from student_recovery_codes where student_id=$1', [st.id]);
  for (const c of codes) await q('insert into student_recovery_codes(student_id, code_hash) values($1,$2)', [st.id, hashRecovery(c)]);
  await q('update students set totp_secret_enc=totp_pending_enc, totp_pending_enc=null, totp_enabled=true, totp_last_step=$1 where id=$2', [step, st.id]);
  return json({ ok: true, recoveryCodes: codes });
});
