import { q } from './db';
import { json } from './guard';
import { getCommunity } from './communityServer';

export const SPUB = "s.status='published' and (s.publish_at is null or s.publish_at <= now())";
/** Ελέγχει ότι το chat είναι ανοιχτό και ο μαθητής δεν είναι αποκλεισμένος. */
export async function needChat(st, feature = 'chat') {
  const c = await getCommunity();
  if (!c.chat || (feature !== 'chat' && !c[feature])) throw json({ error: 'Αυτή η λειτουργία είναι προσωρινά κλειστή.' }, 403);
  if (st) { const r = await q('select community_banned from students where id=$1', [st.id]); if (r[0]?.community_banned) throw json({ error: 'Ο λογαριασμός σου δεν μπορεί να χρησιμοποιήσει το chat.' }, 403); }
  return c;
}
/** Το κανάλι, αν ο μαθητής είναι μέλος του server του (αλλιώς 403). */
export async function channelFor(st, channelId) {
  const r = await q(`select c.*, s.name server_name, m.muted_until from chat_channels c join chat_servers s on s.id=c.server_id
    join chat_members m on m.server_id=s.id and m.student_id=$2 where c.id=$1 and ${SPUB}`, [+channelId || 0, st.id]);
  if (!r.length) throw json({ error: 'Δεν έχεις πρόσβαση σε αυτό το κανάλι.' }, 403);
  return r[0];
}
/** Μορφή μηνύματος καναλιού για τον πελάτη. */
export const MSG_SQL = `select m.id, m.channel_id, m.student_id, m.staff_name, m.body, m.reply_to, m.edited_at, m.deleted, m.created_at, s.nickname, s.avatar,
  coalesce((select json_agg(json_build_object('e', x.emoji, 'n', x.n, 'me', x.me)) from (select emoji, count(*)::int n, bool_or(student_id=$ME) me from chat_reactions r where r.message_id=m.id group by emoji order by min(r.student_id)) x), '[]') reactions,
  (select json_build_object('id', p.id, 'nickname', coalesce(ps.nickname, p.staff_name), 'body', case when p.deleted then '' else left(p.body, 120) end) from chat_messages p left join students ps on ps.id=p.student_id where p.id=m.reply_to) reply
  from chat_messages m left join students s on s.id=m.student_id`;
export const shapeMsg = (m) => ({ id: +m.id, ch: m.channel_id, uid: m.student_id, staff: m.staff_name || '', nick: m.staff_name || m.nickname || '—', avatar: m.avatar || 'happy', body: m.deleted ? '' : m.body,
  deleted: m.deleted, edited: !!m.edited_at, at: m.created_at, reply: m.reply ? { id: +m.reply.id, nick: m.reply.nickname, body: m.reply.body } : null, reactions: m.reactions || [] });
export async function loadMsgs(channelId, me, { before = 0, after = 0, ids = null } = {}) {
  const sql = MSG_SQL.replace(/\$ME/g, '$2');
  if (ids) return (await q(`${sql} where m.id = any($1::bigint[]) order by m.id`, [ids, me])).map(shapeMsg);
  if (after) return (await q(`${sql} where m.channel_id=$1 and m.id>$3 order by m.id limit 100`, [channelId, me, after])).map(shapeMsg);
  const rows = await q(`${sql} where m.channel_id=$1 ${before ? 'and m.id<$3' : ''} order by m.id desc limit 50`, before ? [channelId, me, before] : [channelId, me]);
  return rows.reverse().map(shapeMsg);
}
/** Σήμα προς έναν μαθητή (κλήσεις, DM, πληκτρολόγηση DM): αποθηκεύεται για το «polling» και στέλνεται και μέσω Ably. */
export async function signal(to, from, kind, data, publish) {
  const r = (await q('insert into chat_signals(to_id, from_id, kind, data) values($1,$2,$3,$4::jsonb) returning id', [to, from, kind, JSON.stringify(data || {})]))[0];
  if (publish) await publish(`u:${to}`, 'sig', { id: +r.id, from, kind, data });
  return +r.id;
}
