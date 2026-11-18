'use client';
import Crud from '@/components/admin/Crud';
import { STATUS_OPTS } from '@/components/admin/Fields';
import { TUT_ICONS } from '@/lib/tutorials.mjs';
const fields = [
  { k: 'title', label: 'Τίτλος οδηγού', t: 'text', ph: 'π.χ. Πώς στέλνω άρθρο στην εφημερίδα' },
  { k: 'subtitle', label: 'Υπότιτλος (μία πρόταση)', t: 'text' },
  { k: 'icon', label: 'Εικονίδιο', t: 'emoji', opts: TUT_ICONS },
  { k: 'slug', label: 'Διεύθυνση (slug)', t: 'text', hint: 'Ο οδηγός θα είναι στο /help/<slug>. Αφήστε κενό για αυτόματη δημιουργία.' },
  { k: 'intro', label: 'Εισαγωγή (προαιρετική)', t: 'area', rows: 3, hint: 'Μία-δύο προτάσεις: τι θα μάθει ο αναγνώστης.' },
  { k: 'blocks', label: 'Περιεχόμενο', t: 'tutorial' },
  { k: 'outro', label: 'Κλείσιμο (προαιρετικό)', t: 'area', rows: 2, hint: 'π.χ. «Χρειάζεσαι κι άλλη βοήθεια; Γράψε μας.»' },
  { k: 'sort', label: 'Σειρά εμφάνισης', t: 'num' },
  { k: 'status', label: 'Κατάσταση', t: 'select', opts: STATUS_OPTS },
];
const columns = [
  { k: 'title', label: 'Οδηγός', render: (r) => <b>{r.icon} {r.title}</b> },
  { k: 'status', label: 'Κατάσταση' },
  { k: 'slug', label: 'Διεύθυνση', render: (r) => <code>/help/{r.slug}</code> },
  { k: 'blocks', label: 'Βήματα', render: (r) => (r.blocks || []).filter((b) => b.kind === 'step').length },
];
export default function Page() {
  return (<><h1>Οδηγοί βοήθειας</h1>
    <p className="muted">Γράψε απλούς οδηγούς βήμα-βήμα για τους επισκέπτες (π.χ. «Δεν βλέπεις τα email μας;»). Οι δημοσιευμένοι εμφανίζονται στη σελίδα <a href="/help" target="_blank" rel="noopener">/help</a> και στο υποσέλιδο.</p>
    <Crud resource="tutorials" noun="οδηγός" fields={fields} columns={columns} statusFilter
      defaults={{ status: 'draft', icon: '📘', sort: 10, intro: '', outro: '', blocks: [] }}
      previewPath={(r) => `/help/${r.slug}`} /></>);
}
