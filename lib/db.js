import { neon } from '@neondatabase/serverless';
import { makeQuery } from './heal.mjs';
import { ensureSchema, seedDefaults } from './setup.mjs';

let _sql;
export function db() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('Λείπει το DATABASE_URL.');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}
// Συμβατό με @neondatabase/serverless 0.x (sql(text, params)) και 1.x (sql.query(text, params)).
const exec = async (text, params = []) => { const sql = db(); return typeof sql.query === 'function' ? sql.query(text, params) : sql(text, params); };
// Αν μετά από ενημέρωση λείπει πίνακας (π.χ. δεν έτρεξε το db:setup), ο ιστότοπος τον δημιουργεί μόνος του και ξαναδοκιμάζει.
export const q = makeQuery(exec, async (run) => { await ensureSchema(run); await seedDefaults(run); });

export async function logActivity(user, action, detail = '') {
  try { await q('insert into activity(user_name,action,detail) values($1,$2,$3)', [user?.name || user?.email || '', action, String(detail).slice(0, 300)]); } catch {}
}
