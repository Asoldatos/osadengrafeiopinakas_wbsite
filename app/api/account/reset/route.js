import { q } from '@/lib/db';
import { hashPassword } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { consumeToken } from '@/lib/student';
import { getSite } from '@/lib/data';
import { sendMail, mailConfigured, baseUrl } from '@/lib/mail.mjs';
import { studentPasswordChangedEmail } from '@/lib/emails.mjs';
import { passwordOk } from '@/lib/students.mjs';

export const POST = sroute(async (req) => {
  const k = `sreset-ip:${clientIp(req)}`;
  if (await tooMany(k, 10, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε σε λίγο.' }, 429);
  const { token = '', password = '' } = await body(req);
  if (!passwordOk(password)) return json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.' }, 400);
  const st = await consumeToken(token, 'reset');
  if (!st) { await recordFail(k); return json({ error: 'Ο σύνδεσμος δεν ισχύει πια ή έχει ήδη χρησιμοποιηθεί. Ζήτησε νέο.' }, 400); }
  await q('update students set password_hash=$1, verified=true where id=$2', [hashPassword(password), st.id]);
  await q('delete from student_sessions where student_id=$1', [st.id]);
  await q('delete from student_devices where student_id=$1', [st.id]);        // νέα επιβεβαίωση συσκευών μετά από επαναφορά
  await q('delete from attempts where key like $1 or key=$2', [`slogin:%:${st.email}`, `slogin-acct:${st.email}`]);
  if (mailConfigured()) { try { const site = await getSite(), base = baseUrl(); await sendMail({ to: st.email, ...studentPasswordChangedEmail({ nickname: st.nickname, siteName: site.name, base }), fromName: site.name }); } catch (e) { console.error(e.message); } }
  return json({ ok: true });
}, { open: true });
