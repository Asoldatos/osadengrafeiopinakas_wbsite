import crypto from 'node:crypto';
const SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?'];
/** Ισχυρός τυχαίος κωδικός (χωρίς διφορούμενους χαρακτήρες όπως O/0, l/1), με κρυπτογραφικά ασφαλή τυχαιότητα. */
export function generatePassword(len = 16) {
  const all = SETS.join(''), out = SETS.map((s) => s[crypto.randomInt(s.length)]);
  while (out.length < len) out.push(all[crypto.randomInt(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}
export { passwordIssues } from './pwrules.mjs';
