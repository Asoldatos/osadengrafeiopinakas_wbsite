import { scan, deconfuse } from './profanity.mjs';
// Κοινότητα: φίλτρο περιεχομένου και βοηθητικά. Τα παιδιά είναι οι χρήστες μας, οπότε το φίλτρο είναι αυστηρό:
// κόβει βρισιές/προσβολές και ΚΑΘΕ τρόπο επικοινωνίας εκτός ιστοτόπου (σύνδεσμοι, email, τηλέφωνα, @λογαριασμοί).

/** Κανονικοποίηση: πεζά, χωρίς τόνους, τελικό σ, χωρίς επαναλαμβανόμενα γράμματα (π.χ. «μαλάααακα»). */
export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ').replace(/(.)\1{2,}/g, '$1$1');
}
// «Greeklish» → ελληνικά, για να πιάνονται και γραμμένα με λατινικούς
const GL = [['th', 'θ'], ['ch', 'χ'], ['ps', 'ψ'], ['ks', 'ξ'], ['a', 'α'], ['b', 'μπ'], ['d', 'ντ'], ['e', 'ε'], ['f', 'φ'], ['g', 'γ'], ['h', 'χ'], ['i', 'ι'], ['k', 'κ'], ['l', 'λ'], ['m', 'μ'], ['n', 'ν'], ['o', 'ο'], ['p', 'π'], ['r', 'ρ'], ['s', 'σ'], ['t', 'τ'], ['u', 'ου'], ['v', 'β'], ['w', 'ω'], ['x', 'χ'], ['y', 'υ'], ['z', 'ζ'], ['3', 'ξ'], ['8', 'θ'], ['0', 'ο'], ['1', 'ι'], ['4', 'α'], ['9', 'θ']];
const greeklish = (s) => { let o = s; for (const [l, g] of GL) o = o.split(l).join(g); return o; };
const unify = (s) => s.replace(/(.)\1+/g, '$1').replace(/ου/g, '#').replace(/ει|οι/g, 'ι').replace(/[ηιυ]/g, 'ι').replace(/ω/g, 'ο').replace(/αι/g, 'ε').replace(/#/g, 'ου'); // ίδιος ήχος = ίδιο γράμμα

// Ρίζες (μετά από unify). Επιλεγμένες ώστε να ΜΗΝ πιάνουν συνηθισμένες λέξεις (π.χ. «γάμος», «κωλύω»).
const BAD_ROOTS = ['μαλακ', 'γαμισ', 'γαμιε', 'γαμιμεν', 'γαμιθ', 'γαμιστ', 'πουστ', 'πουταν', 'πουτσ', 'αρχιδ', 'καριολ', 'ψολ', 'μουνι', 'μουνα', 'τσουλ', 'κερατα', 'γιφτ', 'κολοπ', 'κολοφαρδ', 'ξεφτιλ', 'αλιταρ', 'σιχαμ'];
const BAD_WORDS = ['γαμο', 'γαμα', 'κολοσ', 'κολο', 'κολε', 'κολια', 'μπασταρδ', 'μπασταρδε', 'βλακα', 'βλακασ', 'ιλιθιε', 'ιλιθια', 'χαζε', 'καθιστεριμενε', 'καθιστεριμενι', 'μαλακασ', 'ψοφα'];
// Για κείμενο με λατινικούς χαρακτήρες: μόνο λίγες, αδιαμφισβήτητες ρίζες (ώστε π.χ. το «skate» να μην κοπεί)
const GL_ROOTS = ['μαλακ', 'πουστ', 'πουταν', 'πουτσ', 'αρχιδ', 'καριολ', 'μουνι', 'γαμιμεν', 'γαμισ', 'τσουλ'];
const GL_WORDS = ['γαμο', 'σκατα', 'σκατο', 'κολο', 'κολοσ', 'ψολι', 'ψολα', 'μουνι', 'βλακα', 'μαλακα', 'μαλακασ'];
const EN = /\b(f+u+c+k+\w*|k+i+l+l+\s*y+o+u+r+s+e+l+f+)\b/i;   // τα υπόλοιπα αγγλικά τα πιάνει ο κατάλογος (profanity.mjs)

// Επικοινωνία εκτός ιστοτόπου
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\s*(\.|\(dot\)|τελεια)\s*(com|gr|net|org|io|me|ly|gg|tv|app|link|co|info|eu|xyz|site|online|ru)\b)/i;
const EMAIL = /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9.-]+\s*(\.|\(dot\))\s*[a-z]{2,}/i;
const PHONE = /(\+?\d[\d\s\-.()]{7,}\d)/;
const HANDLE = /(^|\s)@[a-z0-9_.]{3,}/i;
const APPS = /\b(insta(gram)?|snap(chat)?|tik\s?tok|discord|whats\s?app|viber|telegram|messenger|kik|wickr|signal app|ινσταγκραμ|ινστα|σναπ|τικ\s?τοκ|ντισκορντ|βαιμπερ|βαιβερ)\b/i;

