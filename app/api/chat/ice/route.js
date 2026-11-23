import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
/** Διακομιστές ICE για τις κλήσεις: δωρεάν STUN + προαιρετικός TURN από τις μεταβλητές TURN_URL/TURN_USERNAME/TURN_CREDENTIAL. */
export const GET = sroute(async () => {
  const ice = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const urls = (process.env.TURN_URL || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (urls.length) ice.push({ urls, username: process.env.TURN_USERNAME || '', credential: process.env.TURN_CREDENTIAL || '' });
  return json({ iceServers: ice });
});
