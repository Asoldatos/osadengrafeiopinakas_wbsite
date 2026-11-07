import { q, logActivity } from '@/lib/db';
import { hashPassword, sha256 } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';
import { getSite } from '@/lib/data';
import { sendMail, mailConfigured, baseUrl } from '@/lib/mail.mjs';
import { passwordChangedEmail } from '@/lib/emails.mjs';

export const POST = route(async (req) => {
  const ipKey = `reset-ip:${clientIp(req)}`;
  if (await tooMany(ipKey, 10, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.' }, 429);
  const { token = '', password = '' } = await body(req);
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) return json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 10 χαρακτήρες.' }, 400);
  const bad = async () => { await recordFail(ipKey); return json({ error: 'Ο σύνδεσμος δεν ισχύει πια ή έχει ήδη χρησιμοποιηθεί. Ζήτησε νέο.' }, 400); };
  const row = (await q(`select r.id, u.id as user_id, u.email, u.name from password_resets r join users u on u.id=r.user_id
    where r.token_hash=$1 and r.used_at is null and r.expires_at > now()`, [sha256(String(token))]))[0];
  if (!row) return bad();
  const claimed = await q('update password_resets set used_at=now() where id=$1 and used_at is null returning id', [row.id]);
  if (!claimed.length) return bad();
  await q('update users set password_hash=$1 where id=$2', [hashPassword(password), row.user_id]);
  await q('delete from sessions where user_id=$1', [row.user_id]);
  await q('delete from attempts where key like $2 or key=$1', [`2fa:${row.user_id}`, `login:%:${row.email}`]);
  await logActivity(row, 'Επαναφορά κωδικού μέσω email');
  if (mailConfigured()) {
    try { const site = await getSite(); const base = baseUrl(); await sendMail({ to: row.email, ...passwordChangedEmail({ name: row.name, siteName: site.name, base }), fromName: site.name }); }
    catch (err) { console.error('Αποτυχία ειδοποίησης αλλαγής κωδικού:', err.message); }
  }
  return json({ ok: true });
}, { open: true });
