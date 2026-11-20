import { SITE_URL } from '@/lib/util';
export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/editor-panel', '/api/', '/account', '/game/xmas/voice/'] }], sitemap: `${SITE_URL}/sitemap.xml` };
}
