import { q, logActivity } from '@/lib/db';
import { decrypt, verifyTotp, makeRecoveryCodes, hashRecovery } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clearFails } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';

/** Βήμα 2: ενεργοποίηση ΜΟΝΟ μετά από επιτυχή επαλήθευση κωδικού. Επιστρέφει τους κωδικούς ανάκτησης μία φορά. */
export const POST = route(async (req, _c, user) => {
  const key = `2fa-setup:${user.user_id}`;
  if (await tooMany(key, 8, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκιμάστε αργότερα.' }, 429);
  const { code } = await body(req);
  const u = (await q('select * from users where id=$1', [user.user_id]))[0];
  if (u.totp_enabled) return json({ error: 'Ήδη ενεργή.' }, 409);
  if (!u.totp_pending_enc) return json({ error: 'Ξεκινήστε ξανά τη ρύθμιση.' }, 400);
  const step = verifyTotp(decrypt(u.totp_pending_enc), code, 0);
  if (!step) { await recordFail(key); return json({ error: 'Ο κωδικός δεν είναι σωστός. Ελέγξτε την ώρα του κινητού σας και δοκιμάστε ξανά.' }, 400); }
  await clearFails(key);
  const codes = makeRecoveryCodes(10);
  await q('delete from recovery_codes where user_id=$1', [u.id]);
  for (const c of codes) await q('insert into recovery_codes(user_id,code_hash) values($1,$2)', [u.id, hashRecovery(c)]);
  await q('update users set totp_secret_enc=totp_pending_enc, totp_pending_enc=null, totp_enabled=true, totp_last_step=$1 where id=$2', [step, u.id]);
  await logActivity(u, 'Ενεργοποίηση επαλήθευσης δύο βημάτων');
  return json({ ok: true, recoveryCodes: codes });
});
