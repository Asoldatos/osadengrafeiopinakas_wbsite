import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { cleanText } from '@/lib/sanitize';
import { loadMsgs } from '@/lib/chat';
import { ablyPublish } from '@/lib/ably';

/** Τα τελευταία μηνύματα ενός καναλιού (τα κανάλια ΔΕΝ είναι κρυπτογραφημένα· τα DM είναι και δεν φαίνονται εδώ). */
export const GET = route(async (req) => {
  const ch = +new URL(req.url).searchParams.get('channel') || 0;
  const rows = await q(`select m.id, m.body, m.deleted, m.created_at, m.staff_name, s.id student_id, s.nickname, s.community_banned,
      (select muted_until from chat_members cm join chat_channels c on c.server_id=cm.server_id where c.id=m.channel_id and cm.student_id=m.student_id) muted_until
    from chat_messages m left join students s on s.id=m.student_id where m.channel_id=$1 order by m.id desc limit 150`, [ch]);
  return json(rows);
}, { perm: 'community' });
/** Ανακοίνωση της σύνταξης σε κανάλι (εμφανίζεται με την ετικέτα «ΣΥΝΤΑΞΗ»). */
export const POST = route(async (req, _c, user) => {
  const b = await body(req), ch = +b.channel || 0, text = cleanText(b.body, 2000).trim();
  if (!text) return json({ error: 'Γράψε το μήνυμα.' }, 400);
  if (!(await q('select 1 from chat_channels where id=$1', [ch])).length) return json({ error: 'Δεν βρέθηκε το κανάλι.' }, 404);
  const name = cleanText(b.as || user.name || 'Η σύνταξη', 60) || 'Η σύνταξη';
  const id = (await q('insert into chat_messages(channel_id, staff_name, body) values($1,$2,$3) returning id', [ch, name, text]))[0].id;
  const [msg] = await loadMsgs(ch, 0, { ids: [id] }); await ablyPublish(`ch:${ch}`, 'msg', msg);
  await logActivity(user, 'Ανακοίνωση στο chat', `κανάλι ${ch}`);
  return json({ ok: true }, 201);
}, { perm: 'community' });
/** { id, deleted } διαγραφή/επαναφορά · { mute: { server_id, student_id, minutes } } σίγαση μαθητή σε server. */
export const PUT = route(async (req, _c, user) => {
  const b = await body(req);
  if (b.mute) {
    const mins = Math.min(60 * 24 * 30, Math.max(0, Math.trunc(+b.mute.minutes) || 0));
    await q("update chat_members set muted_until = case when $1::int > 0 then now() + $1::int * interval '1 minute' else null end where server_id=$2 and student_id=$3", [mins, +b.mute.server_id, +b.mute.student_id]);
    await logActivity(user, mins ? 'Σίγαση στο chat' : 'Άρση σίγασης', `μαθητής ${b.mute.student_id}, ${mins}′`);
    return json({ ok: true });
  }
  const r = await q('update chat_messages set deleted=$1 where id=$2 returning channel_id', [b.deleted === true, +b.id]);
  if (!r.length) return json({ error: 'Δεν βρέθηκε.' }, 404);
  if (b.deleted) await ablyPublish(`ch:${r[0].channel_id}`, 'del', { id: +b.id });
  await logActivity(user, b.deleted ? 'Διαγραφή μηνύματος chat' : 'Επαναφορά μηνύματος chat', `#${b.id}`);
  return json({ ok: true });
}, { perm: 'community' });
