import QRCode from 'qrcode';
import { q } from '@/lib/db';
import { verifyPassword, newTotpSecret, encrypt, otpauthUri } from '@/lib/crypto.mjs';
import { tooMany, recordFail } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';
import { getSite } from '@/lib/data';

/** Βήμα 1: επαναταυτοποίηση με κωδικό → νέο μυστικό (αποθηκεύεται κρυπτογραφημένο, εκκρεμεί). */
export const POST = route(async (req, _c, user) => {
  const key = `reauth:${user.user_id}`;
  if (await tooMany(key, 5, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκιμάστε αργότερα.' }, 429);
  const { password } = await body(req);
  const u = (await q('select * from users where id=$1', [user.user_id]))[0];
  if (!verifyPassword(String(password || ''), u.password_hash)) { await recordFail(key); return json({ error: 'Λάθος κωδικός.' }, 401); }
  if (u.totp_enabled) return json({ error: 'Η επαλήθευση δύο βημάτων είναι ήδη ενεργή.' }, 409);
  const secret = newTotpSecret();
  const site = await getSite();
  const uri = otpauthUri(u.email, secret, site.name);
  await q('update users set totp_pending_enc=$1 where id=$2', [encrypt(secret), u.id]);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 260, errorCorrectionLevel: 'M' });
  return json({ qr, secret, uri });
});
