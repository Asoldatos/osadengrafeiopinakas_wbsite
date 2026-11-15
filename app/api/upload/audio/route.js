import { handleUpload } from '@vercel/blob/client';
import { route, json } from '@/lib/guard';
import { getAdmin } from '@/lib/auth';
import { can } from '@/lib/perms.mjs';

/** Άμεση μεταφόρτωση ήχου (μουσική, ηχητικά εφέ) από τον browser στο Blob. */
export const POST = route(async (req) => {
  const res = await handleUpload({
    body: await req.json(), request: req,
    onBeforeGenerateToken: async () => {
      const u = await getAdmin();
      if (!can(u, 'uploads') || u.must_change) throw new Error('Δεν έχετε δικαίωμα μεταφόρτωσης.');
      return { allowedContentTypes: ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/flac'], maximumSizeInBytes: 40 * 1024 * 1024, addRandomSuffix: true };
    },
    onUploadCompleted: async () => {},
  });
  return json(res);
}, { open: 'external' });
