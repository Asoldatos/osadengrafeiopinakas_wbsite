import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { cleanText } from '@/lib/sanitize';
import { moderate, filterOpts } from '@/lib/community.mjs';
import { needChat, channelFor, loadMsgs } from '@/lib/chat';
import { ablyPublish } from '@/lib/ably';

const REACT = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏', '🤔', '✅'];
const get = async (id) => (await q('select id, channel_id, student_id, deleted from chat_messages where id=$1', [+id || 0]))[0];
/** Επεξεργασία δικού σου μηνύματος. */
export const PATCH = sroute(async (req, { params }, st) => {
  const c = await needChat(st); const m = await get(params.id);
  if (!m || m.deleted || m.student_id !== st.id) return json({ error: 'Δεν βρέθηκε.' }, 404);
  await channelFor(st, m.channel_id);
  const text = cleanText((await body(req)).body, 2000).trim(); if (!text) return json({ error: 'Γράψε κάτι.' }, 400);
  const mod = moderate(text, filterOpts(c, 'comments')); if (mod.error) return json({ error: mod.error }, 400);
  await q('update chat_messages set body=$1, edited_at=now() where id=$2', [text, m.id]);
  const [msg] = await loadMsgs(m.channel_id, 0, { ids: [m.id] }); await ablyPublish(`ch:${m.channel_id}`, 'edit', msg);
  return json({ message: msg });
});
/** Διαγραφή δικού σου μηνύματος. */
export const DELETE = sroute(async (_r, { params }, st) => {
  await needChat(st); const m = await get(params.id);
  if (!m || m.student_id !== st.id) return json({ error: 'Δεν βρέθηκε.' }, 404);
  await q('update chat_messages set deleted=true, body=\'\' where id=$1', [m.id]); await q('delete from chat_reactions where message_id=$1', [m.id]);
  await ablyPublish(`ch:${m.channel_id}`, 'del', { id: +m.id });
  return json({ ok: true });
});
/** POST { action: 'react', emoji } | { action: 'report', reason } */
export const POST = sroute(async (req, { params }, st) => {
  await needChat(st); const m = await get(params.id);
  if (!m || m.deleted) return json({ error: 'Δεν βρέθηκε.' }, 404);
  const ch = await channelFor(st, m.channel_id); const b = await body(req);
  if (b.action === 'react') {
    if (!REACT.includes(b.emoji)) return json({ error: 'Μη έγκυρη αντίδραση.' }, 400);
    const del = await q('delete from chat_reactions where message_id=$1 and student_id=$2 and emoji=$3 returning 1', [m.id, st.id, b.emoji]);
    if (!del.length) await q('insert into chat_reactions(message_id, student_id, emoji) values($1,$2,$3) on conflict do nothing', [m.id, st.id, b.emoji]);
    const [msg] = await loadMsgs(m.channel_id, 0, { ids: [m.id] }); await ablyPublish(`ch:${m.channel_id}`, 'react', { id: msg.id, reactions: msg.reactions });
    return json({ ok: true });
  }
  if (b.action === 'report') {
    if (m.student_id === st.id) return json({ error: 'Δεν μπορείς να αναφέρεις δικό σου μήνυμα.' }, 400);
    const ctx = await q(`select coalesce(s.nickname, x.staff_name) nickname, x.body, x.created_at, x.student_id sender from chat_messages x left join students s on s.id=x.student_id
      where x.channel_id=$1 and x.id between $2 - 400 and $2 + 50 and not x.deleted order by abs(x.id - $2), x.id limit 30`, [m.channel_id, m.id]);
    ctx.sort((a, c) => new Date(a.created_at) - new Date(c.created_at));
    await q('insert into dm_reports(reporter, reported, reason, snapshot) values($1,$2,$3,$4::jsonb)', [st.id, m.student_id, `Κανάλι #${ch.name} (${ch.server_name}): ${cleanText(b.reason, 300) || 'αναφορά μηνύματος'}`, JSON.stringify(ctx)]);
    return json({ ok: true });
  }
  return json({ error: 'Άγνωστη ενέργεια.' }, 400);
});
