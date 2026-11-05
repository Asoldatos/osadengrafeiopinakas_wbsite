'use client';
import { MascotSay } from '@/components/Mascot';
export default function Error({ reset }) {
  return <main className="wrap center-page"><h1 className="h1">Ωπ!</h1><MascotSay mood="oops" k="error" size={170}><button type="button" className="btn btn-primary" onClick={reset}>Δοκίμασε ξανά</button></MascotSay></main>;
}
