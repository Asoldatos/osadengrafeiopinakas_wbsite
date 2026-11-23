'use client';
import { Suspense } from 'react';
import CommunityAdmin from '@/components/admin/CommunityAdmin';
export default function Page() {
  return (<><h1>Κοινότητα</h1><p className="muted">Σχόλια, likes, προβολές, φίλοι και μηνύματα μαθητών: ρυθμίσεις, έλεγχος και αναφορές.</p>
    <Suspense fallback={<p className="muted">Φόρτωση…</p>}><CommunityAdmin /></Suspense></>);
}
