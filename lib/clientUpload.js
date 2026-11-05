import { slugify } from './util';
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  let j = null; try { j = await res.json(); } catch {}
  if (!res.ok) throw new Error(j?.error || 'Κάτι πήγε στραβά.');
  return j;
}
export const toast = (msg, mood = 'happy') => window.dispatchEvent(new CustomEvent('toast', { detail: { msg, mood } }));
export function uploadImage(file, { onProgress, replace } = {}) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/upload' + (replace ? `?replace=${replace}` : ''));
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} x.status < 300 ? resolve(j) : reject(new Error(j.error || 'Αποτυχία μεταφόρτωσης.')); };
    x.onerror = () => reject(new Error('Σφάλμα δικτύου.'));
    const f = new FormData(); f.append('file', file); x.send(f);
  });
}
export async function uploadPdf(file, { onProgress } = {}) {
  if (!/\.pdf$/i.test(file.name)) throw new Error('Επιτρέπονται μόνο αρχεία PDF.');
  const { upload } = await import('@vercel/blob/client');
  const blob = await upload(`pdf/${slugify(file.name.replace(/\.pdf$/i, ''))}.pdf`, file, {
    access: 'public', handleUploadUrl: '/api/upload/pdf', contentType: 'application/pdf', onUploadProgress: (p) => onProgress?.(p.percentage / 100),
  });
  await api('/api/admin/media', { method: 'POST', body: { url: blob.url, name: file.name, mime: 'application/pdf', size: file.size } });
  return blob.url;
}
