import { q, logActivity } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';
import { getSite } from '@/lib/data';
import { sendMail, mailConfigured, baseUrl } from '@/lib/mail.mjs';
import { resetEmail } from '@/lib/emails.mjs';

/** Αίτημα επαναφοράς: η απάντηση είναι πάντα η ίδια, ανεξάρτητα από το αν υπάρχει ο λογαριασμός. */
export const POST = route(async (req) => {
  if (!mailConfigured()) return json({ error: 'Η αποστολή email δεν έχει ρυθμιστεί ακόμα. Ζητήστε από τον διαχειριστή του ιστοτόπου να την ενεργοποιήσει.' }, 503);
  const { email = '' } = await body(req);
  const e = String(email).trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return json({ error: 'Συμπληρώστε ένα έγκυρο email.' }, 400);
  const k1 = `forgot-ip:${clientIp(req)}`, k2 = `forgot-email:${e}`;
  if ((await tooMany(k1, 6, 60)) || (await tooMany(k2, 3, 60))) return json({ error: 'Έχουν γίνει πολλά αιτήματα. Δοκίμασε ξανά σε λίγη ώρα.' }, 429);
  await Promise.all([recordFail(k1), recordFail(k2)]);
  const u = (await q('select id, name, email from users where email=$1', [e]))[0];
  if (u) {
    const token = randomToken(32);
    await q('update password_resets set used_at=now() where user_id=$1 and used_at is null', [u.id]);
    await q("insert into password_resets(user_id, token_hash, expires_at) values($1,$2, now() + interval '1 hour')", [u.id, sha256(token)]);
    try {
      const site = await getSite(); const base = baseUrl();
      const m = resetEmail({ name: u.name, link: `${base}/editor-panel/reset?token=${token}`, siteName: site.name, base });
      await sendMail({ to: u.email, ...m, fromName: site.name });
      await logActivity(u, 'Αίτημα επαναφοράς κωδικού');
    } catch (err) { console.error('Αποτυχία αποστολής email επαναφοράς:', err.message); }
  }
  return json({ ok: true });
}, { open: true });
