import { q } from '@/lib/db';
import { tooMany, recordFail, clearFails } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { checkOtp } from '@/lib/otp';
/** Σωστός κωδικός → άδεια λήψης/εκτύπωσης για 30 λεπτά. */
export const POST = sroute(async (req, _c, st) => {
  const k = `sdlotp:${st.id}`;
  if (await tooMany(k, 6, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.' }, 429);
  const r = await checkOtp(st.id, 'download', (await body(req)).code);
  if (r !== 'ok') { await recordFail(k); return json({ error: r === 'expired' ? 'Ο κωδικός έληξε. Ζήτησε νέο.' : r === 'locked' ? 'Πολλά λάθη σε αυτόν τον κωδικό. Ζήτησε νέο.' : 'Λάθος κωδικός.' }, 401); }
  await clearFails(k);
  await q("update students set dl_until = now() + interval '30 minutes' where id=$1", [st.id]);
  return json({ ok: true });
});
