// Φίλτρο βωμολοχιών Ελληνικά + Αγγλικά (βάσει του «GREEK + ENGLISH PROFANITY FILTER» της ομάδας).
// Ακολουθεί τις οδηγίες του: ταίριασμα ΟΛΟΚΛΗΡΩΝ λέξεων/φράσεων (όχι κομματιών), κανονικοποίηση σε αντίγραφο,
// ξεχωριστά «περάσματα» για επαναλήψεις, διαχωριστικά, leetspeak, μάσκες (*) και ομοιόγλυφους χαρακτήρες.
//
// Τρία επίπεδα όρων:
//   HARD  → μπλοκάρεται πάντα (βωμολοχίες, σεξουαλικά, προσβολές ταυτότητας, γνωστές παραλλαγές)
//   SOFT  → εξαρτάται από τα συμφραζόμενα: στα σχόλια δημοσιεύεται αλλά πάει για έλεγχο (ρυθμιζόμενο)
//   SAFE  → λέξεις του αρχικού καταλόγου που είναι συνηθισμένες/αθώες (π.χ. «νούμερο», «τούβλο», «cracker», «penis» για τη Βιολογία): ποτέ δεν μπλοκάρονται

const W = (s) => s.trim().split(/\s+/).filter(Boolean);

/* ------------------------------ ΚΑΤΑΛΟΓΟΙ ------------------------------ */
const HARD_GR = W(`
πούτσα πούτσος πουτσάρα πουτσάκι μουνί μουνάρα μουνάκι καυλί καυλίτσα ψωλή ψωλάρα γαμώ γαμήσου γαμιέσαι γαμιέμαι γαμημένος γαμημένη γαμημένο
γαμημένε γαμιάς γαμώτο γαμιέται γαμηθείς σκατά σκατίλα σκατό σκατόφατσα χέστης κλανιάρης αρχίδια αρχίδι καυλώνω καυλωμένος καύλα κωλοτρυπίδα
κωλοδάχτυλο κωλόπαιδο κολόπαιδο κωλοχαρακτήρας ξεκωλιάζω ξεκωλιάρης κωλομπαράς παπάρας παπάρι κώλος κωλάρα κολάρα
μαλάκας μαλάκα μαλακία μαλακίες μαλακισμένος μαλακισμένη μαλακισμένε μπάσταρδος μπάσταρδη μπάσταρδε κερατάς
τσαπού πυτσα μαλκας`);
const SOFT_GR = W(`
ηλίθιος ηλίθια ηλίθιε βλάκας βλάκα βλαμμένος βλαμμένε βλακεία ξεφτίλας ξεφτίλα παλιοτόμαρο βρωμιάρης σιχαμένος σιχαμένε
φλώρος φλούφλης ψώνιο ψωνισμένος ρουφιάνος γλείφτης πουλημένος χέσιμο κλανιά πίπα πιπάκι`);
const SAFE_GR = W(`στόκος τούβλο ζώον νούμερο καραγκιόζης γελοίος γελοία άχρηστος άχρηστη ρεζίλι σκουπίδι πουθενάς δειλός καρφί σπασίκλας σκουλήκι μπαλάκια όρχεις κιμωλάκης κιμωλία`);
const HARD_PHRASES_GR = [
  'άντε γαμήσου', 'άι γαμήσου', 'στα αρχίδια μου', 'δε γαμιέται', 'δεν γαμιέται', 'γαμώ τη μάνα σου', 'γαμώ την μάνα σου', 'γαμώ τον πατέρα σου',
  'να πας να γαμηθείς', 'τι στον πούτσο', 'γαμώ την τύχη μου',
];
const SOFT_PHRASES_GR = ['τον ήπιες', 'άντε στο διάολο', 'στο διάολο', 'τι στο διάολο', 'άντε χάσου'];

