import { json } from './guard';
import { getStudent } from './student';

/** Περιτύλιγμα API για μαθητές: έλεγχος Origin (CSRF) και σύνδεσης. */
export function sroute(fn, { open = false } = {}) {
  return async (req, ctx) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        const o = req.headers.get('origin'); let ok = false;
        try { ok = !!o && new URL(o).host === req.headers.get('host'); } catch {}
        if (!ok) return json({ error: 'Μη έγκυρο αίτημα (origin).' }, 403);
      }
      const st = await getStudent();
      if (!open && !st) return json({ error: 'Συνδέσου για να συνεχίσεις.', login: true }, 401);
      return await fn(req, ctx, st);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return json({ error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.' }, 500);
    }
  };
}
