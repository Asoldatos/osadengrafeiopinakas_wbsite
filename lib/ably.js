import crypto from 'node:crypto';
// Ably χωρίς SDK: (α) υπογεγραμμένο TokenRequest → token μόνο για «subscribe» στα κανάλια που επιτρέπουμε,
// (β) δημοσίευση από τον διακομιστή μέσω REST. Οι μαθητές ΠΟΤΕ δεν δημοσιεύουν απευθείας: όλα περνούν από τα δικά μας API (έλεγχοι, φίλτρο).
const KEY = () => process.env.ABLY_API_KEY || '';
export const ablyOn = () => /^[^:]+\.[^:]+:.+$/.test(KEY());

/** Token για συγκεκριμένα κανάλια (μόνο subscribe). Επιστρέφει { token, expires } ή null. */
export async function ablyToken(clientId, channels) {
  if (!ablyOn()) return null;
  const [keyName, secret] = [KEY().split(':')[0], KEY().slice(KEY().indexOf(':') + 1)];
  const capability = JSON.stringify(Object.fromEntries(channels.map((c) => [c, ['subscribe']])));
  const ttl = 60 * 60 * 1000, timestamp = Date.now(), nonce = crypto.randomBytes(16).toString('hex');
  const mac = crypto.createHmac('sha256', secret).update([keyName, ttl, capability, clientId, timestamp, nonce, ''].join('\n')).digest('base64');
  try {
    const r = await fetch(`https://rest.ably.io/keys/${encodeURIComponent(keyName)}/requestToken`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ keyName, ttl, capability, clientId, timestamp, nonce, mac }), cache: 'no-store' });
    if (!r.ok) { console.error('ably token', r.status, await r.text().catch(() => '')); return null; }
    const j = await r.json(); return { token: j.token, expires: j.expires };
  } catch (e) { console.error('ably token', e.message); return null; }
}
/** Δημοσίευση γεγονότος (best-effort: αν αποτύχει, οι πελάτες το βρίσκουν με το «polling»). */
export async function ablyPublish(channel, name, data) {
  if (!ablyOn()) return false;
  try {
    const r = await fetch(`https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(KEY()).toString('base64') }, body: JSON.stringify({ name, data: JSON.stringify(data) }), cache: 'no-store' });
    return r.ok;
  } catch { return false; }
}
