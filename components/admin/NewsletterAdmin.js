'use client';
import Crud from './Crud';
import CampaignActions from './CampaignActions';

const MOODS = { wave: 'Χαιρετά', happy: 'Χαρούμενος', celebrate: 'Πανηγυρίζει', reading: 'Διαβάζει', confused: 'Μπερδεμένος', phone: 'Με κινητό', work: 'Δουλεύει (με κράνος)', oops: 'Ωχ!' };
const fields = [
  { k: 'subject', label: 'Θέμα του email', t: 'text' }, { k: 'preheader', label: 'Σύντομη περίληψη (φαίνεται δίπλα στο θέμα στα εισερχόμενα)', t: 'text' },
  { k: 'theme_slug', label: 'Θέμα εμφάνισης του email', t: 'select', opts: [{ v: '', l: 'Κανονικό' }, { v: 'christmas', l: '🎄 Χριστουγεννιάτικο (κόκκινο/πράσινο, Κιμωλάκης-Άγιος Βασίλης)' }] },
  { k: 'header_image', label: 'Εικόνα κεφαλίδας (προαιρετική, π.χ. χριστουγεννιάτικο banner ή λογότυπο)', t: 'image', noVideo: true },
  { k: 'body_html', label: 'Κείμενο (τίτλοι, περιγραφές, εικόνες)', t: 'html' },
  { k: 'mascot_mood', label: 'Διάθεση του Κιμωλάκη', t: 'select', opts: Object.entries(MOODS).map(([v, l]) => ({ v, l })) },
  { k: 'mascot_text', label: 'Τι λέει ο Κιμωλάκης;', t: 'area', rows: 2, hint: 'Εμφανίζεται σε φυσαλίδα δίπλα στον Κιμωλάκη. Άφησέ το κενό για να μην εμφανιστεί.' },
  { k: 'activation_enabled', label: '🎄 Κουμπί ενεργοποίησης θέματος (ξεκινά αυτόματα τη μετάβαση στον ιστότοπο)', t: 'bool', hint: 'Λειτουργεί όταν έχει επιλεγεί θέμα εμφάνισης. Κάθε παραλήπτης παίρνει προσωπικό, ασφαλή σύνδεσμο.' },
  { k: 'activation_label', label: 'Κείμενο κουμπιού ενεργοποίησης', t: 'text' },
  { k: 'activation_message', label: 'Μήνυμα πάνω από το κουμπί ενεργοποίησης', t: 'area', rows: 2 },
  { k: 'cta_label', label: 'Κύριο κουμπί: κείμενο (προαιρετικό)', t: 'text' }, { k: 'cta_url', label: 'Κύριο κουμπί: σύνδεσμος (https://…)', t: 'url' },
  { k: 'buttons', label: 'Επιπλέον κουμπιά (ένα ανά γραμμή: Ετικέτα | https://…)', t: 'linkLines' },
  { k: 'decor_snow', label: '❄ Χιονονιφάδες στην κεφαλίδα', t: 'bool' }, { k: 'decor_garland', label: '🎀 Γιρλάντα στην κορυφή', t: 'bool' }, { k: 'decor_candy', label: '🍬 Ριγέ «καραμέλα» διαχωριστικά', t: 'bool' },
  { k: 'include_articles', label: 'Να περιλαμβάνονται τα τελευταία άρθρα', t: 'bool' }, { k: 'article_count', label: 'Πόσα άρθρα (0–6)', t: 'num' },
];
const SL = { draft: ['Πρόχειρο', 'draft'], scheduled: ['⏰ Προγραμματισμένο', 'sched'], sending: ['Σε αποστολή…', 'draft'], sent: ['Εστάλη', 'published'], failed: ['Σφάλμα', 'failed'] };
const ath = (d) => new Date(d).toLocaleString('el-GR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Athens' });
const columns = [{ k: 'subject', label: 'Θέμα', render: (r) => <><b>{r.subject}</b>{r.theme_slug === 'christmas' && <span title="Χριστουγεννιάτικο"> 🎄</span>}</> },
  { k: 'st', label: 'Κατάσταση', render: (r) => <><span className={`pill ${SL[r.status]?.[1]}`}>{SL[r.status]?.[0] || r.status}</span>{r.status === 'scheduled' && r.scheduled_at && <><br /><small>{ath(r.scheduled_at)}</small></>}</> },
  { k: 'cnt', label: 'Παραλήπτες', render: (r) => (['draft', 'scheduled'].includes(r.status) ? '—' : `${r.sent_count}/${r.total}${r.failed_count ? ` (${r.failed_count} απέτυχαν)` : ''}`) }, { k: 'sent_at', label: 'Εστάλη', date: true }];

export default function NewsletterAdmin({ canSend, myEmail }) {
  return (
    <Crud noToggle resource="campaigns" noun="αποστολή" fields={fields} columns={columns}
      defaults={{ mascot_mood: 'wave', mascot_text: '', include_articles: true, article_count: 3, body_html: '<p></p>', cta_label: '', cta_url: '', theme_slug: '', activation_enabled: false, activation_label: '🎄 ΕΝΕΡΓΟΠΟΙΗΣΗ ΧΡΙΣΤΟΥΓΕΝΝΙΑΤΙΚΗΣ ΛΕΙΤΟΥΡΓΙΑΣ 🎄', activation_message: '', buttons: [], decor_snow: false, decor_candy: false, decor_garland: false, header_image: '' }}
      extraActions={(r, reload) => <CampaignActions row={r} reload={reload} canSend={canSend} myEmail={myEmail} />} />
  );
}
