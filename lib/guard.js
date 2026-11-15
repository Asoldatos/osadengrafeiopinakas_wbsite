import { NextResponse } from 'next/server';
import { getSession } from './auth';
import { can } from './perms.mjs';

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/** Περιτύλιγμα API: έλεγχος Origin (CSRF), σύνδεσης και ρόλου. */
/** perm: απαιτούμενο δικαίωμα (null = κάθε συνδεδεμένος διαχειριστής). Οι ρόλοι/δικαιώματα ελέγχονται ΠΑΝΤΑ εδώ, στον διακομιστή. */
export function route(fn, { perm = null, open = false, allowMustChange = false } = {}) {
  return async (req, ctx) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        const o = req.headers.get('origin');
        let ok = false;
        try { ok = !!o && new URL(o).host === req.headers.get('host'); } catch {}
        if (!ok && !(open === 'external')) return json({ error: 'Μη έγκυρο αίτημα (origin).' }, 403);
      }
      let user = null;
      if (!open) {
        user = await getSession();
        if (!user || user.pending) return json({ error: 'Απαιτείται σύνδεση.' }, 401);
        if (user.must_change && !allowMustChange) return json({ error: 'Πρέπει πρώτα να αλλάξεις τον κωδικό σου.', mustChange: true }, 403);
        if (perm && !can(user, perm)) return json({ error: 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.' }, 403);
      }
      return await fn(req, ctx, user);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return json({ error: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' }, 500);
    }
  };
}
export async function body(req) {
  try { return await req.json(); } catch { throw json({ error: 'Μη έγκυρα δεδομένα.' }, 400); }
}

/** Έλεγχος δικαιώματος μέσα σε handler (όταν το δικαίωμα εξαρτάται από την ενέργεια). */
export function need(user, perm) { if (!can(user, perm)) throw json({ error: 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.' }, 403); }
