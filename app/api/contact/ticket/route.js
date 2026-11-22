import { q } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { tooMany, recordFail } from '@/lib/auth';
import { cleanText } from '@/lib/sanitize';
import { sha256 } from '@/lib/crypto.mjs';
import { notifyStaff, ticketThread } from '@/lib/tickets';

const find = async (token) => (/^[a-f0-9]{48}$/.test(token || '') ? (await q('select id, kind, name, email, subject, status, created_at from tickets where token_hash=$1', [sha256(token)]))[0] : null);
/** Ο αποστολέας βλέπει το αίτημά του με τον μυστικό σύνδεσμο του email. */
export const GET = route(async (req) => {
  const t = await find(new URL(req.url).searchParams.get('t'));
  if (!t) return json({ error: 'Δεν βρέθηκε το αίτημα.' }, 404);
  return json({ ticket: { id: t.id, kind: t.kind, subject: t.subject, status: t.status, created_at: t.created_at }, thread: await ticketThread(t.id) });
}, { open: true });
/** …και μπορεί να γράψει ξανά στο ίδιο αίτημα. */
export const POST = route(async (req) => {
  const b = await body(req);
  const t = await find(b.t);
  if (!t) return json({ error: 'Δεν βρέθηκε το αίτημα.' }, 404);
  if (t.status === 'closed') return json({ error: 'Το αίτημα έχει κλείσει. Αν χρειάζεσαι κάτι ακόμα, στείλε νέο μήνυμα από τη φόρμα επικοινωνίας.' }, 409);
  const key = `ticketreply:${t.id}`;
  if (await tooMany(key, 6, 60)) return json({ error: 'Έστειλες αρκετά μηνύματα. Περίμενε την απάντησή μας!' }, 429);
  const msg = cleanText(b.message, 4000).trim();
  if (msg.length < 2) return json({ error: 'Γράψε το μήνυμά σου.' }, 400);
  await recordFail(key);
  await q("insert into ticket_replies(ticket_id, author, user_name, body) values($1,'user',$2,$3)", [t.id, t.name || t.email, msg]);
  await q("update tickets set status='open', updated_at=now() where id=$1", [t.id]);
  await notifyStaff(t, msg, true);
  return json({ ok: true, thread: await ticketThread(t.id) });
}, { open: true });
