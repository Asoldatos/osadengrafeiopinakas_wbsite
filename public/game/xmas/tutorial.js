// Οδηγοί χειρισμού: κάρτες που εμφανίζονται τη σωστή στιγμή, δείχνουν τα πλήκτρα της συσκευής
// (υπολογιστής / κινητό / VR) και «τσεκάρονται» μόλις ο παίκτης κάνει την κίνηση.
import { DEVICE } from './engine.js';

const dev = (g) => (g.inVR ? 'vr' : DEVICE.touch ? 'touch' : 'pc');

/** Οι οδηγοί. Κάθε γραμμή: [πλήκτρα, περιγραφή, κλειδί προόδου]. */
export const TUTS = {
  move: {
    title: 'Κίνηση',
    pc: [[['W', 'A', 'S', 'D'], 'Περπάτα', 'move'], [['🖱️'], 'Κούνα το ποντίκι για να κοιτάξεις γύρω', 'look']],
    touch: [[['🕹️'], 'Αριστερός μοχλός: περπάτα', 'move'], [['👆'], 'Σύρε το δάχτυλο δεξιά: κοίτα γύρω', 'look']],
    vr: [[['L 🕹️'], 'Αριστερός μοχλός: περπάτα (προς τα εκεί που κοιτάς)', 'move'], [['R 🕹️'], 'Δεξιός μοχλός: γύρνα αριστερά/δεξιά', 'look']],
  },
  act: {
    title: 'Αλληλεπίδραση',
    pc: [[['E'], 'Πλησίασε ένα αντικείμενο και πάτα E όταν δεις «E: …»', 'act'], [['E', 'κλικ'], 'Προχωράς και τους διαλόγους', null]],
    touch: [[['✋'], 'Πλησίασε και πάτα το ✋ όταν δεις το μήνυμα', 'act'], [['💬'], 'Πάτα πάνω στον διάλογο για να προχωρήσει', null]],
    vr: [[['🔫'], 'Σκανδάλη: χρησιμοποίησε / πάρε', 'act'], [['🔫'], 'Η σκανδάλη προχωράει και τους διαλόγους', null]],
  },
  run: {
    title: 'Τρέξιμο & άλμα',
    pc: [[['Shift'], 'Κράτα το Shift για να τρέξεις', 'sprint'], [['Space'], 'Άλμα', 'jump'], [['V'], 'Άλλαξε κάμερα (1ο / 3ο πρόσωπο)', null], [['Esc'], 'Παύση και ρυθμίσεις', null]],
    touch: [[['🕹️'], 'Σπρώξε τον μοχλό μέχρι τέρμα για να τρέξεις', 'sprint'], [['⤒'], 'Άλμα', 'jump'], [['⏸'], 'Παύση: το κουμπί πάνω δεξιά', null]],
    vr: [[['✊'], 'Κράτα τη λαβή (αριστερό χέρι) για να τρέξεις', 'sprint'], [['B'], 'Άλμα', 'jump'], [['Y'], 'Παύση και μενού', null]],
  },
  roll: {
    title: 'Κύλησε τη χιονόμπαλα',
    pc: [[['W', 'A', 'S', 'D'], 'Περπάτα — η μπάλα κυλάει μπροστά σου και μεγαλώνει', 'roll']],
    touch: [[['🕹️'], 'Περπάτα — η μπάλα κυλάει μπροστά σου και μεγαλώνει', 'roll']],
    vr: [[['L 🕹️'], 'Περπάτα — η μπάλα κυλάει μπροστά σου και μεγαλώνει', 'roll']],
  },
  throw: {
    title: 'Χιονοπόλεμος',
    pc: [[['κλικ'], 'Σημάδεψε με τον σταυρό και κάνε κλικ για να ρίξεις', 'throw'], [['Space'], 'Πήδα για να αποφύγεις τις μπάλες', null]],
    touch: [[['❄'], 'Το ❄ ρίχνει χιονόμπαλα προς τα εκεί που κοιτάς', 'throw'], [['👆'], 'Σημάδεψε σέρνοντας το δάχτυλο δεξιά', null]],
    vr: [[['R 🔫'], 'Δεξιά σκανδάλη: ρίξε — σημάδεψε με το χειριστήριο!', 'throw'], [['👀'], 'Σκύψε ή μετακινήσου για να αποφύγεις', null]],
  },
  ice: {
    title: 'Πάγος!',
    all: [[['⛸️'], 'Στον πάγο γλιστράς και δεν σταματάς αμέσως', null], [['🐢'], 'Κάνε μικρές, ήρεμες κινήσεις', null]],
  },
  listen: {
    title: 'Άκου τα κουδουνάκια',
    all: [[['🎧'], 'Φόρεσε ακουστικά αν μπορείς', null], [['🔔'], 'Ο ήχος ακούγεται από την πλευρά του τάρανδου — γύρνα προς τα εκεί', null], [['🔊'], 'Όσο πιο δυνατά ακούγεται, τόσο πιο κοντά είσαι', null]],
  },
  push: {
    title: 'Σπρώξε το έλκηθρο',
    pc: [[['E'], 'Στάσου πίσω από το έλκηθρο και ΚΡΑΤΑ πατημένο το E', 'push']],
    touch: [[['✋'], 'Στάσου πίσω από το έλκηθρο και ΚΡΑΤΑ πατημένο το ✋', 'push']],
    vr: [[['🔫'], 'Στάσου πίσω από το έλκηθρο και ΚΡΑΤΑ πατημένη τη σκανδάλη', 'push']],
  },
  fly: {
    title: 'Πτήση με το έλκηθρο',
    pc: [[['A', 'D'], 'Στροφή (ή κούνα το ποντίκι)', 'steer'], [['W', 'S'], 'Ανέβα / κατέβα', 'climb'], [['E', 'κλικ'], 'Ρίξε δώρο όταν είσαι πάνω από καμινάδα', 'drop']],
    touch: [[['🕹️'], 'Μοχλός: τιμόνι και ύψος', 'steer'], [['✋'], 'Ρίξε δώρο πάνω από την καμινάδα', 'drop']],
    vr: [[['L 🕹️'], 'Αριστερός μοχλός: τιμόνι και ύψος', 'steer'], [['🔫'], 'Σκανδάλη: ρίξε δώρο', 'drop']],
  },
};

