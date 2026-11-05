import Link from 'next/link';
import { MascotSay } from '@/components/Mascot';
export const metadata = { title: 'Δεν βρέθηκε η σελίδα' };
export default function NotFound() {
  return <main className="wrap center-page"><h1 className="h1">404</h1><MascotSay mood="confused" k="notFound" size={170}><Link className="btn btn-primary" href="/">Πίσω στην αρχική</Link></MascotSay></main>;
}
