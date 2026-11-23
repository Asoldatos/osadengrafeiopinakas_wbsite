'use client';
// Κρυπτογράφηση άκρο-σε-άκρο για τα DM (WebCrypto).
// Κάθε συσκευή έχει δικό της ζεύγος κλειδιών ECDH P-256. Το ΙΔΙΩΤΙΚΟ κλειδί δημιουργείται «μη εξαγώγιμο» και μένει στο IndexedDB της συσκευής:
// ούτε ο διακομιστής ούτε κανένας άλλος μπορεί να το διαβάσει. Για κάθε μήνυμα: τυχαίο κλειδί AES-256-GCM, το οποίο «τυλίγεται» χωριστά
// για κάθε συσκευή του παραλήπτη και του αποστολέα (κλειδί από ECDH). Ο διακομιστής αποθηκεύει μόνο κρυπτογραφημένα δεδομένα.
import { api } from './clientUpload';

const S = typeof window !== 'undefined' ? window.crypto.subtle : null;
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const enc = new TextEncoder(), dec = new TextDecoder();

function idb() {
  return new Promise((res, rej) => { const r = indexedDB.open('osaden-e2e', 1); r.onupgradeneeded = () => r.result.createObjectStore('keys'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function idbGet(k) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('keys').objectStore('keys').get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); }
async function idbPut(k, v) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('keys', 'readwrite'); t.objectStore('keys').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }

export const e2eSupported = () => !!(S && typeof indexedDB !== 'undefined' && window.isSecureContext);
let device = null;
/** Η συσκευή αυτή (δημιουργεί κλειδιά την πρώτη φορά και καταχωρεί το δημόσιο κλειδί). */
export async function myDevice(studentId) {
  if (device && device.student === studentId) return device;
  let rec = await idbGet('dev:' + studentId).catch(() => null);
  if (!rec?.privateKey) {
    const kp = await S.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    rec = { privateKey: kp.privateKey, pub: await S.exportKey('jwk', kp.publicKey) };
  }
  const name = (navigator.userAgentData?.platform || navigator.platform || 'Συσκευή').slice(0, 40);
  const r = await api('/api/chat/keys', { method: 'POST', body: { key: rec.pub, id: rec.id, name } });
  rec.id = r.id; await idbPut('dev:' + studentId, rec);
  device = { ...rec, student: studentId };
  return device;
}
const pubCache = new Map(), devCache = new Map(), sharedCache = new Map();
const importPub = (jwk) => S.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
/** Οι συσκευές ενός μαθητή (cache 60″). */
async function devicesOf(studentId) {
  const c = devCache.get(studentId); if (c && Date.now() - c.t < 60000) return c.list;
  const list = await api(`/api/chat/keys?student=${studentId}`);
  for (const d of list) pubCache.set(d.id, await importPub(d.key));
  devCache.set(studentId, { t: Date.now(), list }); return list;
}
async function pubOf(deviceId) {
  if (pubCache.has(deviceId)) return pubCache.get(deviceId);
  const [d] = await api(`/api/chat/keys?device=${deviceId}`); if (!d) throw new Error('nokey');
  const k = await importPub(d.key); pubCache.set(deviceId, k); return k;
}
async function shared(dev, otherId, otherPub) {
  const key = dev.id + ':' + otherId; if (sharedCache.has(key)) return sharedCache.get(key);
  const k = await S.deriveKey({ name: 'ECDH', public: otherPub }, dev.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  sharedCache.set(key, k); return k;
}
/** Κρυπτογράφηση κειμένου για όλες τις συσκευές του φίλου ΚΑΙ τις δικές μου (για να το βλέπω κι από αλλού). */
export async function encryptFor(me, friendId, text) {
  const dev = await myDevice(me);
  const targets = [...(await devicesOf(friendId)), ...(await devicesOf(me))];
  if (!targets.some((d) => d.student === friendId)) { const e = new Error('Ο φίλος σου δεν έχει ανοίξει ακόμα το chat, οπότε δεν έχει κλειδί κρυπτογράφησης. Μόλις μπει, θα μπορείτε να μιλάτε! 🔒'); e.code = 'nodevice'; throw e; }
  const raw = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
  const mk = await S.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const ct = await S.encrypt({ name: 'AES-GCM', iv }, mk, enc.encode(JSON.stringify({ t: text })));
  const k = {};
  for (const d of targets.slice(0, 10)) {
    const sk = await shared(dev, d.id, pubCache.get(d.id) || (await pubOf(d.id)));
    const iv2 = crypto.getRandomValues(new Uint8Array(12));
    k[d.id] = [b64(iv2), b64(await S.encrypt({ name: 'AES-GCM', iv: iv2 }, sk, raw))];
  }
  return { v: 1, sd: dev.id, iv: b64(iv), ct: b64(ct), k };
}
/** Αποκρυπτογράφηση. Επιστρέφει το κείμενο ή null (π.χ. μήνυμα από πριν μπει αυτή η συσκευή). */
export async function decryptMsg(me, e) {
  try {
    const dev = await myDevice(me); const entry = e?.k?.[dev.id]; if (!entry) return null;
    const sk = await shared(dev, e.sd, await pubOf(e.sd));
    const raw = await S.decrypt({ name: 'AES-GCM', iv: unb64(entry[0]) }, sk, unb64(entry[1]));
    const mk = await S.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    return JSON.parse(dec.decode(await S.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, mk, unb64(e.ct)))).t;
  } catch { return null; }
}
