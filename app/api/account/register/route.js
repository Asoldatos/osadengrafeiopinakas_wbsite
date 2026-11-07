import { q } from '@/lib/db';
import { hashPassword } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { getSite } from '@/lib/data';
import { mailConfigured } from '@/lib/mail.mjs';
import { sendVerifyMail } from '@/lib/student';
import { verifyTurnstile } from '@/lib/turnstile';
import { validEmail, passwordOk, cleanNickname, domainAllowed } from '@/lib/students.mjs';

export const POST = sroute(async (req) => {
  if (!mailConfigured()) return json({ error: 'Οι εγγραφές δεν είναι διαθέσιμες αυτή τη στιγμή (δεν έχει ρυθμιστεί η αποστολή email).' }, 503);
  const acc = (await getSite()).accounts || {};
  if (acc.registrationOpen === false) return json({ error: 'Οι εγγραφές είναι προσωρινά κλειστές.' }, 403);
  const b = await body(req), ip = clientIp(req);
  if (b.website) return json({ ok: true });                       // honeypot: τα ρομπότ συμπληρώνουν κρυφά πεδία
  const k = `reg-ip:${ip}`;
  if (await tooMany(k, 5, 60)) return json({ error: 'Πάρα πολλές προσπάθειες από αυτή τη σύνδεση. Δοκίμασε ξανά αργότερα.' }, 429);
  await recordFail(k);
  if (!(Number(b.t) >= 2500)) return json({ error: 'Πολύ γρήγορα! Συμπλήρωσε τη φόρμα με την ησυχία σου και δοκίμασε ξανά.' }, 400);
  if (!(await verifyTurnstile(b.cf, ip))) return json({ error: 'Ο έλεγχος «δεν είμαι ρομπότ» δεν πέρασε. Δοκίμασε ξανά.' }, 400);
  const email = String(b.email || '').trim().toLowerCase();
  if (!validEmail(email)) return json({ error: 'Συμπλήρωσε ένα έγκυρο email.' }, 400);
  if (!domainAllowed(email, acc.allowedDomains)) return json({ error: `Επιτρέπονται μόνο διευθύνσεις email του σχολείου (${acc.allowedDomains}).` }, 400);
  if (!passwordOk(b.password)) return json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.' }, 400);
  const nick = cleanNickname(b.nickname);
  if (nick.error) return json({ error: nick.error }, 400);
  if (b.consent !== true) return json({ error: 'Για να συνεχίσεις, αποδέξου τους όρους και την ηλικιακή δήλωση.' }, 400);
  const ex = (await q('select id, email, nickname, verified from students where email=$1', [email]))[0];
  if (ex) { if (!ex.verified) { try { await sendVerifyMail(ex); } catch (e) { console.error(e.message); } } return json({ ok: true }); }   // ίδια απάντηση: δεν αποκαλύπτουμε αν υπάρχει λογαριασμός
  let st;
  try {
    st = (await q('insert into students(email,nickname,nick_lower,password_hash,consent_at) values($1,$2,$3,$4,now()) returning id,email,nickname',
      [email, nick.value, nick.value.toLowerCase(), hashPassword(b.password)]))[0];
  } catch (e) { if (String(e.code) === '23505') return json({ error: 'Αυτό το όνομα χρήστη υπάρχει ήδη. Διάλεξε άλλο!' }, 409); throw e; }
  try { await sendVerifyMail(st); } catch (e) { console.error('Αποτυχία email επιβεβαίωσης:', e.message); }
  return json({ ok: true });
}, { open: true });
