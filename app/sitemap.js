import { q } from '@/lib/db';
import { SITE_URL } from '@/lib/util';
export const dynamic = 'force-dynamic';
export default async function sitemap() {
  const base = ['', '/articles', '/editions', '/play', '/categories', '/team', '/about', '/contact'].map((p) => ({ url: SITE_URL + p, changeFrequency: 'weekly' }));
  try {
    const a = await q("select slug, updated_at from articles where status='published' and (publish_at is null or publish_at<=now())");
    const e = await q("select slug, updated_at from editions where status in ('published','archived')");
    return [...base, ...a.map((x) => ({ url: `${SITE_URL}/articles/${x.slug}`, lastModified: x.updated_at })), ...e.map((x) => ({ url: `${SITE_URL}/editions/${x.slug}`, lastModified: x.updated_at }))];
  } catch { return base; }
}