/** Έλεγχος κειμένου. Επιστρέφει null αν είναι εντάξει, αλλιώς φιλικό μήνυμα για τον μαθητή. */
function legacyCheck(text, { strictApps = false } = {}) {
  const raw = String(text || '');
  if (!raw.trim()) return 'Γράψε κάτι πρώτα.';
  const n = norm(raw);
  if (LINK.test(n) || EMAIL.test(n)) return 'Δεν επιτρέπονται σύνδεσμοι και διευθύνσεις email. Μείνε ασφαλής: κράτα την κουβέντα εδώ.';
  if (PHONE.test(n.replace(/[a-zα-ω]/g, ' ')) && (n.match(/\d/g) || []).length >= 8) return 'Δεν επιτρέπονται αριθμοί τηλεφώνου. Μην μοιράζεσαι προσωπικά στοιχεία!';
  if (HANDLE.test(n)) return 'Δεν επιτρέπονται ονόματα λογαριασμών άλλων εφαρμογών (π.χ. @όνομα).';
  if (strictApps && APPS.test(n)) return 'Για την ασφάλειά σου, μην δίνεις και μη ζητάς λογαριασμούς σε άλλες εφαρμογές.';
  if (EN.test(n)) return 'Το μήνυμα περιέχει λέξεις που δεν επιτρέπονται. Ας είμαστε ευγενικοί!';
  const bad = 'Το μήνυμα περιέχει λέξεις που δεν επιτρέπονται. Ας είμαστε ευγενικοί!';
  const gr = unify(n), words = gr.split(/[^a-zα-ω0-9]+/).filter(Boolean);
  if (words.some((w) => BAD_WORDS.includes(w) || BAD_ROOTS.some((r) => w.startsWith(r)))) return bad;
  if (/μαλακ|γαμιμεν/.test(gr.replace(/[^α-ω]/g, ''))) return bad;          // π.χ. «μ α λ α κ α»
  if (/[a-z]/.test(n)) {
    const gw = unify(greeklish(n)).split(/[^a-zα-ω0-9]+/).filter(Boolean);
    if (gw.some((w) => GL_WORDS.includes(w) || GL_ROOTS.some((r) => w.startsWith(r)))) return bad;
  }
  return null;
}

const BAD = 'Το μήνυμα περιέχει λέξεις που δεν επιτρέπονται. Ας είμαστε ευγενικοί!';
/**
 * Πλήρης έλεγχος: στοιχεία επικοινωνίας + ρίζες βρισιών (κλίσεις) + κατάλογος βωμολοχιών Ελληνικά/Αγγλικά.
 * opts: { strictApps, level, block, allow, soft: 'flag'|'block'|'allow' }
 * Επιστρέφει { error } (δεν δημοσιεύεται) ή { flag: [όροι] } (δημοσιεύεται αλλά πάει για έλεγχο) ή {}.
 */
