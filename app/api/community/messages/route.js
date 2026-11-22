import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { cleanText } from '@/lib/sanitize';
import { moderate, filterOpts, pair } from '@/lib/community.mjs';
import { needFeature, canTalk, countSince } from '@/lib/communityServer';

const MSG = 'select id, sender, body, created_at, read_at from dm_messages';
/** GET ?with=ID[&after=lastId]: μηνύματα με έναν φίλο (τα τελευταία 60 ή τα νεότερα από after) και σημείωση ως αναγνωσμένα. */
export const GET = sroute(async (req, _c, st) => {
  await needFeature('messages', st);
  const u = new URL(req.url).searchParams, other = +u.get('with') || 0, after = +u.get('after') || 0;
  if (!(await canTalk(st.id, other))) return json({ error: 'Μπορείς να στείλεις μηνύματα μόνο σε φίλους.' }, 403);
  const [a, b] = pair(st.id, other);
  const rows = after ? await q(`${MSG} where a=$1 and b=$2 and id>$3 order by id limit 100`, [a, b, after])
    : (await q(`${MSG} where a=$1 and b=$2 order by id desc limit 60`, [a, b])).reverse();
  await q('update dm_messages set read_at=now() where a=$1 and b=$2 and sender=$3 and read_at is null', [a, b, other]);
  const seen = (await q('select max(id)::bigint id from dm_messages where a=$1 and b=$2 and sender=$3 and read_at is not null', [a, b, st.id]))[0]?.id || 0;
  return json({ messages: rows.map((m) => ({ id: +m.id, mine: m.sender === st.id, body: m.body, at: m.created_at })), seenUpTo: +seen });
});
/** Νέο μήνυμα: μόνο σε φίλους, χωρίς εικόνες/συνδέσμους/στοιχεία επικοινωνίας, με όρια ρυθμού. */
export const POST = sroute(async (req, _c, st) => {
  const c = await needFeature('messages', st);
  const b = await body(req), other = +b.to || 0;
  const text = cleanText(b.body, 500).trim();
  if (!text) return json({ error: 'Γράψε ένα μήνυμα.' }, 400);
  if (!(await canTalk(st.id, other))) return json({ error: 'Μπορείς να στείλεις μηνύματα μόνο σε φίλους.' }, 403);
  const mod = moderate(text, filterOpts(c, 'messages')); if (mod.error) return json({ error: mod.error }, 400);
  if (await countSince("select count(*)::int n from dm_messages where sender=$1 and created_at > now() - interval '10 seconds'", [st.id]) >= 6) return json({ error: 'Πιο αργά! Περίμενε λίγο πριν στείλεις ξανά.' }, 429);
  if (await countSince("select count(*)::int n from dm_messages where sender=$1 and created_at > now() - interval '1 day'", [st.id]) >= c.maxMessagesPerDay) return json({ error: 'Έφτασες το όριο μηνυμάτων για σήμερα. Τα λέμε αύριο!' }, 429);
  const [a, bb] = pair(st.id, other);
  const m = (await q('insert into dm_messages(a,b,sender,body) values($1,$2,$3,$4) returning id, created_at', [a, bb, st.id, text]))[0];
  return json({ message: { id: +m.id, mine: true, body: text, at: m.created_at } }, 201);
});
