import { tooMany, recordFail, clearFails, countRecent, lockMinutes } from './auth';
import { sendMail, mailConfigured, baseUrl } from './mail.mjs';
import { loginAlertEmail } from './emails.mjs';
import { getSite } from './data';

export const WINDOW = 15;          // λεπτά περιορισμού
export const MAX_ACCOUNT_IP = 5;   // αποτυχίες ανά λογαριασμό+IP
export const MAX_IP = 15;          // αποτυχίες ανά IP (όλοι οι λογαριασμοί)
export const ALERT_AFTER = 3;      // ειδοποίηση email μετά από τόσες αποτυχίες στον λογαριασμό

const keys = (prefix, email, ip) => ({ k1: `${prefix}:${ip}:${email}`, kIp: `${prefix}-ip:${ip}`, kAcct: `${prefix}-acct:${email}` });

/** Επιστρέφει { locked, minutes } αν η IP (ή το ζεύγος IP+λογαριασμός) έχει ξεπεράσει τα όρια. */
export async function checkLock(prefix, email, ip) {
  const { k1, kIp } = keys(prefix, email, ip);
  if (await tooMany(k1, MAX_ACCOUNT_IP, WINDOW)) return { locked: true, minutes: await lockMinutes(k1, WINDOW) };
  if (await tooMany(kIp, MAX_IP, WINDOW)) return { locked: true, minutes: await lockMinutes(kIp, WINDOW) };
  return { locked: false };
}
export const lockMessage = (minutes) => `Πάρα πολλές αποτυχημένες προσπάθειες. Η πρόσβαση από αυτή τη σύνδεση περιορίστηκε προσωρινά. Δοκίμασε ξανά σε ${minutes} ${minutes === 1 ? 'λεπτό' : 'λεπτά'}.`;

/** Καταγράφει αποτυχία και, αν ξεπεραστεί το όριο, στέλνει email ειδοποίησης στον κάτοχο του λογαριασμού (μία φορά ανά 15 λεπτά). */
export async function registerFailure(prefix, email, ip, account, resetPath) {
  const { k1, kIp, kAcct } = keys(prefix, email, ip);
  await Promise.all([recordFail(k1), recordFail(kIp), recordFail(kAcct)]);
  if (!account || !mailConfigured()) return;
  try {
    const count = await countRecent(kAcct, WINDOW);
    const alertKey = `alert:${prefix}:${email}`;
    if (count >= ALERT_AFTER && !(await tooMany(alertKey, 1, WINDOW))) {
      await recordFail(alertKey);
      const site = await getSite(), base = baseUrl();
      await sendMail({ to: account.email, ...loginAlertEmail({ nickname: account.nickname || account.name || email.split('@')[0], count, ip, siteName: site.name, base, resetUrl: base + resetPath }), fromName: site.name });
    }
  } catch (e) { console.error('Αποτυχία ειδοποίησης ασφαλείας:', e.message); }
}
export async function clearFailures(prefix, email, ip) {
  const { k1, kAcct } = keys(prefix, email, ip);
  await Promise.all([clearFails(k1), clearFails(kAcct)]);
}
