import crypto from 'node:crypto';
function key() {
  const k = process.env.ENCRYPTION_KEY || '';
  if (k.length < 32) throw new Error('Λείπει το ENCRYPTION_KEY (≥ 32 χαρακτήρες).');
  return crypto.createHash('sha256').update('theme-activation:' + k).digest();
}
const mac = (body) => crypto.createHmac('sha256', key()).update(body).digest();
/** Υπογεγραμμένο (HMAC-SHA256) token: δεν μπορεί να πλαστογραφηθεί ή να αλλαχτεί. kind: 'a' = σύνδεσμος newsletter, 'i' = εισαγωγή (cookie μετά την ανακατεύθυνση). */
export function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + mac(body).toString('base64url');
}
export function verifyToken(token, kind, now = Date.now()) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const got = Buffer.from(sig, 'base64url'), exp = mac(body);
    if (got.length !== exp.length || !crypto.timingSafeEqual(got, exp)) return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (p.k !== kind || !p.e || now > p.e || !p.t) return null;
    return p;
  } catch { return null; }
}
export const signActivation = ({ theme, campaign, subscriber, exp }) => signToken({ k: 'a', t: theme, c: campaign, s: subscriber, e: exp });
export function verifyActivation(token, now) { const p = verifyToken(token, 'a', now); return p && { theme: String(p.t), campaign: +p.c || 0, subscriber: +p.s || 0 }; }
export const signIntro = (theme, ttlMs = 15 * 60 * 1000) => signToken({ k: 'i', t: theme, e: Date.now() + ttlMs });
export function verifyIntro(token, now) { const p = verifyToken(token, 'i', now); return p ? String(p.t) : null; }
