'use client';
import Crud from '@/components/admin/Crud';
const fields = [
  { k: 'question', label: 'Ερώτηση', t: 'area', rows: 2 }, { k: 'options', label: 'Οι 4 απαντήσεις (μία ανά γραμμή)', t: 'lines' },
  { k: 'correct_no', label: 'Ποια είναι η σωστή; (1–4, με τη σειρά που τις έγραψες)', t: 'num' }, { k: 'explanation', label: 'Εξήγηση (εμφανίζεται μετά την απάντηση)', t: 'text' },
  { k: 'active', label: 'Ενεργή (εμφανίζεται στο κουίζ)', t: 'bool' },
];
const columns = [{ k: 'question', label: 'Ερώτηση' }, { k: 'correct_no', label: 'Σωστή', render: (r) => r.options?.[r.correct_no - 1] }, { k: 'active', label: 'Ενεργή', render: (r) => (r.active ? 'Ναι' : 'Όχι') }];
export default function Page() {
  return (<><h1>Ερωτήσεις κουίζ</h1><p className="muted">Κάθε κουίζ παίρνει 10 τυχαίες ενεργές ερωτήσεις. Χρειάζονται τουλάχιστον 3.</p>
    <Crud resource="quiz" noun="ερώτηση" fields={fields} columns={columns} defaults={{ options: ['', '', '', ''], correct_no: 1, active: true }} /></>);
}
