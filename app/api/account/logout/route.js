import { NextResponse } from 'next/server';
import { sroute } from '@/lib/sguard';
import { destroyStudentSession, clearStudentCookie } from '@/lib/student';
export const POST = sroute(async () => { await destroyStudentSession(); const res = NextResponse.json({ ok: true }); res.cookies.set(clearStudentCookie()); return res; }, { open: true });
