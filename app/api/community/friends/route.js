import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { cleanText } from '@/lib/sanitize';
import { pair } from '@/lib/community.mjs';
import { needFeature, getCommunity, countSince } from '@/lib/communityServer';

const MAX_FRIENDS = 200;
async function lists(me) {
  const rows = await q(`select f.status, f.requester, f.created_at, f.accepted_at, s.id, s.nickname, s.avatar
    from friendships f join students s on s.id = case when f.a=$1 then f.b else f.a end
    where (f.a=$1 or f.b=$1) and s.verified and not s.disabled order by s.nickname`, [me]);
  const unread = Object.fromEntries((await q('select sender, count(*)::int n from dm_messages where (a=$1 or b=$1) and sender<>$1 and read_at is null group by sender', [me])).map((r) => [r.sender, r.n]));
  const blocked = await q('select s.id, s.nickname, s.avatar from blocks b join students s on s.id=b.blocked where b.blocker=$1 order by s.nickname', [me]);
  const P = (r) => ({ id: r.id, nickname: r.nickname, avatar: r.avatar });
  return {
    friends: rows.filter((r) => r.status === 'accepted').map((r) => ({ ...P(r), since: r.accepted_at, unread: unread[r.id] || 0 })),
    incoming: rows.filter((r) => r.status === 'pending' && r.requester !== me).map(P),
    outgoing: rows.filter((r) => r.status === 'pending' && r.requester === me).map(P),
    blocked,
  };
}
export const GET = sroute(async (_r, _c, st) => {
  const c = await getCommunity();
  return json({ enabled: c.friends, messages: c.messages, ...(c.friends ? await lists(st.id) : { friends: [], incoming: [], outgoing: [], blocked: [] }) });
});
/** Ενέργειες φιλίας. Η αναζήτηση γίνεται ΜΟΝΟ με το ακριβές όνομα χρήστη (δεν υπάρχει κατάλογος μαθητών). */
export const POST = sroute(async (req, _c, st) => {
  const b = await body(req), me = st.id, act = b.action;
  if (act !== 'unblock') await needFeature('friends', st);
  let other = +b.id || 0;
  if (act === 'request') {
    const nick = cleanText(b.nickname, 40).trim().toLowerCase();
    const t = nick && (await q('select id from students where nick_lower=$1 and verified and not disabled and not community_banned', [nick]))[0];
    if (!t) return json({ error: 'Δεν βρέθηκε μαθητής με αυτό το όνομα χρήστη. Έλεγξε ότι το έγραψες ακριβώς σωστά.' }, 404);
    other = t.id;
  }
  if (!other || other === me) return json({ error: 'Μη έγκυρη ενέργεια.' }, 400);
  const [a, bb] = pair(me, other);
  const cur = (await q('select status, requester from friendships where a=$1 and b=$2', [a, bb]))[0];
  const blockedEither = (await q('select 1 from blocks where (blocker=$1 and blocked=$2) or (blocker=$2 and blocked=$1)', [me, other])).length > 0;
  switch (act) {
    case 'request': {
      if (blockedEither) return json({ error: 'Δεν μπορείς να στείλεις αίτημα σε αυτόν τον μαθητή.' }, 403);
      if (cur?.status === 'accepted') return json({ error: 'Είστε ήδη φίλοι!' }, 409);
      if (cur?.status === 'pending' && cur.requester === me) return json({ error: 'Έχεις ήδη στείλει αίτημα. Περίμενε να το αποδεχτεί.' }, 409);
      if (cur?.status === 'pending') { await q("update friendships set status='accepted', accepted_at=now() where a=$1 and b=$2", [a, bb]); break; }   // είχε στείλει εκείνος: αποδοχή
      if (await countSince("select count(*)::int n from friendships where requester=$1 and created_at > now() - interval '1 day'", [me]) >= 20) return json({ error: 'Έστειλες πολλά αιτήματα σήμερα. Δοκίμασε αύριο!' }, 429);
      if (await countSince("select count(*)::int n from friendships where (a=$1 or b=$1) and status='accepted'", [me]) >= MAX_FRIENDS) return json({ error: `Έχεις φτάσει τους ${MAX_FRIENDS} φίλους.` }, 409);
      await q('insert into friendships(a,b,requester) values($1,$2,$3)', [a, bb, me]); break;
    }
    case 'accept':
      if (!cur || cur.status !== 'pending' || cur.requester === me) return json({ error: 'Δεν υπάρχει αίτημα.' }, 404);
      if (blockedEither) return json({ error: 'Μη έγκυρη ενέργεια.' }, 403);
      await q("update friendships set status='accepted', accepted_at=now() where a=$1 and b=$2", [a, bb]); break;
    case 'decline': case 'cancel': case 'remove':
      await q('delete from friendships where a=$1 and b=$2', [a, bb]); break;
    case 'block':
      await q('delete from friendships where a=$1 and b=$2', [a, bb]);
      await q('insert into blocks(blocker, blocked) values($1,$2) on conflict do nothing', [me, other]); break;
    case 'unblock':
      await q('delete from blocks where blocker=$1 and blocked=$2', [me, other]); break;
    default: return json({ error: 'Άγνωστη ενέργεια.' }, 400);
  }
  return json({ ok: true, ...(await lists(me)) });
});
