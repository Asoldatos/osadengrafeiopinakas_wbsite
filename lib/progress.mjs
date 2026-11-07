export const levelFor = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
export const xpForLevel = (l) => 50 * (l - 1) * (l - 1);
export function levelInfo(xp) {
  const level = levelFor(xp), cur = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, xp, cur, next, pct: Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) };
}
export const DAILY_XP_CAP = 400;
export const AVATARS = ['happy', 'wave', 'celebrate', 'reading', 'confused', 'phone', 'work', 'oops'];
export const GAMES = {
  quiz: { label: 'Κιμωλο-Κουίζ', icon: '🧠', desc: '10 ερωτήσεις γενικών γνώσεων. Πόσες θα βρεις;', public: false },
  memory: { label: 'Βρες το ζευγάρι', icon: '🃏', desc: 'Ταίριαξε τα πρόσωπα του Κιμωλάκη. Δοκίμασέ το δωρεάν!', public: true },
  hangman: { label: 'Κρεμάλα', icon: '🔤', desc: 'Βρες τη λέξη πριν σπάσει η κιμωλία.', public: false },
  catch: { label: 'Πιάσε τις κιμωλίες', icon: '✏️', desc: 'Μάζεψε κιμωλίες, απόφυγε τις σβήστρες!', public: false },
};
export const BADGES = {
  'first-game': { icon: '🎮', label: 'Πρώτο παιχνίδι', desc: 'Έπαιξες το πρώτο σου παιχνίδι με λογαριασμό.' },
  'first-story': { icon: '📖', label: 'Πρώτη περιπέτεια', desc: 'Ολοκλήρωσες μια περιπέτεια με τον Κιμωλάκη.' },
  'explorer': { icon: '🧭', label: 'Εξερευνητής', desc: 'Ολοκλήρωσες 3 περιπέτειες.' },
  'quiz-perfect': { icon: '🧠', label: 'Άριστος!', desc: 'Απάντησες σωστά και τις 10 ερωτήσεις του κουίζ.' },
  'speedy-memory': { icon: '⚡', label: 'Αστραπή', desc: 'Έλυσες το «Βρες το ζευγάρι» με λιγότερες από 12 κινήσεις.' },
  'chalk-master': { icon: '🏆', label: 'Βασιλιάς της κιμωλίας', desc: '100+ πόντοι στο «Πιάσε τις κιμωλίες».' },
  'wordsmith': { icon: '🔡', label: 'Λεξιλόγος', desc: 'Βρήκες 5 λέξεις στην Κρεμάλα.' },
  'scholar': { icon: '🎓', label: 'Σπουδαστής', desc: 'Έφτασες στο επίπεδο 5.' },
};
