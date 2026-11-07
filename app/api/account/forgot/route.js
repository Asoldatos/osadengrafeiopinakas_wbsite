import { q } from '@/lib/db';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { mailConfigured } from '@/lib/mail.mjs';
import { sendResetMail } from '@/lib/student';
import { verifyTurnstile } from '@/lib/turnstile';

export const POST = sroute(async (req) => {
  if (!mailConfigured()) return json({ error: 'Η αποστολή email δεν έχει ρυθμιστεί ακόμα.' }, 503);
  const b = await body(req), ip = clientIp(req);
  const e = String(b.email || '').trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return json({ error: 'Συμπλήρωσε ένα έγκυρο email.' }, 400);
  const k1 = `sforgot-ip:${ip}`, k2 = `sforgot:${e}`;
  if ((await tooMany(k1, 6, 60)) || (await tooMany(k2, 3, 60))) return json({ error: 'Έχουν γίνει πολλά αιτήματα. Δοκίμασε σε λίγη ώρα.' }, 429);
  await Promise.all([recordFail(k1), recordFail(k2)]);
  if (!(await verifyTurnstile(b.cf, ip))) return json({ error: 'Ο έλεγχος «δεν είμαι ρομπότ» δεν πέρασε. Δοκίμασε ξανά.' }, 400);
  const st = (await q('select id,email,nickname,disabled from students where email=$1', [e]))[0];
  if (st && !st.disabled) { try { await sendResetMail(st); } catch (err) { console.error(err.message); } }
  return json({ ok: true });
}, { open: true });
