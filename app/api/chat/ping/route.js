import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
/** «Είμαι online» (κάθε 60″ όσο το chat είναι ανοιχτό). */
export const POST = sroute(async (_r, _c, st) => { await q('update students set last_seen_chat=now() where id=$1', [st.id]); return json({ ok: true }); });
