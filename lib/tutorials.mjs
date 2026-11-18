// Οδηγοί βοήθειας (κειμενικά tutorials) που φτιάχνονται από τον πίνακα διαχείρισης.
// Το κείμενο γράφεται με απλή μορφοποίηση και μετατρέπεται εδώ σε HTML. Όλα γίνονται escape ΠΡΩΤΑ,
// άρα κανένας διαχειριστής δεν μπορεί να βάλει script ή επικίνδυνο HTML.

export const TUT_KINDS = {
  step: { label: 'Βήμα', icon: '①', hint: 'Αριθμείται αυτόματα (1, 2, 3…)' },
  info: { label: 'Ενότητα', icon: '📄', hint: 'Επικεφαλίδα με κείμενο' },
  tip: { label: 'Συμβουλή', icon: '💡', hint: 'Πράσινο πλαίσιο' },
  warn: { label: 'Προσοχή', icon: '⚠️', hint: 'Πορτοκαλί πλαίσιο' },
};
export const FORMAT_HELP = [
  ['**έντονα**', 'έντονα γράμματα'],
  ['[κείμενο](/διεύθυνση)', 'σύνδεσμος (μέσα στο site ή https://…)'],
  ['- στοιχείο', 'λίστα με κουκκίδες (μία γραμμή το καθένα)'],
  ['1. στοιχείο', 'αριθμημένη λίστα'],
  ['κενή γραμμή', 'νέα παράγραφος'],
  ['{{sender}}', 'η διεύθυνση email από την οποία στέλνει το site'],
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeHref = (u) => { const x = String(u).trim(); return /^(https?:\/\/|\/(?!\/)|#|mailto:)/i.test(x) ? x : null; };

/** Μία γραμμή: έντονα, σύνδεσμοι, μεταβλητές. Η είσοδος είναι ΗΔΗ escaped. */
function inline(s, vars) {
  return s
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in vars ? `<strong>${esc(vars[k])}</strong>` : m))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const raw = url.replace(/&amp;/g, '&'), h = safeHref(raw); if (!h) return label;
      const ext = /^https?:/i.test(h); return `<a href="${esc(h)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    });
}
/** Κείμενο μπλοκ → ασφαλές HTML (παράγραφοι, λίστες). */
export function renderText(text, vars = {}) {
  const lines = esc(text).replace(/\r/g, '').split('\n'); const out = []; let para = [], list = null;
  const flushP = () => { if (para.length) { out.push(`<p>${para.map((l) => inline(l, vars)).join('<br>')}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map((i) => `<li>${inline(i, vars)}</li>`).join('')}</${list.t}>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trim(), ul = l.match(/^[-•*]\s+(.*)$/), ol = l.match(/^\d+[.)]\s+(.*)$/);
    if (!l) { flushP(); flushL(); continue; }
    if (ul || ol) { flushP(); const t = ul ? 'ul' : 'ol'; if (!list || list.t !== t) { flushL(); list = { t, items: [] }; } list.items.push((ul || ol)[1]); continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL(); return out.join('');
}
/** Ολόκληρος οδηγός σε HTML (χρησιμοποιείται στο πλαϊνό πάνελ της σελίδας συντήρησης). */
export function tutorialHtml(t, vars = {}) {
  let n = 0; const parts = [];
  if (t.intro) parts.push(`<div class="tut-intro">${renderText(t.intro, vars)}</div>`);
  for (const b of t.blocks || []) {
    const title = b.title ? esc(b.title) : '';
    if (b.kind === 'step') { n++; parts.push(`<h2>${n}. ${title}</h2>${renderText(b.text, vars)}`); }
    else if (b.kind === 'tip' || b.kind === 'warn') parts.push(`<div class="tut-call ${b.kind}"><strong>${b.kind === 'tip' ? '💡' : '⚠️'} ${title}</strong>${renderText(b.text, vars)}</div>`);
    else parts.push(`${title ? `<h2>${title}</h2>` : ''}${renderText(b.text, vars)}`);
  }
  if (t.outro) parts.push(renderText(t.outro, vars));
  return parts.join('');
}
export const tutorialVars = () => ({ sender: process.env.MAIL_FROM_EMAIL || 'το email του σχολείου' });

