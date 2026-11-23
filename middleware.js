import { NextResponse } from 'next/server';
/** chat.osaden.gr: η αρχική σελίδα του υποτομέα δείχνει την εφαρμογή chat (/chat). Όλα τα άλλα (api, λογαριασμός, στατικά) περνούν κανονικά. */
export function middleware(req) {
  const host = (req.headers.get('host') || '').toLowerCase();
  if (host.startsWith('chat.') && req.nextUrl.pathname === '/') { const u = req.nextUrl.clone(); u.pathname = '/chat'; return NextResponse.rewrite(u); }
  return NextResponse.next();
}
export const config = { matcher: ['/'] };
