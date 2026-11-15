import { q } from '@/lib/db';
import { route, json } from '@/lib/guard';
import { isSuper } from '@/lib/perms.mjs';
/** Αρχείο ενεργειών. Οι διαχειριστές με δικαίωμα «admins» δεν βλέπουν ενέργειες του Superadmin. */
export const GET = route(async (req, _c, user) => {
  const u = +new URL(req.url).searchParams.get('user') || 0, p = [], w = [];
  if (u) { p.push(u); w.push(`user_id=$${p.length}`); }
  if (!isSuper(user)) w.push("(user_id is null or user_id not in (select id from users where role='superadmin'))");
  return json(await q(`select id, user_id, user_name, action, detail, ts from activity ${w.length ? 'where ' + w.join(' and ') : ''} order by id desc limit 300`, p));
}, { perm: 'admins' });
