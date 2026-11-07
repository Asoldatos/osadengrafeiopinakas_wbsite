import { q } from '@/lib/db';
import { json } from '@/lib/guard';
import { sroute } from '@/lib/sguard';
export const GET = sroute(async () => {
  const r = (await q('select word, hint from words where active order by random() limit 1'))[0];
  return r ? json(r) : json({ error: 'Δεν υπάρχουν ακόμα λέξεις.' }, 503);
});
