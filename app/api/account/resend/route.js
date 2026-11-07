import { q } from '@/lib/db';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { mailConfigured } from '@/lib/mail.mjs';
import { sendVerifyMail } from '@/lib/student';

export const POST = sroute(async (req) => {
  if (!mailConfigured()) return json({ error: 'Η αποστολή email δεν έχει ρυθμιστεί.' }, 503);
  const e = String((await body(req)).email || '').trim().toLowerCase().slice(0, 200);
  const k1 = `resend-ip:${clientIp(req)}`, k2 = `resend:${e}`;
  if ((await tooMany(k1, 6, 60)) || (await tooMany(k2, 3, 60))) return json({ error: 'Έχουν γίνει πολλά αιτήματα. Δοκίμασε σε λίγη ώρα.' }, 429);
  await Promise.all([recordFail(k1), recordFail(k2)]);
  const st = (await q('select id,email,nickname,verified,disabled from students where email=$1', [e]))[0];
  if (st && !st.verified && !st.disabled) { try { await sendVerifyMail(st); } catch (err) { console.error(err.message); } }
  return json({ ok: true });
}, { open: true });
