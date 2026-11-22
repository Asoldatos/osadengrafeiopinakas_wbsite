import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { cleanCommunity } from '@/lib/community.mjs';
import { getCommunity } from '@/lib/communityServer';

/** Ρυθμίσεις + στατιστικά κοινότητας (και πόσο χώρο πιάνει η βάση). */
export const GET = route(async () => {
  const s = (await q(`select (select count(*)::int from dm_messages) messages, (select count(*)::int from comments where status='visible') comments,
    (select count(*)::int from comments where status='hidden') hidden, (select count(*)::int from dm_reports where status='open') reports,
    (select count(*)::int from friendships where status='accepted') friendships, (select count(*)::int from tickets where status='open') tickets,
    (select count(*)::int from students where community_banned) banned, (select coalesce(sum(view_count),0)::int from articles) views, (select coalesce(sum(like_count),0)::int from articles) likes,
    pg_database_size(current_database())::bigint dbsize`))[0];
  return json({ settings: await getCommunity(), stats: { ...s, dbsize: +s.dbsize } });
}, { perm: 'community' });
export const PUT = route(async (req, _c, user) => {
  const v = cleanCommunity(await body(req));
  await q("insert into settings(key, value) values('community', $1::jsonb) on conflict (key) do update set value=excluded.value", [JSON.stringify(v)]);
  await logActivity(user, 'Ρυθμίσεις κοινότητας', Object.entries(v).map(([k, x]) => `${k}=${x}`).join(', '));
  return json({ settings: v });
}, { perm: 'community' });
