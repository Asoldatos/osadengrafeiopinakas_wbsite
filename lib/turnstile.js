/** Προαιρετικός έλεγχος «δεν είμαι ρομπότ» (Cloudflare Turnstile). Ενεργοποιείται αν οριστεί TURNSTILE_SECRET_KEY. */
export async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: String(token), remoteip: ip || '' }) });
    return !!(await r.json()).success;
  } catch { return false; }
}
