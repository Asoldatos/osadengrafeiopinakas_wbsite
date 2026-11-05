import { revalidatePath } from 'next/cache';
import { q, logActivity } from '@/lib/db';
import { cfgFor, uniqueSlug } from '@/lib/crud';
import { route, json, body } from '@/lib/guard';

export const GET = route(async (req, { params }) => {
  const cfg = cfgFor(params.resource);
  const url = new URL(req.url);
  const p = []; let w = '1=1';
  for (const f of cfg.filter || []) { const v = url.searchParams.get(f); if (v) { p.push(+v); w += ` and t.${f}=$${p.length}`; } }
  const s = url.searchParams.get('q');
  if (s && cfg.titleCol) { p.push('%' + s.replace(/[\\%_]/g, (m) => '\\' + m) + '%'); w += ` and t.${cfg.titleCol} ilike $${p.length}`; }
  const rows = await q(`select ${cfg.select} where ${w} order by ${cfg.order} limit 500`, p);
  return json(rows);
});
export const POST = route(async (req, { params }, user) => {
  const cfg = cfgFor(params.resource);
  const data = await body(req);
  if (cfg.titleCol && !String(data[cfg.titleCol] || '').trim()) return json({ error: 'Συμπληρώστε τον τίτλο / το όνομα.' }, 400);
  if (params.resource === 'hotspots' && !data.edition_id) return json({ error: 'Λείπει το τεύχος.' }, 400);
  const cols = [], ph = [], vals = [];
  const clean = {};
  for (const k of Object.keys(cfg.cols)) if (k in data) clean[k] = data[k];
  if (cfg.slug) clean.slug = await uniqueSlug(cfg, clean.slug || clean[cfg.titleCol]);
  for (const [k, v] of Object.entries(clean)) {
    const d = cfg.cols[k]; if (!d) continue;
    const val = d.c(v); vals.push(d.json ? JSON.stringify(val) : val); cols.push(k); ph.push('$' + vals.length + (d.json ? '::jsonb' : ''));
  }
  const r = await q(`insert into ${cfg.table}(${cols.join(',')}) values(${ph.join(',')}) returning id`, vals);
  revalidatePath('/', 'layout');
  await logActivity(user, 'Δημιουργία: ' + params.resource, clean[cfg.titleCol] || '');
  const row = (await q(`select ${cfg.select} where t.id=$1`, [r[0].id]))[0];
  return json(row, 201);
});
