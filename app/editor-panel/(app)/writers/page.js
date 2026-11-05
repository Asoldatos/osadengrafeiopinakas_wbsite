'use client';
import Crud from '@/components/admin/Crud';
const fields = [{ k: 'name', label: 'Ονοματεπώνυμο', t: 'text' }, { k: 'role', label: 'Ρόλος (π.χ. Αρχισυντάκτρια)', t: 'text' }, { k: 'photo_url', label: 'Φωτογραφία προφίλ', t: 'image' },
  { k: 'bio', label: 'Βιογραφικό', t: 'area', rows: 5 }, { k: 'visible', label: 'Εμφάνιση στον δημόσιο ιστότοπο', t: 'bool' }];
const columns = [{ k: 'name', label: 'Όνομα', render: (r) => <b>{r.name}</b> }, { k: 'role', label: 'Ρόλος' }, { k: 'visible', label: 'Ορατός', render: (r) => (r.visible ? 'Ναι' : 'Όχι') }];
export default function Page() {
  return (<><h1>Συντακτική ομάδα</h1><Crud resource="writers" noun="συντάκτης" fields={fields} columns={columns} defaults={{ visible: true, sort: 999 }} reorder emptyKey="team" /></>);
}