const HARD_EN = W(`
fuck fucks fucking fucked fucker fuckers motherfucker motherfuckers motherfucking shit shits shitty bullshit horseshit dipshit shithead shitface
bitch bitches bitchy bastard bastards asshole assholes arsehole arseholes dickhead dickheads twat twats cunt cunts wanker wankers tosser bellend
bollocks scumbag douche douchebag skank slut sluts whore whores thot thots asskisser blowjob handjob jizz spunk dildo boobs tits titty boner horny
threesome cum cumming masturbate masturbation
fck fk fuk phuck sht btch cnt ahole
nigga niggas niggah niggahs nigger niggers niglet niglets faggot faggots fag fags kike kikes spic spics wetback wetbacks gook gooks raghead ragheads
towelhead towelheads tranny trannies retard retarded retards mongoloid honky honkeys paki pakis chinks
kys stfu gtfo smd smdh mfer mofo mfs`);
const SOFT_EN = W(`ass arse dick dicks cock cocks pussy pussies prick pricks bugger damn goddamn crap crappy piss pissed jackass dumbass smartass hoe hoes dyke dykes orgasm wtf kms mf fu`);
const SAFE_EN = W(`hell balls ball nut nuts penis vagina nipple nipples erection cracker crackers coon coons chink tit af wth lmao lmfao rofl fml smh pos sob bs npc bozo clown trash mid bro`);
const HARD_PHRASES_EN = ['son of a bitch', 'fuck off', 'fuck you', 'shut the fuck up', 'eat shit', 'kiss my ass', 'suck my dick', 'suck my cock', 'get fucked', 'jerk off', 'jerking off', 'jack off', 'jacking off', 'kill yourself', 'ball sack', 'dick head'];
const SOFT_PHRASES_EN = ['piss off', 'screw you', 'screw off', 'go to hell', 'ass kisser'];

