import { neon } from '@neondatabase/serverless';
let _sql;
export function db() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('Λείπει το DATABASE_URL.');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
// Συμβατό με @neondatabase/serverless 0.x (sql(text, params)) και 1.x (sql.query(text, params)).
export async function q(text, params = []) {
  const sql = db();
  return typeof sql.query === 'function' ? sql.query(text, params) : sql(text, params);
}
export async function logActivity(user, action, detail = '') {
  try { await q('insert into activity(user_name,action,detail) values($1,$2,$3)', [user?.name || user?.email || '', action, String(detail).slice(0, 300)]); } catch {}
}
