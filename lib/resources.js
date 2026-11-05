import { slugify } from './util';
import { cleanHtml, cleanText } from './sanitize';

const T = (v) => (v == null || v === '' ? '' : cleanText(v, 500));
const TN = (v) => (v == null || v === '' ? null : cleanText(v, 1000));
const L = (v) => cleanText(v, 20000);
const H = (v) => cleanHtml(v);
const I = (v) => (v === '' || v == null || isNaN(+v) ? null : Math.trunc(+v));
const I0 = (v) => (isNaN(+v) ? 0 : Math.trunc(+v));
const B = (v) => v === true || v === 'true' || v === 1;
const F = (v) => Math.min(1, Math.max(0, +v || 0));
const D = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };
const DD = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); };
const ST = (v) => (['draft', 'published', 'archived'].includes(v) ? v : 'draft');
const arr = (max, f = (x) => cleanText(x, 1000)) => (v) => (Array.isArray(v) ? v.slice(0, max).map(f) : []);
const LINKS = (v) => (Array.isArray(v) ? v.slice(0, 30).map((l) => ({ label: cleanText(l?.label, 200), url: cleanText(l?.url, 1000) })) : []);
const J = (v) => (v && typeof v === 'object' ? v : {});
const CFG = (v) => {
  const o = {}; if (!v || typeof v !== 'object') return o;
  for (const [k, x] of Object.entries(v).slice(0, 12)) {
    if (k === 'html') o[k] = cleanHtml(x);
    else if (k === 'images') o[k] = Array.isArray(x) ? x.slice(0, 40).map((i) => cleanText(i, 1000)) : [];
    else o[cleanText(k, 30)] = cleanText(x, 5000);
  } return o;
};
const HT = ['link', 'article', 'video', 'audio', 'gallery', 'text', 'game', 'custom'];
const jsonb = (c) => ({ c, json: true });
const col = (c) => ({ c });

export const RES = {
  articles: {
    table: 'articles', slug: true, titleCol: 'title', order: 't.created_at desc',
    select: `t.*, w.name as author_name, c.name as category_name from articles t
             left join authors w on w.id=t.author_id left join categories c on c.id=t.category_id`,
    cols: { title: col(T), subtitle: col(T), slug: col(T), content: col(H), cover_url: col(TN), author_id: col(I), category_id: col(I), tags: jsonb(arr(20, (x) => cleanText(x, 40))), featured: col(B), status: col(ST), publish_at: col(D), gallery: jsonb(arr(40)), videos: jsonb(arr(10)), links: jsonb(LINKS), seo_title: col(T), seo_desc: col(T) },
    touch: true,
  },
  editions: {
    table: 'editions', slug: true, titleCol: 'title', order: 't.pub_date desc nulls last, t.created_at desc',
    select: 't.* from editions t',
    cols: { title: col(T), slug: col(T), cover_url: col(TN), pub_date: col(DD), school_year: col(T), description: col(L), digital_pdf_url: col(TN), print_pdf_url: col(TN), digital_public: col(B), print_public: col(B), status: col(ST), featured: col(B) },
    touch: true,
  },
  writers: {
    table: 'authors', titleCol: 'name', order: 't.sort asc, t.id asc', select: 't.* from authors t',
    cols: { name: col(T), role: col(T), bio: col(L), photo_url: col(TN), sort: col(I0), visible: col(B) },
  },
  categories: {
    table: 'categories', slug: true, titleCol: 'name', order: 't.sort asc, t.name asc', select: 't.* from categories t',
    cols: { name: col(T), slug: col(T), color: col(T), description: col(T), sort: col(I0) },
  },
  hotspots: {
    table: 'hotspots', titleCol: null, order: 't.page_no asc, t.id asc', select: 't.* from hotspots t', filter: ['edition_id'],
    cols: { edition_id: col(I), page_no: col(I0), x: col(F), y: col(F), w: col(F), h: col(F), type: col((v) => (HT.includes(v) ? v : 'link')), icon: col(T), label: col(T), config: jsonb(CFG) },
  },
  media: {
    table: 'media', titleCol: 'name', order: 't.created_at desc', select: 't.* from media t',
    cols: { url: col(T), name: col(T), mime: col(T), size: col(I0), alt: col(T) },
  },
};