/** Οδηγοί που υπάρχουν από την αρχή (μπαίνουν μία φορά· μετά τους αλλάζεις ελεύθερα από τον πίνακα). */
export const DEFAULT_TUTORIALS = [
  {
    slug: 'email-help', icon: '📬', status: 'published', sort: 1, title: 'Δεν βλέπεις τα email μας;',
    subtitle: 'Ένας γρήγορος οδηγός για να φτάνουν τα μηνύματά μας στα Εισερχόμενα.',
    intro: 'Όταν ένας ιστότοπος δεν έχει ακόμα «φήμη» στο email, το email σου μερικές φορές βάζει τα μηνύματά του στον φάκελο **Ανεπιθύμητα (Spam / Junk)**. Δεν σημαίνει ότι κάτι χάλασε ή ότι το μήνυμα είναι επικίνδυνο. Απλώς το email σου δεν μας γνωρίζει ακόμα.',
    blocks: [
      { kind: 'step', title: 'Άνοιξε τον φάκελο «Ανεπιθύμητα»', text: 'Ψάξε το μήνυμα στον φάκελο ανεπιθύμητων του email σου:\n- **Gmail:** αριστερό μενού → «Περισσότερα» → «Spam»\n- **Outlook / Hotmail:** «Ανεπιθύμητη αλληλογραφία» (Junk Email)\n- **Yahoo:** «Spam»\n- **iCloud:** «Junk»' },
      { kind: 'step', title: 'Πάτα «Δεν είναι spam»', text: 'Πάτα **«Δεν είναι spam»** (Not spam / Not junk). Έτσι το email σου μαθαίνει ότι μας εμπιστεύεσαι και τα επόμενα μηνύματα θα έρχονται στα Εισερχόμενα.' },
      { kind: 'step', title: 'Πρόσθεσέ μας στις επαφές σου', text: 'Πρόσθεσε τη διεύθυνση {{sender}} στις επαφές σου. Είναι η διεύθυνση από την οποία σου στέλνουμε.' },
      { kind: 'tip', title: 'Gmail: δεν είναι στα ανεπιθύμητα, αλλά δεν το βρίσκεις;', text: 'Κοίταξε στις καρτέλες **Ενημερώσεις** ή **Προωθήσεις**. Σύρε το μήνυμα στην καρτέλα **Κύρια** και, αν ρωτήσει, διάλεξε «Ναι» για τα επόμενα μηνύματα.' },
      { kind: 'info', title: 'Στο κινητό', text: '- **Εφαρμογή Gmail:** πάτα ☰ → «Spam», άνοιξε το μήνυμα και πάτα «Αναφορά ότι δεν είναι spam».\n- **Εφαρμογή Mail (iPhone):** άνοιξε τα «Ανεπιθύμητα» και μετακίνησε το μήνυμα στα Εισερχόμενα.' },
      { kind: 'warn', title: 'Δεν βρίσκεις τίποτα;', text: '- Περίμενε 5 έως 10 λεπτά και ανανέωσε.\n- Έλεγξε ότι έγραψες σωστά το email σου.\n- Ζήτησε νέο μήνυμα, αλλά όχι πολλές φορές στη σειρά: υπάρχει όριο προσπαθειών.\n- Αν τίποτα δεν δουλεύει, επικοινώνησε μαζί μας από τη σελίδα «Επικοινωνία».' },
    ],
    outro: '',
  },
  {
    slug: 'kimolakis-3d', icon: '🎄', status: 'published', sort: 2, title: 'Πώς παίζω «Τα Χριστούγεννα του Κιμωλάκη»',
    subtitle: 'Η 3D περιπέτειά μας σε υπολογιστή, κινητό και VR — και πώς αποθηκεύεις την πρόοδό σου.',
    intro: 'Μια χριστουγεννιάτικη ιστορία 7 κεφαλαίων που παίζεται κατευθείαν στον browser, χωρίς εγκατάσταση. Μέσα στο παιχνίδι θα δεις κάρτες «ΧΕΙΡΙΣΜΟΣ» που σου δείχνουν τα πλήκτρα τη σωστή στιγμή.',
    blocks: [
      { kind: 'step', title: 'Ξεκίνα το παιχνίδι', text: 'Πήγαινε στα [Παιχνίδια](/play) και πάτα «Παίξε τώρα». Το παιχνίδι ανοίγει σε νέα καρτέλα.' },
      { kind: 'step', title: 'Συνδέσου για να αποθηκεύεται η πρόοδος', text: 'Αν είσαι [συνδεδεμένος](/account/login) με τον λογαριασμό μαθητή σου, η πρόοδος αποθηκεύεται αυτόματα σε κάθε κεφάλαιο. Όταν τελειώσεις παίρνεις το παράσημο 🎄 **Ήρωας των Χριστουγέννων** και **150 XP**.' },
      { kind: 'info', title: 'Στον υπολογιστή', text: '- **W A S D:** περπάτημα · **ποντίκι:** κοιτάς γύρω\n- **Shift:** τρέξιμο · **Space:** άλμα\n- **E:** αλληλεπίδραση και επόμενη φράση\n- **Κλικ:** ρίψη χιονόμπαλας · **V:** αλλαγή κάμερας · **Esc:** παύση' },
      { kind: 'info', title: 'Στο κινητό', text: 'Το παιχνίδι ανοίγει σε πλήρη οθόνη με κουμπιά πάνω στην οθόνη:\n- **Αριστερός μοχλός:** περπάτημα (μέχρι τέρμα για τρέξιμο)\n- **Σύρε δεξιά:** κοιτάς γύρω\n- **✋** αλληλεπίδραση · **⤒** άλμα · **❄** χιονόμπαλα' },
      { kind: 'info', title: 'Σε VR (π.χ. Meta Quest)', text: 'Άνοιξε το osaden.gr στον browser του κράνους και πάτα «Ναι, σε VR!».\n- **Αριστερός μοχλός:** περπάτημα (λαβή για τρέξιμο) · **δεξιός μοχλός:** στροφή\n- **Σκανδάλη:** ενέργεια / ρίψη · **B:** άλμα · **Y:** παύση' },
      { kind: 'warn', title: 'Όταν ο browser ρωτήσει για το VR', text: 'Πάτα **«Allow» / «Να επιτρέπεται»**, αλλιώς το VR δεν θα ξεκινήσει.' },
      { kind: 'tip', title: 'Το έπαιξες χωρίς να είσαι συνδεδεμένος;', text: 'Δεν χάνεται τίποτα! Θα δεις ένα παράθυρο «Αποθήκευση». Γράψε το email του λογαριασμού σου, συνδέσου, και η πρόοδος περνάει στον λογαριασμό σου.' },
    ],
    outro: '',
  },
  {
    slug: 'logariasmos-mathiti', icon: '🧑‍🎓', status: 'draft', sort: 3, title: 'Πώς φτιάχνω λογαριασμό μαθητή',
    subtitle: 'Κέρδισε XP, παράσημα και κράτα την πρόοδό σου στα παιχνίδια.',
    intro: 'Με τον λογαριασμό μαθητή κρατάς τους πόντους σου, τα παράσημα και την πρόοδο στα παιχνίδια, από όποια συσκευή κι αν παίζεις.',
    blocks: [
      { kind: 'step', title: 'Άνοιξε τη σελίδα εγγραφής', text: 'Πήγαινε στη [Δημιουργία λογαριασμού](/account/register).' },
      { kind: 'step', title: 'Συμπλήρωσε τα στοιχεία σου', text: 'Γράψε το email σου, ένα ψευδώνυμο και έναν κωδικό που θα θυμάσαι.' },
      { kind: 'step', title: 'Επιβεβαίωσε το email σου', text: 'Θα σου στείλουμε ένα μήνυμα από το {{sender}}. Άνοιξέ το και πάτα το κουμπί επιβεβαίωσης. Δεν το βρίσκεις; Δες τον οδηγό [Δεν βλέπεις τα email μας;](/help/email-help).' },
      { kind: 'tip', title: 'Ασφάλεια', text: 'Μην πεις σε κανέναν τον κωδικό σου και μη χρησιμοποιείς τον ίδιο κωδικό με άλλους λογαριασμούς σου.' },
    ],
    outro: '',
  },
];
