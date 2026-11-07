'use client';
import Crud from '@/components/admin/Crud';
import { levelFor } from '@/lib/progress.mjs';
const fields = [{ k: 'disabled', label: 'Αποκλεισμένος λογαριασμός', t: 'bool', hint: 'Ο μαθητής δεν μπορεί να συνδεθεί και εξαφανίζεται από τους πίνακες κατάταξης.' }];
const columns = [{ k: 'nickname', label: 'Όνομα χρήστη', render: (r) => <b>{r.nickname}</b> }, { k: 'email', label: 'Email' },
  { k: 'verified', label: 'Επιβεβαιωμένο', render: (r) => (r.verified ? '✔' : '—') }, { k: 'xp', label: 'Επίπεδο / XP', render: (r) => `Επ. ${levelFor(r.xp)} · ${r.xp} XP` },
  { k: 'disabled', label: 'Κατάσταση', render: (r) => <span className={`pill ${r.disabled ? 'archived' : 'published'}`}>{r.disabled ? 'Αποκλεισμένος' : 'Ενεργός'}</span> }, { k: 'created_at', label: 'Εγγραφή', date: true }];
export default function Page() {
  return (<><h1>Λογαριασμοί μαθητών</h1><p className="muted">Αποκλεισμός ή διαγραφή λογαριασμών. Μπορείς να αλλάξεις τους κανόνες εγγραφής στις «Ρυθμίσεις ιστοτόπου → Λογαριασμοί».</p>
    <Crud resource="students" noun="μαθητής" fields={fields} columns={columns} noNew /></>);
}
