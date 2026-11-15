import { q, logActivity } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/crypto.mjs';
import { tooMany, recordFail, clearFails } from '@/lib/auth';
import { route, json, body } from '@/lib/guard';
import { passwordIssues } from '@/lib/password.mjs';

/** Αλλαγή κωδικού από τον ίδιο τον διαχειριστή (και υποχρεωτική αλλαγή στην πρώτη σύνδεση). Οι άλλες συνεδρίες του λήγουν. */
export const POST = route(async (req, _c, user) => {
  const k = `chpw:${user.user_id}`;
  if (await tooMany(k, 6, 15)) return json({ error: 'Πάρα πολλές προσπάθειες. Δοκίμασε σε λίγο.' }, 429);
  const { current = '', next = '' } = await body(req);
  const row = (await q('select password_hash, username, email from users where id=$1', [user.user_id]))[0];
  if (!verifyPassword(String(current), row.password_hash)) { await recordFail(k); return json({ error: 'Ο τρέχων κωδικός δεν είναι σωστός.' }, 401); }
  const issues = passwordIssues(next, { username: row.username || '', email: row.email });
  if (issues.length) return json({ error: `Ο νέος κωδικός πρέπει να έχει: ${issues.join(', ')}.` }, 400);
  if (verifyPassword(String(next), row.password_hash)) return json({ error: 'Ο νέος κωδικός πρέπει να διαφέρει από τον τρέχοντα.' }, 400);
  await q('update users set password_hash=$1, must_change=false where id=$2', [hashPassword(next), user.user_id]);
  await q('delete from sessions where user_id=$1 and id<>$2', [user.user_id, user.id]);
  await clearFails(k);
  await logActivity(user, 'Αλλαγή κωδικού');
  return json({ ok: true });
}, { allowMustChange: true });
