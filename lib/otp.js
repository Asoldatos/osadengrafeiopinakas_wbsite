import crypto from 'node:crypto';
import { q } from './db';
import { sha256 } from './crypto.mjs';

export const genCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
export const hashOtp = (studentId, purpose, code) => sha256(`otp:${studentId}:${purpose}:${code}`);

/** Δημιουργεί νέο κωδικό μίας χρήσης (ακυρώνει τους προηγούμενους). purpose: 'login' | 'download'. */
export async function issueOtp(studentId, purpose, minutes) {
  const code = genCode();
  await q('update student_otps set used_at=now() where student_id=$1 and purpose=$2 and used_at is null', [studentId, purpose]);
  await q("insert into student_otps(student_id,purpose,code_hash,expires_at) values($1,$2,$3, now() + ($4 || ' minutes')::interval)", [studentId, purpose, hashOtp(studentId, purpose, code), String(minutes)]);
  return code;
}
/** Επιστρέφει 'ok' | 'bad' | 'expired' | 'locked'. Μέγιστο 5 λάθη ανά κωδικό· ο σωστός κωδικός χρησιμοποιείται μία φορά. */
export async function checkOtp(studentId, purpose, code) {
  code = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return 'bad';
  const r = (await q('select id, code_hash, attempts, expires_at > now() as live from student_otps where student_id=$1 and purpose=$2 and used_at is null order by id desc limit 1', [studentId, purpose]))[0];
  if (!r || !r.live) return 'expired';
  if (r.attempts >= 5) return 'locked';
  const a = Buffer.from(r.code_hash), b = Buffer.from(hashOtp(studentId, purpose, code));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { await q('update student_otps set attempts=attempts+1 where id=$1', [r.id]); return 'bad'; }
  const used = await q('update student_otps set used_at=now() where id=$1 and used_at is null returning id', [r.id]);
  return used.length ? 'ok' : 'expired';
}
