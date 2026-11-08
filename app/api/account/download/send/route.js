import { tooMany, recordFail } from '@/lib/auth';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { sendOtpMail } from '@/lib/student';
import { mailConfigured } from '@/lib/mail.mjs';
/** Στέλνει κωδικό στο email για λήψη/εκτύπωση εγγράφου. */
export const POST = sroute(async (_req, _c, st) => {
  if (!mailConfigured()) return json({ error: 'Η αποστολή email δεν έχει ρυθμιστεί.' }, 503);
  const k = `otp-send:${st.id}:download`;
  if (await tooMany(k, 4, 15)) return json({ error: 'Έχεις ζητήσει πολλούς κωδικούς. Δοκίμασε ξανά σε λίγο.' }, 429);
  await recordFail(k);
  try { await sendOtpMail(st, 'download'); } catch (e) { console.error(e.message); return json({ error: 'Δεν μπορέσαμε να στείλουμε τον κωδικό.' }, 503); }
  return json({ ok: true });
});
