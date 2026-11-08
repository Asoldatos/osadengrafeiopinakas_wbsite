import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { getSite } from '@/lib/data';
import { sendMail, baseUrl } from '@/lib/mail.mjs';
import { newsletterEmail } from '@/lib/emails.mjs';
import { validEmail } from '@/lib/students.mjs';
import { plain } from '@/lib/util';

const BATCH = 12, PAR = 4;
const csv = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
async function load(id) {
  const c = (await q('select * from campaigns where id=$1', [+id || 0]))[0];
  if (!c) throw json({ error: 'Δεν βρέθηκε η αποστολή.' }, 404);
  const articles = c.include_articles && c.article_count > 0 ? plain(await q("select slug, title, subtitle, cover_url from articles where status='published' and (publish_at is null or publish_at <= now()) order by coalesce(publish_at, created_at) desc limit $1", [c.article_count])) : [];
  return { c, articles };
}
const unsub = (base, token) => `${base}/newsletter/unsubscribe?token=${token}`;

export const GET = route(async (_req, { params }) => {
  if (params.action === 'stats') {
    const r = (await q("select count(*) filter (where status='active')::int active, count(*) filter (where status='pending')::int pending, count(*) filter (where status='unsubscribed')::int unsub from subscribers"))[0];
    return json(r);
  }
  if (params.action !== 'export') return json({ error: 'Άγνωστη ενέργεια.' }, 404);
  const rows = await q('select email, name, status, source, created_at, confirmed_at from subscribers order by created_at desc');
  const head = 'Email,Όνομα,Κατάσταση,Πηγή,Εγγραφή,Επιβεβαίωση\n';
  const body = rows.map((r) => [r.email, r.name, r.status, r.source, r.created_at && new Date(r.created_at).toISOString(), r.confirmed_at && new Date(r.confirmed_at).toISOString()].map(csv).join(',')).join('\n');
  return new Response('\ufeff' + head + body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="syndromites.csv"', 'Cache-Control': 'no-store' } });
}, { role: 'admin' });

export const POST = route(async (req, { params }, user) => {
  const b = await body(req); const site = await getSite(), base = baseUrl();
  const mk = (c, articles, token, name) => newsletterEmail({ campaign: c, articles, siteName: site.name, base, unsubUrl: unsub(base, token), name });
  if (params.action === 'preview') { const { c, articles } = await load(b.id); return json({ html: mk(c, articles, 'preview', 'Μαρία').html }); }
  if (params.action === 'test') {
    const to = String(b.to || '').trim().toLowerCase();
    if (!validEmail(to)) return json({ error: 'Συμπλήρωσε ένα έγκυρο email για τη δοκιμή.' }, 400);
    const { c, articles } = await load(b.id), m = mk(c, articles, 'preview', 'Δοκιμή');
    await sendMail({ to, ...m, subject: `[ΔΟΚΙΜΗ] ${m.subject}`, fromName: site.name });
    return json({ ok: true });
  }
  if (params.action === 'retry') { await q("update campaign_sends set status='pending', error='' where campaign_id=$1 and status='failed'", [+b.id]); await q("update campaigns set status='sending' where id=$1 and status='sent'", [+b.id]); return json({ ok: true }); }
  if (params.action !== 'send') return json({ error: 'Άγνωστη ενέργεια.' }, 404);
  // --- Αποστολή σε παρτίδες (ο browser καλεί επαναληπτικά μέχρι remaining = 0) ---
  const { c, articles } = await load(b.id);
  if (c.status === 'draft') {
    const claim = await q("update campaigns set status='sending', total=(select count(*) from subscribers where status='active') where id=$1 and status='draft' returning id", [c.id]);
    if (claim.length) { await q("insert into campaign_sends(campaign_id, subscriber_id) select $1, id from subscribers where status='active' on conflict do nothing", [c.id]); await logActivity(user, 'Έναρξη αποστολής ενημερωτικού', c.subject); }
  }
  const batch = await q(`select s.id, s.email, s.name, s.token from campaign_sends cs join subscribers s on s.id = cs.subscriber_id
    where cs.campaign_id=$1 and cs.status='pending' and s.status='active' order by s.id limit ${BATCH}`, [c.id]);
  for (let i = 0; i < batch.length; i += PAR) {
    await Promise.all(batch.slice(i, i + PAR).map(async (s) => {
      try {
        const m = mk(c, articles, s.token, s.name), link = `${base}/api/newsletter/unsubscribe?token=${s.token}`;
        await sendMail({ to: s.email, ...m, fromName: site.name, headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
        await q("update campaign_sends set status='sent', sent_at=now() where campaign_id=$1 and subscriber_id=$2", [c.id, s.id]);
      } catch (e) { await q("update campaign_sends set status='failed', error=$3 where campaign_id=$1 and subscriber_id=$2", [c.id, s.id, String(e.message).slice(0, 200)]); }
    }));
  }
  await q("update campaign_sends set status='skipped' where campaign_id=$1 and status='pending' and subscriber_id in (select id from subscribers where status<>'active')", [c.id]);
  const st = (await q("select count(*) filter (where status='pending')::int pending, count(*) filter (where status='sent')::int sent, count(*) filter (where status='failed')::int failed from campaign_sends where campaign_id=$1", [c.id]))[0];
  await q(`update campaigns set sent_count=$2, failed_count=$3, updated_at=now()${st.pending === 0 ? ", status='sent', sent_at=coalesce(sent_at, now())" : ''} where id=$1`, [c.id, st.sent, st.failed]);
  if (st.pending === 0) await logActivity(user, 'Ολοκλήρωση αποστολής ενημερωτικού', `${c.subject} (${st.sent} εστάλησαν, ${st.failed} απέτυχαν)`);
  return json({ remaining: st.pending, sent: st.sent, failed: st.failed, total: Math.max(c.total, st.pending + st.sent + st.failed) });
}, { role: 'admin' });
