import { revalidatePath } from 'next/cache';
import { q, logActivity } from '@/lib/db';
import { route, json, body } from '@/lib/guard';
import { getSite } from '@/lib/data';
import { cleanText } from '@/lib/sanitize';

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const FONTS = ['comfortaa', 'literata', 'manrope'];
function clean(v, key = '') {
  if (typeof v === 'string') return key === 'colors' ? v : cleanText(v, 5000);
  if (Array.isArray(v)) return v.slice(0, 100).map((x) => clean(x));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[cleanText(k, 60)] = clean(x, k); return o; }
  return typeof v === 'boolean' || typeof v === 'number' ? v : null;
}
export const GET = route(async () => json(await getSite()), { role: 'admin' });
export const PUT = route(async (req, _c, user) => {
  const input = clean(await body(req));
  for (const [k, v] of Object.entries(input.colors || {})) if (!HEX.test(v)) return json({ error: `Μη έγκυρο χρώμα: ${k}` }, 400);
  for (const k of ['heading', 'body']) if (input.fonts && !FONTS.includes(input.fonts[k])) return json({ error: 'Μη έγκυρη γραμματοσειρά.' }, 400);
  await q("insert into settings(key,value) values('site',$1::jsonb) on conflict(key) do update set value=excluded.value", [JSON.stringify(input)]);
  revalidatePath('/', 'layout');
  await logActivity(user, 'Αλλαγή ρυθμίσεων ιστοτόπου');
  return json({ ok: true });
}, { role: 'admin' });
