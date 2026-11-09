/** Σφάλμα «λείπει πίνακας/στήλη» της Postgres (42P01 / 42703). */
export const isMissing = (e) => ['42P01', '42703'].includes(e?.code) || /(relation|column) "[^"]*" (of relation "[^"]*" )?does not exist/.test(String(e?.message || ''));

/** Περιτυλίγει τη συνάρτηση ερωτημάτων: αν λείπει πίνακας, τρέχει ΜΙΑ φορά (ανά 30" ανά instance) την ενημέρωση βάσης και ξαναδοκιμάζει. */
export function makeQuery(exec, heal, { cooldownMs = 30000, log = console.warn } = {}) {
  const st = { p: null, t: 0 };
  return async function q(text, params = []) {
    try { return await exec(text, params); }
    catch (e) {
      if (!isMissing(e)) throw e;
      if (!st.p) {
        if (Date.now() - st.t < cooldownMs) throw e;
        log('Η βάση δεδομένων χρειάζεται ενημέρωση, γίνεται αυτόματα…', e.message);
        st.p = Promise.resolve().then(() => heal(exec)).finally(() => { st.t = Date.now(); st.p = null; });
      }
      await st.p;
      return exec(text, params);
    }
  };
}
