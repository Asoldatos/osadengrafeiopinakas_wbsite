import { q } from './db';
import { json } from './guard';
import { cleanCommunity, pair } from './community.mjs';

/** Ρυθμίσεις κοινότητας (settings.community). */
export async function getCommunity() {
  try { const r = await q("select value from settings where key='community'"); return cleanCommunity(r[0]?.value || {}); } catch { return cleanCommunity({}); }
}
/** Πετάει 403 αν η λειτουργία είναι κλειστή ή αν ο μαθητής έχει αποκλειστεί από την κοινότητα. */
export async function needFeature(feature, st) {
  const c = await getCommunity();
  if (!c[feature]) throw json({ error: 'Αυτή η λειτουργία είναι προσωρινά κλειστή.' }, 403);
  if (st) {
    const r = await q('select community_banned from students where id=$1', [st.id]);
    if (r[0]?.community_banned) throw json({ error: 'Ο λογαριασμός σου δεν μπορεί να χρησιμοποιήσει τις λειτουργίες κοινότητας. Αν νομίζεις ότι έγινε λάθος, γράψε μας από τη φόρμα επικοινωνίας.' }, 403);
  }
  return c;
}
/** Είναι φίλοι (αποδεκτό αίτημα) και δεν έχει μπλοκάρει κανείς τον άλλον; */
export async function canTalk(x, y) {
  if (x === y) return false;
  const [a, b] = pair(x, y);
  const r = await q(`select (select status from friendships where a=$1 and b=$2) s,
    exists(select 1 from blocks where (blocker=$1 and blocked=$2) or (blocker=$2 and blocked=$1)) blk,
    (select community_banned or disabled from students where id=$3) other_off`, [a, b, y]);
  return r[0]?.s === 'accepted' && !r[0].blk && !r[0].other_off;
}
/** Απλό όριο ρυθμού: πόσες εγγραφές του μαθητή σε ένα χρονικό διάστημα. */
export async function countSince(sql, params) { return (await q(sql, params))[0]?.n || 0; }
