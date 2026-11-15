/** Η επίσημη διεύθυνση του ιστοτόπου. Αλλάζει από τη μεταβλητή NEXT_PUBLIC_SITE_URL· στην παραγωγή, αν λείπει ή δείχνει σε *.vercel.app/localhost, χρησιμοποιείται η προεπιλογή. */
export const DEFAULT_SITE_URL = 'https://osaden.gr';
const ENV = () => (typeof process !== 'undefined' && process.env) || {};
export function siteUrl(env = ENV()) {
  const e = String(env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (e && !/localhost|\.vercel\.app/i.test(e)) return e.replace(/\/$/, '');
  if (env.NODE_ENV === 'production' || env.VERCEL_ENV) return DEFAULT_SITE_URL;
  return (e || 'http://localhost:3000').replace(/\/$/, '');
}
export const siteHost = (env = ENV()) => new URL(siteUrl(env)).host;
