import { route, json, body } from '@/lib/guard';
import { moderate, filterOpts, cleanCommunity } from '@/lib/community.mjs';
import { getCommunity } from '@/lib/communityServer';
/** Δοκιμή του φίλτρου από τον πίνακα (με τις τρέχουσες ή τις μη αποθηκευμένες ρυθμίσεις). Δεν αποθηκεύει τίποτα. */
export const POST = route(async (req) => {
  const b = await body(req);
  const c = b.settings ? cleanCommunity(b.settings) : await getCommunity();
  const text = String(b.text || '').slice(0, 2000);
  return json({ comments: moderate(text, filterOpts(c, 'comments')), messages: moderate(text, filterOpts(c, 'messages')) });
}, { perm: 'community' });
