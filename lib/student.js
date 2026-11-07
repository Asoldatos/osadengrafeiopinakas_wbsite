import { cookies } from 'next/headers';
import { q } from './db';
import { getSite } from './data';
import { sha256, randomToken } from './crypto.mjs';
import { levelFor, DAILY_XP_CAP } from './progress.mjs';
import { sendMail, baseUrl } from './mail.mjs';
import { studentVerifyEmail, studentResetEmail } from './emails.mjs';

export const SCOOKIE = 'ssid';
const TTL = 30 * 24 * 3600;
const secure = process.env.NODE_ENV === 'production';

export async function createStudentSession(studentId) {
  const token = randomToken(32);
  await q("insert into student_sessions(id,student_id,expires_at) values($1,$2, now() + ($3 || ' seconds')::interval)", [sha256(token), studentId, String(TTL)]);
  q('delete from student_sessions where expires_at < now()').catch(() => {});
  return token;
}
export const studentCookie = (token) => ({ name: SCOOKIE, value: token, httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: TTL });
export const clearStudentCookie = () => ({ name: SCOOKIE, value: '', path: '/', maxAge: 0 });
/** Ο συνδεδεμένος μαθητής (επιβεβαιωμένος και όχι αποκλεισμένος) ή null. */
export async function getStudent() {
  const t = cookies().get(SCOOKIE)?.value;
  if (!t) return null;
  try {
    const r = await q(`select s.id, s.email, s.nickname, s.avatar, s.xp from student_sessions x join students s on s.id = x.student_id
      where x.id = $1 and x.expires_at > now() and s.verified and not s.disabled`, [sha256(t)]);
    return r[0] || null;
  } catch { return null; }
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
