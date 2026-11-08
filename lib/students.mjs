import { normalizeGreek } from './games.mjs';
const BLOCK = ['FUCK', 'SHIT', 'BITCH', 'NIGG', 'MALAK', 'ΜΑΛΑΚ', 'ΠΟΥΤ', 'ΠΟΥΣΤ', 'ΑΡΧΙΔ', 'ΓΑΜΩ', 'ΓΑΜΗ', 'ΓΑΜΙ', 'ΣΚΑΤ', 'NAZI', 'ΝΑΖΙ'];
export const validEmail = (e) => /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/.test(e) && e.length <= 200;
export const passwordOk = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 200;
/** Ψευδώνυμο: 3–20 χαρακτήρες (γράμματα, αριθμοί, κενό, _ . -), χωρίς προσωπικά στοιχεία/βρισιές. */
export function cleanNickname(v) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (!/^[\p{L}\p{N}_ .\-]{3,20}$/u.test(s)) return { error: 'Το όνομα χρήστη πρέπει να έχει 3–20 χαρακτήρες (γράμματα, αριθμούς, κενό, _ . -).' };
  if (/\d{6,}/.test(s)) return { error: 'Μην βάζεις τηλέφωνο ή προσωπικά στοιχεία στο όνομα χρήστη.' };
  const n = normalizeGreek(s).replace(/[^A-ZΑ-Ω]/g, '');
  if (BLOCK.some((b) => n.includes(b))) return { error: 'Αυτό το όνομα δεν επιτρέπεται. Διάλεξε ένα φιλικό όνομα!' };
  return { value: s };
}
export const domainAllowed = (email, list) => {
  const allowed = String(list || '').split(',').map((x) => x.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
  return !allowed.length || allowed.some((d) => email.toLowerCase().endsWith('@' + d) || email.toLowerCase().endsWith('.' + d));
};

/** Σύντομη περιγραφή συσκευής από το User-Agent (π.χ. «Chrome σε Windows»). */
export function deviceLabel(ua) {
  const u = String(ua || '');
  const br = /Edg\//.test(u) ? 'Edge' : /OPR\/|Opera/.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Browser';
  const os = /Windows/.test(u) ? 'Windows' : /Android/.test(u) ? 'Android' : /iPhone|iPad|iOS/.test(u) ? 'iOS' : /Mac OS X|Macintosh/.test(u) ? 'macOS' : /Linux/.test(u) ? 'Linux' : 'άγνωστο σύστημα';
  return `${br} σε ${os}`;
}
