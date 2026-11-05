import { destroySession, COOKIE } from '@/lib/auth';
import { route } from '@/lib/guard';
import { NextResponse } from 'next/server';
export const POST = route(async () => {
  await destroySession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE, value: '', path: '/', maxAge: 0 });
  return res;
}, { open: true });
