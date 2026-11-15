import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { verifyActivation, signIntro } from '@/lib/activation.mjs';
import { themeAvailability } from '@/lib/themes.mjs';
import { getTheme } from '@/lib/themeServer';
import { siteUrl } from '@/lib/siteurl.mjs';
import { tooMany, recordFail, clientIp } from '@/lib/auth';

/** Κουμπί ενεργοποίησης από το newsletter: ελέγχει την υπογραφή (HMAC), καταγράφει το κλικ και ορίζει ένα βραχύβιο, υπογεγραμμένο cookie μίας χρήσης
 *  που λέει στην αρχική σελίδα να ξεκινήσει αυτόματα η κινηματογραφική μετάβαση. Το cookie επιβιώνει της ανακατεύθυνσης και καταναλώνεται αμέσως. */
export async function GET(req) {
  const home = new URL('/', siteUrl()), ip = clientIp(req);
  if (await tooMany(`act:${ip}`, 30, 10)) return NextResponse.redirect(home, 303);
  const a = verifyActivation(new URL(req.url).searchParams.get('t'));
  if (!a) { await recordFail(`act:${ip}`); return NextResponse.redirect(home, 303); }
  const theme = await getTheme(a.theme);
  if (!theme || theme.mode === 'off') return NextResponse.redirect(home, 303);
  // Οι δοκιμαστικές αποστολές (παραλήπτης 0) δουλεύουν και πριν ανοίξει το θέμα· τα κανονικά κλικ μόνο όταν είναι διαθέσιμο.
  if (a.subscriber !== 0 && !themeAvailability(theme).available) return NextResponse.redirect(home, 303);
  try {
    await q(`insert into theme_activations(theme, campaign_id, subscriber_id, count) values($1,$2,$3,1)
      on conflict (theme, campaign_id, subscriber_id) do update set count = theme_activations.count + 1, last_at = now()`, [a.theme, a.campaign, a.subscriber]);
  } catch (e) { console.error(e.message); }
  const res = NextResponse.redirect(home, 303);
  res.cookies.set({ name: 'ti', value: signIntro(a.theme), httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60 });
  res.headers.set('Cache-Control', 'no-store'); res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
