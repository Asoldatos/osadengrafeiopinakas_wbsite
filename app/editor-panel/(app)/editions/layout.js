import { requireAdminPage } from '@/lib/auth';
export const dynamic = 'force-dynamic';
/** Η ενότητα ανοίγει μόνο με το δικαίωμα «editions» (έλεγχος στον διακομιστή). */
export default async function Guard({ children }) { await requireAdminPage('editions'); return children; }
