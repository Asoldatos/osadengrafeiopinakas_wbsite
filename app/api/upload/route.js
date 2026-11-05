import { put, del } from '@vercel/blob';
import { q, logActivity } from '@/lib/db';
import { route, json } from '@/lib/guard';
import { cleanSvg } from '@/lib/sanitize';
import { slugify } from '@/lib/util';

const MAX = 4 * 1024 * 1024; // όριο σώματος αιτήματος των Vercel Functions ≈ 4,5 MB
function sniff(b) {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ['image/png', 'png'];
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ['image/jpeg', 'jpg'];
  if (b.slice(0, 4).toString() === 'GIF8') return ['image/gif', 'gif'];
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return ['image/webp', 'webp'];
  return null;
}
export const POST = route(async (req, _c, user) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Δεν επιλέχθηκε αρχείο.' }, 400);
  if (file.size > MAX) return json({ error: 'Η εικόνα ξεπερνά τα 4 MB. Μικρύνετέ την ή ανεβάστε PDF από την ενότητα PDF.' }, 413);
  let buf = Buffer.from(await file.arrayBuffer());
  let mime, ext;
  const kind = sniff(buf);
  if (kind) [mime, ext] = kind;
  else if (buf.slice(0, 400).toString('utf8').trimStart().startsWith('<')) {
    const svg = cleanSvg(buf.toString('utf8'));
    if (!svg) return json({ error: 'Το SVG δεν είναι ασφαλές ή έγκυρο.' }, 400);
    buf = Buffer.from(svg); mime = 'image/svg+xml'; ext = 'svg';
  } else return json({ error: 'Επιτρέπονται μόνο PNG, JPG, WEBP, GIF και SVG.' }, 415);
  const base = slugify(String(file.name).replace(/\.[^.]+$/, '')) || 'file';
  const blob = await put(`media/${base}.${ext}`, buf, { access: 'public', contentType: mime, addRandomSuffix: true });
  const replace = +(new URL(req.url).searchParams.get('replace') || 0);
  let row;
  if (replace) {
    const old = (await q('select url from media where id=$1', [replace]))[0];
    if (!old) return json({ error: 'Δεν βρέθηκε το αρχείο προς αντικατάσταση.' }, 404);
    row = (await q('update media set url=$1,name=$2,mime=$3,size=$4 where id=$5 returning *', [blob.url, `${base}.${ext}`, mime, buf.length, replace]))[0];
    try { await del(old.url); } catch {}
  } else row = (await q('insert into media(url,name,mime,size) values($1,$2,$3,$4) returning *', [blob.url, `${base}.${ext}`, mime, buf.length]))[0];
  await logActivity(user, 'Μεταφόρτωση εικόνας', row.name);
  return json(row, 201);
});
