// Όλες οι δημόσιες σελίδες του ιστοτόπου, σε ομάδες. Το χρησιμοποιούν ΚΑΙ το sitemap.xml (για Google κ.λπ.)
// ΚΑΙ η σελίδα «Χάρτης ιστοτόπου» (/sitemap) για τους επισκέπτες. Μόνο δημοσιευμένο περιεχόμενο.
import { q } from './db';
import { GAMES } from './progress.mjs';

// σελίδες του Σχεδιαστή που δεν μπαίνουν στη λίστα (η αρχική είναι το «/», ο οδηγός email έγινε /help/email-help)
const SKIP_PAGES = new Set(['home', 'email-help', 'maintenance']);
const safe = (p) => p.catch((e) => { console.error('sitemap', e?.message); return []; });
const pageTitle = (secs, slug) => (Array.isArray(secs) ? secs.find((s) => s?.type === 'pageHeader')?.props?.title : null) || slug.replace(/-/g, ' ');

export async function sitemapGroups() {
  const [articles, editions, categories, pages, tutorials, adventures] = await Promise.all([
    safe(q(`select a.slug, a.title, a.cover_url, a.updated_at, coalesce(a.publish_at, a.created_at) as date from articles a
      where a.status='published' and (a.publish_at is null or a.publish_at<=now()) order by coalesce(a.publish_at, a.created_at) desc`)),
    safe(q("select slug, title, cover_url, updated_at from editions where status in ('published','archived') order by pub_date desc nulls last, id desc")),
    safe(q("select c.slug, c.name from categories c where exists (select 1 from articles a where a.category_id=c.id and a.status='published' and (a.publish_at is null or a.publish_at<=now())) order by c.sort, c.name")),
    safe(q('select slug, published, updated_at from pages order by slug')),
    safe(q("select slug, title, updated_at from tutorials where status='published' order by sort, id")),
    safe(q("select slug, title, updated_at from adventures where status='published' order by sort, id")),
  ]);
  const custom = pages.filter((p) => !SKIP_PAGES.has(p.slug) && Array.isArray(p.published) && p.published.some((s) => !s?.hidden));
  return [
    { id: 'main', title: 'Κύριες σελίδες', icon: '🏠', items: [
      { path: '/', title: 'Αρχική', freq: 'daily', priority: 1 },
      { path: '/articles', title: 'Όλα τα άρθρα', freq: 'daily', priority: 0.9 },
      { path: '/editions', title: 'Τεύχη της εφημερίδας', freq: 'weekly', priority: 0.8 },
      { path: '/categories', title: 'Κατηγορίες', freq: 'weekly', priority: 0.6 },
      { path: '/play', title: 'Παιχνίδια', freq: 'weekly', priority: 0.8 },
      { path: '/help', title: 'Οδηγοί βοήθειας', freq: 'monthly', priority: 0.5 },
      { path: '/newsletter', title: 'Ενημερωτικό δελτίο', freq: 'monthly', priority: 0.4 },
      ...custom.map((p) => ({ path: `/${p.slug}`, title: pageTitle(p.published, p.slug), updated: p.updated_at, freq: 'monthly', priority: 0.6 })),
    ] },
    { id: 'articles', title: 'Άρθρα', icon: '📰', items: articles.map((a) => ({ path: `/articles/${a.slug}`, title: a.title, updated: a.updated_at || a.date, image: a.cover_url, freq: 'monthly', priority: 0.7 })) },
    { id: 'categories', title: 'Κατηγορίες άρθρων', icon: '🏷️', items: categories.map((c) => ({ path: `/articles?category=${encodeURIComponent(c.slug)}`, title: c.name, freq: 'weekly', priority: 0.5 })) },
    { id: 'editions', title: 'Τεύχη', icon: '🗞️', items: editions.map((e) => ({ path: `/editions/${e.slug}`, title: e.title, updated: e.updated_at, image: e.cover_url, freq: 'yearly', priority: 0.6 })) },
    { id: 'games', title: 'Παιχνίδια', icon: '🎮', items: [
      ...adventures.map((a) => ({ path: `/play/adventures/${a.slug}`, title: `🗺️ ${a.title}`, updated: a.updated_at, freq: 'monthly', priority: 0.5 })),
      ...Object.entries(GAMES).map(([k, g]) => ({ path: `/play/games/${k}`, title: `${g.icon} ${g.label}`, freq: 'monthly', priority: 0.5 })),
    ] },
    { id: 'help', title: 'Οδηγοί βοήθειας', icon: '📘', items: tutorials.map((t) => ({ path: `/help/${t.slug}`, title: t.title, updated: t.updated_at, freq: 'monthly', priority: 0.4 })) },
    { id: 'account', title: 'Λογαριασμός μαθητή', icon: '🧑‍🎓', noXml: true, items: [
      { path: '/account/register', title: 'Δημιουργία λογαριασμού' }, { path: '/account/login', title: 'Σύνδεση' },
    ] },
  ].filter((g) => g.items.length);
}
