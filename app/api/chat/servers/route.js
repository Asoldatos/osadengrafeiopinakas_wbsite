import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needChat, SPUB } from '@/lib/chat';

/** Κατάλογος servers που έχουν φτιάξει οι διαχειριστές (μόνο δημοσιευμένοι). */
export const GET = sroute(async (_r, _c, st) => {
  await needChat(st);
  return json(await q(`select s.id, s.slug, s.name, s.icon, s.color, s.description, s.rules,
      (select count(*)::int from chat_members m where m.server_id=s.id) members,
      exists(select 1 from chat_members m where m.server_id=s.id and m.student_id=$1) joined,
      (select count(*)::int from chat_channels c where c.server_id=s.id) channels
    from chat_servers s where ${SPUB} order by s.sort, s.id`, [st.id]));
});
/** { id, action: 'join' (με accept: true για τους κανόνες) | 'leave' } */
export const POST = sroute(async (req, _c, st) => {
  await needChat(st);
  const b = await body(req), id = +b.id || 0;
  const s = (await q(`select s.id, s.rules from chat_servers s where s.id=$1 and ${SPUB}`, [id]))[0];
  if (!s) return json({ error: 'Δεν βρέθηκε ο server.' }, 404);
  if (b.action === 'leave') { await q('delete from chat_members where server_id=$1 and student_id=$2', [id, st.id]); return json({ ok: true }); }
  if (s.rules && b.accept !== true) return json({ error: 'Πρέπει να διαβάσεις και να αποδεχτείς τους κανόνες.' }, 400);
  if ((await q('select count(*)::int n from chat_members where student_id=$1', [st.id]))[0].n >= 30) return json({ error: 'Έχεις μπει σε πάρα πολλούς servers.' }, 409);
  await q('insert into chat_members(server_id, student_id) values($1,$2) on conflict do nothing', [id, st.id]);
  return json({ ok: true });
});
