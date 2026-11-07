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

const VIDEO_TYPES = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogv: 'video/ogg', ogg: 'video/ogg' };
export const isVideoFile = (f) => /\.(mp4|m4v|webm|mov|ogv|ogg)$/i.test(f.name) || f.type.startsWith('video/');
export async function uploadVideo(file, { onProgress } = {}) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = VIDEO_TYPES[ext];
  if (!type) throw new Error('Επιτρέπονται βίντεο MP4, WebM, MOV ή OGG.');
  if (file.size > 200 * 1024 * 1024) throw new Error('Το βίντεο ξεπερνά τα 200 MB. Συμπίεσέ το και δοκίμασε ξανά.');
  const { upload } = await import('@vercel/blob/client');
  const blob = await upload(`video/${slugify(file.name.replace(/\.[^.]+$/, ''))}.${ext === 'm4v' ? 'mp4' : ext}`, file, {
    access: 'public', handleUploadUrl: '/api/upload/video', contentType: type, onUploadProgress: (p) => onProgress?.(p.percentage / 100),
  });
  await api('/api/admin/media', { method: 'POST', body: { url: blob.url, name: file.name, mime: type, size: file.size } });
  return blob.url;
}
