import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { finishPlay } from '@/lib/student';
import { XMAS3D } from '@/lib/progress.mjs';

export const dynamic = 'force-dynamic';
const mask = (e) => { const [u, d] = String(e || '').split('@'); return u && d ? `${u.slice(0, 2)}${'•'.repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d}` : ''; };
const read = async (id) => (await q('select max_ch, completed, completed_at from xmas3d_progress where student_id=$1', [id]))[0] || { max_ch: 0, completed: false, completed_at: null };

/** Κατάσταση: ποιος είναι συνδεδεμένος και τι έχει αποθηκευτεί. Ανοιχτό και για μη συνδεδεμένους (επιστρέφει student: null). */
export const GET = sroute(async (_req, _ctx, st) => {
  if (!st) return json({ student: null, progress: null });
  return json({ student: { nickname: st.nickname, email: mask(st.email) }, progress: await read(st.id) });
}, { open: true });

/**
 * Αποθήκευση προόδου. { maxCh: 0–6, completed: bool, source: 'live' | 'claim' }
 * Η πρόοδος μόνο ανεβαίνει (ποτέ δεν χάνεται). Η ολοκλήρωση δίνει XP + παράσημο ΜΙΑ φορά (ατομικά).
 */
export const POST = sroute(async (req, _ctx, st) => {
  const b = await body(req);
  const maxCh = Math.max(0, Math.min(XMAS3D.chapters - 1, Math.trunc(Number(b.maxCh)) || 0));
  const completed = b.completed === true, source = b.source === 'claim' ? 'claim' : 'live';
  await q(`insert into xmas3d_progress(student_id, max_ch, source) values($1,$2,$3)
    on conflict (student_id) do update set max_ch = greatest(xmas3d_progress.max_ch, excluded.max_ch), updated_at = now()`, [st.id, maxCh, source]);
  let reward = null;
  if (completed) {
    const won = await q(`update xmas3d_progress set completed = true, completed_at = now(), max_ch = $2, plays = plays + 1, source = $3
      where student_id = $1 and not completed returning 1`, [st.id, XMAS3D.chapters - 1, source]);
    if (won.length) reward = await finishPlay(st.id, { xp: XMAS3D.xp, codes: ['xmas-hero', 'first-game'] });
    else await q('update xmas3d_progress set plays = plays + 1 where student_id=$1', [st.id]);
  }
  return json({ ok: true, progress: await read(st.id), reward });
});
