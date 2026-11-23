import { NextResponse } from 'next/server';
import { sroute } from '@/lib/sguard';
import { destroyStudentSession, clearStudentCookie, clearLegacyCookie } from '@/lib/student';
export const POST = sroute(async () => { await destroyStudentSession(); const res = NextResponse.json({ ok: true }); res.cookies.set(clearStudentCookie()); clearLegacyCookie(res); return res; }, { open: true });
