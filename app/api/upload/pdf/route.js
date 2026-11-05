import { handleUpload } from '@vercel/blob/client';
import { route, json } from '@/lib/guard';
import { getAdmin } from '@/lib/auth';

/** Άμεση μεταφόρτωση PDF από τον browser στο Blob (παρακάμπτει το όριο 4,5 MB των Functions). */
export const POST = route(async (req) => {
  const b = await req.json();
  const res = await handleUpload({
    body: b, request: req,
    onBeforeGenerateToken: async () => {
      const u = await getAdmin();
      if (!u) throw new Error('Απαιτείται σύνδεση.');
      return { allowedContentTypes: ['application/pdf'], maximumSizeInBytes: 150 * 1024 * 1024, addRandomSuffix: true };
    },
    onUploadCompleted: async () => {},
  });
  return json(res);
}, { open: 'external' });
