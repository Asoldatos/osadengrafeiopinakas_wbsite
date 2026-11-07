import { q } from '@/lib/db';
import { json, body } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
import { finishPlay } from '@/lib/student';
import { levelFor } from '@/lib/progress.mjs';

/** Αποθήκευση προόδου (σκηνή) και ολοκλήρωση περιπέτειας (XP μία φορά). */
export const POST = sroute(async (req, { params }, st) => {
  const { scene, finish } = await body(req);
  const adv = (await q("select id, scenes, xp_reward, unlock_level from adventures where slug=$1 and status='published'", [params.slug]))[0];
  if (!adv) return json({ error: 'Η περιπέτεια δεν βρέθηκε.' }, 404);
  if (adv.unlock_level > 0 && levelFor(st.xp) < adv.unlock_level) return json({ error: `Η περιπέτεια ξεκλειδώνει στο επίπεδο ${adv.unlock_level}.` }, 403);
  const sc = adv.scenes.find((s) => s.id === scene);
  if (!sc) return json({ error: 'Άγνωστη σκηνή.' }, 400);
  if (!finish) {
    await q(`insert into adventure_progress(student_id, adventure_id, scene_id) values($1,$2,$3)
      on conflict (student_id, adventure_id) do update set scene_id=excluded.scene_id, updated_at=now()`, [st.id, adv.id, scene]);
    return json({ ok: true });
  }
  if (!sc.end) return json({ error: 'Αυτή δεν είναι τελική σκηνή.' }, 400);
  await q(`insert into adventure_progress(student_id, adventure_id, scene_id) values($1,$2,$3)
    on conflict (student_id, adventure_id) do update set scene_id=excluded.scene_id, updated_at=now()`, [st.id, adv.id, scene]);
  // Ατομική «διεκδίκηση» της ολοκλήρωσης: το XP δίνεται μόνο μία φορά, ακόμα και με διπλό κλικ
  const claim = await q('update adventure_progress set finished=true, finished_at=now() where student_id=$1 and adventure_id=$2 and not finished returning 1', [st.id, adv.id]);
  if (!claim.length) return json({ already: true });
  const count = (await q('select count(*)::int n from adventure_progress where student_id=$1 and finished', [st.id]))[0].n;
  const xp = await finishPlay(st.id, { xp: adv.xp_reward, codes: ['first-story', count >= 3 ? 'explorer' : null] });
  return json({ xp });
});
