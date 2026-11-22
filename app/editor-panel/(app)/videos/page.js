'use client';
import Crud from '@/components/admin/Crud';
import { STATUS_OPTS } from '@/components/admin/Fields';

const fields = [
  { k: 'title', label: 'Τίτλος', t: 'text' }, { k: 'slug', label: 'Διεύθυνση (slug)', t: 'text', hint: 'Αφήστε κενό για αυτόματη.' },
  { k: 'youtube_id', label: 'Σύνδεσμος YouTube', t: 'text', hint: 'Ανέβασε το βίντεο στο κανάλι σας στο YouTube (μπορεί και «Μη καταχωρισμένο») και επικόλλησε εδώ τον σύνδεσμο. Δεν πιάνει καθόλου χώρο στον ιστότοπο.' },
  { k: 'description', label: 'Περιγραφή', t: 'area', rows: 4 },
  { k: 'article_id', label: 'Σχετικό άρθρο (προαιρετικό)', t: 'select', from: 'articles', labelKey: 'title', num: true, empty: '— Κανένα —' },
  { k: 'status', label: 'Κατάσταση', t: 'select', opts: STATUS_OPTS }, { k: 'publish_at', label: 'Προγραμματισμένη δημοσίευση', t: 'datetime' },
];
const columns = [
  { k: 'youtube_id', label: '', render: (r) => r.youtube_id ? <img src={`https://i.ytimg.com/vi/${r.youtube_id}/default.jpg`} alt="" width="80" height="60" style={{ borderRadius: 8, objectFit: 'cover' }} /> : '—' },
  { k: 'title', label: 'Τίτλος', render: (r) => <b>{r.title}</b> }, { k: 'status', label: 'Κατάσταση' }, { k: 'article_title', label: 'Άρθρο' }, { k: 'created_at', label: 'Δημιουργία', date: true }];
export default function Page() {
  return (<><h1>Βιντεοθήκη 🎬</h1><p className="muted">Τα βίντεο φιλοξενούνται στο YouTube και εμφανίζονται στη σελίδα <a href="/videos" target="_blank" rel="noopener noreferrer">/videos</a>, ώστε να μη γεμίζει ο αποθηκευτικός χώρος.</p>
    <Crud resource="videos" noun="βίντεο" fields={fields} columns={columns} statusFilter reorder defaults={{ status: 'draft' }} previewPath={(r) => `/videos/${r.slug}`} /></>);
}
