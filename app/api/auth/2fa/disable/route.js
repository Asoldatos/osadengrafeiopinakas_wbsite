import { q, logActivity } from '@/lib/db';
import { verifyPassword, decrypt, verifyTotp, hashRecovery } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clearFails } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';

/** Απενεργοποίηση: απαιτεί κωδικό ΚΑΙ έγκυρο κωδικό 2FA (ή ανάκτησης). */
export const POST = route(async (req, _c, user) => {
  const key = `2fa-off:${user.user_id}`;
  if (await tooMany(key, 5, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκιμάστε αργότερα.' }, 429);
  const { password, code, recovery } = await body(req);
  const u = (await q('select * from users where id=$1', [user.user_id]))[0];
  if (!u.totp_enabled) return json({ error: 'Η επαλήθευση δύο βημάτων δεν είναι ενεργή.' }, 409);
  let ok = verifyPassword(String(password || ''), u.password_hash);
  if (ok) {
    if (recovery) ok = (await q('update recovery_codes set used_at=now() where user_id=$1 and code_hash=$2 and used_at is null returning id', [u.id, hashRecovery(recovery)])).length > 0;
    else ok = !!verifyTotp(decrypt(u.totp_secret_enc), code, Number(u.totp_last_step));
  }
  if (!ok) { await recordFail(key); return json({ error: 'Λάθος κωδικός ή κωδικός επαλήθευσης.' }, 401); }
  await clearFails(key);
  await q('update users set totp_enabled=false, totp_secret_enc=null, totp_pending_enc=null, totp_last_step=0 where id=$1', [u.id]);
  await q('delete from recovery_codes where user_id=$1', [u.id]);
  await logActivity(u, 'Απενεργοποίηση επαλήθευσης δύο βημάτων');
  return json({ ok: true });
});
