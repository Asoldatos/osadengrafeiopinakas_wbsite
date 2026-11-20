import { SITE_URL } from '@/lib/util';
import { sitemapGroups } from '@/lib/sitemapData';

// /sitemap.xml — για τις μηχανές αναζήτησης. Ανανεώνεται κάθε ώρα (και πάντα με το δημοσιευμένο περιεχόμενο).
export const revalidate = 3600;
const abs = (u) => (u && /^https?:\/\//.test(u) ? u : u ? SITE_URL + u : null);

export default async function sitemap() {
  try {
    const groups = await sitemapGroups(), seen = new Set(), out = [];
    for (const g of groups) {
      if (g.noXml) continue;                                     // σελίδες σύνδεσης/λογαριασμού: όχι στις μηχανές αναζήτησης
      for (const it of g.items) {
        if (it.path.includes('?') || seen.has(it.path)) continue; // φίλτρα κατηγοριών = ίδια σελίδα με τα άρθρα
        seen.add(it.path);
        const img = abs(it.image);
        out.push({ url: SITE_URL + (it.path === '/' ? '' : it.path), lastModified: it.updated ? new Date(it.updated) : undefined, changeFrequency: it.freq, priority: it.priority, ...(img ? { images: [img] } : {}) });
      }
    }
    return out;
  } catch {
    return ['', '/articles', '/editions', '/play', '/help'].map((p) => ({ url: SITE_URL + p, changeFrequency: 'weekly' }));
  }
}
