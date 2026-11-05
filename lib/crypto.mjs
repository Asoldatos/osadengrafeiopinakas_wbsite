import crypto from 'node:crypto';

/* ---------- Κωδικοί πρόσβασης (scrypt) ---------- */
const SC = { N: 16384, r: 8, p: 1 };
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, SC);
  return `scrypt$${salt.toString('base64')}$${h.toString('base64')}`;
}
export function verifyPassword(pw, stored) {
  try {
    const [alg, s, h] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const hb = Buffer.from(h, 'base64');
    const d = crypto.scryptSync(pw, Buffer.from(s, 'base64'), hb.length, SC);
    return crypto.timingSafeEqual(hb, d);
  } catch { return false; }
}
export const DUMMY_HASH = hashPassword('dummy-password-for-timing');

/* ---------- Κρυπτογράφηση μυστικών (AES-256-GCM) ---------- */
function key() {
  const k = process.env.ENCRYPTION_KEY || '';
  if (k.length < 32) throw new Error('Λείπει το ENCRYPTION_KEY (≥ 32 χαρακτήρες).');
  return crypto.createHash('sha256').update(k).digest();
}
export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join(':');
}
export function decrypt(blob) {
  const [iv, tag, ct] = blob.split(':').map((x) => Buffer.from(x, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (n = 32) => crypto.randomBytes(n).toString('hex');

/* ---------- TOTP (RFC 6238 / RFC 4226, SHA-1, 30s, 6 ψηφία) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
export function base32decode(str) {
  let bits = 0, val = 0; const out = [];
  for (const ch of str.replace(/=+$/, '').toUpperCase()) {
    const i = B32.indexOf(ch); if (i < 0) continue;
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export const newTotpSecret = () => base32(crypto.randomBytes(20));
export function totpAt(secretB32, step, digits = 6) {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', base32decode(secretB32)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, '0');
}
/** Επιστρέφει το step που ταίριαξε (για αποτροπή επανάληψης) ή null. */
export function verifyTotp(secretB32, code, lastStep = 0, now = Date.now()) {
  code = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return null;
  const cur = Math.floor(now / 30000);
  for (const w of [0, -1, 1]) {
    const step = cur + w;
    if (step <= lastStep) continue;
    const exp = Buffer.from(totpAt(secretB32, step));
    if (crypto.timingSafeEqual(exp, Buffer.from(code))) return step;
  }
  return null;
}
export const otpauthUri = (email, secret, issuer) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

export function makeRecoveryCodes(n = 10) {
  return Array.from({ length: n }, () => {
    const h = crypto.randomBytes(5).toString('hex');
    return `${h.slice(0, 5)}-${h.slice(5)}`;
  });
}
export const normRecovery = (c) => String(c || '').trim().toLowerCase().replace(/[^a-f0-9]/g, '');
export const hashRecovery = (c) => sha256('rc:' + normRecovery(c));
