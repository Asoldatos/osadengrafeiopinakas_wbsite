import { NextResponse } from 'next/server';
import { vrView, vrCategory } from '@/lib/vrContent';

export const dynamic = 'force-dynamic';

/** Ο ιστότοπος σε μορφή για το VR (μόνο δημοσιευμένο περιεχόμενο, μόνο ανάγνωση). ?path=/articles/… ή ?cat=slug */
export async function GET(req) {
  const u = new URL(req.url), cat = u.searchParams.get('cat'), path = (u.searchParams.get('path') || '/').slice(0, 300);
  try {
    const data = cat ? { kind: 'articles', cards: await vrCategory(cat.slice(0, 100)) } : await vrView(path);
    if (!data) return NextResponse.json({ error: 'Η σελίδα δεν βρέθηκε.' }, { status: 404 });
    return NextResponse.json(data, { headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' } });
  } catch (e) {
    console.error('vr', e); return NextResponse.json({ error: 'Κάτι πήγε στραβά.' }, { status: 500 });
  }
}
