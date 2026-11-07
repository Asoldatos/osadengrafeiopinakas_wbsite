import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { cfgFor, uniqueSlug } from '@/lib/crud';

export const GET = route(async (_req, { params }) => {
  const cfg = cfgFor(params.resource);
  const r = await q(`select ${cfg.select} where t.id=$1`, [+params.id]);
  return r[0] ? json(r[0]) : json({ error: 'Δεν βρέθηκε.' }, 404);
});
export const PUT = route(async (req, { params }, user) => {
  const cfg = cfgFor(params.resource);
  const id = +params.id;
  const data = await body(req);
  const clean = {};
  for (const k of Object.keys(cfg.cols)) if (k in data) clean[k] = data[k];
  if (cfg.titleCol && cfg.titleCol in clean && !String(clean[cfg.titleCol] || '').trim()) return json({ error: 'Ο τίτλος δεν μπορεί να είναι κενός.' }, 400);
  if (cfg.slug && ('slug' in clean || cfg.titleCol in clean) && clean.slug !== undefined) clean.slug = await uniqueSlug(cfg, clean.slug || clean[cfg.titleCol], id);
  else delete clean.slug;
  if (cfg.validate) { const cl = {}; for (const [k, v] of Object.entries(clean)) if (cfg.cols[k]) cl[k] = cfg.cols[k].c(v); const msg = cfg.validate(cl); if (msg) return json({ error: msg }, 400); }
  const sets = [], vals = [];
  for (const [k, v] of Object.entries(clean)) {
    const d = cfg.cols[k]; const val = d.c(v); vals.push(d.json ? JSON.stringify(val) : val);
    sets.push(`${k}=$${vals.length}${d.json ? '::jsonb' : ''}`);
  }
  if (cfg.touch) sets.push('updated_at=now()');
  if (!sets.length) return json({ error: 'Καμία αλλαγή.' }, 400);
  vals.push(id);
  const r = await q(`update ${cfg.table} set ${sets.join(',')} where id=$${vals.length} returning id`, vals);
  if (!r.length) return json({ error: 'Δεν βρέθηκε.' }, 404);
  revalidatePath('/', 'layout');
  await logActivity(user, 'Επεξεργασία: ' + params.resource, clean[cfg.titleCol] || `#${id}`);
  return json((await q(`select ${cfg.select} where t.id=$1`, [id]))[0]);
});
export const DELETE = route(async (_req, { params }, user) => {
  const cfg = cfgFor(params.resource);
  const id = +params.id;
  const row = (await q(`select * from ${cfg.table} where id=$1`, [id]))[0];
  if (!row) return json({ error: 'Δεν βρέθηκε.' }, 404);
  await q(`delete from ${cfg.table} where id=$1`, [id]);
  const urls = params.resource === 'media' ? [row.url] : params.resource === 'editions' ? [row.digital_pdf_url, row.print_pdf_url] : [];
  for (const u of urls.filter((x) => x && x.includes('.public.blob.vercel-storage.com'))) { try { await del(u); } catch {} }
  revalidatePath('/', 'layout');
  await logActivity(user, 'Διαγραφή: ' + params.resource, row.title || row.name || `#${id}`);
  return json({ ok: true });
});
