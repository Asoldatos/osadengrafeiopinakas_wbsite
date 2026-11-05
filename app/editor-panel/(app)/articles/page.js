'use client';
import Crud from '@/components/admin/Crud';
import { STATUS_OPTS } from '@/components/admin/Fields';
import { fmtDate } from '@/lib/util';

const fields = [
  { k: 'title', label: 'Τίτλος', t: 'text' }, { k: 'subtitle', label: 'Υπότιτλος', t: 'text' }, { k: 'slug', label: 'Διεύθυνση (slug)', t: 'text', hint: 'Αφήστε κενό για αυτόματη δημιουργία' },
  { k: 'cover_url', label: 'Εικόνα εξωφύλλου', t: 'image' },
  { k: 'author_id', label: 'Συντάκτης', t: 'select', from: 'writers', num: true, empty: '— Χωρίς συντάκτη —' }, { k: 'category_id', label: 'Κατηγορία', t: 'select', from: 'categories', num: true, empty: '— Χωρίς κατηγορία —' },
  { k: 'tags', label: 'Ετικέτες', t: 'tags' }, { k: 'content', label: 'Κείμενο', t: 'html' },
  { k: 'gallery', label: 'Συλλογή εικόνων (μία διεύθυνση ανά γραμμή)', t: 'lines' }, { k: 'videos', label: 'Βίντεο YouTube / Vimeo (μία διεύθυνση ανά γραμμή)', t: 'lines' },
  { k: 'links', label: 'Εξωτερικοί σύνδεσμοι (Ετικέτα | https://…)', t: 'linkLines' },
  { k: 'status', label: 'Κατάσταση', t: 'select', opts: STATUS_OPTS }, { k: 'publish_at', label: 'Προγραμματισμένη δημοσίευση', t: 'datetime', hint: 'Αν είναι «Δημοσιευμένο» με μελλοντική ώρα, θα εμφανιστεί αυτόματα τότε.' },
  { k: 'featured', label: 'Επιλεγμένο άρθρο (εμφανίζεται στην αρχική)', t: 'bool' },
  { k: 'seo_title', label: 'Τίτλος SEO (προαιρετικός)', t: 'text' }, { k: 'seo_desc', label: 'Περιγραφή SEO (προαιρετική)', t: 'area', rows: 2 },
];
const columns = [{ k: 'title', label: 'Τίτλος', render: (r) => <><b>{r.title}</b>{r.featured && ' ⭐'}</> }, { k: 'status', label: 'Κατάσταση', render: (r) => <span className={`pill ${r.status}`}>{r.status === 'published' ? (r.publish_at && new Date(r.publish_at) > new Date() ? `Προγραμματισμένο ${fmtDate(r.publish_at)}` : 'Δημοσιευμένο') : r.status === 'draft' ? 'Πρόχειρο' : 'Αρχειοθετημένο'}</span> },
  { k: 'category_name', label: 'Κατηγορία' }, { k: 'author_name', label: 'Συντάκτης' }, { k: 'created_at', label: 'Δημιουργία', date: true }];
export default function Page() {
  return (<><h1>Άρθρα</h1><Crud resource="articles" noun="άρθρο" fields={fields} columns={columns} statusFilter defaults={{ status: 'draft', tags: [], gallery: [], videos: [], links: [], content: '', featured: false }} previewPath={(r) => `/articles/${r.slug}?preview=1`} emptyKey="articles" /></>);
}
