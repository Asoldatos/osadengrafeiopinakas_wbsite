'use client';
import { Suspense } from 'react';
import TicketsAdmin from '@/components/admin/TicketsAdmin';
export default function Page() {
  return (<><h1>Αιτήματα επικοινωνίας </h1><p className="muted">Ό,τι στέλνουν οι αναγνώστες από τη σελίδα <a href="/contact" target="_blank" rel="noopener noreferrer">/contact</a>: ιδέες για άρθρα, όσοι θέλουν να γράψουν, ερωτήσεις και προβλήματα.</p>
    <Suspense fallback={<p className="muted">Φόρτωση…</p>}><TicketsAdmin /></Suspense></>);
}
