import QRCode from 'qrcode';
import { q } from '@/lib/db';
import { verifyPassword, newTotpSecret, encrypt, otpauthUri } from '@/lib/crypto.mjs';
import { tooMany, recordFail } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { getSite } from '@/lib/data';

export const POST = sroute(async (req, _c, st) => {
  const key = `s2fa-reauth:${st.id}`;
  if (await tooMany(key, 5, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα.' }, 429);
  const { password } = await body(req);
  const u = (await q('select * from students where id=$1', [st.id]))[0];
  if (!verifyPassword(String(password || ''), u.password_hash)) { await recordFail(key); return json({ error: 'Λάθος κωδικός.' }, 401); }
  if (u.totp_enabled) return json({ error: 'Η επαλήθευση δύο βημάτων είναι ήδη ενεργή.' }, 409);
  const secret = newTotpSecret(), site = await getSite();
  const uri = otpauthUri(u.email, secret, site.name);
  await q('update students set totp_pending_enc=$1 where id=$2', [encrypt(secret), st.id]);
  return json({ qr: await QRCode.toDataURL(uri, { margin: 1, width: 260, errorCorrectionLevel: 'M' }), secret });
});
