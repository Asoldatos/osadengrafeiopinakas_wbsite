import { cookies } from 'next/headers';
import { q } from './db';
import { sha256, randomToken } from './crypto.mjs';

export const COOKIE = 'sid';
const secure = process.env.NODE_ENV === 'production';

export async function createSession(userId, pending) {
  const token = randomToken(32);
  const ttl = pending ? 10 * 60 : 7 * 24 * 3600;
  await q("insert into sessions(id,user_id,pending,expires_at) values($1,$2,$3, now() + ($4 || ' seconds')::interval)", [sha256(token), userId, pending, String(ttl)]);
  q("delete from sessions where expires_at < now()").catch(() => {});
  return { token, ttl };
}
export function sessionCookie(token, ttl) {
  return { name: COOKIE, value: token, httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: ttl };
}
export async function getSession() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const r = await q(`select s.id, s.pending, u.id as user_id, u.email, u.name, u.role, u.totp_enabled
      from sessions s join users u on u.id = s.user_id where s.id = $1 and s.expires_at > now()`, [sha256(t)]);
    return r[0] || null;
  } catch { return null; }
}
export async function getAdmin() { const s = await getSession(); return s && !s.pending ? s : null; }
export async function destroySession() {
  const t = cookies().get(COOKIE)?.value;
  if (t) await q('delete from sessions where id = $1', [sha256(t)]);
}

/* Περιορισμός προσπαθειών */
export async function tooMany(key, max, minutes) {
  const r = await q("select count(*)::int as n from attempts where key=$1 and ts > now() - ($2 || ' minutes')::interval", [key, String(minutes)]);
  return r[0].n >= max;
}
export const recordFail = (key) => q('insert into attempts(key) values($1)', [key]);
export const clearFails = (key) => q('delete from attempts where key=$1', [key]);
export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}
