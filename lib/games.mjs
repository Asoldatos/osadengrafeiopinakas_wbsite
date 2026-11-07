// Καθαρή λογική των παιχνιδιών (χωρίς εξαρτήσεις), ώστε να ελέγχεται εύκολα και να τρέχει σε browser και διακομιστή.
export const ALPHABET = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'.split('');
export const MEMORY_MOODS = ['happy', 'wave', 'celebrate', 'reading', 'confused', 'phone', 'work', 'oops'];
export const MAX_WRONG = 6;
/** Κεφαλαία χωρίς τόνους και διαλυτικά, με το τελικό ς → Σ. */
export const normalizeGreek = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
export const shuffle = (a, rnd = Math.random) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
export const dealMemory = (rnd) => shuffle([...MEMORY_MOODS, ...MEMORY_MOODS], rnd).map((mood, id) => ({ id, mood }));
export const maskWord = (word, guessed) => [...word].map((c) => (guessed.has(c) ? c : '_'));
export const wrongCount = (word, guessed) => [...guessed].filter((c) => !word.includes(c)).length;
export const isSolved = (word, guessed) => [...word].every((c) => guessed.has(c));

const num = (v, a, b) => (v !== '' && v != null && Number.isFinite(+v) && +v >= a && +v <= b ? Math.trunc(+v) : null);
/** Η βαθμολογία υπολογίζεται ΠΑΝΤΑ στον διακομιστή από στοιχεία που ελέγχονται για λογικά όρια. null = άκυρο. */
export function scoreFor(game, meta = {}) {
  if (game === 'memory') { const m = num(meta.moves, 8, 80), s = num(meta.secs, 4, 900); return m == null || s == null ? null : Math.max(0, 1000 - 25 * (m - 8) - 3 * s); }
  if (game === 'hangman') { const w = num(meta.wrong, 0, MAX_WRONG); return w == null ? null : meta.won === true ? 100 - 10 * w : 0; }
  if (game === 'catch') { const c = num(meta.caught, 0, 120), b = num(meta.bombs, 0, 60); return c == null || b == null ? null : Math.max(0, c * 3 - b * 5); }
  return null;
}
export function xpFor(game, score, meta = {}) {
  if (game === 'memory') return 10 + Math.min(20, Math.floor(score / 50));
  if (game === 'hangman') return meta.won === true ? 15 + 3 * (MAX_WRONG - Math.trunc(+meta.wrong)) : 2;
  if (game === 'catch') return Math.min(36, Math.floor(score / 10));
  return 0;
}
export const QUIZ_LEN = 10;
export const quizXp = (correct, total) => correct * 8 + (correct === total && total > 0 ? 20 : 0);
/** answers: [1..4] ανά ερώτηση, qids: ταξινομημένα ids, key: Map(id → {correct_no, explanation}) */
export function gradeQuiz(qids, answers, key) {
  const results = qids.map((id, i) => { const k = key.get(id); return { id, right: k?.correct_no ?? 0, explanation: k?.explanation || '', correct: !!k && +answers[i] === k.correct_no }; });
  return { correct: results.filter((r) => r.correct).length, total: qids.length, results };
}
