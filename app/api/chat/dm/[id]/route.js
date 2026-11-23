import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { pair } from '@/lib/community.mjs';
import { needChat, signal } from '@/lib/chat';
import { canTalk, countSince, getCommunity } from '@/lib/communityServer';
import { ablyPublish } from '@/lib/ably';

const B64 = /^[A-Za-z0-9+/=]+$/;
/** Έλεγχος σχήματος κρυπτογραφημένου μηνύματος: { v, sd, iv, ct, k: { συσκευή: [iv, κλειδί] } }. Ο διακομιστής ΔΕΝ μπορεί να το διαβάσει. */
function validEnc(e) {
  if (!e || e.v !== 1 || !Number.isInteger(e.sd) || typeof e.iv !== 'string' || typeof e.ct !== 'string' || !e.k || typeof e.k !== 'object') return false;
  if (!B64.test(e.iv) || e.iv.length > 24 || !B64.test(e.ct) || e.ct.length > 12000) return false;
  const ks = Object.entries(e.k); if (!ks.length || ks.length > 10) return false;
  return ks.every(([d, v]) => /^\d+$/.test(d) && Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'string' && B64.test(x) && x.length < 120));
}
/** GET ?after=ID: κρυπτογραφημένα μηνύματα με έναν φίλο (+ σημείωση ως αναγνωσμένα). */
export const GET = sroute(async (req, { params }, st) => {
  await needChat(st, 'messages'); const other = +params.id || 0;
  if (!(await canTalk(st.id, other))) return json({ error: 'Μόνο με φίλους.' }, 403);
  const after = +new URL(req.url).searchParams.get('after') || 0; const [a, b] = pair(st.id, other);
  const rows = after ? await q('select id, sender, body, enc, created_at, read_at from dm_messages where a=$1 and b=$2 and id>$3 order by id limit 100', [a, b, after])
    : (await q('select id, sender, body, enc, created_at, read_at from dm_messages where a=$1 and b=$2 order by id desc limit 60', [a, b])).reverse();
  await q('update dm_messages set read_at=now() where a=$1 and b=$2 and sender=$3 and read_at is null', [a, b, other]);
  const seen = (await q('select coalesce(max(id),0)::bigint id from dm_messages where a=$1 and b=$2 and sender=$3 and read_at is not null', [a, b, st.id]))[0].id;
  return json({ messages: rows.map((m) => ({ id: +m.id, mine: m.sender === st.id, enc: m.enc, body: m.enc ? '' : m.body, at: m.created_at })), seenUpTo: +seen });
});
/** POST { enc }: αποθήκευση κρυπτογραφημένου μηνύματος. Το φίλτρο λέξεων τρέχει στη συσκευή πριν την κρυπτογράφηση. */
export const POST = sroute(async (req, { params }, st) => {
  await needChat(st, 'messages'); const c = await getCommunity(); const other = +params.id || 0;
  if (!(await canTalk(st.id, other))) return json({ error: 'Μπορείς να στείλεις μηνύματα μόνο σε φίλους.' }, 403);
  const { enc } = await body(req);
  if (!validEnc(enc)) return json({ error: 'Μη έγκυρο μήνυμα.' }, 400);
  if (!(await q('select 1 from chat_devices where id=$1 and student_id=$2', [enc.sd, st.id])).length) return json({ error: 'Άγνωστη συσκευή. Ανανέωσε τη σελίδα.' }, 400);
  if (await countSince("select count(*)::int n from dm_messages where sender=$1 and created_at > now() - interval '10 seconds'", [st.id]) >= 8) return json({ error: 'Πιο αργά!' }, 429);
  if (await countSince("select count(*)::int n from dm_messages where sender=$1 and created_at > now() - interval '1 day'", [st.id]) >= c.maxMessagesPerDay) return json({ error: 'Έφτασες το όριο μηνυμάτων για σήμερα.' }, 429);
  const [a, b] = pair(st.id, other);
  const m = (await q("insert into dm_messages(a,b,sender,body,enc) values($1,$2,$3,'',$4::jsonb) returning id, created_at", [a, b, st.id, JSON.stringify(enc)]))[0];
  const out = { id: +m.id, from: st.id, enc, at: m.created_at };
  await signal(other, st.id, 'dm', { id: out.id }, null);
  await ablyPublish(`u:${other}`, 'dm', out);
  return json({ message: { id: out.id, mine: true, enc, at: m.created_at } }, 201);
});
