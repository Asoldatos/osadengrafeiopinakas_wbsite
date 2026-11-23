import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { cleanText } from '@/lib/sanitize';
import { moderate, filterOpts } from '@/lib/community.mjs';
import { needChat, channelFor, loadMsgs } from '@/lib/chat';
import { countSince } from '@/lib/communityServer';
import { ablyPublish } from '@/lib/ably';

/** GET ?before=ID | ?after=ID : μηνύματα καναλιού (και σημείωση ως αναγνωσμένα). */
export const GET = sroute(async (req, { params }, st) => {
  await needChat(st); const ch = await channelFor(st, params.id);
  const u = new URL(req.url).searchParams;
  const msgs = await loadMsgs(ch.id, st.id, { before: +u.get('before') || 0, after: +u.get('after') || 0 });
  const last = msgs.length ? msgs[msgs.length - 1].id : 0;
  if (last && !u.get('before')) await q('insert into chat_reads(student_id, channel_id, last_id) values($1,$2,$3) on conflict (student_id, channel_id) do update set last_id=greatest(chat_reads.last_id, excluded.last_id)', [st.id, ch.id, last]);
  return json({ messages: msgs, more: !u.get('after') && msgs.length === 50 });
});
/** Νέο μήνυμα: φίλτρο στον διακομιστή (τα κανάλια ΔΕΝ είναι κρυπτογραφημένα, ώστε να προστατεύονται οι μαθητές), slowmode, σίγαση, όρια. */
export const POST = sroute(async (req, { params }, st) => {
  const c = await needChat(st); const ch = await channelFor(st, params.id);
  if (ch.readonly) return json({ error: 'Σε αυτό το κανάλι γράφουν μόνο οι διαχειριστές.' }, 403);
  if (ch.muted_until && new Date(ch.muted_until) > new Date()) return json({ error: 'Έχεις σίγαση σε αυτόν τον server μέχρι ' + new Date(ch.muted_until).toLocaleString('el-GR') + '.' }, 403);
  const b = await body(req);
  const text = cleanText(b.body, 2000).trim();
  if (!text) return json({ error: 'Γράψε ένα μήνυμα.' }, 400);
  const m = moderate(text, filterOpts(c, 'comments')); if (m.error) return json({ error: m.error }, 400);
  const wait = Math.max(ch.slowmode || 0, 1);
  if (await countSince(`select count(*)::int n from chat_messages where student_id=$1 and channel_id=$2 and created_at > now() - ($3 || ' seconds')::interval`, [st.id, ch.id, String(wait)])) return json({ error: ch.slowmode ? `Αργή λειτουργία: ένα μήνυμα κάθε ${ch.slowmode}″.` : 'Πιο αργά!' }, 429);
  if (await countSince("select count(*)::int n from chat_messages where student_id=$1 and created_at > now() - interval '1 day'", [st.id]) >= 500) return json({ error: 'Έφτασες το όριο μηνυμάτων για σήμερα.' }, 429);
  const reply = +b.reply_to || null;
  const id = (await q('insert into chat_messages(channel_id, student_id, body, reply_to) values($1,$2,$3,(select id from chat_messages where id=$4 and channel_id=$1)) returning id', [ch.id, st.id, text, reply]))[0].id;
  await q('insert into chat_reads(student_id, channel_id, last_id) values($1,$2,$3) on conflict (student_id, channel_id) do update set last_id=greatest(chat_reads.last_id, excluded.last_id)', [st.id, ch.id, id]);
  const [msg] = await loadMsgs(ch.id, 0, { ids: [id] });
  await ablyPublish(`ch:${ch.id}`, 'msg', msg);
  return json({ message: { ...msg, reactions: [] }, flagged: !!m.flag }, 201);
});
