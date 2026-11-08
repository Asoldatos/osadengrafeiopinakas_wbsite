'use client';
import { useEffect, useState } from 'react';
import Crud from '@/components/admin/Crud';
import { api } from '@/lib/clientUpload';
const L = { active: 'Ενεργός', pending: 'Αναμονή επιβεβαίωσης', unsubscribed: 'Διαγράφηκε' };
const fields = [{ k: 'name', label: 'Όνομα (προαιρετικό)', t: 'text' }, { k: 'status', label: 'Κατάσταση', t: 'select', opts: [{ v: 'active', l: 'Ενεργός' }, { v: 'pending', l: 'Αναμονή επιβεβαίωσης' }, { v: 'unsubscribed', l: 'Διαγράφηκε' }], hint: 'Οι «Διαγράφηκε» και «Αναμονή» δεν λαμβάνουν ποτέ μηνύματα.' }];
const columns = [{ k: 'email', label: 'Email', render: (r) => <b>{r.email}</b> }, { k: 'name', label: 'Όνομα' },
  { k: 'status_l', label: 'Κατάσταση', render: (r) => <span className={`pill ${r.status === 'active' ? 'published' : r.status === 'pending' ? 'draft' : 'archived'}`}>{L[r.status]}</span> },
  { k: 'source', label: 'Πηγή', render: (r) => ({ site: 'Ιστότοπος', student: 'Λογαριασμός μαθητή', admin: 'Διαχειριστής' }[r.source] || r.source) }, { k: 'created_at', label: 'Εγγραφή', date: true }];
export default function Page() {
  const [st, setSt] = useState(null);
  useEffect(() => { api('/api/admin/newsletter/stats').then(setSt).catch(() => {}); }, []);
  return (<><h1>Συνδρομητές ενημερωτικού δελτίου</h1>
    {st && <div className="stats"><div className="stat"><b>{st.active}</b><span>Ενεργοί συνδρομητές</span></div><div className="stat"><b>{st.pending}</b><span>Περιμένουν επιβεβαίωση</span></div><div className="stat"><b>{st.unsub}</b><span>Έχουν διαγραφεί</span></div></div>}
    <p className="muted">Εδώ βλέπεις όλα τα email που έχουν γραφτεί. Μόνο οι «Ενεργοί» λαμβάνουν μηνύματα. Κάθε εγγραφή επιβεβαιώνεται με email και κάθε μήνυμα έχει σύνδεσμο διαγραφής.</p>
    <p><a className="btn btn-ghost sm" href="/api/admin/newsletter/export">⬇ Λήψη λίστας (CSV)</a></p>
    <Crud resource="subscribers" noun="συνδρομητής" fields={fields} columns={columns} noNew emptyKey="empty" /></>);
}
