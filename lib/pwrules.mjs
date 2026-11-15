// Κανόνες κωδικού (χωρίς εξαρτήσεις Node — χρησιμοποιείται και στον browser).
export function passwordIssues(p, { username = '', email = '' } = {}) {
  const e = [];
  if (typeof p !== 'string' || p.length < 10) e.push('τουλάχιστον 10 χαρακτήρες');
  if (p?.length > 200) e.push('το πολύ 200 χαρακτήρες');
  if (!/[a-zα-ωά-ώ]/i.test(p || '') || !/\d/.test(p || '')) e.push('γράμματα και αριθμούς');
  const low = String(p || '').toLowerCase();
  if ((username && username.length >= 3 && low.includes(username.toLowerCase())) || (email && low.includes(String(email).split('@')[0].toLowerCase()))) e.push('να μην περιέχει το όνομα χρήστη ή το email');
  return e;
}
