import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { needChat, signal } from '@/lib/chat';
import { canTalk, countSince } from '@/lib/communityServer';
import { ablyPublish } from '@/lib/ably';

const KINDS = ['offer', 'answer', 'ice', 'end', 'decline', 'busy'];
/** Σηματοδοσία κλήσεων WebRTC (ο ήχος/η εικόνα πάνε απευθείας μεταξύ των συσκευών, κρυπτογραφημένα). Μόνο μεταξύ φίλων. */
export const POST = sroute(async (req, _c, st) => {
  const c = await needChat(st, 'calls');
  const b = await body(req), to = +b.to || 0, kind = b.kind;
  if (!KINDS.includes(kind)) return json({ error: 'Μη έγκυρο.' }, 400);
  if (!(await canTalk(st.id, to))) return json({ error: 'Μπορείς να καλέσεις μόνο φίλους.' }, 403);
  const data = { callId: String(b.callId || '').slice(0, 40), video: !!b.video && c.video };
  if (kind === 'offer') {
    const target = (await q('select allow_calls from students where id=$1', [to]))[0];
    if (target?.allow_calls === false) return json({ error: 'Αυτός ο φίλος δεν δέχεται κλήσεις.' }, 403);
    if (b.video && !c.video) return json({ error: 'Οι βιντεοκλήσεις είναι κλειστές.' }, 403);
    if (await countSince("select count(*)::int n from chat_calls where caller=$1 and started_at > now() - interval '10 minutes'", [st.id]) >= 15) return json({ error: 'Πολλές κλήσεις. Περίμενε λίγο.' }, 429);
    data.callDb = (await q('insert into chat_calls(caller, callee, video) values($1,$2,$3) returning id', [st.id, to, data.video]))[0].id;
  }
  if (kind === 'answer' && +b.callDb) await q('update chat_calls set answered_at=now() where id=$1 and callee=$2', [+b.callDb, st.id]);
  if ((kind === 'end' || kind === 'decline') && +b.callDb) await q('update chat_calls set ended_at=coalesce(ended_at, now()) where id=$1 and (caller=$2 or callee=$2)', [+b.callDb, st.id]);
  if (b.callDb) data.callDb = +b.callDb;
  const sdp = typeof b.sdp === 'string' ? b.sdp.slice(0, 20000) : undefined;
  if (sdp) data.sdp = sdp;
  if (Array.isArray(b.candidates)) data.candidates = b.candidates.slice(0, 30).map((x) => String(x).slice(0, 600));
  await signal(to, st.id, 'call:' + kind, { ...data, nick: st.nickname, avatar: st.avatar }, ablyPublish);
  return json({ ok: true, callDb: data.callDb || null });
});
