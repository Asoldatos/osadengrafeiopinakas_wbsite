// Το περιεχόμενο του ιστοτόπου σε απλά «μπλοκ» για την προβολή σε VR (ο browser του VR δεν μπορεί να ζωγραφίσει HTML μέσα στον 3D κόσμο).
// ΜΟΝΟ δημοσιευμένο περιεχόμενο. Κανένα HTML δεν περνάει στον πελάτη — μόνο καθαρό κείμενο, που ζωγραφίζεται σε καμβά.
import { q } from './db';
import { getSite, getArticles, getArticle, getEditions, getEdition, getCategories, getPage } from './data';
import { GAMES } from './progress.mjs';
import { publishedTutorials, getTutorial } from './tutorialsData';
import { tutorialVars, blockHtml, renderText } from './tutorials.mjs';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decode = (s) => String(s).replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m));
export const strip = (h) => decode(String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t ]+/g, ' ').replace(/\n\s*/g, '\n').trim();
const okUrl = (u) => (/^(https:\/\/|\/(?!\/))/.test(String(u || '')) ? String(u) : null);
const D = (d) => (d ? new Date(d).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** HTML άρθρου → μπλοκ: h (επικεφαλίδα), p, li, quote, img. */
export function htmlBlocks(html) {
  const out = [], re = /<(h[1-6]|p|li|blockquote|figcaption|pre|td)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*?src\s*=\s*"([^"]+)"[^>]*>/gi; let m;
  for (const part of String(html || '').split(/(?=<(?:h[1-6]|p|ul|ol|blockquote|figure|img|pre|table)\b)/i)) {
    re.lastIndex = 0; let any = false;
    while ((m = re.exec(part))) {
      any = true;
      if (m[3]) { const u = okUrl(m[3]); if (u) out.push({ t: 'img', src: u }); continue; }
      const tag = m[1].toLowerCase(), txt = strip(m[2]); if (!txt) continue;
      out.push(tag[0] === 'h' ? { t: 'h', text: txt } : tag === 'li' ? { t: 'li', text: txt } : tag === 'blockquote' ? { t: 'quote', text: txt } : tag === 'figcaption' ? { t: 'small', text: txt } : { t: 'p', text: txt });
    }
    if (!any) { const txt = strip(part); if (txt) out.push({ t: 'p', text: txt }); }
  }
  return out.slice(0, 400);
}
/** Σελίδα του Σχεδιαστή → μπλοκ (επικεφαλίδες, κείμενα, λίστες, προσαρμοσμένο HTML). */
function sectionBlocks(sections) {
  const out = [];
  const walk = (v, depth) => {
    if (depth > 4 || v == null) return;
    if (Array.isArray(v)) { for (const x of v.slice(0, 40)) walk(x, depth + 1); return; }
    if (typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === 'string') {
        if (k === 'html') out.push(...htmlBlocks(x));
        else if (/^(title|heading)$/.test(k) && x.trim()) out.push({ t: depth ? 'h3' : 'h', text: strip(x) });
        else if (/^(subtitle|text|body|description|intro|content|quote|answer|question|label)$/.test(k) && x.trim() && x.length > 2) out.push({ t: 'p', text: strip(x) });
      } else walk(x, depth + 1);
    }
  };
  for (const s of sections || []) if (!s.hidden) walk(s.props || {}, 0);
  return out.slice(0, 300);
}
const card = (a) => ({ title: a.title, sub: a.subtitle || '', img: okUrl(a.cover_url), meta: [a.category_name, D(a.date)].filter(Boolean).join(' · '), href: `/articles/${a.slug}` });

