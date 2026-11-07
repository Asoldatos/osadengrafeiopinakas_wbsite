const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const INK = '#1D2A26', BOARD = '#2C5E4A', PAPER = '#F3EAD3', YELLOW = '#FFC21F';
const FONT = "'Trebuchet MS','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const STRIPE = ['#00C8E0', '#E5231B', '#FFC21F', '#9B2CFF', '#1FA0FF'];

/** Κοινό «φαντεζί» περίβλημα email (πίνακας, χρωματιστή λωρίδα, Κιμωλάκης με φυσαλίδα, κουμπί). Πίνακες + inline CSS για συμβατότητα με όλους τους πελάτες email. */
function layout({ base, siteName, preheader, title, intro, bubble, button, outro, small, tag = 'ΠΙΝΑΚΑΣ ΔΙΑΧΕΙΡΙΣΗΣ' }) {
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
    <h1 style="margin:0 0 14px;font-family:${FONT};font-size:28px;line-height:1.2;color:${INK};">${title}</h1>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.65;">${intro}</p>
    ${bubble ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr>
      <td width="120" valign="bottom" style="padding-right:6px;"><img src="${esc(base)}/brand/kimolakis-email.png" width="110" alt="Ο Κιμωλάκης, ο μασκότ μας" style="display:block;width:110px;height:auto;border:0;"></td>
      <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#FFF7D6;border:3px solid ${INK};border-radius:18px;padding:14px 18px;font-family:${FONT};font-size:16px;line-height:1.5;font-weight:700;color:${INK};">${bubble}</td></tr></table></td></tr></table>` : ''}
    ${btn}
    ${outro ? `<p style="margin:22px 0 0;font-size:15px;line-height:1.65;color:#4a5753;">${outro}</p>` : ''}
    ${small ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-top:2px dashed #cfc7b1;padding-top:16px;font-size:13px;line-height:1.6;color:#6b7773;">${small}</td></tr></table>` : ''}
  </td></tr>
  <tr><td align="center" style="padding:20px 10px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#7a7360;">Στάλθηκε από το «${esc(siteName)}» · Αυτό είναι αυτόματο μήνυμα, μην απαντήσεις σε αυτό.<br>Κιμωλάκης, εν υπηρεσία, από κιμωλία (και αγάπη) ✏️</td></tr>
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
