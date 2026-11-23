import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needChat } from '@/lib/chat';
import { canTalk } from '@/lib/communityServer';

const okJwk = (k) => k && k.kty === 'EC' && k.crv === 'P-256' && typeof k.x === 'string' && typeof k.y === 'string' && k.x.length < 64 && k.y.length < 64 && !k.d;
/** Δημόσια κλειδιά συσκευών (E2E). ?student=ID → όλες οι συσκευές του (μόνο φίλος ή ο εαυτός σου) · ?device=ID → μία συσκευή. */
export const GET = sroute(async (req, _c, st) => {
  await needChat(st);
  const u = new URL(req.url).searchParams;
  const rows = u.get('device') ? await q('select id, student_id, public_key from chat_devices where id=$1', [+u.get('device') || 0])
    : await q('select id, student_id, public_key from chat_devices where student_id=$1 order by id desc limit 5', [+u.get('student') || 0]);
  const owner = rows[0]?.student_id;
  if (owner && owner !== st.id && !(await canTalk(st.id, owner))) return json({ error: 'Μόνο για φίλους.' }, 403);
  return json(rows.map((r) => ({ id: r.id, student: r.student_id, key: r.public_key })));
});
/** Καταχώριση νέας συσκευής (μόνο το ΔΗΜΟΣΙΟ κλειδί· το ιδιωτικό δεν φεύγει ποτέ από τη συσκευή). Έως 5 ανά μαθητή. */
export const POST = sroute(async (req, _c, st) => {
  await needChat(st);
  const b = await body(req);
  if (!okJwk(b.key)) return json({ error: 'Μη έγκυρο κλειδί.' }, 400);
  const key = { kty: 'EC', crv: 'P-256', x: b.key.x, y: b.key.y, ext: true };
  if (b.id) { const r = await q('update chat_devices set last_seen=now() where id=$1 and student_id=$2 returning id', [+b.id, st.id]); if (r.length) return json({ id: r[0].id }); }
  const id = (await q('insert into chat_devices(student_id, public_key, name) values($1,$2::jsonb,$3) returning id', [st.id, JSON.stringify(key), String(b.name || '').slice(0, 60)]))[0].id;
  await q('delete from chat_devices where student_id=$1 and id not in (select id from chat_devices where student_id=$1 order by last_seen desc limit 5)', [st.id]);
  return json({ id }, 201);
});
