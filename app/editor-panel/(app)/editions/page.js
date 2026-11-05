'use client';
import Crud from '@/components/admin/Crud';
import { STATUS_OPTS } from '@/components/admin/Fields';

const fields = [
  { k: 'title', label: 'Τίτλος τεύχους', t: 'text' }, { k: 'slug', label: 'Διεύθυνση (slug)', t: 'text', hint: 'Αφήστε κενό για αυτόματη δημιουργία' }, { k: 'cover_url', label: 'Εξώφυλλο', t: 'image' },
  { k: 'pub_date', label: 'Ημερομηνία έκδοσης', t: 'date' }, { k: 'school_year', label: 'Σχολική χρονιά', t: 'text', ph: 'π.χ. 2025-2026' }, { k: 'description', label: 'Περιγραφή', t: 'area' },
  { k: 'digital_pdf_url', label: 'Ψηφιακό PDF (για τον αναγνώστη)', t: 'pdf' }, { k: 'digital_public', label: 'Η ψηφιακή έκδοση είναι δημόσια', t: 'bool' },
  { k: 'print_pdf_url', label: 'Εκτυπώσιμο PDF', t: 'pdf' }, { k: 'print_public', label: 'Το εκτυπώσιμο PDF είναι διαθέσιμο για λήψη', t: 'bool' },
  { k: 'status', label: 'Κατάσταση', t: 'select', opts: STATUS_OPTS }, { k: 'featured', label: 'Προτεινόμενο τεύχος', t: 'bool' },
];
const columns = [{ k: 'title', label: 'Τεύχος', render: (r) => <b>{r.title}</b> }, { k: 'status', label: 'Κατάσταση' }, { k: 'school_year', label: 'Χρονιά' }, { k: 'pub_date', label: 'Ημερομηνία', date: true },
  { k: 'pdf', label: 'PDF', render: (r) => `${r.digital_pdf_url ? '📖' : '—'} ${r.print_pdf_url ? '🖨' : ''}` }];
export default function Page() {
  return (<><h1>Εφημερίδα – τεύχη</h1><Crud resource="editions" noun="τεύχος" fields={fields} columns={columns} statusFilter defaults={{ status: 'draft', digital_public: true, print_public: false, featured: false }}
    previewPath={(r) => `/editions/${r.slug}?preview=1`} emptyKey="editions"
    extraActions={(r) => r.digital_pdf_url ? <a className="btn btn-ghost sm" href={`/editor-panel/editions/${r.id}/pages`}>Διαδραστικά</a> : null} /></>);
}
