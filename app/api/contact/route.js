import { q } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { getStudent } from '@/lib/student';
import { getSite } from '@/lib/data';
import { cleanText } from '@/lib/sanitize';
import { sha256, randomToken } from '@/lib/crypto.mjs';
import { sendMail, mailConfigured, baseUrl } from '@/lib/mail.mjs';
import { ticketReceivedEmail } from '@/lib/emails.mjs';
import { TICKET_KINDS } from '@/lib/community.mjs';
import { notifyStaff } from '@/lib/tickets';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
/** Φόρμα επικοινωνίας: δημιουργεί αίτημα (ticket). Ανοιχτή σε όλους, με όριο ρυθμού και «παγίδα» για ρομπότ. */
export const POST = route(async (req) => {
  const b = await body(req);
  if (b.website) return json({ ok: true, ref: 0 });                                 // honeypot: τα ρομπότ συμπληρώνουν όλα τα πεδία
  const ip = clientIp(req), st = await getStudent();
  // όριο: ανά λογαριασμό μαθητή (5/ώρα) ή ανά σύνδεση (10/ώρα: στο σχολείο πολλοί μοιράζονται την ίδια IP)
  const key = st ? `contact:s${st.id}` : `contact:${sha256(ip).slice(0, 24)}`;
  if (await tooMany(key, st ? 5 : 10, 60)) return json({ error: 'Έστειλες αρκετά μηνύματα για τώρα. Δοκίμασε ξανά σε λίγη ώρα.' }, 429);
  const kind = TICKET_KINDS[b.kind] ? b.kind : 'other';
  const name = cleanText(b.name, 80).trim() || st?.nickname || '';
  const email = (st?.email || cleanText(b.email, 254)).trim().toLowerCase();
  const subject = cleanText(b.subject, 140).trim(), message = cleanText(b.message, 4000).trim();
  if (!EMAIL.test(email)) return json({ error: 'Γράψε ένα σωστό email για να μπορέσουμε να σου απαντήσουμε.' }, 400);
  if (subject.length < 3) return json({ error: 'Γράψε ένα σύντομο θέμα.' }, 400);
  if (message.length < 10) return json({ error: 'Το μήνυμα είναι πολύ μικρό. Πες μας λίγα περισσότερα!' }, 400);
  if (b.consent !== true) return json({ error: 'Χρειάζεται να συμφωνήσεις να κρατήσουμε το email σου μόνο για να σου απαντήσουμε.' }, 400);
  await recordFail(key);
  const token = randomToken(24);
  const t = (await q(`insert into tickets(kind,name,email,student_id,subject,message,token_hash,ip_hash) values($1,$2,$3,$4,$5,$6,$7,$8) returning id, kind, name, email, subject`,
    [kind, name, email, st?.id || null, subject, message, sha256(token), sha256(ip).slice(0, 24)]))[0];
  await q("insert into ticket_replies(ticket_id, author, user_name, body) values($1,'user',$2,$3)", [t.id, name || email, message]);
  const link = `${baseUrl()}/contact/ticket/${token}`;
  if (mailConfigured()) {
    const site = await getSite().catch(() => ({ name: 'Όσα δεν γράφει ο πίνακας' }));
    try { await sendMail({ to: email, ...ticketReceivedEmail({ name, subject, ref: t.id, link, siteName: site.name, base: baseUrl() }) }); } catch (e) { console.error('ticket ack', e.message); }
  }
  await notifyStaff(t, message);
  return json({ ok: true, ref: t.id, link: `/contact/ticket/${token}` }, 201);
}, { open: true });
