import { neon } from '@neondatabase/serverless';
let _sql;
export function db() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('Λείπει το DATABASE_URL.');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
export async function q(text, params = []) { return db().query(text, params); }
export async function logActivity(user, action, detail = '') {
  try { await q('insert into activity(user_name,action,detail) values($1,$2,$3)', [user?.name || user?.email || '', action, String(detail).slice(0, 300)]); } catch {}
}
