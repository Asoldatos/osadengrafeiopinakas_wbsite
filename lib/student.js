import { cookies, headers } from 'next/headers';
import { q } from './db';
import { getSite } from './data';
import { sha256, randomToken } from './crypto.mjs';
import { levelFor, DAILY_XP_CAP } from './progress.mjs';
import { issueOtp } from './otp';
import { deviceLabel } from './students.mjs';
import { sendMail, baseUrl } from './mail.mjs';
import { studentVerifyEmail, studentResetEmail, otpEmail } from './emails.mjs';

export const SCOOKIE = 'ssid';
const TTL = 30 * 24 * 3600;
const secure = process.env.NODE_ENV === 'production';

/** pending: null = πλήρης συνεδρία, 'otp' = περιμένει κωδικό email (νέα συσκευή), 'totp' = περιμένει κωδικό 2FA. */
export async function createStudentSession(studentId, pending = null) {
  const token = randomToken(32);
  await q("insert into student_sessions(id,student_id,pending,expires_at) values($1,$2,$3, now() + ($4 || ' seconds')::interval)", [sha256(token), studentId, pending, String(pending ? 600 : TTL)]);
  q('delete from student_sessions where expires_at < now()').catch(() => {});
  return token;
}
export const studentCookie = (token, pending = false) => ({ name: SCOOKIE, value: token, httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: pending ? 600 : TTL });
export const clearStudentCookie = () => ({ name: SCOOKIE, value: '', path: '/', maxAge: 0 });
/** Ο συνδεδεμένος μαθητής (επιβεβαιωμένος και όχι αποκλεισμένος) ή null. */
export async function getStudent() {
  const t = cookies().get(SCOOKIE)?.value;
  if (!t) return null;
  try {
    const r = await q(`select s.id, s.email, s.nickname, s.avatar, s.xp, (s.dl_until is not null and s.dl_until > now()) as dl_ok, s.totp_enabled
      from student_sessions x join students s on s.id = x.student_id
      where x.id = $1 and x.pending is null and x.expires_at > now() and s.verified and not s.disabled`, [sha256(t)]);
    return r[0] || null;
  } catch { return null; }
}
/** Συνεδρία που περιμένει δεύτερο βήμα (κωδικός email ή 2FA). */
export async function getPendingStudent() {
  const t = cookies().get(SCOOKIE)?.value;
  if (!t) return null;
  try {
    const r = await q(`select s.id, s.email, s.nickname, s.totp_enabled, x.pending from student_sessions x join students s on s.id = x.student_id
      where x.id = $1 and x.pending is not null and x.expires_at > now() and s.verified and not s.disabled`, [sha256(t)]);
    return r[0] || null;
  } catch { return null; }
}
export const setPending = (stage) => q('update student_sessions set pending=$1, expires_at = now() + interval \'10 minutes\' where id=$2', [stage, currentSessionHash()]);

/* ---------- αναγνωρισμένες συσκευές (cookie sdev με έως 5 τυχαία tokens) ---------- */
const DEV = 'sdev';
const devTokens = () => (cookies().get(DEV)?.value || '').split('.').filter((x) => /^[a-f0-9]{48}$/.test(x)).slice(0, 5);
export async function isKnownDevice(studentId) {
  const t = devTokens(); if (!t.length) return false;
  const r = await q('select id from student_devices where student_id=$1 and token_hash in (select jsonb_array_elements_text($2::jsonb))', [studentId, JSON.stringify(t.map(sha256))]);
  if (r.length) q('update student_devices set last_seen=now() where id=$1', [r[0].id]).catch(() => {});
  return r.length > 0;
}
/** Καταχωρεί την τρέχουσα συσκευή ως αξιόπιστη. Επιστρέφει το cookie που πρέπει να οριστεί στην απάντηση. */
export async function addDevice(studentId) {
  const token = randomToken(24);
  let label = ''; try { label = deviceLabel(headers().get('user-agent')); } catch {}
  await q('insert into student_devices(student_id, token_hash, label) values($1,$2,$3)', [studentId, sha256(token), label]);
  return { name: DEV, value: [...devTokens().slice(-4), token].join('.'), httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 400 * 24 * 3600 };
}
/** Στέλνει κωδικό OTP στο email του μαθητή. purpose: 'login' (5 λεπτά) ή 'download' (10 λεπτά). */
export async function sendOtpMail(st, purpose) {
  const minutes = purpose === 'login' ? 5 : 10;
  const code = await issueOtp(st.id, purpose, minutes);
  const site = await getSite(), base = baseUrl();
  const bubble = site.mascot?.messages?.[purpose === 'login' ? 'otpLogin' : 'otpDownload'];
  await sendMail({ to: st.email, ...otpEmail({ nickname: st.nickname, code, purpose, minutes, siteName: site.name, base, bubble }), fromName: site.name });
}
export async function destroyStudentSession() {
  const t = cookies().get(SCOOKIE)?.value;
  if (t) await q('delete from student_sessions where id=$1', [sha256(t)]);
}
export const currentSessionHash = () => { const t = cookies().get(SCOOKIE)?.value; return t ? sha256(t) : ''; };

