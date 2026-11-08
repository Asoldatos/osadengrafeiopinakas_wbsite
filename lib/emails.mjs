const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const INK = '#1D2A26', BOARD = '#2C5E4A', PAPER = '#F3EAD3', YELLOW = '#FFC21F';
const FONT = "'Trebuchet MS','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const STRIPE = ['#00C8E0', '#E5231B', '#FFC21F', '#9B2CFF', '#1FA0FF'];

/** Κοινό «φαντεζί» περίβλημα email (πίνακας, χρωματιστή λωρίδα, Κιμωλάκης με φυσαλίδα, κουμπί). Πίνακες + inline CSS για συμβατότητα με όλους τους πελάτες email. */
function layout({ base, siteName, preheader, title, intro, bubble, button, outro, small, tag = 'ΠΙΝΑΚΑΣ ΔΙΑΧΕΙΡΙΣΗΣ', mood = 'wave', rawBody, footerExtra }) {
  const btn = button ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 8px;"><tr><td align="center" bgcolor="${YELLOW}" style="background:${YELLOW};border:3px solid ${INK};border-radius:14px;box-shadow:0 5px 0 ${INK};">
      <a href="${esc(button.href)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:18px;font-weight:800;color:${INK};text-decoration:none;">${esc(button.label)}</a></td></tr></table>` : '';
  return `<!doctype html>
<html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};"><tr><td align="center" style="padding:30px 12px 40px;">
 <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
  <tr><td align="center" bgcolor="${BOARD}" style="background:${BOARD};border:3px solid ${INK};border-bottom:0;border-radius:20px 20px 0 0;padding:30px 20px 22px;">
    <img src="${esc(base)}/brand/logo_text.png" width="270" alt="${esc(siteName)}" style="display:block;width:270px;max-width:80%;height:auto;border:0;">
    <div style="font-family:${FONT};font-size:13px;letter-spacing:2px;color:#CFE6DB;margin-top:12px;">✏️ &nbsp;${esc(tag)}&nbsp; ✏️</div></td></tr>
  <tr><td style="border-left:3px solid ${INK};border-right:3px solid ${INK};padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${STRIPE.map((c) => `<td height="9" style="background:${c};font-size:0;line-height:0;">&nbsp;</td>`).join('')}</tr></table></td></tr>
  <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:3px solid ${INK};border-top:0;border-radius:0 0 20px 20px;padding:36px 34px 30px;font-family:${FONT};color:${INK};">
    ${rawBody ? rawBody : `<h1 style="margin:0 0 14px;font-family:${FONT};font-size:28px;line-height:1.2;color:${INK};">${title}</h1>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.65;">${intro}</p>`}
    ${bubble ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr>
      <td width="120" valign="bottom" style="padding-right:6px;"><img src="${esc(base)}/brand/mascot/${esc(mood)}.png" width="110" alt="Ο Κιμωλάκης, ο μασκότ μας" style="display:block;width:110px;height:auto;border:0;"></td>
      <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#FFF7D6;border:3px solid ${INK};border-radius:18px;padding:14px 18px;font-family:${FONT};font-size:16px;line-height:1.5;font-weight:700;color:${INK};">${bubble}</td></tr></table></td></tr></table>` : ''}
    ${btn}
    ${outro ? `<p style="margin:22px 0 0;font-size:15px;line-height:1.65;color:#4a5753;">${outro}</p>` : ''}
    ${small ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-top:2px dashed #cfc7b1;padding-top:16px;font-size:13px;line-height:1.6;color:#6b7773;">${small}</td></tr></table>` : ''}
  </td></tr>
  <tr><td align="center" style="padding:20px 10px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#7a7360;">Στάλθηκε από το «${esc(siteName)}» · Αυτό είναι αυτόματο μήνυμα, μην απαντήσεις σε αυτό.<br>${footerExtra ? `<br>${footerExtra}` : ''}<br>Κιμωλάκης, εν υπηρεσία, από κιμωλία (και αγάπη) ✏️</td></tr>
 </table></td></tr></table></body></html>`;
}

export function resetEmail({ name, link, siteName, base, hours = 1 }) {
  const hello = name ? `Γεια σου ${esc(name)}!` : 'Γεια σου!';
  return {
    subject: `Επαναφορά κωδικού πρόσβασης · ${siteName}`,
    html: layout({
      base, siteName, preheader: 'Πάτα το κουμπί για να ορίσεις νέο κωδικό. Ο σύνδεσμος ισχύει για 1 ώρα.', title: hello,
      intro: 'Λάβαμε αίτημα για <b>επαναφορά του κωδικού πρόσβασης</b> στον πίνακα διαχείρισης της εφημερίδας. Πάτα το κουμπί και διάλεξε έναν νέο κωδικό.',
      bubble: 'Μην ανησυχείς, συμβαίνει στους καλύτερους! Ακόμα και οι κιμωλίες ξεχνούν πού άφησαν τα πράγματά τους. 😄',
      button: { href: link, label: 'Επαναφορά κωδικού' },
      outro: `⏰ Ο σύνδεσμος ισχύει για <b>${hours} ${hours === 1 ? 'ώρα' : 'ώρες'}</b> και μπορεί να χρησιμοποιηθεί <b>μόνο μία φορά</b>.`,
      small: `Αν δεν ζήτησες εσύ την αλλαγή, αγνόησε αυτό το μήνυμα, ο κωδικός σου δεν θα αλλάξει. Αν το κουμπί δεν δουλεύει, αντίγραψε αυτή τη διεύθυνση στον browser σου:<br><a href="${esc(link)}" style="color:#1FA0FF;word-break:break-all;">${esc(link)}</a>`,
    }),
    text: `${name ? `Γεια σου ${name}!` : 'Γεια σου!'}\n\nΛάβαμε αίτημα για επαναφορά του κωδικού πρόσβασης στον πίνακα διαχείρισης του «${siteName}».\n\nΓια να ορίσεις νέο κωδικό άνοιξε αυτή τη διεύθυνση (ισχύει ${hours} ώρα και μία φορά μόνο):\n${link}\n\nΑν δεν το ζήτησες εσύ, αγνόησε αυτό το μήνυμα, ο κωδικός σου δεν θα αλλάξει.\n\n— Κιμωλάκης`,
  };
}

export function passwordChangedEmail({ name, siteName, base }) {
  const when = new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'long', timeStyle: 'short' });
  return {
    subject: `Ο κωδικός σου άλλαξε · ${siteName}`,
    html: layout({
      base, siteName, preheader: 'Ο κωδικός πρόσβασης του λογαριασμού σου άλλαξε μόλις τώρα.', title: name ? `Έτοιμο, ${esc(name)}! 🎉` : 'Έτοιμο! 🎉',
      intro: `Ο κωδικός πρόσβασης του λογαριασμού σου στον πίνακα διαχείρισης άλλαξε επιτυχώς (${esc(when)}). Για ασφάλεια, αποσυνδέθηκες από όλες τις συσκευές.`,
      bubble: 'Μπράβο! Νέος κωδικός, νέα αρχή. Μην τον γράψεις στον πίνακα της τάξης, εντάξει;',
      button: { href: `${base}/editor-panel/login`, label: 'Σύνδεση στον πίνακα' },
      small: '<b>Δεν το έκανες εσύ;</b> Επικοινώνησε αμέσως με τον διαχειριστή του ιστοτόπου και ζήτησε νέα επαναφορά κωδικού.',
    }),
    text: `${name ? `Έτοιμο, ${name}!` : 'Έτοιμο!'}\n\nΟ κωδικός πρόσβασης του λογαριασμού σου στο «${siteName}» άλλαξε (${when}). Αποσυνδέθηκες από όλες τις συσκευές.\n\nΔεν το έκανες εσύ; Επικοινώνησε αμέσως με τον διαχειριστή.\n\n— Κιμωλάκης`,
  };
}

export function studentVerifyEmail({ nickname, link, siteName, base }) {
  return {
    subject: `Επιβεβαίωσε το email σου · ${siteName}`,
    html: layout({
      base, siteName, tag: 'ΛΟΓΑΡΙΑΣΜΟΣ ΜΑΘΗΤΗ', preheader: 'Ένα κλικ ακόμα και ο λογαριασμός σου είναι έτοιμος!', title: `Καλώς ήρθες, ${esc(nickname)}! 🎉`,
      intro: 'Ευχαριστούμε που έφτιαξες λογαριασμό! Πάτα το κουμπί για να <b>επιβεβαιώσεις το email σου</b> και να ξεκλειδώσεις παιχνίδια, περιπέτειες με τον Κιμωλάκη, πόντους και παράσημα.',
      bubble: 'Γεια σου, φίλε! Είμαι ο Κιμωλάκης και σε περιμένω με ένα σωρό παιχνίδια. Έλα να παίξουμε! 🖍️',
      button: { href: link, label: 'Επιβεβαίωση email' },
      outro: '⏰ Ο σύνδεσμος ισχύει για <b>24 ώρες</b>.',
      small: `Δεν έφτιαξες εσύ λογαριασμό; Αγνόησε αυτό το μήνυμα και δεν θα γίνει τίποτα. Αν το κουμπί δεν δουλεύει, αντίγραψε αυτή τη διεύθυνση στον browser σου:<br><a href="${esc(link)}" style="color:#1FA0FF;word-break:break-all;">${esc(link)}</a>`,
    }),
    text: `Καλώς ήρθες, ${nickname}!\n\nΓια να επιβεβαιώσεις το email σου και να ξεκινήσεις να παίζεις, άνοιξε αυτή τη διεύθυνση (ισχύει 24 ώρες):\n${link}\n\nΔεν έφτιαξες εσύ λογαριασμό; Αγνόησε αυτό το μήνυμα.\n\n— Κιμωλάκης`,
  };
}
export function studentResetEmail({ nickname, link, siteName, base }) {
  return {
    subject: `Επαναφορά κωδικού · ${siteName}`,
    html: layout({
      base, siteName, tag: 'ΛΟΓΑΡΙΑΣΜΟΣ ΜΑΘΗΤΗ', preheader: 'Πάτα το κουμπί για να βάλεις νέο κωδικό. Ισχύει για 1 ώρα.', title: `Γεια σου ${esc(nickname)}!`,
      intro: 'Ζήτησες <b>επαναφορά κωδικού</b> για τον λογαριασμό σου. Πάτα το κουμπί και διάλεξε νέο κωδικό.',
      bubble: 'Συμβαίνει στους καλύτερους! Οι πόντοι και τα παράσημά σου σε περιμένουν ασφαλή. 😄',
      button: { href: link, label: 'Νέος κωδικός' },
      outro: '⏰ Ο σύνδεσμος ισχύει για <b>1 ώρα</b> και χρησιμοποιείται <b>μία φορά</b>.',
      small: `Δεν το ζήτησες εσύ; Αγνόησε αυτό το μήνυμα, ο κωδικός σου δεν θα αλλάξει.<br><a href="${esc(link)}" style="color:#1FA0FF;word-break:break-all;">${esc(link)}</a>`,
    }),
    text: `Γεια σου ${nickname}!\n\nΓια να βάλεις νέο κωδικό άνοιξε αυτή τη διεύθυνση (ισχύει 1 ώρα, μία φορά):\n${link}\n\nΔεν το ζήτησες εσύ; Αγνόησε αυτό το μήνυμα.\n\n— Κιμωλάκης`,
  };
}

const VIDEO = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i;
const abs = (u, base) => (String(u || '').startsWith('/') ? base + u : u);
export const plainText = (html) => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h\d|li|blockquote|div)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
/** Προσθέτει inline στυλ στο (ήδη καθαρισμένο) HTML ώστε να φαίνεται σωστά σε όλους τους πελάτες email. */
export function styleEmailHtml(h) {
  return String(h || '')
    .replace(/<p>/g, '<p style="margin:0 0 14px;font-size:17px;line-height:1.65;">')
    .replace(/<h2>/g, `<h2 style="margin:26px 0 10px;font-family:${FONT};font-size:23px;line-height:1.25;color:${INK};">`)
    .replace(/<h3>/g, `<h3 style="margin:20px 0 8px;font-family:${FONT};font-size:19px;line-height:1.3;color:${INK};">`)
    .replace(/<h4>/g, `<h4 style="margin:16px 0 6px;font-family:${FONT};font-size:17px;color:${INK};">`)
    .replace(/<ul>/g, '<ul style="margin:0 0 14px;padding-left:22px;font-size:17px;line-height:1.65;">')
    .replace(/<ol>/g, '<ol style="margin:0 0 14px;padding-left:22px;font-size:17px;line-height:1.65;">')
    .replace(/<blockquote>/g, '<blockquote style="margin:16px 0;padding:10px 18px;border-left:5px solid #E5231B;background:#F3EAD3;border-radius:0 10px 10px 0;font-size:18px;">')
    .replace(/<a /g, '<a style="color:#1FA0FF;font-weight:700;" ')
    .replace(/<img /g, `<img style="max-width:100%;height:auto;border:2px solid ${INK};border-radius:10px;" `)
    .replace(/<hr\s*\/?>/g, `<hr style="border:0;border-top:3px dotted ${INK};margin:22px 0;">`);
}
const mask = (ip) => String(ip || '').replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.•••.•••').replace(/([0-9a-f]{1,4}:[0-9a-f]{1,4}):.*/i, '$1:••••');

/** Κωδικός μίας χρήσης (OTP): purpose = 'login' (νέα συσκευή) ή 'download' (λήψη/εκτύπωση εγγράφου). */
export function otpEmail({ nickname, code, purpose, minutes, siteName, base, bubble }) {
  const dl = purpose === 'download';
  const box = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 4px;"><tr><td align="center" style="background:#FFF7D6;border:3px dashed ${INK};border-radius:14px;padding:14px 30px;font-family:'Courier New',monospace;font-size:38px;font-weight:800;letter-spacing:10px;color:${INK};">${esc(code)}</td></tr></table>`;
  return {
    subject: `${code} · ${dl ? 'Κωδικός για λήψη εγγράφου' : 'Κωδικός σύνδεσης'} · ${siteName}`,
    html: layout({
      base, siteName, tag: 'ΕΠΙΒΕΒΑΙΩΣΗ ΑΣΦΑΛΕΙΑΣ', mood: 'phone', preheader: `Ο κωδικός σου είναι ${code}. Ισχύει για ${minutes} λεπτά.`, title: `Γεια σου ${esc(nickname)}!`,
      intro: dl ? 'Για να <b>κατεβάσεις ή να εκτυπώσεις</b> το έγγραφο, γράψε αυτόν τον κωδικό στον ιστότοπο:' : 'Κάποιος (ελπίζουμε εσύ!) προσπαθεί να συνδεθεί στον λογαριασμό σου από <b>νέα συσκευή</b>. Γράψε αυτόν τον κωδικό για να ολοκληρωθεί η σύνδεση:',
      bubble: esc(bubble || (dl ? 'Έτσι κρατάμε τα ρομπότ μακριά από τα τεύχη μας!' : 'Μια νέα συσκευή; Πρέπει να σιγουρευτούμε ότι είσαι εσύ!')),
      outro: `${box}<br>⏰ Ο κωδικός ισχύει για <b>${minutes} λεπτά</b> και μπορεί να χρησιμοποιηθεί <b>μία φορά</b>. Μην τον πεις σε κανέναν.`,
      small: dl ? 'Δεν ζήτησες εσύ αυτόν τον κωδικό; Αγνόησέ τον. Αν το ξαναδείς συχνά, άλλαξε τον κωδικό πρόσβασής σου.' : `<b>Δεν προσπαθείς εσύ να συνδεθείς;</b> Μην δώσεις τον κωδικό σε κανέναν και <a href="${esc(base)}/account/forgot" style="color:#1FA0FF;">άλλαξε τον κωδικό σου αμέσως</a>.`,
    }),
    text: `Γεια σου ${nickname}!\n\n${dl ? 'Κωδικός για λήψη/εκτύπωση εγγράφου' : 'Κωδικός σύνδεσης από νέα συσκευή'}: ${code}\nΙσχύει για ${minutes} λεπτά και χρησιμοποιείται μία φορά. Μην τον πεις σε κανέναν.\n\nΔεν τον ζήτησες εσύ; Αγνόησέ τον.\n\n— Κιμωλάκης`,
  };
}
/** Ειδοποίηση για πολλές αποτυχημένες προσπάθειες σύνδεσης. */
export function loginAlertEmail({ nickname, count, ip, siteName, base, resetUrl, minutes = 15 }) {
  const when = new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'long', timeStyle: 'short' });
  return {
    subject: `Ύποπτη προσπάθεια σύνδεσης στον λογαριασμό σου · ${siteName}`,
    html: layout({
      base, siteName, tag: 'ΕΙΔΟΠΟΙΗΣΗ ΑΣΦΑΛΕΙΑΣ', mood: 'oops', preheader: `${count} αποτυχημένες προσπάθειες σύνδεσης στον λογαριασμό σου.`, title: `Προσοχή, ${esc(nickname)}!`,
      intro: `Εντοπίσαμε <b>${count} αποτυχημένες προσπάθειες σύνδεσης</b> στον λογαριασμό σου (${esc(when)}, από διεύθυνση IP ${esc(mask(ip))}).<br><br>Για προστασία, οι προσπάθειες από αυτή τη σύνδεση <b>περιορίζονται προσωρινά για ${minutes} λεπτά</b> όταν ξεπεραστεί το όριο.`,
      bubble: 'Αν ήσουν εσύ που ξέχασες τον κωδικό, κανένα πρόβλημα! Αν όχι, άλλαξέ τον τώρα.',
      button: { href: resetUrl, label: 'Αλλαγή κωδικού' },
      small: 'Αν ήσουν εσύ, μπορείς να αγνοήσεις αυτό το μήνυμα. Δεν ζητάμε ποτέ τον κωδικό σου με email.',
    }),
    text: `Προσοχή, ${nickname}!\n\nΕντοπίσαμε ${count} αποτυχημένες προσπάθειες σύνδεσης στον λογαριασμό σου (${when}, IP ${mask(ip)}). Οι προσπάθειες από αυτή τη σύνδεση περιορίζονται προσωρινά για ${minutes} λεπτά όταν ξεπεραστεί το όριο.\n\nΑν δεν ήσουν εσύ, άλλαξε τον κωδικό σου: ${resetUrl}\n\n— Κιμωλάκης`,
  };
}
export function studentPasswordChangedEmail({ nickname, siteName, base }) {
  const when = new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens', dateStyle: 'long', timeStyle: 'short' });
  return {
    subject: `Ο κωδικός σου άλλαξε · ${siteName}`,
    html: layout({
      base, siteName, tag: 'ΛΟΓΑΡΙΑΣΜΟΣ ΜΑΘΗΤΗ', mood: 'celebrate', preheader: 'Ο κωδικός του λογαριασμού σου άλλαξε μόλις τώρα.', title: `Έτοιμο, ${esc(nickname)}! 🎉`,
      intro: `Ο κωδικός του λογαριασμού σου άλλαξε επιτυχώς (${esc(when)}). Για ασφάλεια αποσυνδέθηκες από όλες τις συσκευές και θα χρειαστεί να επιβεβαιώσεις ξανά τις συσκευές σου.`,
      bubble: 'Νέος κωδικός, νέα αρχή! Οι πόντοι και τα παράσημά σου είναι ασφαλή.',
      button: { href: `${base}/account/login`, label: 'Σύνδεση' },
      small: '<b>Δεν το έκανες εσύ;</b> Ζήτησε αμέσως νέα επαναφορά κωδικού και επικοινώνησε μαζί μας.',
    }),
    text: `Έτοιμο, ${nickname}!\n\nΟ κωδικός του λογαριασμού σου άλλαξε (${when}). Αποσυνδέθηκες από όλες τις συσκευές.\n\nΔεν το έκανες εσύ; Ζήτησε αμέσως νέα επαναφορά κωδικού.\n\n— Κιμωλάκης`,
  };
}
export function newsletterConfirmEmail({ link, siteName, base, bubble }) {
  return {
    subject: `Επιβεβαίωσε την εγγραφή σου στο ενημερωτικό δελτίο · ${siteName}`,
    html: layout({
      base, siteName, tag: 'ΕΝΗΜΕΡΩΤΙΚΟ ΔΕΛΤΙΟ', mood: 'reading', preheader: 'Ένα κλικ ακόμα και είσαι μέσα!', title: 'Σχεδόν έτοιμο! 💌',
      intro: 'Ζήτησες να λαμβάνεις το <b>ενημερωτικό δελτίο</b> της εφημερίδας μας. Πάτα το κουμπί για να επιβεβαιώσεις το email σου.',
      bubble: esc(bubble || 'Πάτα το κουμπί για να επιβεβαιώσεις ότι είσαι εσύ!'),
      button: { href: link, label: 'Επιβεβαίωση εγγραφής' },
      outro: '⏰ Ο σύνδεσμος ισχύει για <b>48 ώρες</b>.',
      small: `Δεν ζήτησες εσύ την εγγραφή; Αγνόησε αυτό το μήνυμα και δεν θα λάβεις τίποτα. Αν το κουμπί δεν δουλεύει, αντίγραψε αυτή τη διεύθυνση στον browser σου:<br><a href="${esc(link)}" style="color:#1FA0FF;word-break:break-all;">${esc(link)}</a>`,
    }),
    text: `Σχεδόν έτοιμο!\n\nΓια να επιβεβαιώσεις την εγγραφή σου στο ενημερωτικό δελτίο του «${siteName}», άνοιξε αυτή τη διεύθυνση (ισχύει 48 ώρες):\n${link}\n\nΔεν ζήτησες εσύ την εγγραφή; Αγνόησε αυτό το μήνυμα.\n\n— Κιμωλάκης`,
  };
}
export function newsletterWelcomeEmail({ siteName, base, unsubUrl, bubble }) {
  return {
    subject: `Καλώς ήρθες στο ενημερωτικό δελτίο! · ${siteName}`,
    html: layout({
      base, siteName, tag: 'ΕΝΗΜΕΡΩΤΙΚΟ ΔΕΛΤΙΟ', mood: 'celebrate', preheader: 'Η εγγραφή σου ολοκληρώθηκε.', title: 'Καλώς ήρθες! 🎉',
      intro: 'Η εγγραφή σου στο ενημερωτικό δελτίο ολοκληρώθηκε. Θα σου στέλνουμε νέα τεύχη, άρθρα και ανακοινώσεις, χωρίς spam.',
      bubble: esc(bubble || 'Ευχαριστώ που γράφτηκες!'), button: { href: base, label: 'Επισκέψου την εφημερίδα' },
      footerExtra: `Δεν θες άλλο να λαμβάνεις μηνύματα; <a href="${esc(unsubUrl)}" style="color:#7a7360;">Διαγραφή από τη λίστα</a>`,
    }),
    text: `Καλώς ήρθες! Η εγγραφή σου στο ενημερωτικό δελτίο του «${siteName}» ολοκληρώθηκε.\n\nΔιαγραφή από τη λίστα: ${unsubUrl}\n\n— Κιμωλάκης`,
  };
}
/** Ένα τεύχος ενημερωτικού δελτίου: κείμενο του διαχειριστή, Κιμωλάκης με δική του φράση, κουμπί, τελευταία άρθρα, σύνδεσμος διαγραφής. */
export function newsletterEmail({ campaign: c, articles = [], siteName, base, unsubUrl, name }) {
  const hello = name ? `Γεια σου ${esc(name)}!` : 'Γεια σου!';
  const arts = articles.length ? `<h2 style="margin:28px 0 12px;font-family:${FONT};font-size:21px;color:${INK};">📰 Τελευταία άρθρα</h2>${articles.map((a) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:2px solid ${INK};border-radius:12px;"><tr>
      ${a.cover_url && !VIDEO.test(a.cover_url) ? `<td width="120" valign="top" style="padding:10px 0 10px 10px;"><a href="${esc(base)}/articles/${esc(a.slug)}"><img src="${esc(abs(a.cover_url, base))}" width="110" alt="" style="display:block;width:110px;height:auto;border-radius:8px;border:2px solid ${INK};"></a></td>` : ''}
      <td valign="top" style="padding:10px 14px;font-family:${FONT};"><a href="${esc(base)}/articles/${esc(a.slug)}" style="color:${INK};font-weight:800;font-size:17px;text-decoration:none;">${esc(a.title)}</a>${a.subtitle ? `<div style="font-size:14px;color:#4a5753;margin-top:4px;">${esc(a.subtitle)}</div>` : ''}</td></tr></table>`).join('')}` : '';
  const body = `<p style="margin:0 0 6px;font-size:14px;color:#6b7773;font-family:${FONT};">${hello}</p>
    <h1 style="margin:0 0 16px;font-family:${FONT};font-size:28px;line-height:1.2;color:${INK};">${esc(c.subject)}</h1>
    ${styleEmailHtml(c.body_html)}${arts}`;
  const html = layout({
    base, siteName, tag: 'ΕΝΗΜΕΡΩΤΙΚΟ ΔΕΛΤΙΟ', mood: c.mascot_mood || 'wave', preheader: c.preheader || c.subject, rawBody: body,
    bubble: c.mascot_text ? esc(c.mascot_text) : '', button: c.cta_label && /^https?:\/\//.test(c.cta_url || '') ? { href: c.cta_url, label: c.cta_label } : undefined,
    footerExtra: `Λαμβάνεις αυτό το μήνυμα επειδή εγγράφηκες στο ενημερωτικό δελτίο.<br><a href="${esc(unsubUrl)}" style="color:#7a7360;">Διαγραφή από τη λίστα</a>`,
  });
  const text = `${c.subject}\n\n${plainText(c.body_html)}\n${c.mascot_text ? `\nΚιμωλάκης: «${c.mascot_text}»\n` : ''}${articles.length ? `\nΤελευταία άρθρα:\n${articles.map((a) => `- ${a.title}: ${base}/articles/${a.slug}`).join('\n')}\n` : ''}${c.cta_label && c.cta_url ? `\n${c.cta_label}: ${c.cta_url}\n` : ''}\nΔιαγραφή από τη λίστα: ${unsubUrl}`;
  return { subject: c.subject, html, text };
}
