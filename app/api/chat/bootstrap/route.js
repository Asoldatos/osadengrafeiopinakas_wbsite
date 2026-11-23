import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needChat, SPUB } from '@/lib/chat';
import { ablyOn } from '@/lib/ably';
import { filterOpts } from '@/lib/community.mjs';

/** Όλα όσα χρειάζεται η εφαρμογή στην εκκίνηση: ο μαθητής, οι servers του με κανάλια και αδιάβαστα, οι φίλοι/DM, οι ρυθμίσεις. */
export const GET = sroute(async (_r, _c, st) => {
  const c = await needChat(st);
  const [servers, channels, friends, me] = await Promise.all([
    q(`select s.id, s.slug, s.name, s.icon, s.color, s.description from chat_servers s join chat_members m on m.server_id=s.id and m.student_id=$1 where ${SPUB} order by s.sort, s.id`, [st.id]),
    q(`select c.id, c.server_id, c.name, c.topic, c.readonly, c.slowmode,
        (select count(*)::int from chat_messages x where x.channel_id=c.id and not x.deleted and x.id > coalesce((select last_id from chat_reads r where r.student_id=$1 and r.channel_id=c.id), 0) and coalesce(x.student_id,0)<>$1) unread
      from chat_channels c join chat_members m on m.server_id=c.server_id and m.student_id=$1 order by c.sort, c.id`, [st.id]),
    q(`select s.id, s.nickname, s.avatar, s.allow_calls, coalesce(s.last_seen_chat > now() - interval '2 minutes', false) online,
        (select count(*)::int from dm_messages d where d.a=least($1,s.id) and d.b=greatest($1,s.id) and d.sender=s.id and d.read_at is null) unread,
        (select max(created_at) from dm_messages d where d.a=least($1,s.id) and d.b=greatest($1,s.id)) last_at
      from friendships f join students s on s.id = case when f.a=$1 then f.b else f.a end
      where (f.a=$1 or f.b=$1) and f.status='accepted' and s.verified and not s.disabled
        and not exists(select 1 from blocks b where (b.blocker=$1 and b.blocked=s.id) or (b.blocker=s.id and b.blocked=$1))
      order by last_at desc nulls last, s.nickname`, [st.id]),
    q('select allow_calls from students where id=$1', [st.id]),
  ]);
  await q('update students set last_seen_chat=now() where id=$1', [st.id]);
  return json({
    me: { id: st.id, nickname: st.nickname, avatar: st.avatar, allowCalls: me[0]?.allow_calls !== false },
    servers: servers.map((s) => ({ ...s, channels: channels.filter((x) => x.server_id === s.id) })),
    friends, realtime: ablyOn(),
    features: { messages: c.messages, friends: c.friends, calls: c.calls, video: c.video },
    filter: filterOpts(c, 'messages'),
  });
});
