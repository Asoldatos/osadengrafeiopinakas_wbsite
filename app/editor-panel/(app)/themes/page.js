import ThemeEditor from '@/components/admin/ThemeEditor';
export const metadata = { title: 'Εποχιακά θέματα' };
export default function Page() {
  return (<><h1>🎄 Εποχιακά θέματα</h1>
    <p className="muted">Όλα τα χριστουγεννιάτικα (χρώματα, κείμενα, χιόνι, μουσική, ηχητικά, η μετάβαση και οι ημερομηνίες) ρυθμίζονται από εδώ. Το ίδιο σύστημα θα εξυπηρετεί και μελλοντικά θέματα (Απόκριες, Πάσχα…).</p>
    <ThemeEditor slug="christmas" /></>);
}