/** Δίνει XP με ημερήσιο όριο· όλα γίνονται σε ένα ατομικό UPDATE. */
export async function awardXp(id, amount) {
  amount = Math.max(0, Math.trunc(amount) || 0);
  const before = (await q('select xp from students where id=$1', [id]))[0]?.xp ?? 0;
  if (!amount) return { gained: 0, total: before, level: levelFor(before), leveledUp: false, capped: false };
  const used = '(case when xp_day = current_date then xp_today else 0 end)';
  const r = await q(`update students set
      xp = xp + least($2::int, greatest(0, $3::int - ${used})),
      xp_today = ${used} + least($2::int, greatest(0, $3::int - ${used})),
      xp_day = current_date where id=$1 returning xp`, [id, amount, DAILY_XP_CAP]);
  const after = r[0].xp;
  return { gained: after - before, total: after, level: levelFor(after), leveledUp: levelFor(after) > levelFor(before), capped: after - before < amount };
}
export async function grantBadges(id, codes) {
  const out = [];
  for (const code of [...new Set(codes.filter(Boolean))]) {
    const r = await q('insert into student_badges(student_id, code) values($1,$2) on conflict do nothing returning code', [id, code]);
    if (r.length) out.push(code);
  }
  return out;
}
export async function finishPlay(id, { xp, codes = [] }) {
  const award = await awardXp(id, xp);
  if (award.level >= 5) codes = [...codes, 'scholar'];
  return { ...award, badges: await grantBadges(id, codes) };
}

/* ---------- σύνδεσμοι email (επιβεβαίωση / επαναφορά) ---------- */
export async function issueToken(studentId, kind, hours) {
  const token = randomToken(32);
  await q('update student_tokens set used_at=now() where student_id=$1 and kind=$2 and used_at is null', [studentId, kind]);
  await q("insert into student_tokens(student_id,kind,token_hash,expires_at) values($1,$2,$3, now() + ($4 || ' hours')::interval)", [studentId, kind, sha256(token), String(hours)]);
  return token;
}
export async function sendVerifyMail(st) {
  const token = await issueToken(st.id, 'verify', 24);
  const site = await getSite(), base = baseUrl();
  await sendMail({ to: st.email, ...studentVerifyEmail({ nickname: st.nickname, link: `${base}/account/verify?token=${token}`, siteName: site.name, base }), fromName: site.name });
}
export async function sendResetMail(st) {
  const token = await issueToken(st.id, 'reset', 1);
  const site = await getSite(), base = baseUrl();
  await sendMail({ to: st.email, ...studentResetEmail({ nickname: st.nickname, link: `${base}/account/reset?token=${token}`, siteName: site.name, base }), fromName: site.name });
}
/** Καταναλώνει ένα token μίας χρήσης. Επιστρέφει τον μαθητή ή null. */
export async function consumeToken(token, kind) {
  const r = await q(`update student_tokens set used_at=now() where token_hash=$1 and kind=$2 and used_at is null and expires_at > now()
    returning student_id`, [sha256(String(token)), kind]);
  if (!r.length) return null;
  return (await q('select id,email,nickname from students where id=$1', [r[0].student_id]))[0] || null;
}
