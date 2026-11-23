import crypto from 'node:crypto';
// Ably χωρίς SDK (σύμφωνα με τις οδηγίες του Ably για TokenRequest και REST):
// (α) υπογεγραμμένο TokenRequest → token ΜΟΝΟ για «subscribe» στα κανάλια που επιτρέπουμε,
// (β) δημοσίευση από τον διακομιστή μέσω REST. Οι μαθητές δεν δημοσιεύουν ποτέ απευθείας: όλα περνούν από τα δικά μας API.
export const ABLY_HOST = 'https://main.realtime.ably.net';
const KEY = () => (process.env.ABLY_API_KEY || '').trim();
export const ablyOn = () => /^[^:\s]+\.[^:\s]+:\S+$/.test(KEY());
let lastError = '';
export const ablyLastError = () => lastError;

/** Τα κανάλια ΠΡΕΠΕΙ να είναι ταξινομημένα και χωρίς κενά, αλλιώς η υπογραφή (mac) δεν ταιριάζει. */
const capabilityOf = (channels) => JSON.stringify(Object.fromEntries([...new Set(channels)].sort().map((c) => [c, ['subscribe']])));

/** Token για συγκεκριμένα κανάλια. Επιστρέφει { token, expires } ή null. */
export async function ablyToken(clientId, channels) {
  if (!ablyOn()) return null;
  const key = KEY(), keyName = key.slice(0, key.indexOf(':')), secret = key.slice(key.indexOf(':') + 1);
  const capability = capabilityOf(channels), ttl = 60 * 60 * 1000, timestamp = Date.now(), nonce = crypto.randomBytes(16).toString('hex');
  const mac = crypto.createHmac('sha256', secret).update(`${keyName}\n${ttl}\n${capability}\n${clientId}\n${timestamp}\n${nonce}\n`, 'utf8').digest('base64');
  try {
    const r = await fetch(`${ABLY_HOST}/keys/${encodeURIComponent(keyName)}/requestToken`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ keyName, ttl, capability, clientId, timestamp, nonce, mac }), cache: 'no-store' });
    if (!r.ok) { lastError = `requestToken ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`; console.error('ably', lastError); return null; }
    const j = await r.json(); lastError = ''; return { token: j.token, expires: j.expires };
  } catch (e) { lastError = 'requestToken: ' + e.message; console.error('ably', lastError); return null; }
}
/* Δημοσίευση από τον διακομιστή.
   Ο λογαριασμός Ably απαιτεί «αναγνωρισμένο» αποστολέα (σφάλμα 40161 με σκέτο κλειδί), οπότε ο διακομιστής
   παίρνει δικό του token με clientId «osaden-server» και δημοσιεύει με αυτό. Το token φυλάγεται ~50 λεπτά. */
