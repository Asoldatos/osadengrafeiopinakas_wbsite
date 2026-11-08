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

/** Πόροι με adminOnly (λογαριασμοί, συνδρομητές, αποστολές) επιτρέπονται μόνο στον διαχειριστή. */
export function assertRole(cfg, user) { if (cfg.adminOnly && user?.role !== 'admin') throw json({ error: 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.' }, 403); }
