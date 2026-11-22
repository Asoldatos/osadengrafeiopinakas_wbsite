import { q } from './db';
import { getSite } from './data';
import { sendMail, mailConfigured, baseUrl } from './mail.mjs';
import { ticketStaffEmail, staffAlertEmail } from './emails.mjs';
import { TICKET_KINDS } from './community.mjs';

/** Πού πηγαίνουν οι ειδοποιήσεις για νέα αιτήματα: CONTACT_NOTIFY_EMAIL, αλλιώς το email επικοινωνίας του ιστοτόπου, αλλιώς contact@osaden.gr. */
export async function staffEmail() {
  const site = await getSite().catch(() => ({}));
  const e = process.env.CONTACT_NOTIFY_EMAIL || site?.footer?.contact?.email || 'contact@osaden.gr';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}
export async function notifyStaff(t, message, followUp = false) {
  if (!mailConfigured()) return;
  const to = await staffEmail(); if (!to) return;
  const site = await getSite().catch(() => ({ name: 'Όσα δεν γράφει ο πίνακας' })), base = baseUrl();
  const m = ticketStaffEmail({ kindLabel: TICKET_KINDS[t.kind] || 'Μήνυμα', subject: t.subject, ref: t.id, from: t.name ? `${t.name} <${t.email}>` : t.email, message, link: `${base}/editor-panel/tickets?id=${t.id}`, siteName: site.name, base, followUp });
  try { await sendMail({ to, ...m }); } catch (e) { console.error('ticket notify', e.message); }
}
export const ticketThread = (id) => q('select id, author, user_name, body, created_at from ticket_replies where ticket_id=$1 order by id', [id]);
export async function alertStaff(title, message, path) {
  if (!mailConfigured()) return;
  const to = await staffEmail(); if (!to) return;
  const site = await getSite().catch(() => ({ name: 'Όσα δεν γράφει ο πίνακας' })), base = baseUrl();
  try { await sendMail({ to, ...staffAlertEmail({ title, message, link: base + path, siteName: site.name, base }) }); } catch (e) { console.error('staff alert', e.message); }
}
