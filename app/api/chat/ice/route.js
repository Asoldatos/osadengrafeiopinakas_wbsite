import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { iceServers } from '@/lib/ably';
/** Διακομιστές ICE για τις κλήσεις (με προσωρινά διαπιστευτήρια TURN). */
export const GET = sroute(async () => json({ iceServers: await iceServers() }));
