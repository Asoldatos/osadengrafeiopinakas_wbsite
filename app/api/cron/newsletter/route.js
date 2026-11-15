import { NextResponse } from 'next/server';
import { runDue } from '@/lib/newsletterSend';
import { tooMany, recordFail, clientIp } from '@/lib/auth';
import { siteUrl } from '@/lib/siteurl.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
/** Αυτόματη αποστολή προγραμματισμένων ενημερωτικών (Vercel Cron, βλ. vercel.json). Στέλνει ΜΟΝΟ όσα έφτασε η ώρα τους, οπότε δεν μπορεί να «προκαλέσει» πρόωρη αποστολή.
 *  Αν έχει οριστεί CRON_SECRET, απαιτείται (το Vercel το στέλνει αυτόματα ως «Authorization: Bearer …»). */
export async function GET(req) {
  const secret = process.env.CRON_SECRET, url = new URL(req.url);
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || url.searchParams.get('secret') || '';
  if (secret ? given !== secret : await tooMany(`cron:${clientIp(req)}`, 2, 1)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!secret) await recordFail(`cron:${clientIp(req)}`);
  const done = await runDue({ budgetMs: 45000 });
  const left = done.reduce((n, d) => n + (d.remaining || 0), 0);
  if (left > 0) {   // συνέχεια σε νέα κλήση (κάθε κλήση έχει όριο χρόνου)
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 1500);
    try { await fetch(`${siteUrl()}/api/cron/newsletter`, { headers: secret ? { authorization: `Bearer ${secret}` } : {}, signal: ctl.signal, cache: 'no-store' }); } catch {}
  }
  return NextResponse.json({ ok: true, done, remaining: left }, { headers: { 'Cache-Control': 'no-store' } });
}
