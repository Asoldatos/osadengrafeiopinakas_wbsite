'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, toast, uploadImage, uploadPdf, uploadVideo, isVideoFile } from '@/lib/clientUpload';
import { MascotSay } from '../Mascot';

const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export default function MediaLibrary() {
  const [rows, setRows] = useState(null), [q, setQ] = useState(''), [type, setType] = useState(''), [prog, setProg] = useState(null);
  const load = useCallback(() => api('/api/admin/media' + (q ? `?q=${encodeURIComponent(q)}` : '')).then(setRows).catch((e) => toast(e.message, 'oops')), [q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  const up = async (files) => {
    for (const f of files) {
      try { setProg(0); if (/\.pdf$/i.test(f.name)) await uploadPdf(f, { onProgress: setProg }); else if (isVideoFile(f)) await uploadVideo(f, { onProgress: setProg }); else await uploadImage(f, { onProgress: setProg }); toast(`Ανέβηκε: ${f.name}`, 'celebrate'); } catch (e) { toast(`${f.name}: ${e.message}`, 'oops'); }
    }
    setProg(null); load();
  };
  const replace = async (m, f) => { if (!f) return; try { setProg(0); await uploadImage(f, { replace: m.id, onProgress: setProg }); toast('Το αρχείο αντικαταστάθηκε.'); } catch (e) { toast(e.message, 'oops'); } setProg(null); load(); };
  const del = async (m) => { if (!confirm(`Διαγραφή του «${m.name}»; Αν χρησιμοποιείται κάπου, θα εμφανίζεται σπασμένο.`)) return; try { await api(`/api/admin/media/${m.id}`, { method: 'DELETE' }); toast('Διαγράφηκε.', 'oops'); load(); } catch (e) { toast(e.message, 'oops'); } };
  const alt = async (m, v) => { if (v === (m.alt || '')) return; try { await api(`/api/admin/media/${m.id}`, { method: 'PUT', body: { alt: v } }); toast('Αποθηκεύτηκε!'); } catch (e) { toast(e.message, 'oops'); } };
  const shown = (rows || []).filter((m) => !type || (type === 'pdf' ? m.mime === 'application/pdf' : type === 'video' ? m.mime.startsWith('video/') : m.mime.startsWith('image/')));
  return (
    <div>
      <div className="adm-tools"><input type="search" placeholder="Αναζήτηση αρχείων…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Αναζήτηση" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Τύπος"><option value="">Όλοι οι τύποι</option><option value="image">Εικόνες / SVG</option><option value="video">Βίντεο</option><option value="pdf">PDF</option></select>
        <label className="btn btn-primary sm">+ Μεταφόρτωση<input type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,video/ogg,application/pdf" onChange={(e) => { up([...e.target.files]); e.target.value = ''; }} /></label></div>
      {prog !== null && <div className="bar"><span style={{ width: `${prog * 100}%` }} /></div>}
      {!rows ? <p className="muted">Φόρτωση…</p> : !shown.length ? <MascotSay mood="happy" k="upload" /> : (
        <div className="mlib">{shown.map((m) => (
          <figure key={m.id} className="mcard">
            {m.mime.startsWith('image/') ? <img src={m.url} alt={m.alt || m.name} loading="lazy" /> : m.mime.startsWith('video/') ? <video src={`${m.url}#t=0.1`} controls muted preload="metadata" playsInline /> : <div className="pdfthumb" aria-hidden="true">PDF</div>}
            <figcaption><b title={m.name}>{m.name}</b><small>{m.mime.split('/')[1]} · {kb(m.size)}</small>
              <input defaultValue={m.alt || ''} placeholder="Εναλλακτικό κείμενο (alt)" aria-label={`Εναλλακτικό κείμενο: ${m.name}`} onBlur={(e) => alt(m, e.target.value)} />
              <span className="row wrap"><button type="button" className="btn btn-ghost sm" onClick={() => navigator.clipboard.writeText(m.url).then(() => toast('Ο σύνδεσμος αντιγράφηκε!'))}>Αντιγραφή URL</button>
                {m.mime.startsWith('image/') && <label className="btn btn-ghost sm">Αντικατάσταση<input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(e) => replace(m, e.target.files[0])} /></label>}
                <button type="button" className="btn btn-danger sm" onClick={() => del(m)}>Διαγραφή</button></span></figcaption></figure>))}</div>)}
    </div>
  );
}
