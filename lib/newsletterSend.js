import { q, logActivity } from './db';
import { getSite } from './data';
import { sendMail, baseUrl, mailConfigured } from './mail.mjs';
import { newsletterEmail } from './emails.mjs';
import { signActivation } from './activation.mjs';
import { getTheme } from './themeServer';
import { plain } from './util';

const BATCH = 10, PAR = 4;
export const unsubUrl = (base, token) => `${base}/newsletter/unsubscribe?token=${token}`;
/** Υπογεγραμμένος σύνδεσμος του κουμπιού ενεργοποίησης θέματος (ισχύει 60 ημέρες· ένας ανά παραλήπτη). */
export function activationUrl(c, subscriberId, base = baseUrl()) {
  if (!c.activation_enabled || !c.theme_slug) return null;
  const t = signActivation({ theme: c.theme_slug, campaign: c.id, subscriber: subscriberId, exp: Date.now() + 60 * 864e5 });
  return `${base}/api/theme/activate?t=${encodeURIComponent(t)}`;
}
export async function loadCampaign(id) {
  const c = (await q('select * from campaigns where id=$1', [+id || 0]))[0];
  if (!c) return null;
  const articles = c.include_articles && c.article_count > 0 ? plain(await q("select slug, title, subtitle, cover_url from articles where status='published' and (publish_at is null or publish_at <= now()) order by coalesce(publish_at, created_at) desc limit $1", [c.article_count])) : [];
  const theme = c.theme_slug ? await getTheme(c.theme_slug) : null;
  return { c, articles, theme };
}
export async function render({ c, articles, theme }, { token = 'preview', name = '', subscriberId = 0 } = {}) {
  const site = await getSite(), base = baseUrl();
  return newsletterEmail({ campaign: c, articles, siteName: site.name, base, unsubUrl: unsubUrl(base, token), name, activationUrl: activationUrl(c, subscriberId, base), theme });
}
/** Έναρξη αποστολής: δημιουργούνται οι παραλήπτες (μία γραμμή ανά συνδρομητή → αδύνατο να σταλεί δεύτερη φορά) και η κατάσταση γίνεται «sending» ατομικά. */
export async function startCampaign(id, user) {
  await q("insert into campaign_sends(campaign_id, subscriber_id) select $1, id from subscribers where status='active' and exists (select 1 from campaigns where id=$1 and status in ('draft','scheduled')) on conflict do nothing", [id]);
  const r = await q("update campaigns set status='sending', total=(select count(*) from campaign_sends where campaign_id=$1), updated_at=now() where id=$1 and status in ('draft','scheduled') returning subject", [id]);
  if (r.length) await logActivity(user || { name: 'Αυτόματος προγραμματισμός' }, 'Έναρξη αποστολής ενημερωτικού', r[0].subject);
  return r.length > 0;
}
/** Στέλνει παρτίδες μέχρι να εξαντληθεί ο διαθέσιμος χρόνος. Κάθε παραλήπτης «κλειδώνεται» ατομικά (FOR UPDATE SKIP LOCKED) πριν σταλεί, άρα δύο ταυτόχρονες διεργασίες δεν στέλνουν ποτέ στο ίδιο email. */
export async function processCampaign(id, { budgetMs = 20000, user } = {}) {
  const t0 = Date.now(), data = await loadCampaign(id);
  if (!data || data.c.status !== 'sending') return status(id);
  if (!mailConfigured()) { await q("update campaigns set last_error=$2 where id=$1", [id, 'Δεν έχει ρυθμιστεί η αποστολή email.']); return status(id); }
  const site = await getSite(), base = baseUrl();
  // Διεκδικήσεις που «κόλλησαν» (π.χ. διακοπή) δεν ξαναστέλνονται αυτόματα: σημειώνονται ως αβέβαιες και μπορούν να ξαναδοκιμαστούν χειροκίνητα.
  await q("update campaign_sends set status='failed', error='Άγνωστο αποτέλεσμα (διακοπή αποστολής)' where campaign_id=$1 and status='sending' and claimed_at < now() - interval '10 minutes'", [id]);
  while (Date.now() - t0 < budgetMs) {
    const batch = await q(`update campaign_sends cs set status='sending', claimed_at=now() from subscribers s
      where s.id = cs.subscriber_id and (cs.campaign_id, cs.subscriber_id) in (select campaign_id, subscriber_id from campaign_sends where campaign_id=$1 and status='pending' order by subscriber_id limit ${BATCH} for update skip locked)
      returning s.id, s.email, s.name, s.token, s.status as sub_status`, [id]);
    if (!batch.length) break;
    for (let i = 0; i < batch.length; i += PAR) {
      await Promise.all(batch.slice(i, i + PAR).map(async (s) => {
        if (s.sub_status !== 'active') { await q("update campaign_sends set status='skipped' where campaign_id=$1 and subscriber_id=$2", [id, s.id]); return; }
        try {
          const m = newsletterEmail({ campaign: data.c, articles: data.articles, siteName: site.name, base, unsubUrl: unsubUrl(base, s.token), name: s.name, activationUrl: activationUrl(data.c, s.id, base), theme: data.theme });
          const link = `${base}/api/newsletter/unsubscribe?token=${s.token}`;
          await sendMail({ to: s.email, ...m, fromName: site.name, headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
          await q("update campaign_sends set status='sent', sent_at=now(), error='' where campaign_id=$1 and subscriber_id=$2", [id, s.id]);
        } catch (e) { await q("update campaign_sends set status='failed', error=$3 where campaign_id=$1 and subscriber_id=$2", [id, s.id, String(e.message).slice(0, 200)]); }
      }));
    }
  }
  const st = await status(id);
  await q(`update campaigns set sent_count=$2, failed_count=$3, updated_at=now()${st.remaining === 0 ? ", status='sent', sent_at=coalesce(sent_at, now())" : ''} where id=$1 and status='sending'`, [id, st.sent, st.failed]);
  if (st.remaining === 0 && data.c.status === 'sending') await logActivity(user || { name: 'Αυτόματος προγραμματισμός' }, 'Ολοκλήρωση αποστολής ενημερωτικού', `${data.c.subject} (${st.sent} εστάλησαν, ${st.failed} απέτυχαν)`);
  return st;
}
export async function status(id) {
  const r = (await q("select count(*) filter (where status='pending')::int pending, count(*) filter (where status='sending')::int sending, count(*) filter (where status='sent')::int sent, count(*) filter (where status='failed')::int failed, count(*) filter (where status='skipped')::int skipped, count(*)::int total from campaign_sends where campaign_id=$1", [id]))[0];
  return { ...r, remaining: r.pending + r.sending };
}
/** Προγραμματισμένα ενημερωτικά που έφτασε η ώρα τους + όσα στέλνονται ήδη. Χρησιμοποιείται από το cron και από τον πίνακα διαχείρισης. */
export async function runDue({ budgetMs = 40000 } = {}) {
  const t0 = Date.now(), done = [];
  for (const r of await q("select id from campaigns where status='scheduled' and scheduled_at <= now() order by scheduled_at")) await startCampaign(r.id, null);
  for (const r of await q("select id from campaigns where status='sending' order by id")) {
    const left = budgetMs - (Date.now() - t0); if (left < 3000) break;
    done.push({ id: r.id, ...(await processCampaign(r.id, { budgetMs: left })) });
  }
  return done;
}
