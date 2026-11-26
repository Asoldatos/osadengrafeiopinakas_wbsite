import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/data';

// Ζωντανή αναζήτηση άρθρων (για το παράθυρο αναζήτησης). Μόνο δημοσιευμένα άρθρα, μόνο βασικά πεδία.
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const qs = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (qs.length < 2) return NextResponse.json({ rows: [], total: 0 });
  try {
    const { rows, total } = await getArticles({ search: qs, limit: 6 });
    return NextResponse.json({ total, rows: rows.map((a) => ({ slug: a.slug, title: a.title, subtitle: a.subtitle, cover_url: a.cover_url, category_name: a.category_name, category_color: a.category_color, date: a.date })) },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch { return NextResponse.json({ rows: [], total: 0 }); }
}