/* ------------------------------ ΚΑΝΟΝΙΚΟΠΟΙΗΣΗ ------------------------------ */
/** A–B: NFKC, πεζά, χωρίς τόνους/διαλυτικά, τελικό σ, χωρίς αόρατους χαρακτήρες. */
export function fold(s) {
  return String(s || '').normalize('NFKC').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
    .replace(/ς/g, 'σ').replace(/[​-‏⁠﻿­]/g, '');
}
const collapse2 = (t) => t.replace(/(.)\1{2,}/g, '$1$1');       // C: «fuuuuck» → «fuuck»
const collapse1 = (t) => t.replace(/(.)\1+/g, '$1');
const GREEK = /[α-ω]/, LATIN = /[a-z]/;
// E: leetspeak (περιορισμένο, ανάλογα με το αλφάβητο της λέξης)
const LEET_L = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };
const LEET_G = { 0: 'ο', 1: 'ι', 3: 'ε', 4: 'α', 5: 'σ', 7: 'τ', 8: 'θ', '@': 'α', $: 'σ', '!': 'ι' };
// F: ομοιόγλυφοι (μόνο σε λέξεις με ΜΕΙΚΤΟ αλφάβητο)
const L2G = { a: 'α', b: 'β', e: 'ε', h: 'η', i: 'ι', k: 'κ', m: 'μ', n: 'ν', o: 'ο', p: 'ρ', t: 'τ', u: 'υ', x: 'χ', y: 'υ', z: 'ζ', v: 'ν' };
const G2L = { α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', μ: 'm', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ζ: 'z' };
const CYR = { а: 'a', в: 'b', е: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', і: 'i' };
const map = (t, m) => [...t].map((c) => m[c] ?? c).join('');
/** Κυριλλικά «διπλότυπα» (а, о, р…) → λατινικά, για το παλιό φίλτρο ριζών. */
export const deconfuse = (s) => map(String(s || '').toLowerCase(), CYR);

/* ------------------------------ ΛΕΞΙΚΑ (κανονικοποιημένα) ------------------------------ */
const build = (list) => new Set(list.map((w) => fold(w).replace(/[\s\-_.]/g, '')));
const D = { hard: build([...HARD_GR, ...HARD_EN]), soft: build([...SOFT_GR, ...SOFT_EN]), safe: build([...SAFE_GR, ...SAFE_EN]) };
const D1 = { hard: new Set([...D.hard].map(collapse1)), soft: new Set([...D.soft].map(collapse1)) };
const P = { hard: [...HARD_PHRASES_GR, ...HARD_PHRASES_EN].map(fold), soft: [...SOFT_PHRASES_GR, ...SOFT_PHRASES_EN].map(fold) };
const hardByLen = {}; for (const w of D.hard) (hardByLen[w.length] ||= []).push(w);

/* ------------------------------ ΕΛΕΓΧΟΣ ------------------------------ */
/**
 * Βρίσκει όρους στο κείμενο. level: 'strict' | 'balanced' | 'aggressive'.
 * extra: { block: [], allow: [] } λέξεις του διαχειριστή. Επιστρέφει { hard: [...], soft: [...] } με τον κανόνα που ταίριαξε (για διαφάνεια).
 */
export function scan(text, { level = 'aggressive', block = [], allow = [] } = {}) {
  const f = fold(text);
  const extraHard = build(block), allowSet = build(allow);
  const hits = { hard: new Map(), soft: new Map() };
  const put = (kind, term, rule) => { if (!allowSet.has(term) && !D.safe.has(term) && !hits[kind].has(term)) hits[kind].set(term, rule); };
  const look = (tok, rule, orig) => {
    if (!tok || tok.length < 2) return;
    if (D.hard.has(tok) || extraHard.has(tok)) return put('hard', tok, rule);
    if (D.soft.has(tok)) return put('soft', tok, rule);
    if (orig && /(.)\1{2,}/.test(orig)) { const c = collapse1(tok); if (D1.hard.has(c)) return put('hard', c, rule + '+επανάληψη'); if (D1.soft.has(c)) put('soft', c, rule + '+επανάληψη'); }
  };
  // φράσεις (μετά από κανονικοποίηση κενών)
  const spaced = ' ' + f.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const spacedLeet = level === 'aggressive' ? ' ' + map(f, LEET_L).replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim() + ' ' : spaced;
  for (const p of P.hard) if (spaced.includes(' ' + p + ' ') || spacedLeet.includes(' ' + p + ' ')) put('hard', p, 'φράση');
  for (const p of P.soft) if (spaced.includes(' ' + p + ' ')) put('soft', p, 'φράση');
  for (const w of block.map(fold)) if (w.includes(' ') && spaced.includes(' ' + w + ' ')) put('hard', w, 'λίστα διαχειριστή');

  const raw = f.split(/\s+/).filter(Boolean);
  for (const r of raw) {
    const plain = r.replace(/^[^\p{L}\p{N}@$!*]+|[^\p{L}\p{N}@$!*]+$/gu, '');       // χωρίς σημεία στίξης στις άκρες
    for (const part of plain.split(/[^\p{L}\p{N}]+/u)) look(part, 'λέξη', part);
    if (level === 'strict') continue;
    look(collapse2(plain.replace(/[._\-]/g, '')), 'διαχωριστικά', plain);           // D: «που-τσα», «π_ου_τσα», «a-hole»
    if (level !== 'aggressive') continue;
    const isG = GREEK.test(plain) && (plain.match(/[α-ω]/g) || []).length >= (plain.match(/[a-z]/g) || []).length;
    const leet = map(map(plain, CYR), isG ? LEET_G : LEET_L).replace(/[._\-]/g, '');
    look(leet.replace(/[^\p{L}*]/gu, ''), 'leetspeak', plain);                        // E: «sh1t», «π0υτσ@», «γ@μησου»
    if (GREEK.test(leet) && LATIN.test(leet)) {                                       // F: μεικτό αλφάβητο
      const g = (leet.match(/[α-ω]/g) || []).length, l = (leet.match(/[a-z]/g) || []).length;
      look(map(leet, g >= l ? L2G : G2L).replace(/[^\p{L}]/gu, ''), 'ομοιόγλυφοι', plain);
    }
    const masked = leet.replace(/[^\p{L}*]/gu, '');
    if (masked.includes('*') && (masked.match(/\*/g) || []).length <= 2 && masked.replace(/\*/g, '').length >= 2 && masked.length >= 4) {   // μάσκα: «f*ck», «ni**er», «γαμ*σου»
      const re = new RegExp('^' + masked.replace(/\*/g, '.') + '$');
      const m = (hardByLen[masked.length] || []).find((w) => re.test(w));
      if (m) put('hard', m, 'μάσκα *');
    }
  }
  if (level !== 'strict') {
    // D: γράμματα χωρισμένα με κενά/τελείες («f u c k», «μ α λ α κ α ς»): ενώνονται ΜΟΝΟ οι σειρές από μονά γράμματα
    const runs = f.match(/(?:^|[\s.\-_])((?:[\p{L}@$0-9*][\s.\-_]+){2,}[\p{L}@$0-9*])(?=$|[\s.\-_])/gu) || [];
    for (const run of runs) {
      const parts = run.trim().split(/[\s.\-_]+/).filter(Boolean);
      if (parts.length >= 3 && parts.every((p) => [...p].length === 1)) {
        const joined = parts.join(''); const isG = GREEK.test(joined);
        look(joined, 'κενά ανάμεσα', joined);
        if (level === 'aggressive') look(map(joined, isG ? LEET_G : LEET_L), 'κενά ανάμεσα+leetspeak', joined);
      }
    }
  }
  return { hard: [...hits.hard].map(([term, rule]) => ({ term, rule })), soft: [...hits.soft].map(([term, rule]) => ({ term, rule })) };
}
