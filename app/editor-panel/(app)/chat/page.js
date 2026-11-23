'use client';
import ChatAdmin from '@/components/admin/ChatAdmin';
export default function Page() {
  return (<><h1>Chat</h1><p className="muted">Οι servers του chat.osaden.gr: δημιουργία, κανάλια, κανόνες, ανακοινώσεις και συντονισμός. Τα προσωπικά μηνύματα είναι κρυπτογραφημένα και φαίνονται μόνο αν κάποιος τα αναφέρει (Κοινότητα → Αναφορές).</p><ChatAdmin /></>);
}
