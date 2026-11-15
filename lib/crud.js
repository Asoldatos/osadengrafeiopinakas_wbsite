import { q } from './db';
import { RES } from './resources';
import { slugify } from './util';
import { json } from './guard';

export async function uniqueSlug(cfg, base, excludeId) {
  let s = slugify(base), n = 1;
  const b = s;
  for (;;) {
    const r = await q(`select id from ${cfg.table} where slug=$1 ${excludeId ? 'and id<>$2' : ''}`, excludeId ? [s, excludeId] : [s]);
    if (!r.length) return s;
    s = b + '-' + ++n;
  }
}
export function cfgFor(name) {
  const c = RES[name];
  if (!c) throw json({ error: 'Άγνωστος πόρος.' }, 404);
  return c;
}

import { can } from './perms.mjs';
/** read=true: ανάγνωση λίστας. Οι μη ευαίσθητοι πόροι (readAny) διαβάζονται από κάθε διαχειριστή, π.χ. για τις λίστες επιλογής. */
export function assertPerm(cfg, user, read = false) { if (read && cfg.readAny) return; if (!can(user, cfg.perm)) throw json({ error: 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.' }, 403); }
const ms = (v) => (v ? new Date(v).getTime() : null);
/** Η αλλαγή κατάστασης/ώρας δημοσίευσης απαιτεί το δικαίωμα «publish», ανεξάρτητα από το δικαίωμα επεξεργασίας. */
export function publishGuard(cfg, user, current, clean) {
  if (!cfg.publish || can(user, 'publish')) return;
  const status = clean.status !== undefined && clean.status !== (current ? current.status : 'draft');
  const when = clean.publish_at !== undefined && ms(clean.publish_at) !== (current ? ms(current.publish_at) : null);
  if (status || when) throw json({ error: 'Δεν έχετε δικαίωμα δημοσίευσης ή αλλαγής κατάστασης. Μπορείτε να αποθηκεύσετε ως πρόχειρο.' }, 403);
}
