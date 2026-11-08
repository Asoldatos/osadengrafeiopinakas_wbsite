import { q } from '@/lib/db';
import { sha256 } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { getSite } from '@/lib/data';
import { sendMail, mailConfigured, baseUrl } from '@/lib/mail.mjs';
import { newsletterWelcomeEmail } from '@/lib/emails.mjs';

export const POST = sroute(async (req) => {
  const k = `nlc-ip:${clientIp(req)}`;
  if (await tooMany(k, 20, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα.' }, 429);
  const { token = '' } = await body(req);
  const r = await q("update subscribers set status='active', confirmed_at=now(), unsub_at=null, confirm_hash=null where confirm_hash=$1 and confirm_expires > now() returning email, token", [sha256(String(token))]);
  if (!r.length) { await recordFail(k); return json({ error: 'Ο σύνδεσμος δεν ισχύει πια ή έχει ήδη χρησιμοποιηθεί.' }, 400); }
  if (mailConfigured()) {
    try { const site = await getSite(), base = baseUrl();
      await sendMail({ to: r[0].email, ...newsletterWelcomeEmail({ siteName: site.name, base, unsubUrl: `${base}/newsletter/unsubscribe?token=${r[0].token}`, bubble: site.mascot?.messages?.newsletterWelcomeBubble }), fromName: site.name }); }
    catch (e) { console.error(e.message); }
  }
  return json({ ok: true });
}, { open: true });
