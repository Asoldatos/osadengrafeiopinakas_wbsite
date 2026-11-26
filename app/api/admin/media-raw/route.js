import { route, json } from '@/lib/guard';

// Δίνει τα bytes μιας εικόνας της βιβλιοθήκης στον επεξεργαστή εικόνων του πίνακα σύνταξης (ίδιο origin → ο καμβάς δεν «μολύνεται»).
// Μόνο για συνδεδεμένους με δικαίωμα μεταφόρτωσης και ΜΟΝΟ από το Vercel Blob (χωρίς ανοιχτό proxy προς οποιοδήποτε site).
const MAX = 15 * 1024 * 1024;
export const GET = route(async (req) => {
  const raw = new URL(req.url).searchParams.get('url') || '';
  let u; try { u = new URL(raw); } catch { return json({ error: 'Μη έγκυρη διεύθυνση.' }, 400); }
  if (u.protocol !== 'https:' || !u.hostname.endsWith('.public.blob.vercel-storage.com')) return json({ error: 'Επιτρέπονται μόνο εικόνες της βιβλιοθήκης.' }, 400);
  const r = await fetch(u, { cache: 'no-store' });
  if (!r.ok) return json({ error: 'Η εικόνα δεν βρέθηκε.' }, 404);
  const type = r.headers.get('content-type') || '';
  if (!/^image\/(png|jpeg|webp|gif)$/.test(type)) return json({ error: 'Δεν είναι εικόνα που επεξεργάζεται.' }, 415);
  const buf = await r.arrayBuffer();
  if (buf.byteLength > MAX) return json({ error: 'Η εικόνα είναι πολύ μεγάλη.' }, 413);
  return new Response(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=300' } });
}, { perm: 'uploads' });
