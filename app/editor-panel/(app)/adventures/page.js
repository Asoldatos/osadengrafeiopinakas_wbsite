'use client';
import Crud from '@/components/admin/Crud';
import { STATUS_OPTS } from '@/components/admin/Fields';
const fields = [
  { k: 'title', label: 'Τίτλος περιπέτειας', t: 'text' }, { k: 'slug', label: 'Διεύθυνση (slug)', t: 'text', hint: 'Αφήστε κενό για αυτόματη δημιουργία' },
  { k: 'description', label: 'Σύντομη περιγραφή', t: 'area', rows: 3 }, { k: 'cover_url', label: 'Εικόνα εξωφύλλου (προαιρετική)', t: 'image' },
  { k: 'unlock_level', label: 'Επίπεδο ξεκλειδώματος', t: 'num', hint: '0 = ανοιχτή σε όλους (και χωρίς λογαριασμό). 1 = απαιτεί λογαριασμό. 2 και πάνω = ξεκλειδώνει όταν ο μαθητής φτάσει το επίπεδο.' },
  { k: 'xp_reward', label: 'Πόντοι XP στην ολοκλήρωση', t: 'num' }, { k: 'sort', label: 'Σειρά εμφάνισης', t: 'num' },
  { k: 'status', label: 'Κατάσταση', t: 'select', opts: STATUS_OPTS }, { k: 'scenes', label: 'Σκηνές της ιστορίας', t: 'scenes' },
];
const columns = [{ k: 'title', label: 'Περιπέτεια', render: (r) => <b>{r.title}</b> }, { k: 'status', label: 'Κατάσταση' }, { k: 'unlock_level', label: 'Επίπεδο', render: (r) => (r.unlock_level === 0 ? 'Ανοιχτή' : `Επ. ${r.unlock_level}`) }, { k: 'scenes', label: 'Σκηνές', render: (r) => r.scenes?.length || 0 }];
export default function Page() {
  return (<><h1>Περιπέτειες με τον Κιμωλάκη</h1><p className="muted">Φτιάξε ιστορίες με επιλογές. Οι μαθητές κερδίζουν XP όταν φτάνουν σε ένα τέλος.</p>
    <Crud resource="adventures" noun="περιπέτεια" fields={fields} columns={columns} statusFilter defaults={{ status: 'draft', unlock_level: 1, xp_reward: 60, sort: 0, scenes: [{ id: 's1', title: 'Η αρχή', text: '', mood: 'happy', end: false, endingTitle: '', choices: [] }] }}
      previewPath={(r) => `/play/adventures/${r.slug}`} /></>);
}
