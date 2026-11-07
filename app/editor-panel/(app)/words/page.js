'use client';
import Crud from '@/components/admin/Crud';
const fields = [{ k: 'word', label: 'Λέξη (3–14 ελληνικά γράμματα, οι τόνοι αφαιρούνται αυτόματα)', t: 'text' }, { k: 'hint', label: 'Υπόδειξη', t: 'text' }, { k: 'active', label: 'Ενεργή', t: 'bool' }];
const columns = [{ k: 'word', label: 'Λέξη', render: (r) => <b>{r.word}</b> }, { k: 'hint', label: 'Υπόδειξη' }, { k: 'active', label: 'Ενεργή', render: (r) => (r.active ? 'Ναι' : 'Όχι') }];
export default function Page() {
  return (<><h1>Λέξεις για την Κρεμάλα</h1><Crud resource="words" noun="λέξη" fields={fields} columns={columns} defaults={{ active: true }} /></>);
}
