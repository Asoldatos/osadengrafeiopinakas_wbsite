import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { getSite } from '@/lib/data';
import { cleanText } from '@/lib/sanitize';
import { randomToken, sha256 } from '@/lib/crypto.mjs';
import { sendMail, mailConfigured, baseUrl } from '@/lib/mail.mjs';
import { ticketReplyEmail } from '@/lib/emails.mjs';
import { TICKET_STATUS } from '@/lib/community.mjs';
import { ticketThread } from '@/lib/tickets';

const get = async (id) => (await q('select t.*, s.nickname from tickets t left join students s on s.id=t.student_id where t.id=$1', [id]))[0];
export const GET = route(async (_r, { params }) => {
  const t = await get(+params.id); if (!t) return json({ error: 'Δεν βρέθηκε.' }, 404);
  delete t.token_hash; delete t.ip_hash;
  return json({ ticket: t, thread: await ticketThread(t.id) });
}, { perm: 'community' });
/** Απάντηση της σύνταξης: αποθηκεύεται και στέλνεται με email στον αποστολέα (με νέο μυστικό σύνδεσμο). */
export const POST = route(async (req, { params }, user) => {
  const t = await get(+params.id); if (!t) return json({ error: 'Δεν βρέθηκε.' }, 404);
  const b = await body(req); const msg = cleanText(b.message, 6000).trim();
  if (msg.length < 2) return json({ error: 'Γράψε την απάντηση.' }, 400);
  await q("insert into ticket_replies(ticket_id, author, user_id, user_name, body) values($1,'staff',$2,$3,$4)", [t.id, user.user_id, user.name || user.username || 'Η σύνταξη', msg]);
  const status = b.close ? 'closed' : 'answered';
  // νέο token σε κάθε απάντηση: ο παλιός σύνδεσμος παύει να ισχύει (λιγότερος κίνδυνος αν προωθηθεί κάποιο email)
  const token = randomToken(24);
  await q('update tickets set status=$1, token_hash=$2, updated_at=now() where id=$3', [status, sha256(token), t.id]);
  let mailed = false;
  if (mailConfigured()) {
    const site = await getSite().catch(() => ({ name: 'Όσα δεν γράφει ο πίνακας' }));
    try { await sendMail({ to: t.email, ...ticketReplyEmail({ name: t.name, subject: t.subject, ref: t.id, reply: msg, link: `${baseUrl()}/contact/ticket/${token}`, siteName: site.name, base: baseUrl() }) }); mailed = true; } catch (e) { console.error('ticket reply', e.message); }
  }
  await logActivity(user, 'Απάντηση σε αίτημα', `#${t.id}`);
  return json({ ok: true, mailed, status, thread: await ticketThread(t.id) });
}, { perm: 'community' });
export const PUT = route(async (req, { params }, user) => {
  const b = await body(req);
  if (!TICKET_STATUS[b.status]) return json({ error: 'Μη έγκυρη κατάσταση.' }, 400);
  const r = await q('update tickets set status=$1, updated_at=now() where id=$2 returning id', [b.status, +params.id]);
  if (!r.length) return json({ error: 'Δεν βρέθηκε.' }, 404);
  await logActivity(user, 'Κατάσταση αιτήματος', `#${params.id} → ${b.status}`);
  return json({ ok: true });
}, { perm: 'community' });
export const DELETE = route(async (_r, { params }, user) => {
  await q('delete from tickets where id=$1', [+params.id]);
  await logActivity(user, 'Διαγραφή αιτήματος', `#${params.id}`);
  return json({ ok: true });
}, { perm: 'community' });
