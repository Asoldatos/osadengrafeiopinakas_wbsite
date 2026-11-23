import { route, json } from '@/lib/guard';
import { ablyOn, ablyToken, ablyPublish, ablyLastError, iceServers, turnConfigured } from '@/lib/ably';
/** Έλεγχος ρυθμίσεων chat: Ably (token + δημοσίευση) και TURN. Δείχνει το ακριβές σφάλμα αν κάτι δεν δουλεύει. */
export const GET = route(async () => {
  const out = { ably: { configured: ablyOn() }, turn: { configured: turnConfigured() }, cookieDomain: process.env.COOKIE_DOMAIN || '', chatUrl: process.env.NEXT_PUBLIC_CHAT_URL || '' };
  if (out.ably.configured) {
    const t = await ablyToken('diag', ['diag:test']); out.ably.token = !!t; if (!t) out.ably.error = ablyLastError();
    out.ably.publish = await ablyPublish('diag:test', 'ping', { at: Date.now() }); if (!out.ably.publish) out.ably.error = ablyLastError();
  }
  const ice = await iceServers(); out.turn.servers = ice.map((s) => [].concat(s.urls).map((u) => u.split(':')[0]).join('+'));
  out.turn.relay = ice.some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)));
  return json(out);
}, { perm: 'community' });
