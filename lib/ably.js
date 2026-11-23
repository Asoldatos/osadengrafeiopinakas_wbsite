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
/** Δημοσίευση γεγονότος (αν αποτύχει, οι πελάτες το βρίσκουν με το εφεδρικό «polling»). */
export async function ablyPublish(channel, name, data) {
  if (!ablyOn()) return false;
  try {
    const r = await fetch(`${ABLY_HOST}/channels/${encodeURIComponent(channel)}/messages`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(KEY()).toString('base64') }, body: JSON.stringify({ name, data: JSON.stringify(data) }), cache: 'no-store' });
    if (!r.ok) { lastError = `publish ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`; console.error('ably', lastError); }
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
  const urls = (process.env.TURN_URL || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (urls.length) out.push({ urls, username: process.env.TURN_USERNAME || '', credential: process.env.TURN_CREDENTIAL || '' });
  return out;
}
export const turnConfigured = () => !!((process.env.CF_TURN_KEY_ID && process.env.CF_TURN_API_TOKEN) || process.env.TURN_URL);
