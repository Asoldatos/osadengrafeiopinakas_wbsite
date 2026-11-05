'use client';
import Crud from '@/components/admin/Crud';
const fields = [{ k: 'name', label: 'Όνομα', t: 'text' }, { k: 'slug', label: 'Διεύθυνση (slug)', t: 'text', hint: 'Αφήστε κενό για αυτόματη δημιουργία' }, { k: 'color', label: 'Χρώμα', t: 'color' },
  { k: 'description', label: 'Σύντομη περιγραφή', t: 'text' }, { k: 'sort', label: 'Σειρά εμφάνισης', t: 'num' }];
const columns = [{ k: 'name', label: 'Όνομα', render: (r) => <><i className="dot" style={{ background: r.color }} /> <b>{r.name}</b></> }, { k: 'slug', label: 'Διεύθυνση' }, { k: 'sort', label: 'Σειρά' }];
export default function Page() {
  return (<><h1>Κατηγορίες</h1><Crud resource="categories" noun="κατηγορία" fields={fields} columns={columns} defaults={{ color: '#00C8E0', sort: 0 }} /></>);
}