/** Μια «σελίδα» για το VR. Επιστρέφει { title, kind, ... }. */
export async function vrView(path) {
  const p = String(path || '/').split('?')[0].replace(/\/+$/, '') || '/', seg = p.split('/').filter(Boolean);
  const site = await getSite();
  const base = { site: { name: site.name, nav: (site.nav || []).filter((n) => n.visible !== false).map((n) => ({ label: n.label, href: n.href })) } };
  if (p === '/') {
    const [rec, feat, eds] = await Promise.all([getArticles({ limit: 8 }), getArticles({ limit: 3, featured: true }), getEditions({ limit: 1 })]);
    return { ...base, kind: 'home', title: site.name, intro: site.tagline || site.description || '', featured: feat.rows.map(card), recent: rec.rows.map(card),
      edition: eds[0] ? { title: eds[0].title, sub: eds[0].description || '', img: okUrl(eds[0].cover_url), href: `/editions/${eds[0].slug}` } : null };
  }
  if (seg[0] === 'articles' && !seg[1]) return { ...base, kind: 'articles', title: 'Άρθρα', ...(await articleList()) };
  if (seg[0] === 'categories' || (seg[0] === 'articles' && seg[1] === 'category')) return { ...base, kind: 'articles', title: 'Κατηγορίες', ...(await articleList()) };
  if (seg[0] === 'articles') {
    const a = await getArticle(decodeURIComponent(seg[1])); if (!a) return null;
    return { ...base, kind: 'article', title: a.title, sub: a.subtitle || '', img: okUrl(a.cover_url), meta: [a.author_name, a.category_name, D(a.date)].filter(Boolean).join(' · '), blocks: htmlBlocks(a.content) };
  }
  if (seg[0] === 'editions' && !seg[1]) return { ...base, kind: 'cards', title: 'Τεύχη της εφημερίδας', cards: (await getEditions({ limit: 40 })).map((e) => ({ title: e.title, sub: e.description || '', img: okUrl(e.cover_url), meta: [e.school_year, D(e.pub_date)].filter(Boolean).join(' · '), href: `/editions/${e.slug}` })) };
  if (seg[0] === 'editions') {
    const e = await getEdition(decodeURIComponent(seg[1])); if (!e) return null;
    return { ...base, kind: 'article', title: e.title, sub: e.description || '', img: okUrl(e.cover_url), meta: [e.school_year, D(e.pub_date)].filter(Boolean).join(' · '),
      blocks: [{ t: 'p', text: 'Το τεύχος είναι PDF. Για να το ξεφυλλίσεις, άνοιξέ το έξω από το VR.' }], outside: `/editions/${e.slug}` };
  }
  if (seg[0] === 'play' && !seg[1]) {
    const advs = await q("select slug, title, description, cover_url from adventures where status='published' order by sort, id").catch(() => []);
    return { ...base, kind: 'games', title: 'Παιχνίδια',
      game3d: { title: 'Τα Χριστούγεννα του Κιμωλάκη', sub: 'Η 3D περιπέτειά μας — παίζεται ΜΕΣΑ στο VR!' },
      adventures: advs.map((a) => ({ title: a.title, sub: a.description || '', img: okUrl(a.cover_url), href: `/play/adventures/${a.slug}` })),
      games: Object.entries(GAMES).map(([k, g]) => ({ title: `${g.icon} ${g.label}`, sub: g.desc, href: `/play/games/${k}`, outside: true })) };
  }
  if (seg[0] === 'play' && seg[1] === 'adventures' && seg[2]) {
    const a = (await q("select slug, title, description, scenes, unlock_level, xp_reward from adventures where slug=$1 and status='published'", [decodeURIComponent(seg[2])]))[0]; if (!a) return null;
    return { ...base, kind: 'adventure', title: a.title, sub: a.description || '', slug: a.slug, unlock: a.unlock_level, xp: a.xp_reward,
      scenes: (a.scenes || []).map((s) => ({ id: s.id, title: s.title, text: s.text, end: !!s.end, endingTitle: s.endingTitle || '', choices: (s.choices || []).filter((c) => c.to && c.label) })) };
  }
  if (seg[0] === 'help' && !seg[1]) return { ...base, kind: 'cards', title: 'Οδηγοί βοήθειας', cards: (await publishedTutorials()).map((t) => ({ title: `${t.icon} ${t.title}`, sub: t.subtitle || '', href: `/help/${t.slug}` })) };
  if (seg[0] === 'help') {
    const t = await getTutorial(decodeURIComponent(seg[1])); if (!t) return null; const vars = tutorialVars();
    const blocks = []; let n = 0; const shot = (b) => (okUrl(b.img) ? [{ t: 'img', src: okUrl(b.img) }, ...(b.caption ? [{ t: 'small', text: b.caption }] : [])] : []);
    if (t.intro) blocks.push({ t: 'p', text: strip(renderText(t.intro, vars)) });
    for (const b of t.blocks || []) {
      if (b.kind === 'image') { blocks.push(...shot(b)); continue; }
      if (b.kind === 'button') { if (b.label) blocks.push({ t: 'p', text: '👉 ' + b.label }); continue; }
      const body = htmlBlocks(blockHtml(b, vars));
      if (b.kind === 'step') { n++; blocks.push({ t: 'step', n, text: b.title }, ...body, ...shot(b)); }
      else if (b.kind === 'tip' || b.kind === 'warn') blocks.push({ t: b.kind, text: b.title, body: body.filter((x) => x.text).map((x) => (x.t === 'li' ? '• ' : '') + x.text).join('\n') }, ...shot(b));
      else blocks.push(...(b.title ? [{ t: 'h', text: b.title }] : []), ...body, ...shot(b));
    }
    return { ...base, kind: 'article', title: `${t.icon} ${t.title}`, sub: t.subtitle || '', blocks };
  }
  if (seg[0] === 'account' || seg[0] === 'newsletter' || seg[0] === 'editor-panel') return { ...base, kind: 'outside', title: 'Άνοιγμα έξω από το VR', outside: p };
  if (seg.length === 1) {
    const secs = await getPage(seg[0]).catch(() => null); if (!secs) return null;
    const head = secs.find((s) => s.type === 'pageHeader')?.props;
    return { ...base, kind: 'article', title: head?.title || seg[0], sub: head?.subtitle || '', blocks: sectionBlocks(secs.filter((s) => s.type !== 'pageHeader')), outside: p };
  }
  return { ...base, kind: 'outside', title: 'Άνοιγμα έξω από το VR', outside: p };
}
async function articleList() {
  const [list, cats] = await Promise.all([getArticles({ limit: 40 }), getCategories()]);
  return { cards: list.rows.map(card), cats: cats.filter((c) => c.count > 0).map((c) => ({ label: c.name, slug: c.slug, color: c.color })) };
}
export async function vrCategory(slug) {
  const list = await getArticles({ limit: 40, category: slug });
  return list.rows.map(card);
}
