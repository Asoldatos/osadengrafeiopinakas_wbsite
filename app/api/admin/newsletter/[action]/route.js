import { q, logActivity } from '@/lib/db';
import { route, json, body, need } from '@/lib/guard';
import { getSite } from '@/lib/data';
import { sendMail } from '@/lib/mail.mjs';
import { validEmail } from '@/lib/students.mjs';
import { getTheme } from '@/lib/themeServer';
import { themeAvailability } from '@/lib/themes.mjs';
import { loadCampaign, render, startCampaign, processCampaign, status, runDue } from '@/lib/newsletterSend';

export const maxDuration = 60;
const csv = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
async function campaign(id) { const d = await loadCampaign(id); if (!d) throw json({ error: 'Δεν βρέθηκε η αποστολή.' }, 404); return d; }

/** Προειδοποίηση: το κουμπί ενεργοποίησης λειτουργεί μόνο όταν το θέμα είναι διαθέσιμο τη στιγμή που θα το πατήσουν. */
async function themeWarning(c, at = new Date()) {
  if (!c.theme_slug || !c.activation_enabled) return null;
  const t = await getTheme(c.theme_slug), a = themeAvailability(t, at);
  return a.available ? null : a.reason === 'off' ? 'Το εποχιακό θέμα είναι απενεργοποιημένο: το κουμπί ενεργοποίησης θα οδηγεί απλώς στην αρχική σελίδα. Ενεργοποίησέ το από «Εποχιακά θέματα».'
    : 'Τη στιγμή της αποστολής το εποχιακό θέμα δεν θα είναι ακόμη διαθέσιμο (δες τις ημερομηνίες στα «Εποχιακά θέματα»). Το κουμπί θα λειτουργεί μόλις ανοίξει το θέμα.';
}
export const GET = route(async (req, { params }) => {
  const url = new URL(req.url);
  if (params.action === 'stats') return json((await q("select count(*) filter (where status='active')::int active, count(*) filter (where status='pending')::int pending, count(*) filter (where status='unsubscribed')::int unsub from subscribers"))[0]);
  if (params.action === 'log') {
    const id = +url.searchParams.get('id') || 0;
    const rows = await q(`select s.email, cs.status, cs.error, cs.sent_at from campaign_sends cs join subscribers s on s.id = cs.subscriber_id where cs.campaign_id=$1
      order by case cs.status when 'failed' then 0 when 'sending' then 1 when 'pending' then 2 else 3 end, cs.sent_at desc nulls last limit 1000`, [id]);
    const c = (await q('select id, subject, status, scheduled_at, sent_at, last_error from campaigns where id=$1', [id]))[0];
    return json({ campaign: c, summary: await status(id), rows });
  }
  if (params.action !== 'export') return json({ error: 'Άγνωστη ενέργεια.' }, 404);
  const rows = await q('select email, name, status, source, created_at, confirmed_at from subscribers order by created_at desc');
  const out = rows.map((r) => [r.email, r.name, r.status, r.source, r.created_at && new Date(r.created_at).toISOString(), r.confirmed_at && new Date(r.confirmed_at).toISOString()].map(csv).join(',')).join('\n');
  return new Response('﻿Email,Όνομα,Κατάσταση,Πηγή,Εγγραφή,Επιβεβαίωση\n' + out, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="syndromites.csv"', 'Cache-Control': 'no-store' } });
}, { perm: 'newsletter' });

export const POST = route(async (req, { params }, user) => {
  need(user, 'newsletter');
  const b = await body(req), a = params.action;
  if (a === 'preview') { const d = await campaign(b.id); return json({ html: (await render(d, { name: 'Μαρία' })).html, warning: await themeWarning(d.c, d.c.scheduled_at ? new Date(d.c.scheduled_at) : new Date()) }); }
  if (a === 'tick') return json({ ran: await runDue({ budgetMs: 15000 }) });     // «ξυπνάει» τα προγραμματισμένα όσο είναι ανοιχτός ο πίνακας
  if (a === 'test') {
    const to = String(b.to || '').trim().toLowerCase();
    if (!validEmail(to)) return json({ error: 'Συμπλήρωσε ένα έγκυρο email για τη δοκιμή.' }, 400);
    const site = await getSite(), m = await render(await campaign(b.id), { name: 'Δοκιμή' });
    await sendMail({ to, ...m, subject: `[ΔΟΚΙΜΗ] ${m.subject}`, fromName: site.name });
    await logActivity(user, 'Δοκιμαστική αποστολή ενημερωτικού', `${m.subject} → ${to}`);
    return json({ ok: true });
  }
  need(user, 'newsletter_send');                                              // προγραμματισμός/αποστολή: ξεχωριστό δικαίωμα
  const { c } = await campaign(b.id);
  if (a === 'schedule') {
    const at = new Date(b.at);
    if (isNaN(at) || at.getTime() < Date.now() + 60000) return json({ error: 'Διάλεξε μια μελλοντική ημερομηνία και ώρα.' }, 400);
    const r = await q("update campaigns set status='scheduled', scheduled_at=$2, updated_at=now() where id=$1 and status in ('draft','scheduled') returning id", [c.id, at.toISOString()]);
    if (!r.length) return json({ error: 'Αυτή η αποστολή δεν μπορεί πια να προγραμματιστεί.' }, 409);
    await logActivity(user, 'Προγραμματισμός ενημερωτικού', `${c.subject} → ${at.toISOString()}`);
    return json({ ok: true, warning: await themeWarning(c, at) });
  }
  if (a === 'unschedule') {
    const r = await q("update campaigns set status='draft', scheduled_at=null, updated_at=now() where id=$1 and status='scheduled' returning id", [c.id]);
    if (r.length) await logActivity(user, 'Ακύρωση προγραμματισμού ενημερωτικού', c.subject);
    return json({ ok: true });
  }
  if (a === 'retry') {
    await q("update campaign_sends set status='pending', error='' where campaign_id=$1 and status='failed'", [c.id]);
    await q("update campaigns set status='sending' where id=$1 and status='sent'", [c.id]);
    await logActivity(user, 'Επανάληψη αποτυχημένων αποστολών', c.subject);
    return json({ ok: true });
  }
  if (a !== 'send') return json({ error: 'Άγνωστη ενέργεια.' }, 404);
  if (['draft', 'scheduled'].includes(c.status)) await startCampaign(c.id, user);
  const st = await processCampaign(c.id, { budgetMs: 20000, user });
  return json(st);
});
