import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { getCommunity } from '@/lib/communityServer';

export const dynamic = 'force-dynamic';
const MAX_MESSAGES = 150000;   // ανώτατο όριο γραμμών μηνυμάτων, για να μη γεμίσει ποτέ η βάση
/** Καθημερινός καθαρισμός (Vercel Cron): κρατά τη βάση μικρή.
 *  Μηνύματα > Ν ημερών, παλιές ημερήσιες προβολές, κλειστά αιτήματα, σβησμένα σχόλια, επιλυμένες αναφορές, παλιές προσπάθειες σύνδεσης. */
export async function GET(req) {
  const secret = process.env.CRON_SECRET, url = new URL(req.url);
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('secret') || '';
  if (secret ? given !== secret : await tooMany(`cron2:${clientIp(req)}`, 2, 1)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!secret) await recordFail(`cron2:${clientIp(req)}`);
  const c = await getCommunity(), out = {};
  const run = async (k, sql, p = []) => { try { out[k] = (await q(sql + ' returning 1', p)).length; } catch (e) { out[k] = 'error'; console.error('cleanup', k, e.message); } };
  await run('messages', "delete from dm_messages where created_at < now() - ($1 || ' days')::interval", [String(c.retentionDays)]);
  await run('overflow', 'delete from dm_messages where id in (select id from dm_messages order by id desc offset $1)', [MAX_MESSAGES]);
  await run('views', "delete from article_views_daily where day < current_date - 400");
  await run('tickets', "delete from tickets where status='closed' and updated_at < now() - interval '365 days'");
  await run('comments', "delete from comments where status='deleted' and created_at < now() - interval '30 days'");
  await run('reports', "delete from dm_reports where status='resolved' and resolved_at < now() - interval '180 days'");
  await run('attempts', "delete from attempts where ts < now() - interval '7 days'");
  return NextResponse.json({ ok: true, deleted: out });
}
