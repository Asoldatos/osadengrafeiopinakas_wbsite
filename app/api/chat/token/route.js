import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needChat, channelFor } from '@/lib/chat';
import { ablyToken, ablyOn } from '@/lib/ably';

/** Token Ably μόνο για «subscribe»: το κανάλι που είναι ανοιχτό (αν είναι μέλος) + το προσωπικό κανάλι του μαθητή. */
export const GET = sroute(async (req, _c, st) => {
  await needChat(st);
  if (!ablyOn()) return json({ realtime: false });
  const chId = +new URL(req.url).searchParams.get('ch') || 0;
  const chans = [`u:${st.id}`];
  if (chId) { await channelFor(st, chId); chans.push(`ch:${chId}`); }
  const t = await ablyToken(`s${st.id}`, chans);
  return t ? json({ realtime: true, ...t, channels: chans }) : json({ realtime: false });
});
