import { NextResponse } from 'next/server';
/** Καταναλώνει το cookie εισαγωγής (ώστε η αυτόματη μετάβαση να μην ξαναπαίξει με ανανέωση της σελίδας). */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: 'ti', value: '', path: '/', maxAge: 0 });
  return res;
}