export function moderate(text, { strictApps = false, level = 'aggressive', block = [], allow = [], soft = 'flag' } = {}) {
  const r = scan(text, { level, block, allow });
  const legacy = legacyCheck(deconfuse(text), { strictApps });
  if (legacy && legacy !== BAD) return { error: legacy, rule: 'επικοινωνία' };   // σύνδεσμοι, email, τηλέφωνα, @, εφαρμογές
  if (r.hard.length) return { error: BAD, terms: r.hard };
  if (legacy === BAD && !allow.some((w) => String(text).toLowerCase().includes(String(w).toLowerCase()))) return { error: BAD, rule: 'ρίζα' };
  if (r.soft.length) {
    if (soft === 'block') return { error: 'Ας το πούμε λίγο πιο ευγενικά!', terms: r.soft };
    if (soft === 'flag') return { flag: r.soft };
  }
  return {};
}
/** Συμβατότητα: μήνυμα σφάλματος ή null (οι ήπιοι όροι επιτρέπονται). */
export const checkText = (text, opts = {}) => moderate(text, { ...opts, soft: opts.soft || 'allow' }).error || null;

/** Ζεύγος μαθητών πάντα με a < b (μία γραμμή ανά φιλία/συνομιλία). */
export const pair = (x, y) => (x < y ? [x, y] : [y, x]);

export const TICKET_KINDS = { idea: 'Ιδέα για άρθρο', article: 'Θέλω να γράψω άρθρο', question: 'Ερώτηση', bug: 'Κάτι δεν λειτουργεί', other: 'Άλλο' };
export const TICKET_STATUS = { open: 'Νέο', pending: 'Σε εξέλιξη', answered: 'Απαντήθηκε', closed: 'Κλειστό' };

/** Προεπιλεγμένες ρυθμίσεις κοινότητας (ο διαχειριστής μπορεί να κλείσει οτιδήποτε άμεσα). */
export const COMMUNITY_DEFAULTS = { comments: true, likes: true, views: true, friends: true, messages: true, retentionDays: 30, autoHideReports: 3, maxMessagesPerDay: 200, filterLevel: 'aggressive', softComments: 'flag', softMessages: 'allow', blockWords: [], allowWords: [], chat: true, calls: true, video: true, chatRetentionDays: 90 };
export const cleanCommunity = (v = {}) => ({
  comments: v.comments !== false, likes: v.likes !== false, views: v.views !== false, friends: v.friends !== false, messages: v.messages !== false,
  retentionDays: Math.min(30, Math.max(3, Math.trunc(+v.retentionDays) || 30)),
  autoHideReports: Math.min(10, Math.max(1, Math.trunc(+v.autoHideReports) || 3)),
  maxMessagesPerDay: Math.min(500, Math.max(20, Math.trunc(+v.maxMessagesPerDay) || 200)),
  filterLevel: ['strict', 'balanced', 'aggressive'].includes(v.filterLevel) ? v.filterLevel : 'aggressive',
  softComments: ['flag', 'block', 'allow'].includes(v.softComments) ? v.softComments : 'flag',
  softMessages: ['block', 'allow'].includes(v.softMessages) ? v.softMessages : 'allow',
  blockWords: wordList(v.blockWords), allowWords: wordList(v.allowWords),
  chat: v.chat !== false, calls: v.calls !== false, video: v.video !== false,
  chatRetentionDays: Math.min(365, Math.max(7, Math.trunc(+v.chatRetentionDays) || 90)),
});
/** Λίστες λέξεων του διαχειριστή (μία ανά γραμμή ή με κόμμα), έως 500. */
function wordList(v) { const a = Array.isArray(v) ? v : String(v || '').split(/[\n,]/); return [...new Set(a.map((x) => String(x).trim().slice(0, 60)).filter((x) => x.length >= 2))].slice(0, 500); }
/** Οι επιλογές του φίλτρου από τις ρυθμίσεις κοινότητας. */
export const filterOpts = (c, where) => ({ level: c.filterLevel, block: c.blockWords, allow: c.allowWords, soft: where === 'messages' ? c.softMessages : c.softComments, strictApps: where === 'messages' });

/** Αναγνωριστικό YouTube από οποιονδήποτε σύνδεσμο (watch, youtu.be, shorts, embed) ή σκέτο id. */
export function youtubeId(v) {
  const s = String(v || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : '';
}
