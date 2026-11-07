import { cache } from 'react';
import { q } from './db';
import { DEFAULT_SITE } from './defaults.mjs';
import { plain } from './util';

function merge(a, b) {
  if (Array.isArray(b) || b === null || typeof b !== 'object') return b === undefined ? a : b;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = a && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k];
  return out;
}
export const getSite = cache(async () => {
  try {
    const r = await q("select value from settings where key='site'");
    return merge(DEFAULT_SITE, r[0]?.value || {});
  } catch { return DEFAULT_SITE; }
});

const PUB = "t.status='published' and (t.publish_at is null or t.publish_at <= now())";
const LIST = `t.id,t.slug,t.title,t.subtitle,t.cover_url,t.tags,t.featured,coalesce(t.publish_at,t.created_at) as date,
  w.name as author_name, c.name as category_name, c.slug as category_slug, c.color as category_color
  from articles t left join authors w on w.id=t.author_id left join categories c on c.id=t.category_id`;
const esc = (s) => String(s).replace(/[\\%_]/g, (m) => '\\' + m);

export async function getArticles({ limit = 12, offset = 0, category, search, tag, featured } = {}) {
  const p = []; let w = PUB;
  if (category) { p.push(category); w += ` and c.slug=$${p.length}`; }
  if (search) { p.push('%' + esc(search) + '%'); w += ` and (t.title ilike $${p.length} or t.subtitle ilike $${p.length} or t.content ilike $${p.length})`; }
  if (tag) { p.push(JSON.stringify([tag])); w += ` and t.tags @> $${p.length}::jsonb`; }
  if (featured) w += ' and t.featured';
  p.push(limit, offset);
  const rows = await q(`select ${LIST} where ${w} order by date desc limit $${p.length - 1} offset $${p.length}`, p);
  const cnt = await q(`select count(*)::int n from articles t left join categories c on c.id=t.category_id where ${w}`, p.slice(0, -2));
  return plain({ rows, total: cnt[0].n });
}
export async function getArticle(slug, preview = false) {
  const r = await q(`select t.*, coalesce(t.publish_at,t.created_at) as date, w.name as author_name, w.role as author_role, w.photo_url as author_photo, w.bio as author_bio,
    c.name as category_name, c.slug as category_slug, c.color as category_color
    from articles t left join authors w on w.id=t.author_id left join categories c on c.id=t.category_id
    where t.slug=$1 ${preview ? '' : 'and ' + PUB}`, [slug]);
  return plain(r[0] || null);
}
export async function getRelated(a, n = 3) {
  const r = await q(`select ${LIST} where ${PUB} and t.id<>$1 and (t.category_id=$2 or t.tags ?| array(select jsonb_array_elements_text($3::jsonb))) order by (t.category_id=$2) desc, date desc limit ${n}`,
    [a.id, a.category_id, JSON.stringify(Array.isArray(a.tags) && a.tags.length ? a.tags : ['__none__'])]);
  return plain(r);
}
export async function getAdjacent(a) {
  const prev = await q(`select t.slug,t.title from articles t where ${PUB} and coalesce(t.publish_at,t.created_at) < $1 order by coalesce(t.publish_at,t.created_at) desc limit 1`, [a.date]);
  const next = await q(`select t.slug,t.title from articles t where ${PUB} and coalesce(t.publish_at,t.created_at) > $1 order by coalesce(t.publish_at,t.created_at) asc limit 1`, [a.date]);
  return plain({ prev: prev[0] || null, next: next[0] || null });
}
export async function getEditions({ search, year, limit = 60 } = {}) {
  const p = []; let w = "t.status in ('published','archived')";
  if (search) { p.push('%' + esc(search) + '%'); w += ` and (t.title ilike $${p.length} or t.description ilike $${p.length})`; }
  if (year) { p.push(year); w += ` and t.school_year=$${p.length}`; }
  p.push(limit);
  return plain(await q(`select t.* from editions t where ${w} order by t.pub_date desc nulls last, t.created_at desc limit $${p.length}`, p));
}
export async function getSchoolYears() {
  const r = await q("select distinct school_year from editions where status in ('published','archived') and school_year<>'' order by school_year desc");
  return r.map((x) => x.school_year);
}
export async function getEdition(slug, preview = false) {
  const r = await q(`select t.* from editions t where t.slug=$1 ${preview ? '' : "and t.status in ('published','archived')"}`, [slug]);
  return plain(r[0] || null);
}
export async function getHotspots(editionId) {
  return plain(await q('select * from hotspots where edition_id=$1 order by page_no, id', [editionId]));
}
export async function getWriters() {
  return plain(await q('select id,name,role,bio,photo_url from authors where visible order by sort asc, id asc'));
}
export async function getCategories() {
  return plain(await q(`select c.id,c.slug,c.name,c.color,c.description,
    (select count(*)::int from articles t where t.category_id=c.id and ${PUB}) as count from categories c order by c.sort, c.name`));
}
export async function getPage(slug) {
  const r = await q('select published from pages where slug=$1', [slug]);
  return r[0]?.published || null;
}
export async function getSiteData() {
  const [recent, featured, editions, writers, categories] = await Promise.all([
    getArticles({ limit: 12 }), getArticles({ limit: 3, featured: true }),
    q("select * from editions where status='published' order by pub_date desc nulls last, created_at desc limit 6"),
    getWriters(), getCategories(),
  ]);
  return plain({ recent: recent.rows, featured: featured.rows, editions, writers, categories });
}
