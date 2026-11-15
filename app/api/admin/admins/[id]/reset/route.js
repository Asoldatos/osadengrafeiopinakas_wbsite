import { q, logActivity } from '@/lib/db';
import { hashPassword } from '@/lib/crypto.mjs';
import { route, json } from '@/lib/guard';
import { canManageTarget } from '@/lib/perms.mjs';
import { generatePassword } from '@/lib/password.mjs';

/** Επαναφορά κωδικού από διαχειριστή: νέος τυχαίος κωδικός (εμφανίζεται μία φορά), υποχρεωτική αλλαγή στην πρώτη σύνδεση, λήξη όλων των συνεδριών. */
export const POST = route(async (req, { params }, user) => {
  const t = (await q('select id, username, role, permissions, disabled from users where id=$1', [+params.id || 0]))[0];
  if (!t) return json({ error: 'Δεν βρέθηκε ο λογαριασμός.' }, 404);
  if (!canManageTarget(user, t)) return json({ error: 'Δεν μπορείτε να επαναφέρετε αυτόν τον λογαριασμό.' }, 403);
  let twofa = false; try { twofa = (await req.json()).twofa === true; } catch {}
  const password = generatePassword(16);
  await q("update users set password_hash=$1, must_change=true where id=$2 and role <> 'superadmin'", [hashPassword(password), t.id]);
  await q('delete from sessions where user_id=$1', [t.id]);
  if (twofa) { await q('update users set totp_enabled=false, totp_secret_enc=null, totp_pending_enc=null, totp_last_step=0 where id=$1', [t.id]); await q('delete from recovery_codes where user_id=$1', [t.id]); }
  await logActivity(user, 'Επαναφορά κωδικού διαχειριστή', `${t.username}${twofa ? ' (και 2FA)' : ''}`);
  return json({ ok: true, password });
}, { perm: 'admins' });
