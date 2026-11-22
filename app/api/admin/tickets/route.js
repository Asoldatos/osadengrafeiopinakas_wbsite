import { q } from '@/lib/db';
import { route, json } from '@/lib/guard';
/** Λίστα αιτημάτων (δικαίωμα «community»). */
export const GET = route(async (req) => {
  const s = new URL(req.url).searchParams.get('status');
  const rows = await q(`select t.id, t.kind, t.name, t.email, t.subject, t.status, t.created_at, t.updated_at, (select count(*)::int from ticket_replies r where r.ticket_id=t.id) n
    from tickets t ${s && s !== 'all' ? 'where t.status=$1' : ''} order by (t.status='open') desc, t.updated_at desc limit 300`, s && s !== 'all' ? [s] : []);
  const counts = Object.fromEntries((await q('select status, count(*)::int n from tickets group by status')).map((r) => [r.status, r.n]));
  return json({ rows, counts });
}, { perm: 'community' });
