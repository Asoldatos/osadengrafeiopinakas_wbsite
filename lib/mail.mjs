// Αποστολή email μέσω HTTP API (Brevo ή Resend). Χωρίς επιβεβαίωση πρόσβασης σε επιπλέον πακέτα.
// ΜΙΑ διεύθυνση αποστολής (MAIL_FROM_EMAIL, π.χ. noreply@τοdomain.gr) για ΟΛΑ: επαναφορά κωδικού, κωδικοί OTP,
// ειδοποιήσεις ασφαλείας, επιβεβαιώσεις και ενημερωτικό δελτίο.
export const mailConfigured = () => !!(process.env.MAIL_FROM_EMAIL && (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY));

/** Η διεύθυνση του ιστοτόπου για τους συνδέσμους στα email. Δεν χρησιμοποιεί ποτέ κεφαλίδες του αιτήματος (αποτροπή «password reset poisoning»). */
export function baseUrl() {
  const e = process.env.NEXT_PUBLIC_SITE_URL;
  if (e && !/localhost|example\.vercel\.app/.test(e)) return e.replace(/\/$/, '');
  const v = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (v) return 'https://' + v;
  return (e || 'http://localhost:3000').replace(/\/$/, '');
}
export function sender(fromName) {
  const clean = (x) => String(x || '').replace(/["<>\r\n]/g, '').trim();
  return { email: process.env.MAIL_FROM_EMAIL, name: clean(process.env.MAIL_FROM_NAME || fromName) || 'Όσα δεν γράφει ο πίνακας' };
}
export async function sendMail({ to, subject, html, text, fromName, headers }) {
  const from = sender(fromName);
  if (process.env.BREVO_API_KEY) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: from.name, email: from.email }, to: [{ email: to }], subject, htmlContent: html, textContent: text, ...(headers ? { headers } : {}) }),
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return;
  }
  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `"${from.name}" <${from.email}>`, to: [to], subject, html, text, ...(headers ? { headers } : {}) }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return;
  }
  throw new Error('Δεν έχει οριστεί πάροχος email.');
}
