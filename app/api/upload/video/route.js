import { handleUpload } from '@vercel/blob/client';
import { route, json } from '@/lib/guard';
import { getAdmin } from '@/lib/auth';
import { can } from '@/lib/perms.mjs';

/** Άμεση μεταφόρτωση βίντεο από τον browser στο Blob (παρακάμπτει το όριο 4,5 MB των Functions). */
export const POST = route(async (req) => {
  const b = await req.json();
  const res = await handleUpload({
    body: b, request: req,
    onBeforeGenerateToken: async () => {
      const u = await getAdmin();
      if (!can(u, 'uploads') || u.must_change) throw new Error('Δεν έχετε δικαίωμα μεταφόρτωσης.');
      return { allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'], maximumSizeInBytes: 200 * 1024 * 1024, addRandomSuffix: true };
    },
    onUploadCompleted: async () => {},
  });
  return json(res);
}, { open: 'external' });
