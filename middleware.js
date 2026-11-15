import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/siteurl.mjs';

/** Κανονικοποίηση διεύθυνσης: στην παραγωγή, τα *.vercel.app και το www ανακατευθύνονται (308) στο επίσημο domain (osaden.gr). Μόνο για σελίδες (GET/HEAD), όχι για API/αρχεία. */
export function middleware(req) {
  if (process.env.VERCEL_ENV !== 'production' || !['GET', 'HEAD'].includes(req.method)) return NextResponse.next();
  const host = (req.headers.get('host') || '').toLowerCase(), canon = new URL(siteUrl());
  if (host !== canon.host && (host.endsWith('.vercel.app') || host === `www.${canon.host}`)) {
    const u = req.nextUrl.clone(); u.protocol = 'https:'; u.host = canon.host; u.port = ''; return NextResponse.redirect(u, 308);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!api/|_next/|favicon\\.ico|brand/|audio/|.*\\.[a-zA-Z0-9]{2,5}$).*)'] };
