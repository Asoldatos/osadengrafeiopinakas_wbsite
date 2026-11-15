import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { mergePerms, canManageTarget, PERM_KEYS, uid } from '@/lib/perms.mjs';
import { validEmail } from '@/lib/students.mjs';
import { cleanText } from '@/lib/sanitize';

async function target(id) {
  const t = (await q('select id, username, email, name, role, permissions, disabled from users where id=$1', [+id || 0]))[0];
  if (!t) throw json({ error: 'Δεν βρέθηκε ο λογαριασμός.' }, 404);
  return t;
}
/** Επεξεργασία: όνομα, email, δικαιώματα, ενεργοποίηση/απενεργοποίηση. Ο ρόλος δεν αλλάζει ΠΟΤΕ από εδώ· ο Superadmin και οι «ισότιμοι» διαχειριστές δεν αγγίζονται. */
export const PUT = route(async (req, { params }, user) => {
  const t = await target(params.id);
  const b = await body(req), sets = [], vals = [], notes = [], self = t.id === uid(user);
  // Τον δικό του λογαριασμό ο καθένας αλλάζει ΜΟΝΟ όνομα/email — ποτέ δικαιώματα, ρόλο ή κατάσταση.
  if (self ? (b.permissions !== undefined || b.disabled !== undefined || b.role !== undefined) : !canManageTarget(user, t)) return json({ error: 'Δεν μπορείτε να επεξεργαστείτε αυτόν τον λογαριασμό.' }, 403);
  if (b.name !== undefined) { vals.push(cleanText(b.name, 60).trim() || t.username); sets.push(`name=$${vals.length}`); }
  if (b.email !== undefined) { const e = String(b.email).trim().toLowerCase(); if (!validEmail(e)) return json({ error: 'Μη έγκυρο email.' }, 400); vals.push(e); sets.push(`email=$${vals.length}`); }
  if (b.permissions !== undefined) {
    const next = mergePerms(user, t.permissions, b.permissions), changed = PERM_KEYS.filter((k) => (t.permissions?.[k] === true) !== next[k]);
    vals.push(JSON.stringify(next)); sets.push(`permissions=$${vals.length}::jsonb`);
    if (changed.length) notes.push(`δικαιώματα: ${changed.map((k) => (next[k] ? '+' : '−') + k).join(', ')}`);
  }
  if (b.disabled !== undefined) { vals.push(b.disabled === true); sets.push(`disabled=$${vals.length}`); notes.push(b.disabled === true ? 'απενεργοποίηση' : 'ενεργοποίηση'); }
  if (!sets.length) return json({ error: 'Καμία αλλαγή.' }, 400);
  vals.push(t.id);
  try { await q(`update users set ${sets.join(',')} where id=$${vals.length}${self ? '' : " and role <> 'superadmin'"}`, vals); } catch (e) { if (String(e.code) === '23505') return json({ error: 'Το email χρησιμοποιείται ήδη.' }, 409); throw e; }
  if (b.disabled === true) await q('delete from sessions where user_id=$1', [t.id]);
  await logActivity(user, 'Επεξεργασία διαχειριστή', `${t.username}: ${notes.join('; ') || 'στοιχεία'}`);
  return json({ ok: true });
}, { perm: 'admins' });

export const DELETE = route(async (_req, { params }, user) => {
  const t = await target(params.id);
  if (!canManageTarget(user, t)) return json({ error: 'Δεν μπορείτε να διαγράψετε αυτόν τον λογαριασμό.' }, 403);
  await q("delete from users where id=$1 and role <> 'superadmin'", [t.id]);
  await logActivity(user, 'Διαγραφή διαχειριστή', t.username);
  return json({ ok: true });
}, { perm: 'admins' });
