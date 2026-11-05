import { revalidatePath } from 'next/cache';
import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { SECTION_DEFS } from '@/lib/sectionDefs.mjs';
import { cleanHtml, cleanText } from '@/lib/sanitize';

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const num = (v, d) => Math.min(240, Math.max(0, Number.isFinite(+v) ? +v : d));
function cleanProps(v) {
  if (typeof v === 'string') return cleanText(v, 20000);
  if (Array.isArray(v)) return v.slice(0, 60).map(cleanProps);
  return typeof v === 'number' || typeof v === 'boolean' ? v : '';
}
function cleanSections(input) {
  if (!Array.isArray(input) || input.length > 60) throw json({ error: 'Μη έγκυρη διάταξη σελίδας.' }, 400);
  return input.map((s) => {
    if (!SECTION_DEFS[s?.type]) throw json({ error: 'Άγνωστος τύπος ενότητας.' }, 400);
    const props = {};
    for (const f of SECTION_DEFS[s.type].fields) {
      const v = s.props?.[f.k];
      props[f.k] = s.type === 'custom' && f.k === 'html' ? cleanHtml(v) : cleanProps(v ?? '');
    }
    const st = s.style || {};
    return { id: cleanText(s.id, 20), type: s.type, hidden: !!s.hidden, props,
      style: { bg: HEX.test(st.bg || '') ? st.bg : '', padTop: num(st.padTop, 64), padBottom: num(st.padBottom, 64), bgImage: cleanText(st.bgImage, 1000) } };
  });
}
const pageRow = async (slug) => (await q('select * from pages where slug=$1', [slug]))[0];

export const GET = route(async (req, { params }) => {
  const r = await pageRow(params.slug);
  if (!r) return json({ error: 'Δεν βρέθηκε η σελίδα.' }, 404);
  if (new URL(req.url).searchParams.get('revisions'))
    return json(await q('select id,note,user_name,created_at from revisions where slug=$1 order by id desc limit 40', [params.slug]));
  return json({ draft: r.draft, published: r.published, updated_at: r.updated_at });
}, { role: 'admin' });

export const PUT = route(async (req, { params }) => {
  const { draft } = await body(req);
  const clean = cleanSections(draft);
  const r = await q('update pages set draft=$1::jsonb, updated_at=now() where slug=$2 returning slug', [JSON.stringify(clean), params.slug]);
  return r.length ? json({ ok: true, savedAt: new Date().toISOString() }) : json({ error: 'Δεν βρέθηκε η σελίδα.' }, 404);
}, { role: 'admin' });

export const POST = route(async (req, { params }, user) => {
  const action = new URL(req.url).searchParams.get('action');
  const r = await pageRow(params.slug);
  if (!r) return json({ error: 'Δεν βρέθηκε η σελίδα.' }, 404);
  if (action === 'publish') {
    await q('update pages set published=draft, updated_at=now() where slug=$1', [params.slug]);
    await q('insert into revisions(slug,data,note,user_name) values($1,$2::jsonb,$3,$4)', [params.slug, JSON.stringify(r.draft), 'Δημοσίευση', user.name || user.email]);
    revalidatePath('/', 'layout'); revalidatePath('/' + (params.slug === 'home' ? '' : params.slug));
    await logActivity(user, 'Δημοσίευση σελίδας', params.slug);
    return json({ ok: true });
  }
  if (action === 'discard') {
    await q('update pages set draft=published where slug=$1', [params.slug]);
    return json({ ok: true, draft: r.published });
  }
  if (action === 'restore') {
    const { id } = await body(req);
    const rev = (await q('select data from revisions where id=$1 and slug=$2', [+id, params.slug]))[0];
    if (!rev) return json({ error: 'Δεν βρέθηκε η έκδοση.' }, 404);
    await q('update pages set draft=$1::jsonb where slug=$2', [JSON.stringify(rev.data), params.slug]);
    await logActivity(user, 'Επαναφορά έκδοσης σελίδας', params.slug);
    return json({ ok: true, draft: rev.data });
  }
  return json({ error: 'Άγνωστη ενέργεια.' }, 400);
}, { role: 'admin' });
