import { NextResponse } from 'next/server';
import { getSession } from './auth';

export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/** Περιτύλιγμα API: έλεγχος Origin (CSRF), σύνδεσης και ρόλου. */
export function route(fn, { role = 'editor', open = false } = {}) {
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
        if (role === 'admin' && user.role !== 'admin') return json({ error: 'Δεν έχετε δικαίωμα για αυτήν την ενέργεια.' }, 403);
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
