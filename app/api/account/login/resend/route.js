import { tooMany, recordFail } from '@/lib/auth';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { getPendingStudent, sendOtpMail } from '@/lib/student';
export const POST = sroute(async () => {
  const st = await getPendingStudent();
  if (!st || st.pending !== 'otp') return json({ error: 'Η συνεδρία έληξε. Συνδέσου ξανά.', restart: true }, 401);
  const k = `otp-send:${st.id}:login`;
  if (await tooMany(k, 4, 15)) return json({ error: 'Έχεις ζητήσει πολλούς κωδικούς. Δοκίμασε ξανά σε λίγο.' }, 429);
  await recordFail(k);
  try { await sendOtpMail(st, 'login'); } catch (e) { console.error(e.message); return json({ error: 'Δεν μπορέσαμε να στείλουμε τον κωδικό.' }, 503); }
  return json({ ok: true });
}, { open: true });