const SERVER_ID = 'osaden-server';
let srvTok = null;
async function serverToken() {
  if (srvTok && srvTok.expires - Date.now() > 5 * 60000) return srvTok.token;
  const key = KEY(), keyName = key.slice(0, key.indexOf(':')), secret = key.slice(key.indexOf(':') + 1);
  const capability = JSON.stringify({ '*': ['publish'] }), ttl = 60 * 60 * 1000, timestamp = Date.now(), nonce = crypto.randomBytes(16).toString('hex');
  const mac = crypto.createHmac('sha256', secret).update(`${keyName}\n${ttl}\n${capability}\n${SERVER_ID}\n${timestamp}\n${nonce}\n`, 'utf8').digest('base64');
  const r = await fetch(`${ABLY_HOST}/keys/${encodeURIComponent(keyName)}/requestToken`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ keyName, ttl, capability, clientId: SERVER_ID, timestamp, nonce, mac }), cache: 'no-store' });
  if (!r.ok) throw new Error(`server token ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`);
  const j = await r.json(); srvTok = { token: j.token, expires: j.expires }; return j.token;
}
const send = (channel, auth, body) => fetch(`${ABLY_HOST}/channels/${encodeURIComponent(channel)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body, cache: 'no-store' });
/** Δημοσίευση γεγονότος (αν αποτύχει, οι πελάτες το βρίσκουν με το εφεδρικό «polling»). */
export async function ablyPublish(channel, name, data) {
  if (!ablyOn()) return false;
  const body = JSON.stringify({ name, data: JSON.stringify(data), clientId: SERVER_ID });
  try {
    let r;
    try {
      r = await send(channel, 'Bearer ' + Buffer.from(await serverToken()).toString('base64'), body);
      if (r.status === 401) { srvTok = null; r = await send(channel, 'Bearer ' + Buffer.from(await serverToken()).toString('base64'), body); }
    } catch (e) { lastError = e.message; r = await send(channel, 'Basic ' + Buffer.from(KEY()).toString('base64'), body); }
    if (!r.ok) { lastError = `publish ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`; console.error('ably', lastError); }
    else lastError = '';
    return r.ok;
  } catch (e) { lastError = 'publish: ' + e.message; return false; }
}

/** Διακομιστές ICE για τις κλήσεις: Cloudflare TURN (δωρεάν έως 1.000 GB/μήνα) αν έχει ρυθμιστεί, αλλιώς TURN από μεταβλητές, πάντα με STUN. */
export async function iceServers() {
  const out = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
  const id = process.env.CF_TURN_KEY_ID, tok = process.env.CF_TURN_API_TOKEN;
  if (id && tok) {
    try {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 7200 }), cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        // οι διευθύνσεις στη θύρα 53 μπλοκάρονται από τους browsers και καθυστερούν τη σύνδεση
        const list = (j.iceServers || []).map((s) => ({ ...s, urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) })).filter((s) => s.urls.length);
        if (list.length) return list;
      } else console.error('turn', r.status, await r.text().catch(() => ''));
    } catch (e) { console.error('turn', e.message); }
  }
  // ExpressTURN (δωρεάν 1.000 GB/μήνα): σταθερό όνομα χρήστη/κωδικός από το dashboard.
  // EXPRESSTURN_SERVER δέχεται «free.expressturn.com», «turn:free.expressturn.com:3478» ή πολλούς με κόμμα.
  const et = expressTurn();
  if (et) return [...out, et];
  // Metered Open Relay: δωρεάν 20 GB/μήνα, χωρίς κάρτα (METERED_APP = το όνομα της εφαρμογής, π.χ. «osaden» από το osaden.metered.live)
  const app = (process.env.METERED_APP || '').trim().replace(/\.metered\.live.*$/, '').replace(/^https?:\/\//, ''), mk = (process.env.METERED_API_KEY || '').trim();
  if (app && mk) {
    try {
      const r = await fetch(`https://${encodeURIComponent(app)}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(mk)}`, { cache: 'no-store' });
      if (r.ok) { const list = await r.json(); if (Array.isArray(list) && list.length) return [...out, ...list.filter((x) => [].concat(x.urls).some((u) => /^turns?:/.test(u)))]; }
      else console.error('metered', r.status, await r.text().catch(() => ''));
    } catch (e) { console.error('metered', e.message); }
  }
  const urls = (process.env.TURN_URL || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (urls.length) out.push({ urls, username: process.env.TURN_USERNAME || '', credential: process.env.TURN_CREDENTIAL || '' });
  return out;
}
function expressTurn() {
  const user = (process.env.EXPRESSTURN_USERNAME || '').trim(), pass = (process.env.EXPRESSTURN_PASSWORD || '').trim();
  const hosts = (process.env.EXPRESSTURN_SERVER || '').split(',').map((h) => h.trim().replace(/^turns?:/i, '').replace(/^\/\//, '').replace(/\?.*$/, '').replace(/:\d+$/, '')).filter(Boolean);
  if (!hosts.length || !user || !pass) return null;
  // UDP (γρηγορότερο) + TCP (περνά από σχολικά/εταιρικά δίκτυα που κόβουν το UDP), θύρα 3478 του δωρεάν πακέτου
  return { urls: hosts.flatMap((h) => [`turn:${h}:3478`, `turn:${h}:3478?transport=tcp`]), username: user, credential: pass };
}
export const turnConfigured = () => !!((process.env.EXPRESSTURN_SERVER && process.env.EXPRESSTURN_USERNAME && process.env.EXPRESSTURN_PASSWORD) || (process.env.CF_TURN_KEY_ID && process.env.CF_TURN_API_TOKEN) || (process.env.METERED_APP && process.env.METERED_API_KEY) || process.env.TURN_URL);
