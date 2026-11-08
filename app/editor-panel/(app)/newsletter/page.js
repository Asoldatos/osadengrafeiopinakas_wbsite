'use client';
import Crud from '@/components/admin/Crud';
import CampaignActions from '@/components/admin/CampaignActions';
const MOODS = { wave: 'Χαιρετά', happy: 'Χαρούμενος', celebrate: 'Πανηγυρίζει', reading: 'Διαβάζει', confused: 'Μπερδεμένος', phone: 'Με κινητό', work: 'Δουλεύει (με κράνος)', oops: 'Ωχ!' };
const fields = [
  { k: 'subject', label: 'Θέμα του email', t: 'text' }, { k: 'preheader', label: 'Σύντομη περίληψη (φαίνεται δίπλα στο θέμα στα εισερχόμενα)', t: 'text' },
  { k: 'body_html', label: 'Κείμενο', t: 'html' },
  { k: 'mascot_mood', label: 'Διάθεση του Κιμωλάκη', t: 'select', opts: Object.entries(MOODS).map(([v, l]) => ({ v, l })) },
  { k: 'mascot_text', label: 'Τι λέει ο Κιμωλάκης;', t: 'area', rows: 2, hint: 'Εμφανίζεται σε φυσαλίδα δίπλα στον Κιμωλάκη. Άφησέ το κενό για να μην εμφανιστεί.' },
  { k: 'cta_label', label: 'Κουμπί: κείμενο (προαιρετικό)', t: 'text' }, { k: 'cta_url', label: 'Κουμπί: σύνδεσμος (https://…)', t: 'url' },
  { k: 'include_articles', label: 'Να περιλαμβάνονται τα τελευταία άρθρα', t: 'bool' }, { k: 'article_count', label: 'Πόσα άρθρα (0–6)', t: 'num' },
];
const SL = { draft: ['Πρόχειρο', 'draft'], sending: ['Σε αποστολή…', 'draft'], sent: ['Εστάλη', 'published'] };
const columns = [{ k: 'subject', label: 'Θέμα', render: (r) => <b>{r.subject}</b> },
  { k: 'st', label: 'Κατάσταση', render: (r) => <span className={`pill ${SL[r.status]?.[1]}`}>{SL[r.status]?.[0]}</span> },
  { k: 'cnt', label: 'Παραλήπτες', render: (r) => (r.status === 'draft' ? '—' : `${r.sent_count}/${r.total}${r.failed_count ? ` (${r.failed_count} απέτυχαν)` : ''}`) }, { k: 'sent_at', label: 'Εστάλη', date: true }];
export default function Page() {
  return (<><h1>Ενημερωτικό δελτίο</h1>
    <p className="muted">Γράψε ένα μήνυμα, διάλεξε τον Κιμωλάκη και τι θα λέει, δες προεπισκόπηση, στείλε δοκιμή στον εαυτό σου και μετά στείλε το σε όλους τους ενεργούς συνδρομητές. <b>Ένα μήνυμα που έχει σταλεί δεν αλλάζει.</b></p>
    <Crud resource="campaigns" noun="αποστολή" fields={fields} columns={columns}
      defaults={{ mascot_mood: 'wave', mascot_text: '', include_articles: true, article_count: 3, body_html: '<p></p>', cta_label: '', cta_url: '' }}
      extraActions={(r, reload) => <CampaignActions row={r} reload={reload} />} /></>);
}