/** Δείχνει έναν οδηγό. Ολοκληρώνεται όταν γίνουν όλες οι κινήσεις του (ή μετά από `max` δευτερόλεπτα). Δεν σταματά την ιστορία. */
export function tutorial(g, id, { max = 40, min = 4 } = {}) {
  const T = TUTS[id]; if (!T || !g.settings?.tutorials) return Promise.resolve();
  const d = dev(g), rows = T[d] || T.all || T.pc;
  g.tutProg ||= {}; const need = rows.map((r) => r[2]).filter(Boolean); for (const k of need) g.tutProg[k] = 0;
  const el = ensureEl(g);
  el.innerHTML = `<small>ΧΕΙΡΙΣΜΟΣ</small><b>${T.title}</b>` + rows.map((r) => `<div class="tr" data-k="${r[2] || ''}"><span class="keys">${r[0].map((k) => `<kbd>${k}</kbd>`).join('')}</span><span class="tx">${r[1]}</span><i>✓</i></div>`).join('');
  el.hidden = false; el.classList.remove('done', 'in'); void el.offsetWidth; el.classList.add('in');
  g.ui.tut = { title: T.title, rows: rows.map((r) => ({ keys: r[0].join(' '), text: r[1], k: r[2] })) }; g.ui.vdirty = true;
  const start = g.t; let id0 = (g._tutId = (g._tutId || 0) + 1);
  return g.until(() => {
    if (g._tutId !== id0) return true;                          // άρχισε άλλος οδηγός
    const ok = need.filter((k) => g.tutProg[k] >= 1);
    for (const k of ok) el.querySelector(`.tr[data-k="${k}"]`)?.classList.add('ok');
    if (g.ui.tut) g.ui.tut.done = ok;
    const all = ok.length === need.length && g.t - start > min;
    if (all || g.t - start > max) { el.classList.add('done'); g.audio.chime?.([1319, 1760], 0.05, 0.12); setTimeout(() => { if (g._tutId === id0) { el.hidden = true; g.ui.tut = null; g.ui.vdirty = true; } }, 1400); return true; }
    return false;
  });
}
/** Κλείνει όποιον οδηγό είναι ανοιχτός. */
export function closeTutorial(g) { g._tutId = (g._tutId || 0) + 1; const el = g.root.querySelector('#tut'); if (el) el.hidden = true; g.ui.tut = null; g.ui.vdirty = true; }
/** Σημειώνει πρόοδο σε μια κίνηση (π.χ. 'move', 1/3 δευτ.). */
export function tutMark(g, k, amount = 1) { if (g.tutProg && k in g.tutProg) g.tutProg[k] = Math.min(1, g.tutProg[k] + amount); }

function ensureEl(g) { let el = g.root.querySelector('#tut'); if (!el) { el = document.createElement('div'); el.id = 'tut'; el.hidden = true; g.root.querySelector('#hud').appendChild(el); } return el; }
