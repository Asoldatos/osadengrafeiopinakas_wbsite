import { q } from '@/lib/db';
import { route, json } from '@/lib/guard';
import { getCommunity } from '@/lib/communityServer';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|lighthouse|headless|curl|wget|python|scrapy/i;
/** +1 προβολή. Μία γραμμή ανά άρθρο ανά ημέρα (μικρό αποτύπωμα στη βάση) + συνολικός μετρητής στο άρθρο.
 *  Ο browser στέλνει μία φορά ανά επίσκεψη (sessionStorage) και τα ρομπότ αγνοούνται. */
export const POST = route(async (req, { params }) => {
  if (BOT.test(req.headers.get('user-agent') || '')) return json({ ok: true });
  const c = await getCommunity(); if (!c.views) return json({ ok: true });
  const id = +params.id; if (!(id > 0)) return json({ ok: false }, 400);
  const r = await q("update articles set view_count = view_count + 1 where id=$1 and status='published' and (publish_at is null or publish_at <= now()) returning view_count", [id]);
  if (!r.length) return json({ ok: false }, 404);
  await q('insert into article_views_daily(article_id, day, views) values($1, current_date, 1) on conflict (article_id, day) do update set views = article_views_daily.views + 1', [id]);
  return json({ ok: true, views: r[0].view_count });
}, { open: true });
