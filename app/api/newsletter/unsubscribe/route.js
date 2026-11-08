import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { baseUrl } from '@/lib/mail.mjs';

const TOKEN = /^[a-f0-9]{48}$/;
// GET (άνοιγμα συνδέσμου) → σελίδα επιβεβαίωσης, ώστε προγράμματα προεπισκόπησης email να μην διαγράφουν κατά λάθος.
export async function GET(req) {
  const t = new URL(req.url).searchParams.get('token') || '';
  return NextResponse.redirect(`${baseUrl()}/newsletter/unsubscribe${TOKEN.test(t) ? `?token=${t}` : ''}`, 303);
}
// POST: σελίδα διαγραφής ΚΑΙ «διαγραφή με ένα κλικ» (RFC 8058) από τον πελάτη email (χωρίς Origin).
export async function POST(req) {
  const ip = clientIp(req);
  if (await tooMany(`nlu-ip:${ip}`, 60, 60)) return NextResponse.json({ error: 'Πολλά αιτήματα.' }, { status: 429 });
  let t = new URL(req.url).searchParams.get('token') || '';
  if (!t) { try { t = (await req.json()).token || ''; } catch {} }
  if (!TOKEN.test(t)) { await recordFail(`nlu-ip:${ip}`); return NextResponse.json({ error: 'Μη έγκυρος σύνδεσμος.' }, { status: 400 }); }
  const r = await q("update subscribers set status='unsubscribed', unsub_at=now(), confirm_hash=null where token=$1 returning id", [t]);
  if (!r.length) { await recordFail(`nlu-ip:${ip}`); return NextResponse.json({ error: 'Δεν βρέθηκε η εγγραφή.' }, { status: 404 }); }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
