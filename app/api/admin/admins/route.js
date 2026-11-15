import { q, logActivity } from '@/lib/db';
import { hashPassword } from '@/lib/crypto.mjs';
import { route, json, body } from '@/lib/guard';
import { grantable, canManageTarget, PERM_KEYS, uid } from '@/lib/perms.mjs';
import { generatePassword } from '@/lib/password.mjs';
import { validEmail } from '@/lib/students.mjs';
import { cleanText } from '@/lib/sanitize';

const USERNAME = /^[a-z0-9._-]{3,30}$/i;
/** Λίστα λογαριασμών διαχείρισης (ποτέ κωδικοί/μυστικά) με ένδειξη ποιους μπορεί να χειριστεί ο τρέχων χρήστης. */
export const GET = route(async (_req, _c, user) => {
  const rows = await q('select id, username, email, name, role, permissions, disabled, must_change, totp_enabled, created_at, last_login, created_by from users order by (role=\'superadmin\') desc, id');
  return json(rows.map((r) => ({ ...r, manageable: canManageTarget(user, r), self: r.id === uid(user) })));
}, { perm: 'admins' });

/** Δημιουργία διαχειριστή: ο κωδικός παράγεται στον διακομιστή, επιστρέφεται ΜΙΑ φορά και αποθηκεύεται μόνο ως hash (scrypt). Ο ρόλος είναι ΠΑΝΤΑ «admin». */
export const POST = route(async (req, _c, user) => {
  const b = await body(req);
  const username = String(b.username || '').trim().toLowerCase(), email = String(b.email || '').trim().toLowerCase();
  if (!USERNAME.test(username)) return json({ error: 'Το όνομα χρήστη πρέπει να έχει 3–30 χαρακτήρες (λατινικά γράμματα, αριθμούς, . _ -).' }, 400);
  if (!validEmail(email)) return json({ error: 'Συμπλήρωσε ένα έγκυρο email.' }, 400);
  const perms = grantable(user, b.permissions);
  const password = generatePassword(16);
  let row;
  try {
    row = (await q("insert into users(email, username, name, password_hash, role, permissions, must_change, created_by) values($1,$2,$3,$4,'admin',$5::jsonb,true,$6) returning id",
      [email, username, cleanText(b.name, 60).trim() || username, hashPassword(password), JSON.stringify(perms), uid(user)]))[0];
  } catch (e) { if (String(e.code) === '23505') return json({ error: 'Το όνομα χρήστη ή το email χρησιμοποιείται ήδη.' }, 409); throw e; }
  await logActivity(user, 'Δημιουργία διαχειριστή', `${username} · δικαιώματα: ${PERM_KEYS.filter((k) => perms[k]).join(', ') || 'κανένα'}`);
  return json({ id: row.id, username, email, password }, 201);
}, { perm: 'admins' });
