import { q } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { getSite } from '@/lib/data';
import { mailConfigured, sendMail, baseUrl } from '@/lib/mail.mjs';
import { newsletterConfirmEmail } from '@/lib/emails.mjs';
import { verifyTurnstile } from '@/lib/turnstile';
import { validEmail } from '@/lib/students.mjs';
import { cleanText } from '@/lib/sanitize';

/** Εγγραφή στο ενημερωτικό δελτίο με διπλή επιβεβαίωση (double opt-in). Η απάντηση είναι πάντα ίδια. */
export const POST = sroute(async (req) => {
  const site = await getSite();
  if (site.newsletter?.enabled === false) return json({ error: 'Οι εγγραφές στο ενημερωτικό δελτίο είναι προσωρινά κλειστές.' }, 403);
  if (!mailConfigured()) return json({ error: 'Η αποστολή email δεν έχει ρυθμιστεί ακόμα. Δοκίμασε ξανά αργότερα.' }, 503);
  const b = await body(req), ip = clientIp(req);
  if (b.website) return json({ ok: true });                         // honeypot
  const email = String(b.email || '').trim().toLowerCase();
  if (!validEmail(email)) return json({ error: 'Συμπλήρωσε ένα έγκυρο email.' }, 400);
  if (!(Number(b.t) >= 1500)) return json({ error: 'Πολύ γρήγορα! Δοκίμασε ξανά.' }, 400);
  const k1 = `nl-ip:${ip}`, k2 = `nl:${email}`;
  if ((await tooMany(k1, 8, 60)) || (await tooMany(k2, 3, 60))) return json({ error: 'Έχουν γίνει πολλά αιτήματα. Δοκίμασε σε λίγη ώρα.' }, 429);
  await Promise.all([recordFail(k1), recordFail(k2)]);
  if (!(await verifyTurnstile(b.cf, ip))) return json({ error: 'Ο έλεγχος «δεν είμαι ρομπότ» δεν πέρασε. Δοκίμασε ξανά.' }, 400);
  const token = randomToken(32), name = cleanText(b.name, 60).trim();
  const ex = (await q('select id, status from subscribers where email=$1', [email]))[0];
  if (ex?.status === 'active') return json({ ok: true });             // δεν αποκαλύπτουμε ότι υπάρχει ήδη
  if (ex) await q("update subscribers set status='pending', confirm_hash=$1, confirm_expires=now() + interval '48 hours', unsub_at=null where id=$2", [sha256(token), ex.id]);
  else await q("insert into subscribers(email, name, token, source, confirm_hash, confirm_expires) values($1,$2,$3,'site',$4, now() + interval '48 hours')", [email, name, randomToken(24), sha256(token)]);
  try {
    const base = baseUrl();
    await sendMail({ to: email, ...newsletterConfirmEmail({ link: `${base}/newsletter/confirm?token=${token}`, siteName: site.name, base, bubble: site.mascot?.messages?.newsletterConfirmBubble }), fromName: site.name });
  } catch (e) { console.error('Newsletter confirm email:', e.message); }
  return json({ ok: true });
}, { open: true });
