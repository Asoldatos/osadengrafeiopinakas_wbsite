'use client';
import Mascot from '@/components/Mascot';
/** Σφάλμα σελίδας διαχείρισης: φιλικό μήνυμα με οδηγίες, αντί για γενικό «Ωπ!». */
export default function AdminError({ error, reset }) {
  return (
    <div className="card center" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }} role="alert">
      <Mascot mood="oops" size={110} />
      <h1>Ωπ! Η σελίδα δεν φόρτωσε</h1>
      <p>Δοκίμασε ξανά. Αν το πρόβλημα συνεχίζεται και μόλις ενημέρωσες τον ιστότοπο, η βάση δεδομένων ίσως χρειάζεται ενημέρωση: τρέξε <code>npm run db:setup</code> στον υπολογιστή σου ή περίμενε μερικά δευτερόλεπτα και ανανέωσε τη σελίδα.</p>
      {error?.digest && <p className="muted small">Κωδικός σφάλματος: {error.digest}</p>}
      <div className="btns" style={{ justifyContent: 'center' }}><button type="button" className="btn btn-primary" onClick={reset}>Δοκίμασε ξανά</button></div>
    </div>
  );
}
