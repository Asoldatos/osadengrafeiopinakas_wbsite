import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needChat, channelFor } from '@/lib/chat';
import { canTalk } from '@/lib/communityServer';
import { ablyPublish, ablyOn } from '@/lib/ably';

/** «Ο τάδε γράφει…» (μόνο με Ably· ο πελάτης στέλνει το πολύ μία φορά ανά 3″). */
export const POST = sroute(async (req, _c, st) => {
  if (!ablyOn()) return json({ ok: false });
  await needChat(st); const b = await body(req);
  const who = { uid: st.id, nick: st.nickname };
  if (b.ch) { await channelFor(st, b.ch); await ablyPublish(`ch:${+b.ch}`, 'typing', who); }
  else if (b.dm && (await canTalk(st.id, +b.dm))) await ablyPublish(`u:${+b.dm}`, 'typing', { ...who, dm: st.id });
  return json({ ok: true });
});
